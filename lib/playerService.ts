import db from './db';
import { Player } from './types';

export async function searchPlayers(search?: string): Promise<Player[]> {
  if (search && search.trim()) {
    const result = await db.query<Player>(
      `SELECT * FROM players WHERE LOWER(name) LIKE LOWER($1) ORDER BY name`,
      [`%${search.trim()}%`]
    );
    return result.rows;
  }

  const result = await db.query<Player>(`SELECT * FROM players ORDER BY name`);
  return result.rows;
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const result = await db.query<Player>(`SELECT * FROM players WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function createPlayer(name: string): Promise<Player> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Player name is required');
  }

  const result = await db.query<Player>(
    `INSERT INTO players (name) VALUES ($1) RETURNING *`,
    [trimmed]
  );
  return result.rows[0];
}
