'use client'

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/pessoal/providers'
import MainLayout from '@/components/Layout/MainLayout'
import { FiCreditCard, FiCheck } from 'react-icons/fi'

type PlanType = 'pessoal' | 'infinity'

function AssinaturaContent() {
  const searchParams = useSearchParams()
  const plan = useMemo<PlanType>(() => {
    const p = searchParams.get('plan')
    return p === 'infinity' ? 'infinity' : 'pessoal'
  }, [searchParams])
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isInfinity = plan === 'infinity'
  const stripeContext = isInfinity ? 'infinity' : 'pessoal'
  const title = isInfinity ? 'Plano Infinity' : 'Assinatura do site'
  const priceLabel = isInfinity ? 'R$ 49,00' : 'R$ 20,00'
  const buttonLabel = isInfinity ? 'Assinar Infinity — R$ 49/mês' : 'Assinar por R$ 20/mês'
  const features = isInfinity
    ? [
        'Acesso completo ao Financeiro Pessoal',
        'Acesso completo ao Financeiro Empresarial',
        'Um único pagamento para as duas aplicações',
      ]
    : [
        'Acesso completo ao Financeiro Pessoal',
        'Dashboard, gastos, receitas, investimentos e sonhos',
      ]

  async function handleAssinar() {
    if (!session?.access_token) {
      setError('Faça login novamente para continuar.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ context: stripeContext }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erro ao iniciar checkout. Tente novamente.')
        setLoading(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError('Resposta inválida do servidor.')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="nexus-card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mb-4">
              <FiCreditCard className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2 animate-nexus-reveal">
              {title}
            </h1>
            <p className="text-[#bbbbbb] animate-nexus-reveal" style={{ animationDelay: '0.05s', animationFillMode: 'backwards' }}>
              {isInfinity
                ? 'Pessoal e Empresarial juntos com um único pagamento.'
                : 'Seu período de degustação de 24 horas acabou. Assine para continuar usando todos os recursos.'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 mb-8">
            {features.map((label) => (
              <div key={label} className="flex items-center gap-2 text-[#dddddd]">
                <FiCheck className="text-green-500 shrink-0" />
                <span>{label}</span>
              </div>
            ))}
            <div className="text-3xl font-bold text-[#f0f0f0] mt-4">
              {priceLabel} <span className="text-lg font-normal text-[#bbbbbb]">/mês</span>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mb-4" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAssinar}
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl bg-white text-black font-semibold hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Redirecionando ao pagamento...' : buttonLabel}
          </button>

          <p className="text-[#666666] text-xs text-center mt-6">
            Pagamento seguro processado pelo Stripe. Cancele quando quiser.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}

export default function AssinaturaPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="max-w-xl mx-auto py-12 px-4 flex justify-center">
          <div className="animate-pulse rounded-xl bg-white/10 h-64 w-full" />
        </div>
      </MainLayout>
    }>
      <AssinaturaContent />
    </Suspense>
  )
}
