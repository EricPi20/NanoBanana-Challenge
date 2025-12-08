-- Nano Banana Challenge - Supabase Database Schema
-- Run this in your Supabase SQL Editor

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_at BIGINT NOT NULL,
  votes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table for category descriptions from CSV uploaded by captain
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  category TEXT NOT NULL,
  image_descr TEXT NOT NULL,
  round_type TEXT, -- 'easy', 'medium', 'hard', or null for any
  uploaded_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write (for game purposes)
CREATE POLICY "Allow public read access" ON game_state
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON game_state
  FOR ALL USING (true);

CREATE POLICY "Allow public read access" ON players
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON players
  FOR ALL USING (true);

CREATE POLICY "Allow public read access" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON submissions
  FOR ALL USING (true);

CREATE POLICY "Allow public read access" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON categories
  FOR ALL USING (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Create storage bucket for submissions (run this in Supabase Dashboard > Storage)
-- Or use the Supabase Dashboard to create a bucket named 'submissions' with public access

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON game_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

