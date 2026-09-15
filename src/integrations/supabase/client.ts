import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Client Supabase du projet Ooble.
 *
 * L'URL et la clé anon (JWT public par nature — elle vit dans l'app côté
 * navigateur) sont inscrites ici, surchargées si besoin par les variables
 * d'environnement `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. On utilise
 * le JWT anon legacy plutôt que la publishable key `sb_publishable_…` car le
 * gateway des Edge Functions n'accepte que le JWT anon comme apikey.
 */
const DEFAULT_URL = "https://uukxacjjviiktmbikdwp.supabase.co";
const DEFAULT_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a3hhY2pqdmlpa3RtYmlrZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTAzOTgsImV4cCI6MjEwMDQyNjM5OH0.Gi8UYPg2qlbP7vlWBJrDBwr661Kbxj5NHZYAJU2QENE";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes("VOTRE-PROJET"));

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
