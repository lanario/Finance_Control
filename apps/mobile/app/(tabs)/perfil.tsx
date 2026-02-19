import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSupabaseClient } from '../../lib/supabase'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../lib/context'
import { Ionicons } from '@expo/vector-icons'
import { AnimatedFadeIn, AnimatedPressableScale, LottieLoader } from '../../components'

/**
 * Tela de Perfil mínima: dados do usuário e logout (Fase 2).
 */
export default function PerfilScreen() {
  const router = useRouter()
  const [context, setContext] = useState<AppContext>('pessoal')
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(CONTEXT_STORAGE_KEY).then((ctx) => {
      const c = (ctx as AppContext) ?? 'pessoal'
      setContext(c)
      getSupabaseClient(c)
        .auth.getUser()
        .then(({ data: { user } }) => {
          setEmail(user?.email ?? null)
        })
        .finally(() => setLoading(false))
    })
  }, [])

  async function handleLogout() {
    const ctx = (await AsyncStorage.getItem(CONTEXT_STORAGE_KEY)) as AppContext
    const supabase = getSupabaseClient(ctx ?? 'pessoal')
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <LottieLoader />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AnimatedFadeIn delay={0}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.label}>Contexto</Text>
          <Text style={styles.value}>
            {context === 'pessoal' ? 'Financeiro Pessoal' : 'Financeiro Empresarial'}
          </Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email ?? '—'}</Text>
        </View>
      </AnimatedFadeIn>
      <AnimatedFadeIn delay={120}>
        <AnimatedPressableScale style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </AnimatedPressableScale>
      </AnimatedFadeIn>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    padding: 24,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden' as const,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.6)',
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    overflow: 'hidden' as const,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
})
