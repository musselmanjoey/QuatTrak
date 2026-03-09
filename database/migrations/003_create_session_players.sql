CREATE TABLE session_players (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

CREATE INDEX idx_session_players_session ON session_players (session_id);
CREATE INDEX idx_session_players_player ON session_players (player_id);
