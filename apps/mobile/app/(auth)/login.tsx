import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSupabaseClient } from '../../lib/supabase'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../lib/context'
import { AnimatedFadeIn, AnimatedPressableScale } from '../../components'

WebBrowser.maybeCompleteAuthSession()

/**
 * Tela de Login/Cadastro com toggle, email/senha e Google OAuth.
 * Contexto (Pessoal ou Empresarial) vem dos params ou do storage.
 */
export default function LoginScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ context?: string }>()
  const [context, setContext] = useState<AppContext>('pessoal')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingOAuth, setLoadingOAuth] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const ctx = (params.context ?? 'pessoal') as AppContext
    setContext(ctx)
    AsyncStorage.setItem(CONTEXT_STORAGE_KEY, ctx)
  }, [params.context])

  const supabase = getSupabaseClient(context)

  function validatePassword(pwd: string): string | null {
    if (pwd.length < 6) return 'A senha deve ter pelo menos 6 caracteres'
    return null
  }

  async function handleEmailAuth() {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (isSignUp) {
        const passwordError = validatePassword(password)
        if (passwordError) {
          setError(passwordError)
          setLoading(false)
          return
        }
        const redirectUrl = Linking.createURL('/callback')
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        })
        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }
        setSuccess('Conta criada! Verifique seu email para confirmar.')
        setEmail('')
        setPassword('')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Email ou senha incorretos.')
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('Confirme seu email antes de fazer login.')
          } else {
            setError(signInError.message)
          }
          setLoading(false)
          return
        }
        const ctx = (await AsyncStorage.getItem(CONTEXT_STORAGE_KEY)) as AppContext
        router.replace(ctx === 'empresarial' ? '/(tabs-empresarial)/dashboard' : '/(tabs)/dashboard')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao conectar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoadingOAuth(true)
    try {
      const redirectUrl = Linking.createURL('/callback')
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      })
      if (oauthError) {
        setError(oauthError.message)
        setLoadingOAuth(false)
        return
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success' && result.url) {
          const url = result.url
          const hash = url.split('#')[1]
          if (hash) {
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
              const ctx = (await AsyncStorage.getItem(CONTEXT_STORAGE_KEY)) as AppContext
              router.replace(ctx === 'empresarial' ? '/(tabs-empresarial)/dashboard' : '/(tabs)/dashboard')
            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao conectar com o Google.')
    } finally {
      setLoadingOAuth(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AnimatedFadeIn delay={0}>
          <Text style={styles.title}>
            {context === 'pessoal' ? 'Financeiro Pessoal' : 'Financeiro Empresarial'}
          </Text>
        </AnimatedFadeIn>
        <AnimatedFadeIn delay={80}>
          <Text style={styles.subtitle}>{isSignUp ? 'Criar conta' : 'Entrar'}</Text>
        </AnimatedFadeIn>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <AnimatedFadeIn delay={160}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'password'}
            editable={!loading}
          />
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={240}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              loading && styles.buttonDisabled,
              pressed && !loading && { opacity: 0.9 },
            ]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{isSignUp ? 'Cadastrar' : 'Entrar'}</Text>
            )}
          </Pressable>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={320}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <AnimatedPressableScale
            style={[styles.googleButton, loadingOAuth && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loadingOAuth}
          >
            {loadingOAuth ? (
              <ActivityIndicator color="#1e3a5f" />
            ) : (
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            )}
          </AnimatedPressableScale>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={400}>
          <Pressable
            style={({ pressed }) => [styles.toggleButton, pressed && !loading && { opacity: 0.85 }]}
            onPress={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
            </Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.85 }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
        </AnimatedFadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a5f',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 32,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  error: {
    color: '#ef4444',
    marginBottom: 12,
    fontSize: 14,
  },
  success: {
    color: '#10b981',
    marginBottom: 12,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden' as const,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  googleButtonText: {
    color: '#1e3a5f',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  backButton: {
    marginTop: 32,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
})
