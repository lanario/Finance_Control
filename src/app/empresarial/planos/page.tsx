'use client'

import { useState } from 'react'
import { useAuth } from '@/app/empresarial/providers'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { FiCreditCard, FiCheck } from 'react-icons/fi'

export default function PlanosEmpresarialPage() {
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
        body: JSON.stringify({ context: 'empresarial' }),
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
    <MainLayoutEmpresarial>
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-2xl border p-8 shadow-xl emp-bg-card emp-border emp-text-primary">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mb-4">
              <FiCreditCard className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Planos
            </h1>
            <p className="emp-text-muted">
              Escolha o plano e inicie seu pagamento de forma segura pelo Stripe.
            </p>
          </div>

          <div className="rounded-xl border emp-border emp-input-bg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Financeiro Empresarial</h2>
              <span className="text-2xl font-bold">
                R$ 30,00 <span className="text-sm font-normal emp-text-muted">/mês</span>
              </span>
            </div>
            <ul className="space-y-2 mb-6 emp-text-secondary">
              <li className="flex items-center gap-2">
                <FiCheck className="text-green-500 shrink-0" />
                Acesso completo ao Financeiro Empresarial
              </li>
              <li className="flex items-center gap-2">
                <FiCheck className="text-green-500 shrink-0" />
                Clientes, vendas, orçamentos, contas a pagar e receber
              </li>
              <li className="flex items-center gap-2">
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
              className="w-full py-3 px-6 rounded-xl font-semibold text-white shadow-brutalist-green hover:animate-brutalist-glow-green disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              style={{ backgroundColor: '#00a86b' }}
            >
              {loading ? 'Redirecionando ao pagamento...' : 'Iniciar pagamento — R$ 30/mês'}
            </button>
          </div>

          <p className="emp-text-muted text-xs text-center">
            Pagamento seguro processado pelo Stripe.
          </p>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
