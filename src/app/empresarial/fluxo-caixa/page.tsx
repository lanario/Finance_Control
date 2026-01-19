'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiCheck,
  FiX,
  FiFilter,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiSearch,
  FiActivity,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface FluxoCaixa {
  id: string
  tipo: 'entrada' | 'saida'
  origem: 'conta_pagar' | 'conta_receber' | 'venda' | 'outro'
  origem_id: string | null
  descricao: string
  valor: number
  data_movimentacao: string
  forma_pagamento: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

interface ResumoFluxoCaixa {
  saldoAtual: number
  totalEntradas: number
  totalSaidas: number
  entradasMes: number
  saidasMes: number
  saldoMes: number
}

interface FluxoCaixaMensal {
  mes: string
  entradas: number
  saidas: number
  saldo: number
  ano: number
  mesNumero: number
}

export default function FluxoCaixaPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [movimentacoes, setMovimentacoes] = useState<FluxoCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMovimentacao, setEditingMovimentacao] = useState<FluxoCaixa | null>(null)
  const [resumo, setResumo] = useState<ResumoFluxoCaixa>({
    saldoAtual: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    entradasMes: 0,
    saidasMes: 0,
    saldoMes: 0,
  })
  const [fluxoMensal, setFluxoMensal] = useState<FluxoCaixaMensal[]>([])

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // Formulário
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    origem: 'outro' as 'conta_pagar' | 'conta_receber' | 'venda' | 'outro',
    origem_id: '',
    descricao: '',
    valor: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    observacoes: '',
  })

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      await loadMovimentacoes()
      await loadFluxoMensal()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMovimentacoes = async () => {
    try {
      const userId = session?.user?.id

      let query = supabase
        .from('fluxo_caixa')
        .select('*')
        .eq('user_id', userId)
        .order('data_movimentacao', { ascending: false })

      // Aplicar filtros
      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }

      if (filtroOrigem) {
        query = query.eq('origem', filtroOrigem)
      }

      if (filtroDataInicio) {
        query = query.gte('data_movimentacao', filtroDataInicio)
      }

      if (filtroDataFim) {
        query = query.lte('data_movimentacao', filtroDataFim)
      }

      const { data, error } = await query

      if (error) throw error

      let movimentacoesFiltradas = data || []

      // Aplicar busca por texto
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        movimentacoesFiltradas = movimentacoesFiltradas.filter(
          (mov) =>
            mov.descricao.toLowerCase().includes(buscaLower) ||
            mov.observacoes?.toLowerCase().includes(buscaLower)
        )
      }

      setMovimentacoes(movimentacoesFiltradas)
      calcularResumo(movimentacoesFiltradas)
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
    }
  }

  const loadFluxoMensal = async () => {
    try {
      const userId = session?.user?.id
      const now = new Date()
      const mesesAtras = 6 // Últimos 6 meses

      // Buscar todas as movimentações dos últimos 6 meses
      const dataInicio = new Date(now.getFullYear(), now.getMonth() - mesesAtras, 1)
      const { data, error } = await supabase
        .from('fluxo_caixa')
        .select('*')
        .eq('user_id', userId)
        .gte('data_movimentacao', dataInicio.toISOString().split('T')[0])
        .order('data_movimentacao', { ascending: true })

      if (error) throw error

      // Agrupar por mês
      const fluxoPorMes = new Map<string, { entradas: number; saidas: number }>()

      data?.forEach((mov) => {
        const dataMov = new Date(mov.data_movimentacao)
        const chave = `${dataMov.getFullYear()}-${String(dataMov.getMonth() + 1).padStart(2, '0')}`
        
        if (!fluxoPorMes.has(chave)) {
          fluxoPorMes.set(chave, { entradas: 0, saidas: 0 })
        }

        const mes = fluxoPorMes.get(chave)!
        if (mov.tipo === 'entrada') {
          mes.entradas += Number(mov.valor)
        } else {
          mes.saidas += Number(mov.valor)
        }
      })

      // Converter para array e ordenar
      const fluxoArray: FluxoCaixaMensal[] = Array.from(fluxoPorMes.entries())
        .map(([chave, valores]) => {
          const [ano, mes] = chave.split('-')
          const mesNumero = parseInt(mes)
          const meses = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
          ]

          return {
            mes: `${meses[mesNumero - 1]}/${ano}`,
            entradas: valores.entradas,
            saidas: valores.saidas,
            saldo: valores.entradas - valores.saidas,
            ano: parseInt(ano),
            mesNumero,
          }
        })
        .sort((a, b) => {
          if (a.ano !== b.ano) return a.ano - b.ano
          return a.mesNumero - b.mesNumero
        })

      setFluxoMensal(fluxoArray)
    } catch (error) {
      console.error('Erro ao carregar fluxo mensal:', error)
    }
  }

  const calcularResumo = (movimentacoes: FluxoCaixa[]) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const mesAtual = startOfMonth.toISOString().split('T')[0]
    const fimMesAtual = endOfMonth.toISOString().split('T')[0]

    const todas = movimentacoes
    const doMes = movimentacoes.filter(
      (mov) => mov.data_movimentacao >= mesAtual && mov.data_movimentacao <= fimMesAtual
    )

    const totalEntradas = todas
      .filter((mov) => mov.tipo === 'entrada')
      .reduce((sum, mov) => sum + Number(mov.valor), 0)

    const totalSaidas = todas
      .filter((mov) => mov.tipo === 'saida')
      .reduce((sum, mov) => sum + Number(mov.valor), 0)

    const entradasMes = doMes
      .filter((mov) => mov.tipo === 'entrada')
      .reduce((sum, mov) => sum + Number(mov.valor), 0)

    const saidasMes = doMes
      .filter((mov) => mov.tipo === 'saida')
      .reduce((sum, mov) => sum + Number(mov.valor), 0)

    setResumo({
      saldoAtual: totalEntradas - totalSaidas,
      totalEntradas,
      totalSaidas,
      entradasMes,
      saidasMes,
      saldoMes: entradasMes - saidasMes,
    })
  }

  useEffect(() => {
    if (session) {
      loadMovimentacoes()
    }
  }, [filtroTipo, filtroOrigem, filtroDataInicio, filtroDataFim, buscaTexto, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      const valor = parseFloat(formData.valor)

      if (editingMovimentacao) {
        // Editar movimentação existente
        const { error } = await supabase
          .from('fluxo_caixa')
          .update({
            tipo: formData.tipo,
            origem: formData.origem,
            origem_id: formData.origem_id || null,
            descricao: formData.descricao,
            valor: valor,
            data_movimentacao: formData.data_movimentacao,
            forma_pagamento: formData.forma_pagamento,
            observacoes: formData.observacoes || null,
          })
          .eq('id', editingMovimentacao.id)

        if (error) throw error
      } else {
        // Criar nova movimentação
        const { error } = await supabase
          .from('fluxo_caixa')
          .insert({
            user_id: userId,
            tipo: formData.tipo,
            origem: formData.origem,
            origem_id: formData.origem_id || null,
            descricao: formData.descricao,
            valor: valor,
            data_movimentacao: formData.data_movimentacao,
            forma_pagamento: formData.forma_pagamento,
            observacoes: formData.observacoes || null,
          })

        if (error) throw error
      }

      setShowModal(false)
      setEditingMovimentacao(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
      alert('Erro ao salvar movimentação')
    }
  }

  const handleEdit = (movimentacao: FluxoCaixa) => {
    setEditingMovimentacao(movimentacao)
    setFormData({
      tipo: movimentacao.tipo,
      origem: movimentacao.origem,
      origem_id: movimentacao.origem_id || '',
      descricao: movimentacao.descricao,
      valor: movimentacao.valor.toString(),
      data_movimentacao: movimentacao.data_movimentacao,
      forma_pagamento: movimentacao.forma_pagamento || 'pix',
      observacoes: movimentacao.observacoes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return

    try {
      const { error } = await supabase.from('fluxo_caixa').delete().eq('id', id)
      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error)
      alert('Erro ao excluir movimentação')
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      origem: 'outro',
      origem_id: '',
      descricao: '',
      valor: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      forma_pagamento: 'pix',
      observacoes: '',
    })
    setEditingMovimentacao(null)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'entrada') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Entrada</span>
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Saída</span>
    }
  }

  const getOrigemLabel = (origem: string) => {
    const labels: Record<string, string> = {
      conta_pagar: 'Conta a Pagar',
      conta_receber: 'Conta a Receber',
      venda: 'Venda',
      outro: 'Outro',
    }
    return labels[origem] || origem
  }

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Fluxo de Caixa</h1>
            <p className="text-gray-400 mt-1">Acompanhe entradas e saídas do seu caixa</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nova Movimentação</span>
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Saldo Atual</p>
                <p className={`text-2xl font-bold mt-1 ${resumo.saldoAtual >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatarMoeda(resumo.saldoAtual)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Entradas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{formatarMoeda(resumo.totalEntradas)}</p>
                <p className="text-sm text-gray-400 mt-1">Mês: {formatarMoeda(resumo.entradasMes)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Saídas</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{formatarMoeda(resumo.totalSaidas)}</p>
                <p className="text-sm text-gray-400 mt-1">Mês: {formatarMoeda(resumo.saidasMes)}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <FiTrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Saldo do Mês</p>
                <p className={`text-2xl font-bold mt-1 ${resumo.saldoMes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatarMoeda(resumo.saldoMes)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Fluxo Mensal */}
        {fluxoMensal.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Fluxo de Caixa - Últimos 6 Meses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fluxoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => formatarMoeda(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Entradas"
                  dot={{ fill: '#10B981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Saídas"
                  dot={{ fill: '#EF4444', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#6366F1"
                  strokeWidth={2}
                  name="Saldo"
                  dot={{ fill: '#6366F1', r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Barras */}
        {fluxoMensal.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Entradas vs Saídas - Últimos 6 Meses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fluxoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => formatarMoeda(value)}
                />
                <Legend />
                <Bar dataKey="entradas" fill="#10B981" name="Entradas" />
                <Bar dataKey="saidas" fill="#EF4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por descrição ou observações..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todos">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>

            {/* Origem */}
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas as origens</option>
              <option value="conta_pagar">Conta a Pagar</option>
              <option value="conta_receber">Conta a Receber</option>
              <option value="venda">Venda</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* Filtros de Data */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Data Início</label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Origem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Forma Pagamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      Nenhuma movimentação encontrada
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatarData(mov.data_movimentacao)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTipoBadge(mov.tipo)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {mov.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {getOrigemLabel(mov.origem)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        mov.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {mov.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(mov.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {mov.forma_pagamento || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <ActionButtons
                          onEdit={() => handleEdit(mov)}
                          onDelete={() => handleDelete(mov.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingMovimentacao ? 'Editar Movimentação' : 'Nova Movimentação'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>

                  {/* Origem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Origem</label>
                    <select
                      value={formData.origem}
                      onChange={(e) => setFormData({ ...formData, origem: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="conta_pagar">Conta a Pagar</option>
                      <option value="conta_receber">Conta a Receber</option>
                      <option value="venda">Venda</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descrição da movimentação"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Valor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Data Movimentação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data da Movimentação</label>
                    <input
                      type="date"
                      value={formData.data_movimentacao}
                      onChange={(e) => setFormData({ ...formData, data_movimentacao: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                  <select
                    value={formData.forma_pagamento}
                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                    <option value="cheque">Cheque</option>
                    <option value="cartao_debito">Cartão Débito</option>
                    <option value="cartao_credito">Cartão Crédito</option>
                  </select>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Observações adicionais..."
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    {editingMovimentacao ? 'Salvar Alterações' : 'Criar Movimentação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayoutEmpresarial>
  )
}

