'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiPlus, FiFileText } from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

type StatusOrcamento = 'em_processo' | 'concluido' | 'cancelado'

const OPCOES_STATUS: { value: StatusOrcamento; label: string }[] = [
  { value: 'em_processo', label: 'Em processo' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
]

interface Orcamento {
  id: string
  numero: string
  data_emissao: string
  data_validade: string | null
  status: string
  valor_total: number
  desconto: number
  valor_final: number
  cliente_nome: string | null
  cliente_id: string | null
  created_at: string
}

export default function OrcamentosPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [statusDropdownAberto, setStatusDropdownAberto] = useState<string | null>(null)
  const [statusDropdownRect, setStatusDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null)

  useEffect(() => {
    if (session) {
      loadOrcamentos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when session changes
  }, [session])

  const loadOrcamentos = async () => {
    try {
      const userId = session?.user?.id
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrcamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return

    try {
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadOrcamentos()
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error)
      alert('Erro ao excluir orçamento')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'em_processo':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'cancelado':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 emp-text-muted border-gray-500/30'
    }
  }

  const abrirStatusDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    setStatusDropdownRect({ left: rect.left, top: rect.bottom + 4, width: Math.max(rect.width, 160) })
    setStatusDropdownAberto((prev) => (prev === id ? null : id))
  }

  const fecharStatusDropdown = () => {
    setStatusDropdownAberto(null)
    setStatusDropdownRect(null)
  }

  const handleAlterarStatus = async (id: string, status: StatusOrcamento) => {
    try {
      const userId = session?.user?.id
      const { error } = await supabase
        .from('orcamentos')
        .update({ status })
        .eq('id', id)

      if (error) throw error

      // Ao marcar como concluído, criar venda pendente na aba de vendas (uma vez por orçamento)
      if (status === 'concluido' && userId) {
        const { data: vendaExistente } = await supabase
          .from('vendas')
          .select('id')
          .eq('orcamento_id', id)
          .eq('user_id', userId)
          .maybeSingle()

        if (!vendaExistente) {
          const orc = orcamentos.find((o) => o.id === id)
          if (orc) {
            await supabase.from('vendas').insert({
              user_id: userId,
              orcamento_id: id,
              cliente_id: orc.cliente_id || null,
              categoria_id: null,
              descricao: `Orçamento #${orc.numero}`,
              valor_total: orc.valor_total,
              valor_desconto: orc.desconto,
              valor_final: orc.valor_final,
              data_venda: orc.data_emissao,
              forma_pagamento: null,
              status: 'pendente',
              parcelada: false,
              total_parcelas: 1,
              observacoes: null,
              tipo_venda: 'servico',
            })
          }
        }
      }

      fecharStatusDropdown()
      loadOrcamentos()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status do orçamento')
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      concluido: 'Concluído',
      em_processo: 'Em processo',
      cancelado: 'Cancelado',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse emp-text-primary text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold emp-text-primary mb-2">Orçamentos</h1>
            <p className="emp-text-secondary">
            Gerencie seus orçamentos e crie documentos profissionais
            </p>
          </div>
          <button
            onClick={() => router.push('/empresarial/orcamentos/novo')}
            className="flex items-center space-x-2 px-6 py-3 emp-text-primary hover:opacity-90 rounded-lg transition-colors shadow-lg"
            style={{ backgroundColor: 'var(--emp-accent)' }}
          >
            <FiPlus className="w-5 h-5" />
            <span>Novo Orçamento</span>
          </button>
        </div>

        {orcamentos.length === 0 ? (
          <div className="emp-bg-card rounded-lg border emp-border p-12 text-center">
            <FiFileText className="w-16 h-16 emp-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold emp-text-primary mb-2">
              Nenhum orçamento encontrado
            </h3>
            <p className="emp-text-muted mb-6">
              Comece criando seu primeiro orçamento
            </p>
            <button
              onClick={() => router.push('/empresarial/orcamentos/novo')}
              className="inline-flex items-center space-x-2 px-6 py-3 emp-text-primary hover:opacity-90 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--emp-accent)' }}
            >
              <FiPlus className="w-5 h-5" />
              <span>Criar Orçamento</span>
            </button>
          </div>
        ) : (
          <div className="emp-bg-card rounded-lg border emp-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="emp-input-bg border-b emp-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold emp-text-secondary">
                      Número
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold emp-text-secondary">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold emp-text-secondary">
                      Data Emissão
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold emp-text-secondary">
                      Valor Total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold emp-text-secondary">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold emp-text-secondary">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--emp-border)]">
                  {orcamentos.map((orcamento) => (
                    <tr
                      key={orcamento.id}
                      className="hover:opacity-90 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium emp-text-primary">
                          {orcamento.numero}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="emp-text-secondary">
                          {orcamento.cliente_nome || 'Não informado'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="emp-text-secondary">
                          {new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold emp-text-primary">
                          R$ {orcamento.valor_final.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={(e) => abrirStatusDropdown(orcamento.id, e)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)] focus:ring-offset-2 focus:ring-offset-[var(--emp-bg-card)] transition-opacity hover:opacity-90 ${getStatusColor(
                            orcamento.status
                          )}`}
                          title="Clique para alterar o status"
                        >
                          {getStatusLabel(orcamento.status)}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <ActionButtons
                            onView={() => router.push(`/empresarial/orcamentos/${orcamento.id}`)}
                            onEdit={() => router.push(`/empresarial/orcamentos/${orcamento.id}/editar`)}
                            onDownload={() => router.push(`/empresarial/orcamentos/${orcamento.id}/pdf`)}
                            onDelete={() => handleDelete(orcamento.id)}
                            showView={true}
                            showDownload={true}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dropdown de status (portal) */}
        {statusDropdownAberto && statusDropdownRect && typeof document !== 'undefined' &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                aria-hidden="true"
                onClick={fecharStatusDropdown}
              />
              <div
                className="fixed z-[9999] py-2 min-w-[160px] rounded-xl shadow-2xl border-2 border-purple-500 emp-bg-card"
                style={{
                  left: statusDropdownRect.left,
                  top: statusDropdownRect.top,
                  width: statusDropdownRect.width,
                }}
              >
                <p className="px-3 py-1.5 text-xs font-semibold emp-text-muted uppercase tracking-wider border-b emp-border mb-1">
                  Alterar status
                </p>
                {OPCOES_STATUS.map((op) => {
                  const isSelected = orcamentos.find((o) => o.id === statusDropdownAberto)?.status === op.value
                  const statusStyles = {
                    em_processo: isSelected
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium'
                      : 'text-yellow-300 hover:bg-yellow-500/10 border border-transparent',
                    concluido: isSelected
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 font-medium'
                      : 'text-green-300 hover:bg-green-500/10 border border-transparent',
                    cancelado: isSelected
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-medium'
                      : 'text-red-300 hover:bg-red-500/10 border border-transparent',
                  }
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => statusDropdownAberto && handleAlterarStatus(statusDropdownAberto, op.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${statusStyles[op.value]}`}
                    >
                      {op.label}
                    </button>
                  )
                })}
              </div>
            </>,
            document.body
          )}
      </div>
    </MainLayoutEmpresarial>
  )
}
