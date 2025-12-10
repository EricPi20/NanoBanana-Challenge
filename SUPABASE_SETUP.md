# Supabase Setup Guide 🚀

## Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## Step 2: Set Up Database Schema

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Copy and paste the contents of `schema.sql` file
4. Click **Run** to execute the SQL

## Step 3: Create Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it: `submissions`
4. Make it **Public** (toggle on)
5. Click **Create bucket**

## Step 4: Set Up Storage Policies

After creating the bucket, go back to **SQL Editor** and run:

```sql
-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions');

-- Allow public write access (for game submissions)
CREATE POLICY "Public write access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'submissions');

-- Allow public update access
CREATE POLICY "Public update access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'submissions');
```

## Step 5: Enable Realtime

1. Go to **Database** → **Replication** (left sidebar)
2. Enable replication for:
   - `game_state`
   - `players`
   - `submissions`

## Step 6: Verify Environment Variables

Your `.env.local` should already be set up with:
```
NEXT_PUBLIC_SUPABASE_URL=https://hxfwxpttxrmxzwnsbvdz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Znd4cHR0eHJteHp3bnNidmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzI4MjUsImV4cCI6MjA4MDc0ODgyNX0.-ze3jHO1artyRFaGjXcWC-HHBBTo-A5MIf9dYtgfTDs
```

## Step 7: Restart Dev Server

```bash
npm run dev
```

That's it! Your game should now work with Supabase! 🎉


