/**
 * Contexto do app: Pessoal ou Empresarial.
 * Usado para decidir qual cliente Supabase e qual fluxo de auth usar.
 */
export type AppContext = 'pessoal' | 'empresarial'

export const CONTEXT_STORAGE_KEY = 'infinitylines-app-context'
