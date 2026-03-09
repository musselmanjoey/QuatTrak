CREATE TABLE match_players (
  id SERIAL PRIMARY KEY,
  match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team SMALLINT NOT NULL CHECK (team IN (1, 2)),
  elo_before INT NOT NULL,
  elo_after INT,
  UNIQUE(match_id, player_id)
);

CREATE INDEX idx_match_players_match ON match_players (match_id);
CREATE INDEX idx_match_players_player ON match_players (player_id);
