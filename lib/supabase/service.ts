import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("!!! Supabase environment variables not set. Cannot connect to DB. !!!");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);