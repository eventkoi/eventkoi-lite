import { createClient } from "@supabase/supabase-js";
import { fetchPluginConfig } from "./config";

let supabase = null;

export async function getSupabase() {
  if (supabase) return supabase;

  const config = await fetchPluginConfig();
  supabase = createClient(config.supabase_url, config.supabase_anon_key);
  return supabase;
}
