'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Página de Contas a Pagar foi unificada em Compras/Despesas.
 * Redireciona para a página de despesas.
 */
export default function ContasAPagarRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/empresarial/despesas')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[200px] text-gray-400">
      Redirecionando...
    </div>
  )
}
