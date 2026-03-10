export interface Court {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

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
  court_id: number;
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

// Tournament types
export interface Tournament {
  id: number;
  name: string;
  format: 'single_elimination' | 'round_robin';
  team_size: number;
  status: 'setup' | 'active' | 'completed';
  organizer_player_id: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentTeam {
  id: number;
  tournament_id: number;
  name: string;
  seed: number | null;
  created_at: string;
}

export interface TournamentTeamWithPlayers extends TournamentTeam {
  players: { id: number; name: string; elo_rating: number }[];
  avg_elo: number;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round_number: number;
  match_number: number;
  team1_id: number | null;
  team2_id: number | null;
  score_team1: number | null;
  score_team2: number | null;
  winning_team_id: number | null;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  court_id: number | null;
  next_match_id: number | null;
  next_match_slot: number | null;
  is_bye: boolean;
  reported_by_player_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentMatchWithDetails extends TournamentMatch {
  team1_name: string | null;
  team2_name: string | null;
  court_name: string | null;
  team1_players: { id: number; name: string }[];
  team2_players: { id: number; name: string }[];
}

export interface TournamentStandingsEntry {
  team_id: number;
  team_name: string;
  seed: number | null;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_differential: number;
}

export interface TournamentWithDetails extends Tournament {
  organizer_name: string;
  team_count: number;
  match_count: number;
  completed_match_count: number;
}
