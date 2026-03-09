CREATE TABLE courts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO courts (name, slug) VALUES ('Main Net', 'main');

ALTER TABLE sessions ADD COLUMN court_id INTEGER;
UPDATE sessions SET court_id = (SELECT id FROM courts WHERE slug = 'main');
ALTER TABLE sessions ALTER COLUMN court_id SET NOT NULL;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_court FOREIGN KEY (court_id) REFERENCES courts(id);

ALTER TABLE sessions DROP CONSTRAINT sessions_date_key;
ALTER TABLE sessions ADD CONSTRAINT sessions_date_court_unique UNIQUE (date, court_id);
