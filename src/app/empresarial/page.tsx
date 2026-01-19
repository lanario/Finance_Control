'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './providers'

export default function EmpresarialPage() {
  const router = useRouter()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.push('/empresarial/dashboard')
      } else {
        router.push('/empresarial/auth/login')
      }
    }
  }, [session, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="animate-pulse text-white text-xl">Carregando...</div>
    </div>
  )
}

