'use client'

import { useAuth } from '@/app/pessoal/providers'
import { useRouter } from 'next/navigation'
import { useEffect, Suspense, useMemo } from 'react'
import Sidebar from './Sidebar'

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white text-lg">Carregando...</div>
      </div>
    </div>
  )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/pessoal/auth/login')
    }
  }, [session, loading, router])

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

  if (loading) {
    return <LoadingFallback />
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-20 transition-all duration-150 ease-out min-h-screen will-change-transform">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}

