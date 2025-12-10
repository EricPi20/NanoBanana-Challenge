-- Add session support to Nano Banana Challenge
-- Run this in Supabase SQL Editor (Database → SQL Editor)

-- Add session_id column to game_state table
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add easy_round_players column if it doesn't exist (for backward compatibility)
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS easy_round_players TEXT[] DEFAULT '{}';

-- Add session_id column to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add session_id column to submissions table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index on session_id for better query performance
CREATE INDEX IF NOT EXISTS idx_game_state_session_id ON game_state(session_id);
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON submissions(session_id);

-- Update existing rows to have a default session_id of 'main' for backward compatibility
-- (Only if they don't have a session_id already)
UPDATE game_state SET session_id = 'main' WHERE session_id IS NULL;
UPDATE players SET session_id = 'main' WHERE session_id IS NULL;
UPDATE submissions SET session_id = 'main' WHERE session_id IS NULL;

-- Note: The game_state table uses 'id' as primary key
-- For backward compatibility, existing game_state with id='main' will have session_id='main'
-- New sessions will use session_id as both the id and session_id value
-- The code will use session_id for filtering, but id remains the primary key
