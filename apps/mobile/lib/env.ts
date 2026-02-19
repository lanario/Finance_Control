import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>

function getEnv(key: string): string | undefined {
  return extra[key] ?? process.env[key]
}

export function getSupabasePessoalConfig(): { url: string; anonKey: string } {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_PESSOAL_URL') ?? getEnv('EXPO_PUBLIC_SUPABASE_URL')
  const anonKey =
    getEnv('EXPO_PUBLIC_SUPABASE_PESSOAL_ANON_KEY') ?? getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    throw new Error(
      'Variáveis do Supabase (Pessoal) não configuradas. Configure EXPO_PUBLIC_SUPABASE_PESSOAL_* ou EXPO_PUBLIC_SUPABASE_* no .env'
    )
  }
  return { url, anonKey }
}

export function getSupabaseEmpresarialConfig(): { url: string; anonKey: string } {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_EMPRESARIAL_URL')
  const anonKey = getEnv('EXPO_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY')
  if (!url || !anonKey) {
    throw new Error(
      'Variáveis do Supabase (Empresarial) não configuradas. Configure EXPO_PUBLIC_SUPABASE_EMPRESARIAL_* no .env'
    )
  }
  return { url, anonKey }
}
