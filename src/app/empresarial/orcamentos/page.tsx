'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiPlus, FiFileText } from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

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

  useEffect(() => {
    if (session) {
      loadOrcamentos()
    }
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
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'cancelado':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Orçamentos</h1>
            <p className="text-gray-400">
              Gerencie seus orçamentos e crie documentos profissionais
            </p>
          </div>
          <button
            onClick={() => router.push('/empresarial/orcamentos/novo')}
            className="flex items-center space-x-2 bg-purple-800 hover:bg-purple-900 text-white px-6 py-3 rounded-lg transition-colors shadow-lg"
          >
            <FiPlus className="w-5 h-5" />
            <span>Novo Orçamento</span>
          </button>
        </div>

        {orcamentos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <FiFileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum orçamento encontrado
            </h3>
            <p className="text-gray-400 mb-6">
              Comece criando seu primeiro orçamento
            </p>
            <button
              onClick={() => router.push('/empresarial/orcamentos/novo')}
              className="inline-flex items-center space-x-2 bg-purple-800 hover:bg-purple-900 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Criar Orçamento</span>
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Número
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Data Emissão
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Valor Total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {orcamentos.map((orcamento) => (
                    <tr
                      key={orcamento.id}
                      className="hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {orcamento.numero}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300">
                          {orcamento.cliente_nome || 'Não informado'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300">
                          {new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          R$ {orcamento.valor_final.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            orcamento.status
                          )}`}
                        >
                          {getStatusLabel(orcamento.status)}
                        </span>
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
      </div>
    </MainLayoutEmpresarial>
  )
}
