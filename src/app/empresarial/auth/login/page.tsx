'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseEmpresarial } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiMail, FiLock, FiArrowLeft, FiUser, FiBriefcase, FiTrendingUp, FiUsers } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import NeonGridBackground from '@/components/Layout/NeonGridBackground'

type OAuthProvider = 'google'

export default function LoginEmpresarialPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingOAuth, setLoadingOAuth] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

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
        setSuccess('Email confirmado com sucesso! Agora você pode fazer login.')
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  function validatePassword(pwd: string): string | null {
    if (pwd.length < 6) return 'A senha deve ter pelo menos 6 caracteres'
    return null
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: signInError } = await supabaseEmpresarial.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        let errorMessage = signInError.message
        if (signInError.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e as configurações do Supabase.'
        } else if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada e confirme sua conta.'
        }
        setError(errorMessage)
        setLoading(false)
      } else {
        router.push('/empresarial/dashboard')
      }
    } catch (err: unknown) {
      console.error('Erro ao fazer login:', err)
      setError('Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.')
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError('Informe o nome da empresa.')
      setLoading(false)
      return
    }

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

      const { error: signUpError } = await supabaseEmpresarial.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: { full_name: trimmedName },
        },
      })

      if (signUpError) {
        let errorMessage = signUpError.message
        if (signUpError.message.includes('fetch') || signUpError.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão com o Supabase. Verifique o projeto e sua conexão.'
        } else if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou use outro email.'
        } else if (signUpError.message.includes('Invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.'
        } else if (signUpError.message.includes('Password')) {
          errorMessage = 'Senha inválida. Use pelo menos 6 caracteres.'
        }
        setError(errorMessage)
        setLoading(false)
      } else {
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar a conta.')
        setError('')
        setLoading(false)
        setEmail('')
        setPassword('')
      }
    } catch (err: unknown) {
      console.error('Erro ao criar conta:', err)
      const message = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.'
      setError(message.includes('fetch') ? 'Verifique o projeto Supabase, a URL no .env.local e sua conexão.' : 'Verifique sua conexão e tente novamente.')
      setLoading(false)
    }
  }

  /**
   * Login/cadastro via Google (OAuth).
   * redirectTo deve estar em Authentication > URL Configuration no Supabase (projeto empresarial).
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
    <div
      className="min-h-screen relative flex flex-col lg:flex-row lg:items-center lg:justify-center overflow-y-auto px-3 py-6 sm:px-4 sm:py-8 lg:py-12 pb-8 sm:pb-12 pt-14 sm:pt-8"
      style={{ backgroundColor: '#0d0d0d' }}
    >
      <NeonGridBackground />

      {/* Botão Voltar - canto superior esquerdo (igual ao Finance Pessoal) */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 px-3 py-2.5 sm:px-4 rounded-lg bg-white/15 text-white border border-white/25 hover:bg-white/25 hover:border-white/40 transition-all text-sm font-semibold shadow-lg min-h-[44px] touch-manipulation"
        title="Voltar para a página inicial"
      >
        <FiArrowLeft className="w-5 h-5 flex-shrink-0" />
        <span>Voltar</span>
      </button>

      <div className="relative z-10 w-full max-w-4xl flex flex-col lg:flex-row lg:items-center lg:justify-center gap-6 sm:gap-8 lg:gap-12 px-0 sm:px-2 mx-auto">
        {/* Box de login: primeiro no mobile, à direita no desktop */}
        <div className="w-full max-w-md lg:shrink-0 lg:order-2 lg:ml-auto order-1">
          <div
            className="rounded-xl sm:rounded-2xl shadow-2xl border border-gray-700/60 p-5 sm:p-6 md:p-8 lg:p-10 relative"
            style={{
              backgroundColor: '#1a1a1a',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              {isSignUp ? 'Preencha os dados para acessar o Finance Empresarial' : 'Entre na sua conta Finance Empresarial'}
            </p>
          </div>

          {/* Toggle Entrar / Cadastrar com pill neon e transição */}
          <div
            className="relative flex rounded-lg p-1 mb-6 overflow-hidden"
            style={{ backgroundColor: '#222222' }}
          >
            <div
              className="absolute top-1 left-1 bottom-1 w-[calc(50%-2px)] rounded-md transition-all duration-300 ease-out"
              style={{
                backgroundColor: '#00ff88',
                boxShadow: '0 0 16px rgba(0, 255, 136, 0.4)',
                transform: isSignUp ? 'translateX(100%)' : 'translateX(0)',
              }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError('')
                setSuccess('')
              }}
              className={`relative z-10 flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-300 ${
                !isSignUp ? 'text-black' : 'text-gray-300 hover:text-white'
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
              className={`relative z-10 flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-300 ${
                isSignUp ? 'text-black' : 'text-gray-300 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4 sm:space-y-5">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
                  Nome da empresa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="organization"
                    className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon focus:border-transparent transition-all"
                    style={{ backgroundColor: '#222222' }}
                    placeholder="Nome da sua empresa"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
                Email corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiMail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon focus:border-transparent transition-all"
                  style={{ backgroundColor: '#222222' }}
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-medium text-gray-400 uppercase tracking-widest">
                  Senha
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-neon transition-colors"
                    onClick={() => {}}
                  >
                    esqueceu?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiLock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 6 : undefined}
                  className="w-full pl-10 pr-24 py-3 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon focus:border-transparent transition-all"
                  style={{ backgroundColor: '#222222' }}
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? 'ocultar' : 'mostrar'}
                </button>
              </div>
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">mínimo 6 caracteres</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-neon/10 border border-neon/30 text-neon px-4 py-3 rounded-xl text-sm">
                {success}
                {isSignUp && (
                  <p className="text-xs text-gray-400 mt-1">Após confirmar o email, você poderá fazer login.</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
              style={{
                backgroundColor: '#00ff88',
                color: '#000000',
                boxShadow: '0 0 20px rgba(0, 255, 136, 0.35), 0 0 40px rgba(0, 255, 136, 0.15)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Carregando...
                </span>
              ) : (
                isSignUp ? 'Criar conta' : 'Continuar para o dashboard'
              )}
            </button>
          </form>

          {/* Ou continue com - abaixo do formulário */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 text-gray-500" style={{ backgroundColor: '#1a1a1a' }}>
                Ou continue com
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={loadingOAuth || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold border border-gray-600 text-white hover:border-neon/50 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-6"
            style={{ backgroundColor: '#222222' }}
          >
            <FcGoogle className="w-5 h-5" aria-hidden />
            <span>{loadingOAuth ? 'Redirecionando...' : 'Continuar com Google'}</span>
          </button>

          <p className="text-center text-xs text-gray-500 mt-6">
            Ao continuar, você concorda com os{' '}
            <Link href="/termos" className="text-neon hover:underline">Termos</Link>
            {' '}e{' '}
            <Link href="/privacidade" className="text-neon hover:underline">Política de Privacidade</Link>
            {' '}do Finance Empresarial.
          </p>
          </div>

          <p className="text-center text-gray-500 text-xs mt-4 sm:mt-6">
            Finance Empresarial · Infinity Lines
          </p>
        </div>

        {/* Painel esquerdo: alinhamento igual ao Finance Pessoal (ícone + título na mesma linha, texto e lista alinhados) */}
        <div className="w-full lg:max-w-md lg:flex-1 lg:order-1 order-2 mb-4 lg:mb-0 flex flex-col justify-center px-2 sm:px-0">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-gray-600 flex-shrink-0 neon-glow-pulse" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
              <FiBriefcase className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white neon-text-glow">
              Finance Empresarial
            </h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-6 lg:mb-8 max-w-md">
            Sistema completo de gestão financeira empresarial com controle total sobre operações, fluxo de caixa e relatórios.
          </p>
          <ul className="space-y-3 sm:space-y-4">
            <li className="flex items-start sm:items-center gap-3 text-gray-300 text-sm sm:text-base">
              <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/5 border border-gray-600 flex-shrink-0">
                <FiBriefcase className="w-4 h-4 sm:w-5 sm:h-5 text-neon" />
              </span>
              <span className="font-medium">Controle total das operações da empresa</span>
            </li>
            <li className="flex items-start sm:items-center gap-3 text-gray-300 text-sm sm:text-base">
              <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/5 border border-gray-600 flex-shrink-0">
                <FiTrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-neon" />
              </span>
              <span className="font-medium">Fluxo de caixa, receitas e relatórios</span>
            </li>
            <li className="flex items-start sm:items-center gap-3 text-gray-300 text-sm sm:text-base">
              <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/5 border border-gray-600 flex-shrink-0">
                <FiUsers className="w-4 h-4 sm:w-5 sm:h-5 text-neon" />
              </span>
              <span className="font-medium">Multi-usuários e permissões</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
