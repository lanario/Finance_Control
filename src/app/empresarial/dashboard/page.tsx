'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiBriefcase,
  FiUsers,
  FiShoppingBag,
} from 'react-icons/fi'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DashboardStats {
  contasPagarMes: number
  contasReceberMes: number
  vendasMes: number
  totalFornecedores: number
  totalClientes: number
  saldoTotal: number
}

interface FluxoCaixaMensal {
  mes: string
  entradas: number
  saidas: number
  saldo: number
  ano: number
  mesNumero: number
}

interface DespesasPorCategoria {
  categoria: string
  valor: number
  porcentagem: number
}

interface VendasPorCategoria {
  categoria: string
  valor: number
  porcentagem: number
}

interface FaturamentoMensal {
  mes: string
  faturamento: number
  ano: number
  mesNumero: number
}

interface LucroMensal {
  mes: string
  lucro: number
  receitas: number
  despesas: number
  ano: number
  mesNumero: number
}

interface DespesasMensais {
  mes: string
  despesas: number
  ano: number
  mesNumero: number
}

export default function DashboardEmpresarialPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    contasPagarMes: 0,
    contasReceberMes: 0,
    vendasMes: 0,
    totalFornecedores: 0,
    totalClientes: 0,
    saldoTotal: 0,
  })
  const [fluxoCaixaMensal, setFluxoCaixaMensal] = useState<FluxoCaixaMensal[]>([])
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<DespesasPorCategoria[]>([])
  const [vendasPorCategoria, setVendasPorCategoria] = useState<VendasPorCategoria[]>([])
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([])
  const [lucroMensal, setLucroMensal] = useState<LucroMensal[]>([])
  const [despesasMensais, setDespesasMensais] = useState<DespesasMensais[]>([])
  const [loading, setLoading] = useState(true)

  // Helper para calcular datas dos últimos 6 meses
  const getMonthsRange = useCallback(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      return {
        monthDate,
        monthStart,
        monthEnd,
        monthName: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        ano: monthDate.getFullYear(),
        mesNumero: monthDate.getMonth() + 1,
      }
    })
  }, [])

  // Função otimizada para carregar dados em paralelo
  const loadDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const userId = session.user.id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
      const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

      // Paralelizar todas as queries principais
      const [
        fornecedoresResult,
        clientesResult,
        contasPagarMesResult,
        parcelasPagarMesResult,
        contasReceberMesResult,
        parcelasReceberMesResult,
        vendasMesResult,
        parcelasVendasMesResult,
      ] = await Promise.all([
        supabase
          .from('fornecedores')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('ativo', true),
        supabase
          .from('clientes')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('ativo', true),
        supabase
          .from('contas_a_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr)
          .eq('parcelada', false),
        supabase
          .from('parcelas_contas_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('contas_a_receber')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr)
          .eq('parcelada', false),
        supabase
          .from('parcelas_contas_receber')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('vendas')
          .select('valor_final')
          .eq('user_id', userId)
          .gte('data_venda', startOfMonthStr)
          .lte('data_venda', endOfMonthStr)
          .eq('parcelada', false)
          .eq('status', 'aprovado'),
        supabase
          .from('parcelas_vendas')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr)
          .eq('status', 'aprovado'),
      ])

      // Calcular totais do mês atual
      const totalContasPagar = 
        (contasPagarMesResult.data?.reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0) +
        (parcelasPagarMesResult.data?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0)

      const totalContasReceber = 
        (contasReceberMesResult.data?.reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0) +
        (parcelasReceberMesResult.data?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0)

      const totalVendas = 
        (vendasMesResult.data?.reduce((sum, v) => sum + Number(v.valor_final || 0), 0) || 0) +
        (parcelasVendasMesResult.data?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0)

      const saldoTotal = totalContasReceber + totalVendas - totalContasPagar

      setStats({
        contasPagarMes: totalContasPagar,
        contasReceberMes: totalContasReceber,
        vendasMes: totalVendas,
        totalFornecedores: fornecedoresResult.count || 0,
        totalClientes: clientesResult.count || 0,
        saldoTotal,
      })

      // Carregar dados históricos em paralelo (últimos 6 meses)
      const monthsRange = getMonthsRange()
      
      // Preparar todas as queries para os 6 meses em paralelo
      const historicalQueries = monthsRange.flatMap(({ monthStart, monthEnd }) => {
        const startStr = monthStart.toISOString().split('T')[0]
        const endStr = monthEnd.toISOString().split('T')[0]
        
        return [
          supabase
            .from('contas_a_receber')
            .select('valor')
            .eq('user_id', userId)
            .gte('data_vencimento', startStr)
            .lte('data_vencimento', endStr)
            .eq('parcelada', false)
            .eq('recebida', true),
          supabase
            .from('vendas')
            .select('valor_final')
            .eq('user_id', userId)
            .gte('data_venda', startStr)
            .lte('data_venda', endStr)
            .eq('parcelada', false)
            .eq('status', 'aprovado'),
          supabase
            .from('parcelas_vendas')
            .select('valor')
            .eq('user_id', userId)
            .gte('data_vencimento', startStr)
            .lte('data_vencimento', endStr)
            .eq('status', 'aprovado'),
          supabase
            .from('contas_a_pagar')
            .select('valor')
            .eq('user_id', userId)
            .gte('data_vencimento', startStr)
            .lte('data_vencimento', endStr)
            .eq('parcelada', false)
            .eq('paga', true),
          supabase
            .from('parcelas_contas_pagar')
            .select('valor')
            .eq('user_id', userId)
            .gte('data_vencimento', startStr)
            .lte('data_vencimento', endStr)
            .eq('paga', true),
        ]
      })

      const historicalResults = await Promise.all(historicalQueries)
      
      // Processar resultados históricos
      const fluxoCaixaData: FluxoCaixaMensal[] = []
      const faturamentoData: FaturamentoMensal[] = []
      const lucroData: LucroMensal[] = []
      const despesasMensaisData: DespesasMensais[] = []

      monthsRange.forEach((month, index) => {
        const baseIndex = index * 5
        const receitas = (historicalResults[baseIndex]?.data || []) as Array<{ valor: number }>
        const vendas = (historicalResults[baseIndex + 1]?.data || []) as Array<{ valor_final: number }>
        const parcelasVendas = (historicalResults[baseIndex + 2]?.data || []) as Array<{ valor: number }>
        const pagas = (historicalResults[baseIndex + 3]?.data || []) as Array<{ valor: number }>
        const parcelasPagas = (historicalResults[baseIndex + 4]?.data || []) as Array<{ valor: number }>

        const entradas = 
          (receitas.reduce((sum, r) => sum + Number(r.valor || 0), 0)) +
          (vendas.reduce((sum, v) => sum + Number(v.valor_final || 0), 0)) +
          (parcelasVendas.reduce((sum, p) => sum + Number(p.valor || 0), 0))
        
        const saidas = 
          (pagas.reduce((sum, p) => sum + Number(p.valor || 0), 0)) +
          (parcelasPagas.reduce((sum, p) => sum + Number(p.valor || 0), 0))

        const faturamento = 
          (vendas.reduce((sum, v) => sum + Number(v.valor_final || 0), 0)) +
          (parcelasVendas.reduce((sum, p) => sum + Number(p.valor || 0), 0))

        fluxoCaixaData.push({
          mes: month.monthName,
          entradas,
          saidas,
          saldo: entradas - saidas,
          ano: month.ano,
          mesNumero: month.mesNumero,
        })

        faturamentoData.push({
          mes: month.monthName,
          faturamento,
          ano: month.ano,
          mesNumero: month.mesNumero,
        })

        lucroData.push({
          mes: month.monthName,
          lucro: entradas - saidas,
          receitas: entradas,
          despesas: saidas,
          ano: month.ano,
          mesNumero: month.mesNumero,
        })

        despesasMensaisData.push({
          mes: month.monthName,
          despesas: saidas,
          ano: month.ano,
          mesNumero: month.mesNumero,
        })
      })

      setFluxoCaixaMensal(fluxoCaixaData)
      setFaturamentoMensal(faturamentoData)
      setLucroMensal(lucroData)
      setDespesasMensais(despesasMensaisData)

      // Carregar despesas e vendas por categoria (paralelizado)
      const [categoriasDespesasResult, categoriasReceitasResult] = await Promise.all([
        supabase
          .from('categorias')
          .select('id, nome')
          .eq('user_id', userId)
          .eq('tipo', 'despesa')
          .eq('ativo', true),
        supabase
          .from('categorias')
          .select('id, nome')
          .eq('user_id', userId)
          .eq('tipo', 'receita')
          .eq('ativo', true),
      ])

      // Buscar despesas por categoria em paralelo
      if (categoriasDespesasResult.data && categoriasDespesasResult.data.length > 0) {
        const categoriaQueries = categoriasDespesasResult.data.flatMap(categoria => [
          supabase
            .from('contas_a_pagar')
            .select('valor')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_vencimento', startOfMonthStr)
            .lte('data_vencimento', endOfMonthStr)
            .eq('parcelada', false),
          supabase
            .from('parcelas_contas_pagar')
            .select('valor')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_vencimento', startOfMonthStr)
            .lte('data_vencimento', endOfMonthStr)
        ])

        const categoriaResults = await Promise.all(categoriaQueries)

        const despesasPorCategoriaMap: { [key: string]: number } = {}
        categoriasDespesasResult.data.forEach((categoria, index) => {
          const baseIndex = index * 2
          const contasNaoParceladas = categoriaResults[baseIndex]?.data || []
          const parcelas = categoriaResults[baseIndex + 1]?.data || []
          
          const valor = 
            contasNaoParceladas.reduce((sum, c) => sum + Number(c.valor || 0), 0) +
            parcelas.reduce((sum, p) => sum + Number(p.valor || 0), 0)
          
          if (valor > 0) {
            despesasPorCategoriaMap[categoria.nome] = valor
          }
        })

        const despesasPorCategoriaData: DespesasPorCategoria[] = Object.entries(despesasPorCategoriaMap)
          .map(([categoria, valor]) => ({
            categoria,
            valor: Number(valor.toFixed(2)),
            porcentagem: totalContasPagar > 0
              ? Number(((valor / totalContasPagar) * 100).toFixed(1))
              : 0,
          }))
          .sort((a, b) => b.valor - a.valor)

        setDespesasPorCategoria(despesasPorCategoriaData)
      } else {
        setDespesasPorCategoria([])
      }

      // Buscar vendas por categoria em paralelo
      if (categoriasReceitasResult.data && categoriasReceitasResult.data.length > 0) {
        const categoriaQueries = categoriasReceitasResult.data.flatMap(categoria => [
          supabase
            .from('vendas')
            .select('valor_final')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_venda', startOfMonthStr)
            .lte('data_venda', endOfMonthStr)
            .eq('parcelada', false)
            .eq('status', 'aprovado'),
          supabase
            .from('parcelas_vendas')
            .select('valor')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_vencimento', startOfMonthStr)
            .lte('data_vencimento', endOfMonthStr)
            .eq('status', 'aprovado')
        ])

        const categoriaResults = await Promise.all(categoriaQueries)

        const vendasPorCategoriaMap: { [key: string]: number } = {}
        categoriasReceitasResult.data.forEach((categoria, index) => {
          const baseIndex = index * 2
          const vendasNaoParceladas = categoriaResults[baseIndex]?.data || []
          const parcelas = categoriaResults[baseIndex + 1]?.data || []
          
          const valor = 
            vendasNaoParceladas.reduce((sum, v) => sum + Number(v.valor_final || 0), 0) +
            parcelas.reduce((sum, p) => sum + Number(p.valor || 0), 0)
          
          if (valor > 0) {
            vendasPorCategoriaMap[categoria.nome] = valor
          }
        })

        const vendasPorCategoriaData: VendasPorCategoria[] = Object.entries(vendasPorCategoriaMap)
          .map(([categoria, valor]) => ({
            categoria,
            valor: Number(valor.toFixed(2)),
            porcentagem: totalVendas > 0
              ? Number(((valor / totalVendas) * 100).toFixed(1))
              : 0,
          }))
          .sort((a, b) => b.valor - a.valor)

        setVendasPorCategoria(vendasPorCategoriaData)
      } else {
        setVendasPorCategoria([])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, getMonthsRange])

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData()
    }
  }, [session?.user?.id, loadDashboardData])

  const COLORS_PURPLE = useMemo(() => ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'], [])
  const COLORS_GREEN = useMemo(() => ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'], [])

  const statCards = useMemo(() => [
    {
      title: 'Despesas',
      value: `R$ ${stats.contasPagarMes.toFixed(2)}`,
      icon: FiTrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      clickable: false,
    },
    {
      title: 'Receitas',
      value: `R$ ${stats.contasReceberMes.toFixed(2)}`,
      icon: FiTrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      clickable: false,
    },
    {
      title: 'Vendas do Mês',
      value: `R$ ${stats.vendasMes.toFixed(2)}`,
      icon: FiShoppingBag,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      clickable: false,
    },
    {
      title: 'Saldo Total',
      value: `R$ ${stats.saldoTotal.toFixed(2)}`,
      icon: FiDollarSign,
      color: stats.saldoTotal >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: stats.saldoTotal >= 0 ? 'bg-green-500/20' : 'bg-red-500/20',
      clickable: false,
    },
    {
      title: 'Fornecedores',
      value: stats.totalFornecedores.toString(),
      icon: FiBriefcase,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      clickable: false,
    },
    {
      title: 'Clientes',
      value: stats.totalClientes.toString(),
      icon: FiUsers,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      clickable: false,
    },
  ], [stats])

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
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Visão geral das suas finanças empresariais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div
                key={index}
                className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.bgColor} p-3 rounded-full`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Fluxo de Caixa */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all col-span-1 lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">
              Fluxo de Caixa (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <LineChart data={fluxoCaixaMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="entradas" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Entradas"
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="saidas" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Saídas"
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Saldo"
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Despesas por Categoria */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Despesas do Mês por Categoria
            </h2>
            {despesasPorCategoria.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300} minHeight={300}>
                  <PieChart>
                    <Pie
                      data={despesasPorCategoria}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ categoria, porcentagem }) => 
                        porcentagem > 5 ? `${categoria}: ${porcentagem}%` : ''
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="valor"
                      isAnimationActive={true}
                    >
                      {despesasPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PURPLE[index % COLORS_PURPLE.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {despesasPorCategoria.map((item, index) => (
                    <div key={item.categoria} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS_PURPLE[index % COLORS_PURPLE.length] }}
                        />
                        <span className="text-gray-300">{item.categoria}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-semibold">R$ {item.valor.toFixed(2)}</span>
                        <span className="text-gray-400 ml-2">({item.porcentagem}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>Nenhuma despesa registrada neste mês</p>
              </div>
            )}
          </div>

          {/* Gráfico de Vendas por Categoria */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Vendas do Mês por Categoria
            </h2>
            {vendasPorCategoria.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300} minHeight={300}>
                  <PieChart>
                    <Pie
                      data={vendasPorCategoria}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ categoria, porcentagem }) => 
                        porcentagem > 5 ? `${categoria}: ${porcentagem}%` : ''
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="valor"
                      isAnimationActive={true}
                    >
                      {vendasPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_GREEN[index % COLORS_GREEN.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {vendasPorCategoria.map((item, index) => (
                    <div key={item.categoria} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS_GREEN[index % COLORS_GREEN.length] }}
                        />
                        <span className="text-gray-300">{item.categoria}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-semibold">R$ {item.valor.toFixed(2)}</span>
                        <span className="text-gray-400 ml-2">({item.porcentagem}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <p>Nenhuma venda registrada neste mês</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráficos de Faturamento e Lucro Mensal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Faturamento Mensal (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={faturamentoMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                />
                <Legend />
                <Bar 
                  dataKey="faturamento" 
                  fill="#8b5cf6" 
                  name="Faturamento"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Lucro Total Mensal (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={lucroMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Lucro']}
                />
                <Legend />
                <Bar 
                  dataKey="lucro" 
                  fill="#10b981" 
                  name="Lucro"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Despesas/Gastos da Empresa (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={despesasMensais} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Despesas']}
                />
                <Legend />
                <Bar 
                  dataKey="despesas" 
                  fill="#ef4444" 
                  name="Despesas"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
