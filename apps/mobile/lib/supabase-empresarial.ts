import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSupabaseEmpresarialConfig } from './env'

const { url, anonKey } = getSupabaseEmpresarialConfig()

export const supabaseEmpresarial = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'infinity-empresarial-session',
  },
})
