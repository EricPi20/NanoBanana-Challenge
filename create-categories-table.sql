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
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Allow public read access" ON categories;
DROP POLICY IF EXISTS "Allow public write access" ON categories;
DROP POLICY IF EXISTS "Allow public update access" ON categories;
DROP POLICY IF EXISTS "Allow public delete access" ON categories;

-- Create policies for public read/write (for game purposes)
CREATE POLICY "Allow public read access" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public write access" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON categories
  FOR DELETE USING (true);

-- Enable Realtime for categories table
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add current_category_image_descr column to game_state if it doesn't exist
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS current_category_image_descr TEXT;

