'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { FiPlus, FiEdit, FiTrash2, FiDollarSign, FiX } from 'react-icons/fi'
import { formatDate, formatarMoeda } from '@/lib/utils'
import { DateInput } from '@/components/ui/DateInput'

interface Receita {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: 'fixa' | 'extra'
  mes_referencia: number
  ano_referencia: number
  user_id: string
}

export default function ReceitasPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null)
  const [activeTab, setActiveTab] = useState<'fixa' | 'extra'>('fixa')
  const [formData, setFormData] = useState({
    descricao: '',
    descricaoSelecionada: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'fixa' as 'fixa' | 'extra',
  })

  // Sugestões de descrições para receitas
  const sugestoesDescricoes = [
    'Salário',
    'Freelance',
    'Venda',
    'Aluguel',
    'Dividendos',
    'Juros',
    'Investimentos',
    'Bônus',
    'Comissão',
    'Ajuda',
    'Presente',
    'Reembolso',
    'Transferência',
    'Pix Recebido',
    'Outros',
    'PERSONALIZADO'
  ]

  useEffect(() => {
    if (session) {
      loadReceitas()
    }
  }, [session])

  const loadReceitas = async () => {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('data', { ascending: false })

      if (error) throw error
      setReceitas(data || [])
    } catch (error) {
      console.error('Erro ao carregar receitas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const dataReceita = new Date(formData.data)
      const mesReferencia = dataReceita.getMonth() + 1
      const anoReferencia = dataReceita.getFullYear()

      // Determinar a descrição final (da seleção ou personalizada)
      const descricaoFinal = formData.descricaoSelecionada === 'PERSONALIZADO' || !formData.descricaoSelecionada
        ? formData.descricao
        : formData.descricaoSelecionada

      const receitaData = {
        descricao: descricaoFinal,
        valor: parseFloat(formData.valor),
        data: formData.data,
        tipo: formData.tipo,
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia,
        user_id: session?.user?.id,
      }

      if (editingReceita) {
        const { error } = await supabase
          .from('receitas')
          .update(receitaData)
          .eq('id', editingReceita.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('receitas').insert([receitaData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingReceita(null)
      setFormData({
        descricao: '',
        descricaoSelecionada: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        tipo: 'fixa',
      })
      loadReceitas()
    } catch (error) {
      console.error('Erro ao salvar receita:', error)
      alert('Erro ao salvar receita')
    }
  }

  const handleEdit = (receita: Receita) => {
    setEditingReceita(receita)
    const descricaoNaLista = sugestoesDescricoes.find(s => s === receita.descricao)
    setFormData({
      descricao: receita.descricao,
      descricaoSelecionada: descricaoNaLista ? receita.descricao : (receita.descricao ? 'PERSONALIZADO' : ''),
      valor: receita.valor.toString(),
      data: receita.data.split('T')[0],
      tipo: receita.tipo,
    })
    setActiveTab(receita.tipo)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return

    try {
      const { error } = await supabase.from('receitas').delete().eq('id', id)
      if (error) throw error
      loadReceitas()
    } catch (error) {
      console.error('Erro ao excluir receita:', error)
      alert('Erro ao excluir receita')
    }
  }

  const receitasFixas = receitas.filter((r) => r.tipo === 'fixa')
  const receitasExtras = receitas.filter((r) => r.tipo === 'extra')
  const receitasAtivas = activeTab === 'fixa' ? receitasFixas : receitasExtras
  const totalFixa = receitasFixas.reduce((sum, r) => sum + r.valor, 0)
  const totalExtra = receitasExtras.reduce((sum, r) => sum + r.valor, 0)
  const totalGeral = totalFixa + totalExtra

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-[#f0f0f0]">Carregando...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#f0f0f0] mb-2 animate-nexus-reveal">Receitas</h1>
            <p className="text-[#bbbbbb] animate-nexus-reveal" style={{ animationDelay: '0.05s', animationFillMode: 'backwards' }}>
              Gerencie suas receitas fixas e extras
            </p>
          </div>
          <button
            onClick={() => {
              setEditingReceita(null)
              setFormData({
                descricao: '',
                descricaoSelecionada: '',
                valor: '',
                data: new Date().toISOString().split('T')[0],
                tipo: activeTab,
              })
              setShowModal(true)
            }}
            className="bg-white text-black px-4 py-2 rounded-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Receita</span>
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0d0d0d] rounded-lg shadow-lg p-6 border border-white/10">
            <p className="text-[#bbbbbb] text-sm mb-1">Total Geral</p>
            <p className="text-3xl font-bold text-green-400">
              R$ {formatarMoeda(totalGeral)}
            </p>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg shadow-lg p-6 border border-white/10">
            <p className="text-[#bbbbbb] text-sm mb-1">Receitas Fixas</p>
            <p className="text-3xl font-bold text-blue-400">
              R$ {formatarMoeda(totalFixa)}
            </p>
          </div>
          <div className="bg-[#0d0d0d] rounded-lg shadow-lg p-6 border border-white/10">
            <p className="text-[#bbbbbb] text-sm mb-1">Receitas Extras</p>
            <p className="text-3xl font-bold text-yellow-400">
              R$ {formatarMoeda(totalExtra)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#0d0d0d] rounded-lg shadow-lg border border-white/10">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('fixa')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'fixa'
                  ? 'bg-white text-black border-b-2 border-white'
                  : 'text-[#bbbbbb] hover:text-white'
              }`}
            >
              Receitas Fixas
            </button>
            <button
              onClick={() => setActiveTab('extra')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'extra'
                  ? 'bg-white text-black border-b-2 border-white'
                  : 'text-[#bbbbbb] hover:text-white'
              }`}
            >
              Receitas Extras
            </button>
          </div>

          <div className="p-6">
            {receitasAtivas.length === 0 ? (
              <div className="bg-white/5/50 rounded-lg p-12 text-center border border-white/10">
                <FiDollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-[#bbbbbb] text-lg mb-2">
                  Nenhuma receita {activeTab === 'fixa' ? 'fixa' : 'extra'} cadastrada
                </p>
                <p className="text-[#666666] text-sm">
                  Clique em "Adicionar Receita" para começar
                </p>
              </div>
            ) : (
              <div className="bg-[#0d0d0d] rounded-lg shadow-md border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white text-black">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Descrição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Mês/Ano Referência
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {receitasAtivas.map((receita) => (
                        <tr
                          key={receita.id}
                          className="hover:bg-white/5/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-[#f0f0f0] font-medium">
                            {receita.descricao}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-green-400 font-semibold">
                            R$ {formatarMoeda(receita.valor)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#bbbbbb]">
                            {formatDate(receita.data)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[#bbbbbb]">
                            {receita.mes_referencia}/{receita.ano_referencia}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(receita)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <FiEdit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(receita.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
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
        </div>

        {/* Modal de Receita */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] rounded-lg p-8 w-full max-w-md border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#f0f0f0]">
                  {editingReceita ? 'Editar Receita' : 'Nova Receita'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingReceita(null)
                  }}
                  className="text-[#bbbbbb] hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
                    Tipo de Receita
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: 'fixa' })}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        formData.tipo === 'fixa'
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 text-[#dddddd] border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Fixa Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: 'extra' })}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        formData.tipo === 'extra'
                          ? 'bg-white text-black border-white'
                          : 'bg-white/5 text-[#dddddd] border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Receita Extra
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
                    Descrição
                  </label>
                  <select
                    value={formData.descricaoSelecionada}
                    onChange={(e) => {
                      const valor = e.target.value
                      setFormData({ 
                        ...formData, 
                        descricaoSelecionada: valor,
                        descricao: valor === 'PERSONALIZADO' ? formData.descricao : (valor || '')
                      })
                    }}
                    required={!formData.descricao}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30 mb-2"
                  >
                    <option value="">Selecione uma opção...</option>
                    {sugestoesDescricoes.map((sugestao) => (
                      <option key={sugestao} value={sugestao}>
                        {sugestao === 'PERSONALIZADO' ? '✏️ Personalizado' : sugestao}
                      </option>
                    ))}
                  </select>
                  {(formData.descricaoSelecionada === 'PERSONALIZADO' || (!formData.descricaoSelecionada && formData.descricao)) && (
                    <input
                      type="text"
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      required={formData.descricaoSelecionada === 'PERSONALIZADO'}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                      placeholder="Digite a descrição personalizada..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <DateInput
                    label="Data"
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: e.target.value })
                    }
                    required
                  />
                  {formData.tipo === 'fixa' && (
                    <p className="text-xs text-[#666666] mt-1">
                      A receita fixa será contabilizada no mês de referência da data
                    </p>
                  )}
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingReceita(null)
                    }}
                    className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-[#dddddd] hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-white text-black rounded-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
