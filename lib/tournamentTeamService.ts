import db from './db';
import { TournamentTeam, TournamentTeamWithPlayers } from './types';

export async function createTeam(tournamentId: number, name: string): Promise<TournamentTeam> {
  const result = await db.query<TournamentTeam>(
    `INSERT INTO tournament_teams (tournament_id, name) VALUES ($1, $2) RETURNING *`,
    [tournamentId, name]
  );
  return result.rows[0];
}

export async function updateTeam(teamId: number, name: string): Promise<TournamentTeam> {
  const result = await db.query<TournamentTeam>(
    `UPDATE tournament_teams SET name = $1 WHERE id = $2 RETURNING *`,
    [name, teamId]
  );
  if (!result.rows[0]) throw new Error('Team not found');
  return result.rows[0];
}

export async function deleteTeam(teamId: number): Promise<void> {
  const result = await db.query(
    `DELETE FROM tournament_teams WHERE id = $1`,
    [teamId]
  );
  if (result.rowCount === 0) throw new Error('Team not found');
}

export async function addPlayerToTeam(teamId: number, playerId: number): Promise<void> {
  await db.query(
    `INSERT INTO tournament_team_players (team_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [teamId, playerId]
  );
}

export async function removePlayerFromTeam(teamId: number, playerId: number): Promise<void> {
  await db.query(
    `DELETE FROM tournament_team_players WHERE team_id = $1 AND player_id = $2`,
    [teamId, playerId]
  );
}

export async function getTeamsWithPlayers(tournamentId: number): Promise<TournamentTeamWithPlayers[]> {
  const teamsResult = await db.query<TournamentTeam>(
    `SELECT * FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed NULLS LAST, name`,
    [tournamentId]
  );

  const teams: TournamentTeamWithPlayers[] = [];

  for (const team of teamsResult.rows) {
    const playersResult = await db.query<{ id: number; name: string; elo_rating: number }>(
      `SELECT p.id, p.name, p.elo_rating
       FROM tournament_team_players ttp
       JOIN players p ON p.id = ttp.player_id
       WHERE ttp.team_id = $1
       ORDER BY p.name`,
      [team.id]
    );

    const players = playersResult.rows;
    const avg_elo = players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length)
      : 0;

    teams.push({ ...team, players, avg_elo });
  }

  return teams;
}

export async function autoSeedTeams(tournamentId: number): Promise<TournamentTeamWithPlayers[]> {
  const teams = await getTeamsWithPlayers(tournamentId);

  // Sort by avg Elo descending
  const sorted = [...teams].sort((a, b) => b.avg_elo - a.avg_elo);

  for (let i = 0; i < sorted.length; i++) {
    await db.query(
      `UPDATE tournament_teams SET seed = $1 WHERE id = $2`,
      [i + 1, sorted[i].id]
    );
    sorted[i].seed = i + 1;
  }

  return sorted;
}
