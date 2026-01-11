-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT
);

-- Create Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT REFERENCES categories(name) ON DELETE SET NULL,
  path TEXT,
  tag TEXT,
  content TEXT,
  color TEXT,
  "isFavorite" BOOLEAN DEFAULT FALSE,
  "userTags" TEXT[], -- Array of strings
  "isHidden" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Suggestions Table
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  "suggestedAt" BIGINT,
  content TEXT,
  tag TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Policies are optional for quick start but recommended for security.
-- If you face "new row violates row-level security policy" errors, enable these or disable RLS.

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Allow public access (Demo Mode)
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public insert categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public delete categories" ON categories FOR DELETE USING (true);

CREATE POLICY "Public read prompts" ON prompts FOR SELECT USING (true);
CREATE POLICY "Public insert prompts" ON prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update prompts" ON prompts FOR UPDATE USING (true);
CREATE POLICY "Public delete prompts" ON prompts FOR DELETE USING (true);

CREATE POLICY "Public read suggestions" ON suggestions FOR SELECT USING (true);
CREATE POLICY "Public insert suggestions" ON suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update suggestions" ON suggestions FOR UPDATE USING (true);
CREATE POLICY "Public delete suggestions" ON suggestions FOR DELETE USING (true);
