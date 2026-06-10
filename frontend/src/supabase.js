import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Auto-format if the user provided just the reference ID (e.g. "nrzmdmojiyllwxulnrke")
if (supabaseUrl && !supabaseUrl.startsWith('http') && supabaseUrl !== 'YOUR_SUPABASE_URL') {
  supabaseUrl = `https://${supabaseUrl.trim()}.supabase.co`;
}

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'YOUR_ANON_KEY';

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
