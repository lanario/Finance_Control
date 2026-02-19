'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabasePessoal } from '@/lib/supabase/pessoal'

/**
 * Página de callback OAuth para o fluxo pessoal.
 * O Supabase redireciona aqui após login com Google (ou outro provider).
 * A URL deve estar em Authentication > URL Configuration > Redirect URLs no Supabase.
 * Ex.: http://69.62.87.91:3001/auth/callback
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const { data: { subscription } } = supabasePessoal.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setStatus('ok')
          router.replace('/pessoal/dashboard')
        }
      }
    )

    let attempts = 0
    const maxAttempts = 10
    function tryRedirect() {
      attempts += 1
      supabasePessoal.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('ok')
          router.replace('/pessoal/dashboard')
        } else {
          const hash = typeof window !== 'undefined' ? window.location.hash : ''
          if (hash && hash.includes('error=')) {
            setStatus('error')
            router.replace('/pessoal/auth/login?error=oauth')
          } else if (attempts >= maxAttempts) {
            router.replace('/pessoal/auth/login')
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-blue-900">
      <div className="text-white text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin w-10 h-10 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
            <p>Conectando... Aguarde.</p>
          </>
        )}
        {status === 'error' && <p>Redirecionando para o login...</p>}
      </div>
    </div>
  )
}
