import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug: verificar variáveis (apenas em desenvolvimento)
if (typeof window === 'undefined') {
  console.log('🔍 Verificando variáveis de ambiente...')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Definida' : '❌ Não definida')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas!')
  console.error('')
  console.error('📝 Para resolver:')
  console.error('1. Crie um arquivo .env.local na raiz do projeto')
  console.error('2. Adicione as seguintes variáveis:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui')
  console.error('')
  console.error('💡 Veja o arquivo SETUP.md para instruções detalhadas')
  console.error('')
  console.error('⚠️ IMPORTANTE: Reinicie o servidor após criar/modificar o .env.local!')
  console.error('')
  
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'See SETUP.md for instructions. ' +
    'IMPORTANT: Restart the server after creating/modifying .env.local!'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
