import db from './db';
import { Tournament, TournamentWithDetails } from './types';

export async function createTournament(
  name: string,
  format: 'single_elimination' | 'round_robin',
  teamSize: number,
  organizerPlayerId: number
): Promise<Tournament> {
  const result = await db.query<Tournament>(
    `INSERT INTO tournaments (name, format, team_size, organizer_player_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, format, teamSize, organizerPlayerId]
  );
  return result.rows[0];
}

export async function getTournamentById(id: number): Promise<TournamentWithDetails | null> {
  const result = await db.query<TournamentWithDetails>(
    `SELECT t.*,
            p.name as organizer_name,
            (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id)::int as team_count,
            (SELECT COUNT(*) FROM tournament_matches tm WHERE tm.tournament_id = t.id)::int as match_count,
            (SELECT COUNT(*) FROM tournament_matches tm WHERE tm.tournament_id = t.id AND tm.status = 'completed')::int as completed_match_count
     FROM tournaments t
     JOIN players p ON p.id = t.organizer_player_id
     WHERE t.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function listTournaments(status?: string): Promise<TournamentWithDetails[]> {
  let query = `
    SELECT t.*,
           p.name as organizer_name,
           (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id)::int as team_count,
           (SELECT COUNT(*) FROM tournament_matches tm WHERE tm.tournament_id = t.id)::int as match_count,
           (SELECT COUNT(*) FROM tournament_matches tm WHERE tm.tournament_id = t.id AND tm.status = 'completed')::int as completed_match_count
    FROM tournaments t
    JOIN players p ON p.id = t.organizer_player_id`;

  const params: unknown[] = [];
  if (status) {
    query += ` WHERE t.status = $1`;
    params.push(status);
  }

  query += ` ORDER BY t.created_at DESC`;

  const result = await db.query<TournamentWithDetails>(query, params);
  return result.rows;
}

export async function updateTournamentStatus(
  id: number,
  status: 'setup' | 'active' | 'completed'
): Promise<Tournament> {
  const result = await db.query<Tournament>(
    `UPDATE tournaments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!result.rows[0]) throw new Error('Tournament not found');
  return result.rows[0];
}

export async function addCourtToTournament(tournamentId: number, courtId: number): Promise<void> {
  await db.query(
    `INSERT INTO tournament_courts (tournament_id, court_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [tournamentId, courtId]
  );
}

export async function removeCourtFromTournament(tournamentId: number, courtId: number): Promise<void> {
  await db.query(
    `DELETE FROM tournament_courts WHERE tournament_id = $1 AND court_id = $2`,
    [tournamentId, courtId]
  );
}

export async function getTournamentCourts(tournamentId: number) {
  const result = await db.query<{ id: number; name: string; slug: string }>(
    `SELECT c.id, c.name, c.slug
     FROM tournament_courts tc
     JOIN courts c ON c.id = tc.court_id
     WHERE tc.tournament_id = $1
     ORDER BY c.name`,
    [tournamentId]
  );
  return result.rows;
}
