-- Nano Banana Challenge Database Schema for Supabase
-- Run this in Supabase SQL Editor (Database → SQL Editor)

-- Create game_state table
CREATE TABLE IF NOT EXISTS game_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  admin_id TEXT,
  phase TEXT NOT NULL DEFAULT 'lobby',
  current_round TEXT,
  round_number INTEGER DEFAULT 0,
  selected_players TEXT[] DEFAULT '{}',
  timer_started_at BIGINT,
  timer_duration INTEGER DEFAULT 180,
  round_winners TEXT[] DEFAULT '{}',
  easy_round_players TEXT[] DEFAULT '{}',
  current_category_image_descr TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_at BIGINT NOT NULL,
  votes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create categories table for category descriptions from CSV uploaded by captain
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  category TEXT NOT NULL,
  image_descr TEXT NOT NULL,
  round_type TEXT, -- 'easy', 'medium', 'hard', or null for any
  uploaded_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Allow public read access" ON game_state;
DROP POLICY IF EXISTS "Allow public write access" ON game_state;
DROP POLICY IF EXISTS "Allow public update access" ON game_state;
DROP POLICY IF EXISTS "Allow public delete access" ON game_state;
DROP POLICY IF EXISTS "Allow public read access" ON players;
DROP POLICY IF EXISTS "Allow public write access" ON players;
DROP POLICY IF EXISTS "Allow public update access" ON players;
DROP POLICY IF EXISTS "Allow public delete access" ON players;
DROP POLICY IF EXISTS "Allow public read access" ON submissions;
DROP POLICY IF EXISTS "Allow public write access" ON submissions;
DROP POLICY IF EXISTS "Allow public update access" ON submissions;
DROP POLICY IF EXISTS "Allow public delete access" ON submissions;

-- Create policies for public read/write (for game purposes)
-- In production, you might want to restrict these

-- Game state policies
CREATE POLICY "Allow public read access" ON game_state
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON game_state
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON game_state
  FOR UPDATE USING (true);

-- Players policies
CREATE POLICY "Allow public read access" ON players
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON players
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON players
  FOR DELETE USING (true);

-- Submissions policies
CREATE POLICY "Allow public read access" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON submissions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON submissions
  FOR DELETE USING (true);

-- Categories policies
CREATE POLICY "Allow public read access" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON categories
  FOR DELETE USING (true);

-- Enable Realtime for all tables (ignore errors if already enabled)
DO $$
BEGIN
  -- Try to add tables to realtime publication
  -- If they're already added, this will fail silently
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Note: Storage bucket and policies should be created separately
-- See SUPABASE_SETUP.md for storage setup instructions
