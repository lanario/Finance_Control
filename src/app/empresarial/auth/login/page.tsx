'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseEmpresarial } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiMail, FiLock, FiTrendingUp, FiBriefcase, FiUsers, FiArrowLeft } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import Image from 'next/image'
import InstallAppBanner from '@/components/InstallAppBanner'

type OAuthProvider = 'google'

export default function LoginEmpresarialPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOAuth, setLoadingOAuth] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  // Redirecionar se já estiver autenticado (ex.: retorno do OAuth)
  useEffect(() => {
    if (authLoading) return
    if (session) {
      router.replace('/empresarial/dashboard')
    }
  }, [session, authLoading, router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const confirmed = urlParams.get('confirmed')
      if (confirmed === 'true') {
        setSuccess('✅ Email confirmado com sucesso! Agora você pode fazer login.')
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres'
    }
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabaseEmpresarial.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        let errorMessage = error.message
        
        if (error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e as configurações do Supabase.'
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada e confirme sua conta.'
        }
        
        setError(errorMessage)
        setLoading(false)
      } else {
        router.push('/empresarial/dashboard')
      }
    } catch (err: any) {
      console.error('Erro ao fazer login:', err)
      setError('Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.')
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Erro de configuração: Variáveis do Supabase não encontradas. Reinicie o servidor.')
        setLoading(false)
        return
      }

      const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
          return `${window.location.origin}/empresarial/auth/login?confirmed=true`
        }
        return process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/empresarial/auth/login?confirmed=true`
          : 'http://localhost:3000/empresarial/auth/login?confirmed=true'
      }
      
      const redirectUrl = getRedirectUrl()
      
      const { error, data } = await supabaseEmpresarial.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) {
        let errorMessage = error.message
        
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão com o Supabase. Verifique: 1) Se o projeto está ativo no Supabase, 2) Se a URL está correta, 3) Sua conexão com internet.'
        } else if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.'
        } else if (error.message.includes('Password')) {
          errorMessage = 'Senha inválida. Use pelo menos 6 caracteres.'
        }
        
        setError(errorMessage)
        setLoading(false)
      } else {
        setSuccess('✅ Conta criada com sucesso! Verifique seu email para confirmar a conta.')
        setError('')
        setLoading(false)
        setEmail('')
        setPassword('')
      }
    } catch (err: any) {
      console.error('Erro ao criar conta:', err)
      let errorMessage = 'Erro ao conectar com o servidor. '
      
      if (err.message?.includes('fetch')) {
        errorMessage += 'Verifique: 1) Se o projeto Supabase está ativo, 2) Se a URL está correta no .env.local, 3) Sua conexão com internet.'
      } else {
        errorMessage += 'Verifique sua conexão e tente novamente.'
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  /**
   * Inicia login/cadastro via provedor OAuth (Google, etc.)
   * O redirectTo deve ser igual ao configurado no Supabase (Authentication > URL Configuration).
   * Ex.: http://69.62.87.91:3001/empresarial/auth/callback
   */
  async function handleOAuthSignIn(provider: OAuthProvider) {
    setLoadingOAuth(true)
    setError('')
    setSuccess('')
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      const redirectTo = `${baseUrl}/empresarial/auth/callback`
      const { error: oauthError } = await supabaseEmpresarial.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (oauthError) {
        setError(oauthError.message || 'Erro ao conectar com o provedor. Tente novamente.')
        setLoadingOAuth(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com o provedor.'
      setError(message)
      setLoadingOAuth(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-purple-900 px-4 py-12">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Lado Esquerdo - Branding */}
        <div className="hidden md:block text-white space-y-6">
          <div className="flex items-end space-x-2 mb-8">
            <Image
              src="/images/infinity_sem_fundo.png"
              alt="Infinity Lines"
              width={120}
              height={100}
              className="object-contain"
            />
            <h1 className="text-4xl font-bold pb-8">Infinity Lines</h1>
          </div>
          <p className="text-xl text-white/90 mb-8">
            Sistema completo de gestão financeira empresarial com controle total sobre suas operações.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <FiBriefcase className="w-5 h-5" />
              </div>
              <span className="text-white/90">Gestão empresarial completa</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <FiTrendingUp className="w-5 h-5" />
              </div>
              <span className="text-white/90">Fluxo de caixa e relatórios</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <FiUsers className="w-5 h-5" />
              </div>
              <span className="text-white/90">Multi-usuários e permissões</span>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-secondary-light/20 relative">
            {/* Botão Voltar para Home */}
            <button
              onClick={() => router.push('/')}
              className="absolute top-4 left-4 flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors text-sm font-medium"
              title="Voltar para a página inicial"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            {/* Logo Mobile */}
            <div className="md:hidden flex items-center justify-center space-x-2 mb-6">
              <Image
                src="/images/infinity_sem_fundo.png"
                alt="Infinity Lines"
                width={72}
                height={72}
                className="object-contain"
              />
              <h1 className="text-2xl font-bold text-primary">Infinity Lines</h1>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-primary mb-2">
                {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
              </h2>
              <p className="text-secondary">
                {isSignUp 
                  ? 'Cadastre-se para acessar o Financeiro Empresarial'
                  : 'Entre no Financeiro Empresarial'
                }
              </p>
            </div>

            <div className="mb-6 flex bg-secondary-light/20 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setError('')
                  setSuccess('')
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                  !isSignUp
                    ? 'bg-primary text-white shadow-md'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setError('')
                  setSuccess('')
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                  isSignUp
                    ? 'bg-primary text-white shadow-md'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Cadastrar
              </button>
            </div>

            {/* OAuth - Login com Google */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-light/40" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-secondary">Ou continue com</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loadingOAuth || loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold border-2 border-secondary-light text-primary hover:bg-secondary-light/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <FcGoogle className="w-5 h-5" aria-hidden />
                <span>{loadingOAuth ? 'Redirecionando...' : 'Continuar com Google'}</span>
              </button>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-primary mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-secondary" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border-2 border-secondary-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-primary mb-2"
                >
                  Senha
                  {isSignUp && (
                    <span className="text-xs text-secondary font-normal ml-2">
                      (mínimo 6 caracteres)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-secondary" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isSignUp ? 6 : undefined}
                    className="w-full pl-10 pr-4 py-3 border-2 border-secondary-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                  <span className="font-semibold">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                  <span className="font-semibold">✅</span>
                  <div>
                    <p className="font-semibold mb-1">{success}</p>
                    <p className="text-xs text-green-600">
                      Após confirmar o email, você poderá fazer login normalmente.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Carregando...</span>
                  </span>
                ) : (
                  isSignUp ? 'Criar Conta' : 'Entrar'
                )}
              </button>
            </form>
            <div className="mt-6 pt-6 border-t border-secondary-light/20">
              <InstallAppBanner />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
