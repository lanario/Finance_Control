'use client'

import { useState } from 'react'
import { useAuth } from '@/app/empresarial/providers'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { FiCreditCard, FiCheck } from 'react-icons/fi'

export default function AssinaturaEmpresarialPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        body: JSON.stringify({ context: 'empresarial' }),
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
    <MainLayoutEmpresarial>
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-2xl border p-8 shadow-xl emp-bg-card emp-border emp-text-primary">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mb-4">
              <FiCreditCard className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Assinatura do site
            </h1>
            <p className="emp-text-muted">
              Seu período de degustação de 24 horas acabou. Assine para continuar
              usando todos os recursos do Financeiro Empresarial.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center gap-2 emp-text-secondary">
              <FiCheck className="text-green-500 shrink-0" />
              <span>Acesso completo ao Financeiro Empresarial</span>
            </div>
            <div className="flex items-center gap-2 emp-text-secondary">
              <FiCheck className="text-green-500 shrink-0" />
              <span>Clientes, vendas, orçamentos, contas a pagar e receber</span>
            </div>
            <div className="text-3xl font-bold mt-4">
              R$ 30,00 <span className="text-lg font-normal emp-text-muted">/mês</span>
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
            className="w-full py-3 px-6 rounded-xl bg-neon text-black font-semibold hover:bg-neon-dim disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Redirecionando ao pagamento...' : 'Assinar por R$ 30/mês'}
          </button>

          <p className="emp-text-muted text-xs text-center mt-6">
            Pagamento seguro processado pelo Stripe. Cancele quando quiser.
          </p>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
