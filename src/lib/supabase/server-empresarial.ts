import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL
const serviceRoleKey = process.env.SUPABASE_EMPRESARIAL_SERVICE_ROLE_KEY

/** Verifica se as variáveis do admin Empresarial estão configuradas. */
export function hasSupabaseAdminEmpresarialConfig(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey)
}

/**
 * Cliente Supabase Empresarial com Service Role para uso apenas no servidor (webhooks, APIs).
 * Ignora RLS; usar somente em Route Handlers confiáveis (ex.: webhook Stripe).
 */
export function createSupabaseAdminEmpresarial() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variáveis SUPABASE_EMPRESARIAL_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL são obrigatórias para webhooks/API empresarial.'
    )
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
