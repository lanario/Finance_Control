import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase (Empresarial) não configuradas!')
  console.error('')
  console.error('📝 Configure no .env.local:')
  console.error('   NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL=sua_url_aqui')
  console.error('   NEXT_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY=sua_chave_aqui')
  console.error('')
  console.error('⚠️ IMPORTANTE: Reinicie o servidor após modificar o .env.local!')
  
  throw new Error(
    'Missing Supabase (Empresarial) environment variables. ' +
    'Please configure NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL and NEXT_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY in .env.local'
  )
}

export const supabaseEmpresarial = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'infinity-empresarial-session'
  }
})
