'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './providers'

export default function Home() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }
  }, [session, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-pulse text-primary text-xl">Carregando...</div>
    </div>
  )
}

