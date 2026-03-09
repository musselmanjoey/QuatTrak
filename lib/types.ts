export interface Player {
  id: number;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  date: string;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface SessionPlayer {
  id: number;
  session_id: number;
  player_id: number;
  is_active: boolean;
  checked_in_at: string;
}

export interface Match {
  id: number;
  session_id: number;
  round_number: number;
  status: 'pending' | 'in_progress' | 'completed';
  winning_team: number | null;
  created_at: string;
  updated_at: string;
}

export interface MatchPlayer {
  id: number;
  match_id: number;
  player_id: number;
  team: number;
  elo_before: number;
  elo_after: number | null;
}

// Extended types for API responses
export interface SessionWithPlayers extends Session {
  players: (SessionPlayer & { player: Player })[];
}

export interface MatchWithPlayers extends Match {
  players: (MatchPlayer & { player_name: string })[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  elo_rating: number;
  wins: number;
  losses: number;
  games_played: number;
  win_rate: number;
}

export interface PlayerProfile extends Player {
  games_played: number;
  win_rate: number;
  match_history: MatchHistoryEntry[];
}

export interface MatchHistoryEntry {
  match_id: number;
  date: string;
  round_number: number;
  team: number;
  winning_team: number;
  won: boolean;
  teammates: string[];
  opponents: string[];
  elo_before: number;
  elo_after: number | null;
}
