import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_PESSOAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Verifica se as variáveis do admin Pessoal estão configuradas (sem criar o cliente).
 */
export function hasSupabaseAdminPessoalConfig(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

/**
 * Cliente Supabase com Service Role para uso apenas no servidor (webhooks, APIs).
 * Ignora RLS; usar somente em Route Handlers confiáveis (ex.: webhook Stripe).
 */
export function createSupabaseAdminPessoal(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variáveis SUPABASE_PESSOAL_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) e URL do Supabase Pessoal são obrigatórias para webhooks/API.'
    )
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
