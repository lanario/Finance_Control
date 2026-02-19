import { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabasePessoal } from '../lib/supabase-pessoal'
import { supabaseEmpresarial } from '../lib/supabase-empresarial'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../lib/context'

/**
 * Tela inicial: Splash / Escolha de contexto (Pessoal ou Empresarial).
 * Se já houver sessão salva, redireciona para o dashboard.
 * Usa componentes nativos para evitar tela branca com Reanimated/Moti no primeiro paint.
 */
export default function IndexScreen() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    async function checkSession() {
      const savedContext = await AsyncStorage.getItem(CONTEXT_STORAGE_KEY)
      const context = (savedContext ?? 'pessoal') as AppContext
      const supabase = context === 'pessoal' ? supabasePessoal : supabaseEmpresarial
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!cancelled && session) {
        if (context === 'pessoal') {
          router.replace('/(tabs)/dashboard')
        } else {
          router.replace('/(tabs-empresarial)/dashboard')
        }
      }
    }
    checkSession()
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleContextChoice(context: AppContext) {
    await AsyncStorage.setItem(CONTEXT_STORAGE_KEY, context)
    router.push({
      pathname: '/login',
      params: { context },
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Infinity Lines</Text>
        <Text style={styles.subtitle}>Controle suas finanças</Text>
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            onPress={() => handleContextChoice('pessoal')}
          >
            <Text style={styles.buttonText}>Pessoal</Text>
            <Text style={styles.buttonHint}>Finanças pessoais</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && { opacity: 0.85 }]}
            onPress={() => handleContextChoice('empresarial')}
          >
            <Text style={styles.buttonText}>Empresarial</Text>
            <Text style={styles.buttonHint}>Gestão empresarial</Text>
          </Pressable>
        </View>
      </View>
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
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttons: {
    gap: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
})
