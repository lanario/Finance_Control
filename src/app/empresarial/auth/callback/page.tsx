'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseEmpresarial } from '@/lib/supabase/empresarial'
import NeonGridBackground from '@/components/Layout/NeonGridBackground'

/**
 * Página de callback OAuth para o fluxo empresarial.
 * O Supabase redireciona aqui após login com Google (ou outro provider).
 * A URL deve estar em Authentication > URL Configuration > Redirect URLs no Supabase (projeto empresarial).
 */
export default function AuthCallbackEmpresarialPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const { data: { subscription } } = supabaseEmpresarial.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setStatus('ok')
          router.replace('/empresarial/dashboard')
        }
      }
    )

    let attempts = 0
    const maxAttempts = 10
    function tryRedirect() {
      attempts += 1
      supabaseEmpresarial.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('ok')
          router.replace('/empresarial/dashboard')
        } else {
          const hash = typeof window !== 'undefined' ? window.location.hash : ''
          if (hash && hash.includes('error=')) {
            setStatus('error')
            router.replace('/empresarial/auth/login?error=oauth')
          } else if (attempts >= maxAttempts) {
            router.replace('/empresarial/auth/login')
          } else {
            timeoutId = setTimeout(tryRedirect, 800)
          }
        }
      })
    }

    tryRedirect()

    return () => {
      subscription.unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ backgroundColor: '#0d0d0d' }}>
      <NeonGridBackground />
      <div className="relative z-10 text-white text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin w-10 h-10 border-2 border-neon border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-300">Conectando... Aguarde.</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-gray-400">Redirecionando para o login...</p>
        )}
      </div>
    </div>
  )
}
