'use client'

import { useAuth } from '@/app/pessoal/providers'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { hasAccess, type PerfilAssinatura } from '@/types/assinatura'
import { TrialTimer } from '@/components/TrialTimer'
import Sidebar from './Sidebar'
import NexusBackground from './NexusBackground'

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-nexus">
      <div className="flex flex-col items-center space-y-4 relative z-10">
        <div className="w-12 h-12 border-4 border-[var(--nexus-border)] border-t-[var(--nexus-accent)] rounded-full animate-spin"></div>
        <div className="text-[var(--nexus-text)] text-lg">Carregando...</div>
      </div>
    </div>
  )
}

const ROTAS_SEM_VERIFICACAO_ASSINATURA = ['/pessoal/auth/login', '/pessoal/assinatura', '/pessoal/planos']

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [perfil, setPerfil] = useState<PerfilAssinatura | null | undefined>(undefined)

  useEffect(() => {
    if (!loading && !session) {
      router.push('/pessoal/auth/login')
    }
  }, [session, loading, router])

  // Carregar perfil e garantir registro (trial 24h); verificar acesso para redirecionar à assinatura
  useEffect(() => {
    if (!session?.user || loading) return

    let cancelled = false
    const token = session.access_token

    async function run() {
      const { data: profileRow } = await supabase
        .from('perfis')
        .select('trial_ends_at, subscription_status, stripe_customer_id, stripe_subscription_id, created_at')
        .eq('user_id', session!.user.id)
        .single()

      if (cancelled) return
      if (profileRow) {
        setPerfil(profileRow as PerfilAssinatura)
        return
      }
      // Perfil não existe: criar via API (trial 24h)
      try {
        const res = await fetch('/api/pessoal/ensure-profile', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const { created } = await res.json()
        if (created) {
          const { data: newRow } = await supabase
            .from('perfis')
            .select('trial_ends_at, subscription_status, stripe_customer_id, stripe_subscription_id, created_at')
            .eq('user_id', session!.user.id)
            .single()
          if (!cancelled && newRow) setPerfil(newRow as PerfilAssinatura)
        }
      } catch {
        setPerfil(null)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when session ids or loading change
  }, [session?.user?.id, session?.access_token, loading])

  // Redirecionar para assinatura se trial expirado e sem assinatura ativa
  useEffect(() => {
    if (loading || perfil === undefined) return
    if (!session || ROTAS_SEM_VERIFICACAO_ASSINATURA.includes(pathname ?? '')) return
    if (perfil === null) return
    if (!hasAccess(perfil)) {
      router.replace('/pessoal/assinatura')
    }
  }, [session, loading, perfil, pathname, router])

  // Prefetch de rotas principais quando o usuário está logado
  useEffect(() => {
    if (session && !loading) {
      const routes = [
        '/pessoal/dashboard',
        '/pessoal/cartoes',
        '/pessoal/gastos',
        '/pessoal/receitas',
      ]
      
      // Prefetch em background usando requestIdleCallback
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          routes.forEach(route => router.prefetch(route))
        })
      } else {
        // Fallback para navegadores sem requestIdleCallback
        setTimeout(() => {
          routes.forEach(route => router.prefetch(route))
        }, 100)
      }
    }
  }, [session, loading, router])

  const aguardandoPerfil = session && perfil === undefined
  if (loading || aguardandoPerfil) {
    return <LoadingFallback />
  }

  if (!session) {
    return null
  }

  const mostrarTimerTrial =
    perfil && pathname && !ROTAS_SEM_VERIFICACAO_ASSINATURA.includes(pathname)

  return (
    <div className="flex min-h-screen bg-nexus">
      <NexusBackground />
      <Sidebar />
      <main className="flex-1 relative z-10 p-8 ml-64 min-h-screen">
        {mostrarTimerTrial && (
          <div className="mb-4">
            <TrialTimer
              perfil={perfil}
              assinaturaHref="/pessoal/assinatura"
              variant="pessoal"
            />
          </div>
        )}
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}

