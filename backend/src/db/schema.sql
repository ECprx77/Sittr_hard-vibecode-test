PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'babysitter', 'admin')),
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  postal_code TEXT,
  bio TEXT,
  experience TEXT,
  hourly_rate REAL,
  phone TEXT,
  phone_public INTEGER NOT NULL DEFAULT 0,
  photo_path TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS availabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  UNIQUE (user_id, day_of_week, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS favorites (
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  babysitter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (parent_id, babysitter_id)
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  babysitter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'seen', 'accepted', 'declined', 'cancelled')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_postal ON profiles(postal_code);
CREATE INDEX IF NOT EXISTS idx_availabilities_user ON availabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
