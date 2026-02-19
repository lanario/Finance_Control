import type { AppContext } from './context'
import { supabasePessoal } from './supabase-pessoal'
import { supabaseEmpresarial } from './supabase-empresarial'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Retorna o cliente Supabase conforme o contexto (Pessoal ou Empresarial).
 */
export function getSupabaseClient(context: AppContext): SupabaseClient {
  return context === 'pessoal' ? supabasePessoal : supabaseEmpresarial
}

export { supabasePessoal, supabaseEmpresarial }
