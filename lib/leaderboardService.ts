import db from './db';
import { LeaderboardEntry, MatchHistoryEntry, PlayerProfile } from './types';

export async function getLeaderboard(minGames: number = 0): Promise<LeaderboardEntry[]> {
  const result = await db.query<LeaderboardEntry>(
    `SELECT id, name, elo_rating, wins, losses,
            (wins + losses) as games_played,
            CASE WHEN (wins + losses) > 0
              THEN ROUND(wins::numeric / (wins + losses) * 100, 1)
              ELSE 0
            END as win_rate
     FROM players
     WHERE (wins + losses) >= $1
     ORDER BY elo_rating DESC`,
    [minGames]
  );
  return result.rows;
}

export async function getPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
  const playerResult = await db.query<{
    id: number; name: string; elo_rating: number;
    wins: number; losses: number; created_at: string; updated_at: string;
  }>(
    `SELECT * FROM players WHERE id = $1`,
    [playerId]
  );

  const player = playerResult.rows[0];
  if (!player) return null;

  const gamesPlayed = player.wins + player.losses;
  const winRate = gamesPlayed > 0
    ? Math.round((player.wins / gamesPlayed) * 1000) / 10
    : 0;

  // Get match history
  const historyResult = await db.query<MatchHistoryEntry>(
    `SELECT
       m.id as match_id,
       s.date::text as date,
       m.round_number,
       mp.team,
       m.winning_team,
       (mp.team = m.winning_team) as won,
       mp.elo_before,
       mp.elo_after,
       ARRAY(
         SELECT p2.name FROM match_players mp2
         JOIN players p2 ON p2.id = mp2.player_id
         WHERE mp2.match_id = m.id AND mp2.team = mp.team AND mp2.player_id != $1
       ) as teammates,
       ARRAY(
         SELECT p2.name FROM match_players mp2
         JOIN players p2 ON p2.id = mp2.player_id
         WHERE mp2.match_id = m.id AND mp2.team != mp.team
       ) as opponents
     FROM match_players mp
     JOIN matches m ON m.id = mp.match_id
     JOIN sessions s ON s.id = m.session_id
     WHERE mp.player_id = $1 AND m.status = 'completed'
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [playerId]
  );

  return {
    ...player,
    games_played: gamesPlayed,
    win_rate: winRate,
    match_history: historyResult.rows,
  };
}
