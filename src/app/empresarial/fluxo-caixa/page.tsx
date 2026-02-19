'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Página de Fluxo de Caixa foi removida do sistema.
 * Redireciona para o dashboard.
 */
export default function FluxoCaixaRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/empresarial/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[200px] text-gray-400">
      Redirecionando...
    </div>
  )
}
