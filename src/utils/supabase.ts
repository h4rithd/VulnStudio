import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Load values from the environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[supabase] Initializing Supabase client with URL:', supabaseUrl);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
