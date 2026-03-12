import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el frontend.
 *
 * Resolución de variables:
 * - URL: `NEXT_PUBLIC_SUPABASE_URL`
 * - Key pública (en orden):
 *   1) `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 *   2) `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
 *   3) `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * `true` cuando existe configuración mínima para crear el cliente.
 * Útil para evitar ejecutar lógica dependiente de Supabase en entornos sin variables.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient: SupabaseClient | null = null;

/**
 * Devuelve una instancia singleton de `SupabaseClient`.
 *
 * - Crea el cliente una sola vez y reutiliza la misma instancia.
 * - Lanza error si faltan variables de entorno requeridas.
 *
 * @throws {Error} Si no existe `NEXT_PUBLIC_SUPABASE_URL` o una key pública válida.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y una de estas llaves: NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}
