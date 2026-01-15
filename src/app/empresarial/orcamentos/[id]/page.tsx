'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiArrowLeft, FiEdit, FiDownload } from 'react-icons/fi'

interface Orcamento {
  id: string
  numero: string
  data_emissao: string
  data_validade: string | null
  status: string
  valor_total: number
  desconto: number
  valor_final: number
  observacoes: string | null
  condicoes_pagamento: string | null
  prazo_entrega: string | null
  cliente_nome: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  cliente_endereco: string | null
  cor_primaria: string
  cor_secundaria: string
  logo_url: string | null
  cabecalho_personalizado: string | null
  rodape_personalizado: string | null
}

interface ItemOrcamento {
  id: string
  item_numero: number
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto: number
  valor_total: number
  observacoes: string | null
}

export default function VisualizarOrcamentoPage() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orcamentoId = params.id as string

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session && orcamentoId) {
      loadOrcamento()
    }
  }, [session, orcamentoId])

  const loadOrcamento = async () => {
    try {
      const userId = session?.user?.id

      // Carregar orçamento
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', orcamentoId)
        .eq('user_id', userId)
        .single()

      if (orcamentoError) throw orcamentoError
      setOrcamento(orcamentoData)

      // Carregar itens
      const { data: itensData, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('user_id', userId)
        .order('item_numero', { ascending: true })

      if (itensError) throw itensError
      setItens(itensData || [])
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error)
      alert('Erro ao carregar orçamento')
      router.push('/empresarial/orcamentos')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'enviado':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'rejeitado':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'convertido':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      rascunho: 'Rascunho',
      enviado: 'Enviado',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      convertido: 'Convertido',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  if (!orcamento) {
    return (
      <MainLayoutEmpresarial>
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">Orçamento não encontrado</p>
          <button
            onClick={() => router.push('/empresarial/orcamentos')}
            className="mt-4 px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg"
          >
            Voltar
          </button>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/empresarial/orcamentos')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Orçamento {orcamento.numero}</h1>
              <p className="text-gray-400">Visualização do orçamento</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/empresarial/orcamentos/${orcamentoId}/editar`)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiEdit className="w-5 h-5" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => router.push(`/empresarial/orcamentos/${orcamentoId}/pdf`)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FiDownload className="w-5 h-5" />
              <span>Baixar PDF</span>
            </button>
          </div>
        </div>

        {/* Informações do Orçamento */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Informações do Orçamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Número</label>
              <p className="text-white font-semibold">{orcamento.numero}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(orcamento.status)}`}>
                {getStatusLabel(orcamento.status)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Data de Emissão</label>
              <p className="text-white">{new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}</p>
            </div>
            {orcamento.data_validade && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Data de Validade</label>
                <p className="text-white">{new Date(orcamento.data_validade).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
              <p className="text-white">{orcamento.cliente_nome || 'Não informado'}</p>
            </div>
            {orcamento.cliente_email && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email do Cliente</label>
                <p className="text-white">{orcamento.cliente_email}</p>
              </div>
            )}
            {orcamento.cliente_telefone && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Telefone do Cliente</label>
                <p className="text-white">{orcamento.cliente_telefone}</p>
              </div>
            )}
            {orcamento.cliente_endereco && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Endereço do Cliente</label>
                <p className="text-white">{orcamento.cliente_endereco}</p>
              </div>
            )}
          </div>
        </div>

        {/* Itens do Orçamento */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Itens do Orçamento</h2>
          {itens.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum item encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Descrição</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Quantidade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Unidade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Valor Unitário</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Desconto</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {itens.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-300">{item.item_numero}</td>
                      <td className="px-4 py-3 text-white">{item.descricao}</td>
                      <td className="px-4 py-3 text-gray-300">{item.quantidade}</td>
                      <td className="px-4 py-3 text-gray-300">{item.unidade}</td>
                      <td className="px-4 py-3 text-gray-300">R$ {item.valor_unitario.toFixed(2)}</td>
                      <td className="px-4 py-3 text-red-400">R$ {item.desconto.toFixed(2)}</td>
                      <td className="px-4 py-3 text-white font-semibold text-right">R$ {item.valor_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totais e Observações */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Totais e Informações Adicionais</h2>
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Subtotal:</span>
                <span className="text-white font-semibold">R$ {orcamento.valor_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Desconto:</span>
                <span className="text-red-400">- R$ {orcamento.desconto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-white font-bold text-lg">Total:</span>
                <span className="text-white font-bold text-lg">R$ {orcamento.valor_final.toFixed(2)}</span>
              </div>
            </div>
            {orcamento.condicoes_pagamento && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Condições de Pagamento</label>
                <p className="text-white">{orcamento.condicoes_pagamento}</p>
              </div>
            )}
            {orcamento.prazo_entrega && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Prazo de Entrega</label>
                <p className="text-white">{orcamento.prazo_entrega}</p>
              </div>
            )}
            {orcamento.observacoes && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Observações</label>
                <p className="text-white whitespace-pre-wrap">{orcamento.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
