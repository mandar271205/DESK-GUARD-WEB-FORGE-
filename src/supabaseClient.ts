import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const missingSupabaseConfig = !supabaseUrl || !supabasePublishableKey;

export const supabase = createClient(supabaseUrl || "https://missing.supabase.co", supabasePublishableKey || "missing-key");
