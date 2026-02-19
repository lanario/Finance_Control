'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ComprasPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/empresarial/compras-despesas')
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-[200px] text-gray-400">
      Redirecionando...
    </div>
  )
}
