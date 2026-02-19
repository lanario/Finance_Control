import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Tira-teima: em dev, confira se esta URL é o mesmo projeto onde o Google está habilitado (não expõe a key)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development' && supabaseUrl) {
  const origem = process.env.NEXT_PUBLIC_SUPABASE_PESSOAL_URL ? 'NEXT_PUBLIC_SUPABASE_PESSOAL_URL' : 'NEXT_PUBLIC_SUPABASE_URL'
  console.log('[Supabase Pessoal] Usando projeto:', supabaseUrl, `(variável: ${origem})`)
}

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
