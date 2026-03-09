import db from './db';
import { Court } from './types';

export async function getAllCourts(): Promise<Court[]> {
  const result = await db.query<Court>(
    `SELECT * FROM courts WHERE is_active = true ORDER BY name`
  );
  return result.rows;
}

export async function getCourtBySlug(slug: string): Promise<Court | null> {
  const result = await db.query<Court>(
    `SELECT * FROM courts WHERE slug = $1 AND is_active = true`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function createCourt(name: string, slug: string): Promise<Court> {
  const result = await db.query<Court>(
    `INSERT INTO courts (name, slug) VALUES ($1, $2) RETURNING *`,
    [name, slug]
  );
  return result.rows[0];
}

interface CourtOverviewPlayer {
  player_id: number;
  name: string;
  elo_rating: number;
  is_active: boolean;
}

export interface CourtOverview {
  id: number;
  name: string;
  slug: string;
  session_id: number | null;
  checked_in_count: number;
  active_count: number;
  players: CourtOverviewPlayer[];
}

export async function getCourtsOverview(): Promise<CourtOverview[]> {
  const courts = await getAllCourts();

  const overviews: CourtOverview[] = [];

  for (const court of courts) {
    const sessionResult = await db.query<{ id: number }>(
      `SELECT id FROM sessions WHERE court_id = $1 AND date = CURRENT_DATE`,
      [court.id]
    );

    const sessionId = sessionResult.rows[0]?.id || null;
    let players: CourtOverviewPlayer[] = [];

    if (sessionId) {
      const playersResult = await db.query<CourtOverviewPlayer>(
        `SELECT sp.player_id, p.name, p.elo_rating, sp.is_active
         FROM session_players sp
         JOIN players p ON p.id = sp.player_id
         WHERE sp.session_id = $1
         ORDER BY sp.checked_in_at`,
        [sessionId]
      );
      players = playersResult.rows;
    }

    overviews.push({
      id: court.id,
      name: court.name,
      slug: court.slug,
      session_id: sessionId,
      checked_in_count: players.length,
      active_count: players.filter(p => p.is_active).length,
      players,
    });
  }

  return overviews;
}
