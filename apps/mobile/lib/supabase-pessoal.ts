import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSupabasePessoalConfig } from './env'

const { url, anonKey } = getSupabasePessoalConfig()

export const supabasePessoal = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'infinity-pessoal-session',
  },
})
