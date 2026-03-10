-- Migration 007: Tournament System
-- 6 new tables for standalone tournament support

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('single_elimination', 'round_robin')),
  team_size INT NOT NULL DEFAULT 2,
  status VARCHAR(20) NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'completed')),
  organizer_player_id INT NOT NULL REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Courts assigned to a tournament
CREATE TABLE IF NOT EXISTS tournament_courts (
  id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  court_id INT NOT NULL REFERENCES courts(id),
  UNIQUE(tournament_id, court_id)
);

-- Teams in a tournament
CREATE TABLE IF NOT EXISTS tournament_teams (
  id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  seed INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Players on a team
CREATE TABLE IF NOT EXISTS tournament_team_players (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES players(id),
  UNIQUE(team_id, player_id)
);

-- Tournament matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  match_number INT NOT NULL DEFAULT 1,
  team1_id INT REFERENCES tournament_teams(id),
  team2_id INT REFERENCES tournament_teams(id),
  score_team1 INT,
  score_team2 INT,
  winning_team_id INT REFERENCES tournament_teams(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed')),
  court_id INT REFERENCES courts(id),
  next_match_id INT REFERENCES tournament_matches(id),
  next_match_slot INT CHECK (next_match_slot IN (1, 2)),
  is_bye BOOLEAN NOT NULL DEFAULT false,
  reported_by_player_id INT REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Elo tracking for tournament matches (mirrors match_players)
CREATE TABLE IF NOT EXISTS tournament_match_players (
  id SERIAL PRIMARY KEY,
  tournament_match_id INT NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES players(id),
  team_id INT NOT NULL REFERENCES tournament_teams(id),
  elo_before INT NOT NULL,
  elo_after INT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_next ON tournament_matches(next_match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_players_team ON tournament_team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_match_players_match ON tournament_match_players(tournament_match_id);
