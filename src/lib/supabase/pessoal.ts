import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase (Pessoal) não configuradas!')
  console.error('')
  console.error('📝 Configure no .env.local:')
  console.error('   NEXT_PUBLIC_SUPABASE_PESSOAL_URL=sua_url_aqui')
  console.error('   NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY=sua_chave_aqui')
  console.error('')
  console.error('⚠️ IMPORTANTE: Reinicie o servidor após modificar o .env.local!')
  
  throw new Error(
    'Missing Supabase (Pessoal) environment variables. ' +
    'Please configure NEXT_PUBLIC_SUPABASE_PESSOAL_URL and NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY in .env.local'
  )
}

export const supabasePessoal = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'infinity-pessoal-session'
  }
})
