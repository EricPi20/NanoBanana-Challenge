-- Add easy_round_players column to game_state table if it doesn't exist
-- Run this in Supabase SQL Editor if you want the full functionality

ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS easy_round_players TEXT[] DEFAULT '{}';
