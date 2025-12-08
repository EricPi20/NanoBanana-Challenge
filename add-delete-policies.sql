-- Migration: Add DELETE policies for players and submissions tables
-- Run this in your Supabase SQL Editor if player deletion is not working
-- This adds the missing DELETE policies required by Row Level Security (RLS)

-- Drop existing DELETE policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Allow public delete access" ON players;
DROP POLICY IF EXISTS "Allow public delete access" ON submissions;

-- Add DELETE policy for players table
CREATE POLICY "Allow public delete access" ON players
  FOR DELETE USING (true);

-- Add DELETE policy for submissions table  
CREATE POLICY "Allow public delete access" ON submissions
  FOR DELETE USING (true);

