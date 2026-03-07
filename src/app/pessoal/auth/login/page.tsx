'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { FiMail, FiLock, FiUser, FiArrowLeft, FiPieChart, FiTrendingUp, FiTarget } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import Image from 'next/image'
import LoginDotGridBackground from '@/components/Layout/LoginDotGridBackground'

type OAuthProvider = 'google'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState('')
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
      router.replace('/pessoal/dashboard')
    }
  }, [session, authLoading, router])

  // Verificar se o usuário veio de uma confirmação de email
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const confirmed = urlParams.get('confirmed')
      if (confirmed === 'true') {
        setSuccess('✅ Email confirmado com sucesso! Agora você pode fazer login.')
        // Limpar o parâmetro da URL sem recarregar a página
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Melhorar mensagens de erro
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
        router.push('/pessoal/dashboard')
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

    const nome = nomeCompleto.trim()
    if (!nome) {
      setError('Informe seu nome completo.')
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
      // Debug: verificar variáveis no cliente
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Erro de configuração: Variáveis do Supabase não encontradas. Reinicie o servidor.')
        setLoading(false)
        return
      }

      console.log('🔍 Tentando criar conta...')
      console.log('URL:', supabaseUrl ? '✅' : '❌')
      
      // Redirecionar para /pessoal/auth/callback após confirmação: estabelece sessão e envia para o dashboard
      const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
          return `${window.location.origin}/pessoal/auth/callback`
        }
        return process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/pessoal/auth/callback`
          : 'https://infinity-lines.vercel.app/pessoal/auth/callback'
      }
      
      const redirectUrl = getRedirectUrl()
      console.log('🔗 URL de redirecionamento:', redirectUrl)
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: nomeCompleto.trim() },
        },
      })

      if (error) {
        console.error('Erro do Supabase:', error)
        
        // Melhorar mensagens de erro
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
        console.log('✅ Conta criada com sucesso!')
        setSuccess('✅ Conta criada com sucesso! Verifique seu email para confirmar a conta.')
        setError('')
        setLoading(false)
        setEmail('')
        setPassword('')
        setNomeCompleto('')
      }
    } catch (err: any) {
      console.error('Erro ao criar conta:', err)
      console.error('Detalhes:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      
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
   * Login/cadastro via Google (OAuth).
   * redirectTo deve estar em Authentication > URL Configuration no Supabase (projeto pessoal).
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
      const redirectTo = `${baseUrl}/pessoal/auth/callback`
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
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

  const features = [
    { icon: FiPieChart, label: 'Controle total das suas finanças' },
    { icon: FiTrendingUp, label: 'Gastos, receitas e investimentos' },
    { icon: FiTarget, label: 'Sonhos e metas financeiras' },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center relative bg-black overflow-y-auto px-3 py-6 sm:px-4 sm:py-8 lg:py-12 pb-8 sm:pb-12 pt-14 sm:pt-8">
      <LoginDotGridBackground />

      {/* Botão Voltar - topo absoluto, área de toque adequada no mobile */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 px-3 py-2.5 sm:px-4 rounded-lg bg-white/15 text-white border border-white/25 hover:bg-white/25 hover:border-white/40 transition-all text-sm font-semibold shadow-lg min-h-[44px] touch-manipulation"
        title="Voltar para a página inicial"
      >
        <FiArrowLeft className="w-5 h-5 flex-shrink-0" />
        <span>Voltar</span>
      </button>

      {/* Container central: card primeiro no mobile, texto abaixo */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col lg:flex-row lg:items-center lg:justify-center gap-6 sm:gap-8 lg:gap-12 px-0 sm:px-2 mx-auto">
      {/* Coluna direita no desktop = card de login (order 1 no mobile) */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center order-1 lg:order-2 flex-shrink-0">
        <div className="login-card-enter w-full bg-[#0d0d0d] rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 lg:p-10 border border-white/[0.08] relative">
          {/* Toggle Login / Cadastro com pill deslizante */}
          <div className="login-item-3 mb-4 sm:mb-6 login-toggle-track flex bg-white/[0.06] rounded-lg p-1 border border-white/[0.06]">
            <div
              className={`login-toggle-pill ${isSignUp ? 'login-toggle-pill--signup' : ''}`}
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
                !isSignUp ? 'text-black' : 'text-gray-400 hover:text-white'
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
                isSignUp ? 'text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Conteúdo que muda ao alternar: transição suave */}
          <div key={isSignUp ? 'signup' : 'login'} className="login-mode-transition">
          <div className="text-center mb-5 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
              {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">
              {isSignUp
                ? 'Cadastre-se para gerenciar suas finanças'
                : 'Entre na sua conta Finance Pessoal'
              }
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="login-item-5 space-y-4 sm:space-y-5">
            {isSignUp && (
              <div>
                <label htmlFor="nomeCompleto" className="block text-sm font-medium text-gray-300 mb-2">
                  Nome completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <input
                    id="nomeCompleto"
                    type="text"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    required={isSignUp}
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
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
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
                {isSignUp && (
                  <span className="text-xs text-gray-500 font-normal ml-2">(mín. 6 caracteres)</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FiLock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 6 : undefined}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                <span className="font-semibold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                <span className="font-semibold">✅</span>
                <div>
                  <p className="font-semibold mb-1">{success}</p>
                  <p className="text-xs text-green-400/80">
                    Após confirmar o email, você poderá fazer login normalmente.
                  </p>
                </div>
              </div>
            )}

            <div
              className="login-btn-brutalist"
              data-disabled={loading ? 'true' : undefined}
            >
              <button
                type="submit"
                disabled={loading}
                className="login-btn-brutalist-inner w-full focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-[#0d0d0d]"
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
            </div>
          </form>

          {/* OAuth - Google (parte de baixo da box) */}
          <div className="space-y-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/[0.08]">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-[#0d0d0d] text-gray-500">Ou continue com</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loadingOAuth || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FcGoogle className="w-5 h-5" aria-hidden />
              <span>{loadingOAuth ? 'Redirecionando...' : 'Continuar com Google'}</span>
            </button>
          </div>

          </div>
        </div>

        <p className="login-item-7 text-center text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          Não tem uma conta?{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setError('')
              setSuccess('')
            }}
            className="text-white font-medium hover:underline"
          >
            Criar conta
          </button>
        </p>
      </div>

      {/* Coluna esquerda no desktop = texto e destaques (order 2 no mobile, abaixo do card) */}
      <div className="relative z-10 w-full lg:max-w-md flex flex-col justify-center order-2 lg:order-1 px-2 sm:px-0">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.06] border border-white/[0.08] flex-shrink-0">
            <Image
              src="/images/infinity_sem_fundo.png"
              alt=""
              width={32}
              height={32}
              className="object-contain w-8 h-8 sm:w-9 sm:h-9"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Finance Pessoal
          </h1>
        </div>
        <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-6 lg:mb-8 max-w-md">
          Sistema completo de gestão financeira pessoal com controle total sobre suas receitas, gastos e investimentos.
        </p>
        <ul className="space-y-3 sm:space-y-4">
          {features.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.label} className="flex items-start sm:items-center gap-3 text-white/90">
                <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/[0.08] border border-white/[0.08] flex-shrink-0">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </span>
                <span className="text-sm sm:text-base font-medium">{item.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
      </div>
    </div>
  )
}

