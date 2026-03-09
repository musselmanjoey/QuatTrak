import db from './db';
import { Match, MatchWithPlayers } from './types';
import { calculateEloChanges } from './elo';
import { generateAutoMatches } from './matchGenerator';

interface PlayerForGeneration {
  id: number;
  elo_rating: number;
  games_this_session: number;
}

export async function getMatchesBySession(sessionId: number): Promise<MatchWithPlayers[]> {
  const matchesResult = await db.query<Match>(
    `SELECT * FROM matches WHERE session_id = $1 ORDER BY round_number, id`,
    [sessionId]
  );

  const matches: MatchWithPlayers[] = [];

  for (const match of matchesResult.rows) {
    const playersResult = await db.query<{
      id: number;
      match_id: number;
      player_id: number;
      team: number;
      elo_before: number;
      elo_after: number | null;
      player_name: string;
    }>(
      `SELECT mp.*, p.name as player_name
       FROM match_players mp
       JOIN players p ON p.id = mp.player_id
       WHERE mp.match_id = $1
       ORDER BY mp.team, p.name`,
      [match.id]
    );

    matches.push({
      ...match,
      players: playersResult.rows,
    });
  }

  return matches;
}

export async function getNextRoundNumber(sessionId: number): Promise<number> {
  const result = await db.query<{ max: number | null }>(
    `SELECT MAX(round_number) as max FROM matches WHERE session_id = $1`,
    [sessionId]
  );
  return (result.rows[0]?.max ?? 0) + 1;
}

export async function generateMatches(
  sessionId: number,
  teamSize: number,
  mode: 'auto' | 'manual',
  manualTeams?: { team1: number[]; team2: number[] }[]
): Promise<MatchWithPlayers[]> {
  const roundNumber = await getNextRoundNumber(sessionId);

  if (mode === 'manual' && manualTeams) {
    return createMatchesFromTeams(sessionId, roundNumber, manualTeams);
  }

  // Auto mode: get active checked-in players with game counts
  const playersResult = await db.query<PlayerForGeneration>(
    `SELECT p.id, p.elo_rating,
            COALESCE(
              (SELECT COUNT(*) FROM match_players mp
               JOIN matches m ON m.id = mp.match_id
               WHERE mp.player_id = p.id AND m.session_id = $1), 0
            )::int as games_this_session
     FROM players p
     JOIN session_players sp ON sp.player_id = p.id
     WHERE sp.session_id = $1 AND sp.is_active = true
     ORDER BY p.id`,
    [sessionId]
  );

  const teams = generateAutoMatches(playersResult.rows, teamSize);

  if (teams.length === 0) {
    throw new Error(`Not enough active players for ${teamSize}v${teamSize} matches`);
  }

  return createMatchesFromTeams(sessionId, roundNumber, teams);
}

async function createMatchesFromTeams(
  sessionId: number,
  roundNumber: number,
  teams: { team1: number[]; team2: number[] }[]
): Promise<MatchWithPlayers[]> {
  const createdMatches: MatchWithPlayers[] = [];

  for (const teamPair of teams) {
    const match = await db.withTransaction(async (client) => {
      // Create match
      const matchResult = await client.query<Match>(
        `INSERT INTO matches (session_id, round_number, status) VALUES ($1, $2, 'pending') RETURNING *`,
        [sessionId, roundNumber]
      );
      const newMatch = matchResult.rows[0];

      // Insert team 1 players
      for (const playerId of teamPair.team1) {
        const playerResult = await client.query<{ elo_rating: number }>(
          `SELECT elo_rating FROM players WHERE id = $1`,
          [playerId]
        );
        await client.query(
          `INSERT INTO match_players (match_id, player_id, team, elo_before) VALUES ($1, $2, 1, $3)`,
          [newMatch.id, playerId, playerResult.rows[0].elo_rating]
        );
      }

      // Insert team 2 players
      for (const playerId of teamPair.team2) {
        const playerResult = await client.query<{ elo_rating: number }>(
          `SELECT elo_rating FROM players WHERE id = $1`,
          [playerId]
        );
        await client.query(
          `INSERT INTO match_players (match_id, player_id, team, elo_before) VALUES ($1, $2, 2, $3)`,
          [newMatch.id, playerId, playerResult.rows[0].elo_rating]
        );
      }

      // Fetch the full match with players
      const playersResult = await client.query<{
        id: number; match_id: number; player_id: number; team: number;
        elo_before: number; elo_after: number | null; player_name: string;
      }>(
        `SELECT mp.*, p.name as player_name
         FROM match_players mp JOIN players p ON p.id = mp.player_id
         WHERE mp.match_id = $1 ORDER BY mp.team, p.name`,
        [newMatch.id]
      );

      return { ...newMatch, players: playersResult.rows };
    });

    createdMatches.push(match);
  }

  return createdMatches;
}

export async function recordMatchResult(
  matchId: number,
  winningTeam: 1 | 2
): Promise<MatchWithPlayers> {
  return db.withTransaction(async (client) => {
    // Get match
    const matchResult = await client.query<Match>(
      `SELECT * FROM matches WHERE id = $1`,
      [matchId]
    );
    const match = matchResult.rows[0];
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Match already completed');

    // Get match players
    const playersResult = await client.query<{
      id: number; match_id: number; player_id: number; team: number;
      elo_before: number; elo_after: number | null; player_name: string;
    }>(
      `SELECT mp.*, p.name as player_name
       FROM match_players mp JOIN players p ON p.id = mp.player_id
       WHERE mp.match_id = $1`,
      [matchId]
    );

    const team1 = playersResult.rows
      .filter(p => p.team === 1)
      .map(p => ({ id: p.player_id, elo: p.elo_before }));
    const team2 = playersResult.rows
      .filter(p => p.team === 2)
      .map(p => ({ id: p.player_id, elo: p.elo_before }));

    // Calculate Elo changes
    const eloChanges = calculateEloChanges(team1, team2, winningTeam);

    // Update match
    await client.query(
      `UPDATE matches SET status = 'completed', winning_team = $1, updated_at = NOW() WHERE id = $2`,
      [winningTeam, matchId]
    );

    // Update each player's Elo, win/loss, and match_players record
    for (const mp of playersResult.rows) {
      const newElo = eloChanges.get(mp.player_id)!;
      const won = mp.team === winningTeam;

      await client.query(
        `UPDATE match_players SET elo_after = $1 WHERE id = $2`,
        [newElo, mp.id]
      );

      await client.query(
        `UPDATE players SET elo_rating = $1, wins = wins + $2, losses = losses + $3, updated_at = NOW() WHERE id = $4`,
        [newElo, won ? 1 : 0, won ? 0 : 1, mp.player_id]
      );
    }

    // Return updated match
    const updatedPlayers = await client.query<{
      id: number; match_id: number; player_id: number; team: number;
      elo_before: number; elo_after: number | null; player_name: string;
    }>(
      `SELECT mp.*, p.name as player_name
       FROM match_players mp JOIN players p ON p.id = mp.player_id
       WHERE mp.match_id = $1 ORDER BY mp.team, p.name`,
      [matchId]
    );

    return {
      ...match,
      status: 'completed' as const,
      winning_team: winningTeam,
      players: updatedPlayers.rows,
    };
  });
}
