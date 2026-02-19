import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSupabaseClient } from '../../lib/supabase'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../lib/context'

/**
 * Tela de callback OAuth: processa o retorno do provedor (Google) e redireciona ao dashboard.
 */
export default function AuthCallbackScreen() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function handleCallback() {
      try {
        const context = (await AsyncStorage.getItem(CONTEXT_STORAGE_KEY)) as AppContext | null
        const ctx = context ?? 'pessoal'
        const supabase = getSupabaseClient(ctx)
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (session) {
          setStatus('ok')
          const dest = ctx === 'empresarial' ? '/(tabs-empresarial)/dashboard' : '/(tabs)/dashboard'
          router.replace(dest)
        } else {
          setStatus('error')
          setMessage('Não foi possível completar o login.')
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setMessage(e instanceof Error ? e.message : 'Erro ao processar login.')
        }
      }
    }
    handleCallback()
    return () => { cancelled = true }
  }, [router])

  return (
    <View style={styles.container}>
      {status === 'loading' && <ActivityIndicator size="large" color="#10b981" />}
      {status === 'error' && <Text style={styles.error}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
})
