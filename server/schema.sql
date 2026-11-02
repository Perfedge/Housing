CREATE TABLE IF NOT EXISTS housing_users (
 id uuid PRIMARY KEY, username text NOT NULL UNIQUE, email text NOT NULL UNIQUE,
 password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS housing_sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES housing_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS housing_sessions_user ON housing_sessions(user_id);
CREATE TABLE IF NOT EXISTS housing_resets (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES housing_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS housing_resets_user ON housing_resets(user_id);
CREATE TABLE IF NOT EXISTS housing_scenarios (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES housing_users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 inputs jsonb NOT NULL, reflection text NOT NULL DEFAULT '' CHECK (length(reflection)<=10000),
 baseline jsonb, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,name)
);
CREATE TABLE IF NOT EXISTS housing_limits (
 key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
);
