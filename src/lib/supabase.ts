import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const isValidUrl = (url: string) => {
  try { return url.startsWith('https://') || url.startsWith('http://'); }
  catch { return false; }
}

let _supabase = null as ReturnType<typeof createClient> | null;
if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
  try { _supabase = createClient(supabaseUrl, supabaseAnonKey); }
  catch { _supabase = null; }
}

export const supabase = _supabase;
export const isSupabaseConfigured = _supabase !== null;
