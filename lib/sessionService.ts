import db from './db';
import { Session, Player } from './types';

interface CheckedInPlayer {
  id: number;
  player_id: number;
  is_active: boolean;
  checked_in_at: string;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
}

export interface SessionWithCheckedIn extends Session {
  players: CheckedInPlayer[];
}

export async function findOrCreateTodaySession(courtId: number): Promise<SessionWithCheckedIn> {
  // Try to find today's session for this court
  let result = await db.query<Session>(
    `SELECT * FROM sessions WHERE date = CURRENT_DATE AND court_id = $1`,
    [courtId]
  );

  let session: Session;

  if (result.rows.length === 0) {
    // Create today's session for this court
    const createResult = await db.query<Session>(
      `INSERT INTO sessions (date, court_id) VALUES (CURRENT_DATE, $1) RETURNING *`,
      [courtId]
    );
    session = createResult.rows[0];
  } else {
    session = result.rows[0];
  }

  // Get checked-in players
  const playersResult = await db.query<CheckedInPlayer>(
    `SELECT sp.id, sp.player_id, sp.is_active, sp.checked_in_at,
            p.name, p.elo_rating, p.wins, p.losses
     FROM session_players sp
     JOIN players p ON p.id = sp.player_id
     WHERE sp.session_id = $1
     ORDER BY sp.checked_in_at`,
    [session.id]
  );

  return {
    ...session,
    players: playersResult.rows,
  };
}

export async function checkInPlayer(sessionId: number, playerId: number): Promise<void> {
  await db.query(
    `INSERT INTO session_players (session_id, player_id)
     VALUES ($1, $2)
     ON CONFLICT (session_id, player_id) DO UPDATE SET is_active = true`,
    [sessionId, playerId]
  );
}

export async function removeCheckIn(sessionId: number, playerId: number): Promise<void> {
  await db.query(
    `DELETE FROM session_players WHERE session_id = $1 AND player_id = $2`,
    [sessionId, playerId]
  );
}

export async function togglePlayerActive(sessionId: number, playerId: number): Promise<boolean> {
  const result = await db.query<{ is_active: boolean }>(
    `UPDATE session_players SET is_active = NOT is_active
     WHERE session_id = $1 AND player_id = $2
     RETURNING is_active`,
    [sessionId, playerId]
  );
  return result.rows[0]?.is_active ?? false;
}
