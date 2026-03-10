import db from './db';
import { TournamentMatch, TournamentMatchWithDetails, TournamentStandingsEntry } from './types';
import { calculateEloChanges } from './elo';

export async function generateSingleEliminationBracket(tournamentId: number): Promise<void> {
  // Get seeded teams
  const teamsResult = await db.query<{ id: number; seed: number }>(
    `SELECT id, seed FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed`,
    [tournamentId]
  );
  const teams = teamsResult.rows;

  if (teams.length < 2) throw new Error('Need at least 2 teams');

  // Pad to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const totalRounds = Math.log2(bracketSize);

  // Standard seeding: 1vN, 2v(N-1), etc.
  const firstRoundMatchups = generateSeededMatchups(bracketSize);

  await db.withTransaction(async (client) => {
    // Clear any existing matches
    await client.query(
      `DELETE FROM tournament_matches WHERE tournament_id = $1`,
      [tournamentId]
    );

    // Create all match shells round by round (later rounds first for next_match linking)
    // We'll create from final to first, then link
    const matchesByRound: number[][] = [];

    // Create matches from final round backward
    for (let round = totalRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundMatches: number[] = [];

      for (let m = 0; m < matchesInRound; m++) {
        const nextMatchId = round < totalRounds
          ? matchesByRound[matchesByRound.length - 1][Math.floor(m / 2)]
          : null;
        const nextMatchSlot = round < totalRounds ? (m % 2) + 1 : null;

        const result = await client.query<{ id: number }>(
          `INSERT INTO tournament_matches (tournament_id, round_number, match_number, status, next_match_id, next_match_slot)
           VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING id`,
          [tournamentId, round, m + 1, nextMatchId, nextMatchSlot]
        );
        roundMatches.push(result.rows[0].id);
      }

      matchesByRound.push(roundMatches);
    }

    // First round matches are the LAST array added
    const firstRoundMatches = matchesByRound[matchesByRound.length - 1];

    // Assign teams to first round using seeded matchups
    for (let i = 0; i < firstRoundMatchups.length; i++) {
      const [seed1, seed2] = firstRoundMatchups[i];
      const team1 = seed1 <= teams.length ? teams[seed1 - 1] : null;
      const team2 = seed2 <= teams.length ? teams[seed2 - 1] : null;
      const matchId = firstRoundMatches[i];

      if (team1 && team2) {
        // Both teams present — mark ready
        await client.query(
          `UPDATE tournament_matches SET team1_id = $1, team2_id = $2, status = 'ready' WHERE id = $3`,
          [team1.id, team2.id, matchId]
        );
      } else if (team1 && !team2) {
        // Bye for team1 — auto-complete and advance
        await client.query(
          `UPDATE tournament_matches SET team1_id = $1, winning_team_id = $1, status = 'completed', is_bye = true WHERE id = $2`,
          [team1.id, matchId]
        );
        // Advance winner
        await advanceWinnerInternal(client, matchId, team1.id);
      } else if (!team1 && team2) {
        // Bye for team2
        await client.query(
          `UPDATE tournament_matches SET team2_id = $1, winning_team_id = $1, status = 'completed', is_bye = true WHERE id = $2`,
          [team2.id, matchId]
        );
        await advanceWinnerInternal(client, matchId, team2.id);
      }
    }
  });
}

function generateSeededMatchups(bracketSize: number): [number, number][] {
  // Standard bracket seeding: 1vN, 2v(N-1), etc.
  // Uses recursive halving for proper bracket placement
  if (bracketSize === 2) return [[1, 2]];

  const matchups: [number, number][] = [];
  const half = bracketSize / 2;

  // Generate position order for proper bracket seeding
  const positions = getPositionOrder(bracketSize);

  for (let i = 0; i < half; i++) {
    matchups.push([positions[i * 2], positions[i * 2 + 1]]);
  }

  return matchups;
}

function getPositionOrder(size: number): number[] {
  if (size === 2) return [1, 2];

  const prev = getPositionOrder(size / 2);
  const result: number[] = [];

  for (const seed of prev) {
    result.push(seed);
    result.push(size + 1 - seed);
  }

  return result;
}

async function advanceWinnerInternal(
  client: import('pg').PoolClient,
  matchId: number,
  winningTeamId: number
): Promise<void> {
  const matchResult = await client.query<TournamentMatch>(
    `SELECT * FROM tournament_matches WHERE id = $1`,
    [matchId]
  );
  const match = matchResult.rows[0];
  if (!match?.next_match_id) return;

  const slot = match.next_match_slot;
  const teamCol = slot === 1 ? 'team1_id' : 'team2_id';

  await client.query(
    `UPDATE tournament_matches SET ${teamCol} = $1 WHERE id = $2`,
    [winningTeamId, match.next_match_id]
  );

  // Check if both teams are now filled → mark ready
  const nextMatch = await client.query<TournamentMatch>(
    `SELECT * FROM tournament_matches WHERE id = $1`,
    [match.next_match_id]
  );
  if (nextMatch.rows[0]?.team1_id && nextMatch.rows[0]?.team2_id) {
    await client.query(
      `UPDATE tournament_matches SET status = 'ready' WHERE id = $1`,
      [match.next_match_id]
    );
  }
}

export async function generateRoundRobinSchedule(tournamentId: number): Promise<void> {
  const teamsResult = await db.query<{ id: number; seed: number }>(
    `SELECT id, seed FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed NULLS LAST, id`,
    [tournamentId]
  );
  const teams = teamsResult.rows;

  if (teams.length < 2) throw new Error('Need at least 2 teams');

  await db.withTransaction(async (client) => {
    // Clear existing matches
    await client.query(
      `DELETE FROM tournament_matches WHERE tournament_id = $1`,
      [tournamentId]
    );

    // Circle method for round robin
    const teamIds = teams.map(t => t.id);
    const n = teamIds.length;
    const hasGhost = n % 2 !== 0;

    if (hasGhost) {
      teamIds.push(-1); // ghost team for bye
    }

    const total = teamIds.length;
    const rounds = total - 1;

    for (let round = 0; round < rounds; round++) {
      let matchNumber = 1;

      for (let i = 0; i < total / 2; i++) {
        const home = i === 0 ? 0 : ((round + i - 1) % (total - 1)) + 1;
        const awayIdx = total - 1 - i;
        const away = awayIdx === 0 ? 0 : ((round + awayIdx - 1) % (total - 1)) + 1;

        const team1Id = teamIds[home];
        const team2Id = teamIds[away];

        // Skip matches involving the ghost team
        if (team1Id === -1 || team2Id === -1) continue;

        await client.query(
          `INSERT INTO tournament_matches (tournament_id, round_number, match_number, team1_id, team2_id, status)
           VALUES ($1, $2, $3, $4, $5, 'ready')`,
          [tournamentId, round + 1, matchNumber, team1Id, team2Id]
        );
        matchNumber++;
      }
    }
  });
}

export async function advanceWinner(matchId: number): Promise<void> {
  const matchResult = await db.query<TournamentMatch>(
    `SELECT * FROM tournament_matches WHERE id = $1`,
    [matchId]
  );
  const match = matchResult.rows[0];
  if (!match || !match.winning_team_id || !match.next_match_id) return;

  await db.withTransaction(async (client) => {
    await advanceWinnerInternal(client, matchId, match.winning_team_id!);
  });
}

export async function recordTournamentMatchResult(
  matchId: number,
  scoreTeam1: number,
  scoreTeam2: number,
  reportedByPlayerId: number | null,
  isOverride?: boolean
): Promise<TournamentMatch> {
  return db.withTransaction(async (client) => {
    // Get match
    const matchResult = await client.query<TournamentMatch>(
      `SELECT * FROM tournament_matches WHERE id = $1`,
      [matchId]
    );
    const match = matchResult.rows[0];
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed' && !isOverride) throw new Error('Match already completed');
    if (!match.team1_id || !match.team2_id) throw new Error('Match teams not set');

    const winningTeamId = scoreTeam1 > scoreTeam2 ? match.team1_id : match.team2_id;

    // Get players for both teams
    const team1Players = await client.query<{ player_id: number; elo_rating: number }>(
      `SELECT ttp.player_id, p.elo_rating
       FROM tournament_team_players ttp
       JOIN players p ON p.id = ttp.player_id
       WHERE ttp.team_id = $1`,
      [match.team1_id]
    );
    const team2Players = await client.query<{ player_id: number; elo_rating: number }>(
      `SELECT ttp.player_id, p.elo_rating
       FROM tournament_team_players ttp
       JOIN players p ON p.id = ttp.player_id
       WHERE ttp.team_id = $1`,
      [match.team2_id]
    );

    // Calculate Elo changes
    const team1 = team1Players.rows.map(p => ({ id: p.player_id, elo: p.elo_rating }));
    const team2 = team2Players.rows.map(p => ({ id: p.player_id, elo: p.elo_rating }));
    const winningTeamNum: 1 | 2 = winningTeamId === match.team1_id ? 1 : 2;
    const eloChanges = calculateEloChanges(team1, team2, winningTeamNum);

    // If override, clear previous match player records
    if (isOverride) {
      await client.query(
        `DELETE FROM tournament_match_players WHERE tournament_match_id = $1`,
        [matchId]
      );
    }

    // Snapshot Elo in tournament_match_players
    for (const p of team1Players.rows) {
      await client.query(
        `INSERT INTO tournament_match_players (tournament_match_id, player_id, team_id, elo_before, elo_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [matchId, p.player_id, match.team1_id, p.elo_rating, eloChanges.get(p.player_id)]
      );
    }
    for (const p of team2Players.rows) {
      await client.query(
        `INSERT INTO tournament_match_players (tournament_match_id, player_id, team_id, elo_before, elo_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [matchId, p.player_id, match.team2_id, p.elo_rating, eloChanges.get(p.player_id)]
      );
    }

    // Update player Elo ratings and win/loss
    for (const [playerId, newElo] of eloChanges) {
      const won = team1.some(p => p.id === playerId)
        ? winningTeamNum === 1
        : winningTeamNum === 2;
      await client.query(
        `UPDATE players SET elo_rating = $1, wins = wins + $2, losses = losses + $3, updated_at = NOW() WHERE id = $4`,
        [newElo, won ? 1 : 0, won ? 0 : 1, playerId]
      );
    }

    // Update match
    const updatedResult = await client.query<TournamentMatch>(
      `UPDATE tournament_matches
       SET score_team1 = $1, score_team2 = $2, winning_team_id = $3, status = 'completed',
           reported_by_player_id = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [scoreTeam1, scoreTeam2, winningTeamId, reportedByPlayerId, matchId]
    );

    // Advance winner for single elimination
    await advanceWinnerInternal(client, matchId, winningTeamId);

    // Check if tournament is complete
    const remaining = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM tournament_matches
       WHERE tournament_id = $1 AND status != 'completed'`,
      [match.tournament_id]
    );
    if (remaining.rows[0].count === 0) {
      await client.query(
        `UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [match.tournament_id]
      );
    }

    return updatedResult.rows[0];
  });
}

export async function assignCourtToMatch(matchId: number, courtId: number): Promise<void> {
  await db.query(
    `UPDATE tournament_matches SET court_id = $1 WHERE id = $2`,
    [courtId, matchId]
  );
}

export async function getTournamentMatches(tournamentId: number): Promise<TournamentMatchWithDetails[]> {
  const matchesResult = await db.query<TournamentMatch>(
    `SELECT * FROM tournament_matches WHERE tournament_id = $1 ORDER BY round_number, match_number`,
    [tournamentId]
  );

  const matches: TournamentMatchWithDetails[] = [];

  for (const match of matchesResult.rows) {
    const team1Name = match.team1_id
      ? (await db.query<{ name: string }>(`SELECT name FROM tournament_teams WHERE id = $1`, [match.team1_id])).rows[0]?.name || null
      : null;
    const team2Name = match.team2_id
      ? (await db.query<{ name: string }>(`SELECT name FROM tournament_teams WHERE id = $1`, [match.team2_id])).rows[0]?.name || null
      : null;
    const courtName = match.court_id
      ? (await db.query<{ name: string }>(`SELECT name FROM courts WHERE id = $1`, [match.court_id])).rows[0]?.name || null
      : null;

    const team1Players = match.team1_id
      ? (await db.query<{ id: number; name: string }>(
          `SELECT p.id, p.name FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id WHERE ttp.team_id = $1`,
          [match.team1_id]
        )).rows
      : [];
    const team2Players = match.team2_id
      ? (await db.query<{ id: number; name: string }>(
          `SELECT p.id, p.name FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id WHERE ttp.team_id = $1`,
          [match.team2_id]
        )).rows
      : [];

    matches.push({
      ...match,
      team1_name: team1Name,
      team2_name: team2Name,
      court_name: courtName,
      team1_players: team1Players,
      team2_players: team2Players,
    });
  }

  return matches;
}

export async function getMatchById(matchId: number): Promise<TournamentMatchWithDetails | null> {
  const matches = await db.query<TournamentMatch>(
    `SELECT * FROM tournament_matches WHERE id = $1`,
    [matchId]
  );
  const match = matches.rows[0];
  if (!match) return null;

  const team1Name = match.team1_id
    ? (await db.query<{ name: string }>(`SELECT name FROM tournament_teams WHERE id = $1`, [match.team1_id])).rows[0]?.name || null
    : null;
  const team2Name = match.team2_id
    ? (await db.query<{ name: string }>(`SELECT name FROM tournament_teams WHERE id = $1`, [match.team2_id])).rows[0]?.name || null
    : null;
  const courtName = match.court_id
    ? (await db.query<{ name: string }>(`SELECT name FROM courts WHERE id = $1`, [match.court_id])).rows[0]?.name || null
    : null;

  const team1Players = match.team1_id
    ? (await db.query<{ id: number; name: string }>(
        `SELECT p.id, p.name FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id WHERE ttp.team_id = $1`,
        [match.team1_id]
      )).rows
    : [];
  const team2Players = match.team2_id
    ? (await db.query<{ id: number; name: string }>(
        `SELECT p.id, p.name FROM tournament_team_players ttp JOIN players p ON p.id = ttp.player_id WHERE ttp.team_id = $1`,
        [match.team2_id]
      )).rows
    : [];

  return {
    ...match,
    team1_name: team1Name,
    team2_name: team2Name,
    court_name: courtName,
    team1_players: team1Players,
    team2_players: team2Players,
  };
}

export async function getPlayerMatches(tournamentId: number, playerId: number): Promise<TournamentMatchWithDetails[]> {
  // Find teams this player is on in this tournament
  const teamIds = await db.query<{ team_id: number }>(
    `SELECT ttp.team_id FROM tournament_team_players ttp
     JOIN tournament_teams tt ON tt.id = ttp.team_id
     WHERE tt.tournament_id = $1 AND ttp.player_id = $2`,
    [tournamentId, playerId]
  );

  if (teamIds.rows.length === 0) return [];

  const ids = teamIds.rows.map(r => r.team_id);
  const allMatches = await getTournamentMatches(tournamentId);

  return allMatches.filter(m =>
    (m.team1_id && ids.includes(m.team1_id)) ||
    (m.team2_id && ids.includes(m.team2_id))
  );
}

export async function getRoundRobinStandings(tournamentId: number): Promise<TournamentStandingsEntry[]> {
  const teamsResult = await db.query<{ id: number; name: string; seed: number | null }>(
    `SELECT id, name, seed FROM tournament_teams WHERE tournament_id = $1`,
    [tournamentId]
  );

  const matchesResult = await db.query<TournamentMatch>(
    `SELECT * FROM tournament_matches WHERE tournament_id = $1 AND status = 'completed'`,
    [tournamentId]
  );

  const standings = new Map<number, TournamentStandingsEntry>();

  for (const team of teamsResult.rows) {
    standings.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      seed: team.seed,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      point_differential: 0,
    });
  }

  for (const match of matchesResult.rows) {
    if (!match.team1_id || !match.team2_id || match.score_team1 === null || match.score_team2 === null) continue;

    const s1 = standings.get(match.team1_id);
    const s2 = standings.get(match.team2_id);

    if (s1) {
      s1.points_for += match.score_team1;
      s1.points_against += match.score_team2;
      if (match.winning_team_id === match.team1_id) s1.wins++;
      else s1.losses++;
    }

    if (s2) {
      s2.points_for += match.score_team2;
      s2.points_against += match.score_team1;
      if (match.winning_team_id === match.team2_id) s2.wins++;
      else s2.losses++;
    }
  }

  const result = Array.from(standings.values());
  for (const entry of result) {
    entry.point_differential = entry.points_for - entry.points_against;
  }

  // Sort: wins desc, then point differential desc
  result.sort((a, b) => b.wins - a.wins || b.point_differential - a.point_differential);

  return result;
}
