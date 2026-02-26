'use client'

import { useState } from 'react'
import { useAuth } from '@/app/pessoal/providers'
import MainLayout from '@/components/Layout/MainLayout'
import { FiCreditCard, FiCheck } from 'react-icons/fi'

export default function PlanosPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleIniciarPagamento() {
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
        body: JSON.stringify({ context: 'pessoal' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erro ao iniciar pagamento. Tente novamente.')
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
              Planos
            </h1>
            <p className="text-[#bbbbbb] animate-nexus-reveal" style={{ animationDelay: '0.05s', animationFillMode: 'backwards' }}>
              Escolha o plano e inicie seu pagamento de forma segura pelo Stripe.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#f0f0f0]">Financeiro Pessoal</h2>
              <span className="text-2xl font-bold text-[#f0f0f0]">
                R$ 30,00 <span className="text-sm font-normal text-[#bbbbbb]">/mês</span>
              </span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-[#dddddd]">
                <FiCheck className="text-green-500 shrink-0" />
                Acesso completo ao Financeiro Pessoal
              </li>
              <li className="flex items-center gap-2 text-[#dddddd]">
                <FiCheck className="text-green-500 shrink-0" />
                Dashboard, gastos, receitas, investimentos e sonhos
              </li>
              <li className="flex items-center gap-2 text-[#dddddd]">
                <FiCheck className="text-green-500 shrink-0" />
                Cancele quando quiser
              </li>
            </ul>

            {error && (
              <p className="text-red-400 text-sm text-center mb-4" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleIniciarPagamento}
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl bg-white text-black font-semibold hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Redirecionando ao pagamento...' : 'Iniciar pagamento — R$ 30/mês'}
            </button>
          </div>

          <p className="text-[#666666] text-xs text-center">
            Pagamento seguro processado pelo Stripe.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
