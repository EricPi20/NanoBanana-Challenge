import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate Supabase configuration
const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  } catch (error) {
    console.error('Supabase initialization error:', error);
  }
} else {
  if (typeof window !== 'undefined') {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║          SUPABASE CONFIGURATION REQUIRED                      ║
╠══════════════════════════════════════════════════════════════╣
║  Please create a .env.local file with your Supabase config: ║
║                                                              ║
║  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co ║
║  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key                ║
║                                                              ║
║  See README.md for detailed setup instructions!             ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }
}

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase is not initialized. Please configure Supabase in .env.local');
  }
  return supabase;
};

export { supabase };
