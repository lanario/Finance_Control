'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VendasPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/empresarial/vendas-receitas')
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-[200px] text-gray-400">
      Redirecionando...
    </div>
  )
}
