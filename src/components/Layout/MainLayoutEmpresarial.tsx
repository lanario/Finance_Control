'use client'

import { useAuth } from '@/app/empresarial/providers'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { hasAccess, type PerfilAssinatura } from '@/types/assinatura'
import { TrialTimer } from '@/components/TrialTimer'
import SidebarEmpresarial from './SidebarEmpresarial'
import NeonGridBackground from './NeonGridBackground'

const ROTAS_SEM_VERIFICACAO_ASSINATURA = ['/empresarial/auth/login', '/empresarial/assinatura', '/empresarial/planos']

export default function MainLayoutEmpresarial({
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
      router.push('/empresarial/auth/login')
    }
  }, [session, loading, router])

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
      try {
        const res = await fetch('/api/empresarial/ensure-profile', {
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

  useEffect(() => {
    if (loading || perfil === undefined) return
    if (!session || ROTAS_SEM_VERIFICACAO_ASSINATURA.includes(pathname ?? '')) return
    if (perfil === null) return
    if (!hasAccess(perfil)) {
      router.replace('/empresarial/assinatura')
    }
  }, [session, loading, perfil, pathname, router])

  const aguardandoPerfil = session && perfil === undefined
  if (loading || aguardandoPerfil) {
    return (
      <div className="flex items-center justify-center min-h-screen relative" data-theme="dark">
        <NeonGridBackground />
        <div className="relative z-10 animate-pulse emp-text-primary text-xl">Carregando...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const mostrarTimerTrial =
    perfil && pathname && !ROTAS_SEM_VERIFICACAO_ASSINATURA.includes(pathname)

  return (
    <div className="flex min-h-screen relative" data-theme="dark">
      <NeonGridBackground />
      <SidebarEmpresarial />
      <main className="relative z-10 flex-1 p-8 ml-64 min-h-screen">
        {mostrarTimerTrial && (
          <div className="mb-4">
            <TrialTimer
              perfil={perfil}
              assinaturaHref="/empresarial/assinatura"
              variant="empresarial"
            />
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
