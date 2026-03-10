import db from './db';

export async function identifyPlayer(name: string): Promise<{ id: number; name: string } | null> {
  const result = await db.query<{ id: number; name: string }>(
    `SELECT id, name FROM players WHERE LOWER(name) = LOWER($1)`,
    [name.trim()]
  );
  return result.rows[0] || null;
}

export async function isOrganizer(tournamentId: number, playerId: number): Promise<boolean> {
  const result = await db.query<{ organizer_player_id: number }>(
    `SELECT organizer_player_id FROM tournaments WHERE id = $1`,
    [tournamentId]
  );
  if (!result.rows[0]) return false;
  return result.rows[0].organizer_player_id === playerId;
}
