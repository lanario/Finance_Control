'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { formatarMoeda } from '@/lib/utils'
import {
  FiDollarSign,
  FiCreditCard,
  FiTrendingUp,
  FiTrendingDown,
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
  totalGastos: number
  totalCartoes: number
  gastosMes: number
  receitasMes: number
}

interface GastosMensais {
  mes: string
  gastos: number
  ano: number
  mesNumero: number
}

interface Investimento {
  id: string
  nome: string
  tipo: string
  valor_investido: number
  valor_atual: number
  data_aquisicao: string
  user_id: string
}

interface InvestimentosPorTipo {
  tipo: string
  valor_investido: number
  valor_atual: number
  porcentagem: number
}

interface DespesasPorCategoria {
  categoria: string
  valor: number
  porcentagem: number
}

const MESES_NOMES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function DashboardContent() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalGastos: 0,
    totalCartoes: 0,
    gastosMes: 0,
    receitasMes: 0,
  })
  const [gastosMensais, setGastosMensais] = useState<GastosMensais[]>([])
  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [investimentosPorTipo, setInvestimentosPorTipo] = useState<InvestimentosPorTipo[]>([])
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<DespesasPorCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [mesSelecionado, setMesSelecionado] = useState<number>(now.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState<number>(now.getFullYear())

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowCheckoutSuccess(true)
      router.replace('/pessoal/dashboard', { scroll: false })
      const t = setTimeout(() => setShowCheckoutSuccess(false), 5000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session, mesSelecionado, anoSelecionado])

  const loadDashboardData = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const startOfMonth = new Date(anoSelecionado, mesSelecionado - 1, 1)
      const endOfMonth = new Date(anoSelecionado, mesSelecionado, 0)
      const startStr = startOfMonth.toISOString().split('T')[0]
      const endStr = endOfMonth.toISOString().split('T')[0]
      const sixMonthsAgo = new Date(anoSelecionado, mesSelecionado - 6, 1)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

      // Paralelizar todas as queries independentes para reduzir latência (evita soma de round-trips)
      const [
        cartoesResult,
        todasComprasMesResult,
        parcelasMesResult,
        receitasMesResult,
        todasCompras6MesesResult,
        parcelas6MesesResult,
        investimentosResult,
      ] = await Promise.all([
        supabase.from('cartoes').select('id').eq('user_id', userId),
        supabase
          .from('compras')
          .select('id, valor, data, categoria, parcelada, total_parcelas')
          .eq('user_id', userId)
          .gte('data', startStr)
          .lte('data', endStr),
        supabase
          .from('parcelas')
          .select('valor, data_vencimento, categoria')
          .eq('user_id', userId)
          .gte('data_vencimento', startStr)
          .lte('data_vencimento', endStr),
        supabase
          .from('receitas')
          .select('valor')
          .eq('user_id', userId)
          .eq('mes_referencia', mesSelecionado)
          .eq('ano_referencia', anoSelecionado),
        supabase
          .from('compras')
          .select('id, valor, data, parcelada, total_parcelas')
          .eq('user_id', userId)
          .gte('data', sixMonthsAgo.toISOString())
          .order('data', { ascending: true }),
        supabase
          .from('parcelas')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', sixMonthsAgoStr)
          .order('data_vencimento', { ascending: true }),
        supabase
          .from('investimentos')
          .select('id, nome, tipo, valor_investido, valor_atual, data_aquisicao, user_id')
          .eq('user_id', userId)
          .order('data_aquisicao', { ascending: false }),
      ])

      const cartoes = cartoesResult.data ?? []
      const todasComprasMes = todasComprasMesResult.data ?? []
      const parcelasMes = parcelasMesResult.data ?? []
      const receitasMes = receitasMesResult.data ?? []
      const todasCompras6Meses = todasCompras6MesesResult.data ?? []
      const parcelas6Meses = parcelas6MesesResult.data ?? []
      const investimentosData = investimentosResult.data ?? []

      // Filtrar compras NÃO parceladas no cliente (compatível com schemas com/sem coluna parcelada)
      const comprasMes = todasComprasMes.filter((c: { parcelada?: boolean; total_parcelas?: number }) => {
        const isParcelada = c.parcelada === true || (c.total_parcelas ?? 0) > 1
        return !isParcelada
      })
      const compras6Meses = todasCompras6Meses.filter((c: { parcelada?: boolean; total_parcelas?: number }) => {
        const isParcelada = c.parcelada === true || (c.total_parcelas ?? 0) > 1
        return !isParcelada
      })

      // Calcular total de gastos do mês atual (compras não parceladas + parcelas que vencem no mês)
      const totalGastosCompras = comprasMes.reduce((sum, compra) => sum + Number(compra.valor), 0)
      const totalGastosParcelas = parcelasMes.reduce((sum, parcela) => sum + Number(parcela.valor), 0)
      const totalGastos = totalGastosCompras + totalGastosParcelas
      const totalReceitas = receitasMes.reduce((sum, receita) => sum + Number(receita.valor), 0)

      // Processar dados mensais (últimos 6 meses para o gráfico de linha)
      const gastosPorMes: { [key: string]: number } = {}

      // Inicializar últimos 6 meses com zero (relativo ao mês selecionado)
      for (let i = 5; i >= 0; i--) {
        const date = new Date(anoSelecionado, mesSelecionado - 1 - i, 1)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        gastosPorMes[key] = 0
      }

      // Agregar gastos por mês (últimos 6 meses) - Compras não parceladas
      compras6Meses.forEach((compra) => {
        const compraDate = new Date(compra.data)
        const key = `${compraDate.getFullYear()}-${String(compraDate.getMonth() + 1).padStart(2, '0')}`
        if (gastosPorMes[key] !== undefined) {
          gastosPorMes[key] += Number(compra.valor)
        }
      })

      // Agregar parcelas por mês (baseado na data de vencimento) - TODAS as parcelas
      parcelas6Meses.forEach((parcela) => {
        const vencimentoDate = new Date(parcela.data_vencimento)
        const key = `${vencimentoDate.getFullYear()}-${String(vencimentoDate.getMonth() + 1).padStart(2, '0')}`
        if (gastosPorMes[key] !== undefined) {
          gastosPorMes[key] += Number(parcela.valor)
        }
      })

      // Converter para array formatado (já está ordenado pela chave)
      const gastosMensaisData: GastosMensais[] = Object.keys(gastosPorMes)
        .sort() // Ordena as chaves (formato YYYY-MM)
        .map((key) => {
          const [ano, mes] = key.split('-')
          const anoNumero = parseInt(ano, 10)
          const mesNumero = parseInt(mes, 10)
          return {
            mes: `${MESES_NOMES_ABREV[mesNumero - 1]}/${ano.slice(2)}`,
            gastos: gastosPorMes[key],
            ano: anoNumero,
            mesNumero: mesNumero,
          }
        })

      setInvestimentos(investimentosData)

      // Processar investimentos por tipo
      const investimentosPorTipoMap: { [key: string]: { valor_investido: number; valor_atual: number } } = {}
      const totalInvestidoGeral = investimentosData.reduce((sum, inv) => sum + Number(inv.valor_investido), 0)

      investimentosData.forEach((investimento) => {
        const tipo = investimento.tipo || 'Outros'
        if (!investimentosPorTipoMap[tipo]) {
          investimentosPorTipoMap[tipo] = { valor_investido: 0, valor_atual: 0 }
        }
        investimentosPorTipoMap[tipo].valor_investido += investimento.valor_investido
        investimentosPorTipoMap[tipo].valor_atual += investimento.valor_atual
      })

      const investimentosPorTipoData: InvestimentosPorTipo[] = Object.entries(investimentosPorTipoMap)
        .map(([tipo, valores]) => ({
          tipo,
          valor_investido: Number(valores.valor_investido.toFixed(2)),
          valor_atual: Number(valores.valor_atual.toFixed(2)),
          porcentagem: totalInvestidoGeral > 0
            ? Number(((valores.valor_investido / totalInvestidoGeral) * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.valor_investido - a.valor_investido)

      setInvestimentosPorTipo(investimentosPorTipoData)

      // Processar despesas por categoria do mês atual
      const despesasPorCategoriaMap: { [key: string]: number } = {}

      comprasMes.forEach((compra) => {
        const categoria = (compra as { categoria?: string }).categoria || 'Outros'
        despesasPorCategoriaMap[categoria] = (despesasPorCategoriaMap[categoria] ?? 0) + Number(compra.valor)
      })
      parcelasMes.forEach((parcela) => {
        const categoria = (parcela as { categoria?: string }).categoria || 'Outros'
        despesasPorCategoriaMap[categoria] = (despesasPorCategoriaMap[categoria] ?? 0) + Number(parcela.valor)
      })
      
      const despesasPorCategoriaData: DespesasPorCategoria[] = Object.entries(despesasPorCategoriaMap)
        .map(([categoria, valor]) => ({
          categoria,
          valor: Number(valor.toFixed(2)),
          porcentagem: totalGastos > 0
            ? Number(((valor / totalGastos) * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.valor - a.valor)
      
      setDespesasPorCategoria(despesasPorCategoriaData)

      setStats({
        totalGastos,
        totalCartoes: cartoes.length,
        gastosMes: totalGastos,
        receitasMes: totalReceitas,
      })
      setGastosMensais(gastosMensaisData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Despesas do Mês',
      value: `R$ ${formatarMoeda(stats.gastosMes)}`,
      icon: FiTrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      clickable: true,
      href: (mes: number, ano: number) => {
        return `/pessoal/gastos-mensais/${ano}/${mes}`
      },
    },
    {
      title: 'Receitas do Mês',
      value: `R$ ${formatarMoeda(stats.receitasMes)}`,
      icon: FiTrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      clickable: true,
      href: '/pessoal/receitas',
    },
    {
      title: 'Total de Cartões',
      value: stats.totalCartoes.toString(),
      icon: FiCreditCard,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      clickable: false,
    },
    {
      title: 'Saldo Total',
      value: `R$ ${formatarMoeda(stats.receitasMes - stats.gastosMes)}`,
      icon: FiDollarSign,
      color: 'text-white',
      bgColor: 'bg-primary/20',
      clickable: false,
    },
  ]

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white">Carregando...</div>
        </div>
      </MainLayout>
    )
  }

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const mesNome = mesesNomes[mesSelecionado - 1]

  // Gerar lista de anos (últimos 5 anos até o próximo ano)
  const anosDisponiveis = []
  const anoAtual = new Date().getFullYear()
  for (let i = anoAtual - 2; i <= anoAtual + 1; i++) {
    anosDisponiveis.push(i)
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {showCheckoutSuccess && (
          <div className="rounded-xl bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 text-center">
            Pagamento confirmado. Sua assinatura está ativa.
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#f0f0f0] mb-2 animate-nexus-reveal">Dashboard</h1>
            <p className="text-[#bbbbbb] animate-nexus-reveal" style={{ animationDelay: '0.05s', animationFillMode: 'backwards' }}>
              Visão geral das suas finanças pessoais
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-[#bbbbbb] text-sm">Mês:</label>
              <select
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(parseInt(e.target.value))}
                className="px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:border-white/30 transition-colors duration-200"
              >
                {mesesNomes.map((mes, index) => (
                  <option key={index} value={index + 1}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-[#bbbbbb] text-sm">Ano:</label>
              <select
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
                className="px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:border-white/30 transition-colors duration-200"
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon
            const isClickable = (card as any).clickable
            
            const cardContent = (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#bbbbbb] text-sm mb-1">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-full`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            )
            
            if (isClickable) {
              const href = typeof (card as any).href === 'function' 
                ? (card as any).href(mesSelecionado, anoSelecionado) 
                : (card as any).href || ''
              
              return (
                <button
                  key={index}
                  onClick={() => href && router.push(href)}
                  className="nexus-card p-6 w-full text-left cursor-pointer"
                >
                  {cardContent}
                </button>
              )
            }
            
            return (
              <div key={index} className="nexus-card p-6">
                {cardContent}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Despesas Mensais */}
          <div className="nexus-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#f0f0f0]">
                Despesas Mensais
              </h2>
              <span className="text-xs text-[#888888]">Últimos 6 meses • Clique para detalhes</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={gastosMensais} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                style={{ cursor: 'pointer' }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload as GastosMensais
                    router.push(`/pessoal/gastos-mensais/${payload.ano}/${payload.mesNumero}`)
                  }
                }}
              >
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '12px'
                  }}
                  formatter={(value: number) => [`R$ ${formatarMoeda(value)}`, 'Despesas']}
                  labelStyle={{ color: '#9ca3af', marginBottom: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 5, strokeWidth: 2, stroke: '#1f2937', cursor: 'pointer' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ef4444', cursor: 'pointer' }}
                  name="Despesas"
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
            {gastosMensais.length === 0 && (
              <div className="text-center py-8 text-[#666666]">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </div>

          {/* Gráfico de Investimentos - Barras */}
          <div className="nexus-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#f0f0f0]">
                Investimentos por Tipo
              </h2>
              <button
                onClick={() => router.push('/investimentos')}
                className="text-xs text-primary hover:text-primary-dark transition-colors"
              >
                Ver todos →
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={investimentosPorTipo} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                layout="vertical"
                barCategoryGap="10%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  type="number"
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                />
                <YAxis 
                  type="category"
                  dataKey="tipo" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#4b5563' }}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '12px'
                  }}
                  cursor={false}
                  formatter={(value: number, name: string, props: any) => {
                    const porcentagem = props.payload.porcentagem || 0
                    const rentabilidadeNum = props.payload.valor_investido > 0
                      ? (((props.payload.valor_atual - props.payload.valor_investido) / props.payload.valor_investido) * 100)
                      : 0
                    const rentabilidade = rentabilidadeNum.toFixed(2)
                    if (name === 'valor_investido') {
                      return [`R$ ${formatarMoeda(value)} (${porcentagem}%)`, 'Investido']
                    }
                    return [`R$ ${formatarMoeda(value)} (${rentabilidadeNum >= 0 ? '+' : ''}${rentabilidade}%)`, 'Valor Atual']
                  }}
                  labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold' }}
                />
                <Legend />
                <Bar 
                  dataKey="valor_investido" 
                  fill="#3b82f6" 
                  name="Investido"
                  radius={[0, 0, 0, 0]}
                  animationDuration={800}
                />
                <Bar 
                  dataKey="valor_atual" 
                  fill="#10b981" 
                  name="Valor Atual"
                  radius={[0, 8, 8, 0]}
                  animationDuration={800}
                >
                  {investimentosPorTipo.map((entry, index) => {
                    const rentabilidade = entry.valor_investido > 0
                      ? ((entry.valor_atual - entry.valor_investido) / entry.valor_investido) * 100
                      : 0
                    const color = rentabilidade >= 0 ? '#10b981' : '#ef4444'
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={color}
                        style={{ fill: color }}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {investimentosPorTipo.length === 0 && (
              <div className="text-center py-8 text-[#666666]">
                <p>Nenhum investimento cadastrado</p>
                <button
                  onClick={() => router.push('/pessoal/investimentos')}
                  className="mt-2 text-primary hover:text-primary-dark text-sm"
                >
                  Adicionar investimento
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Pizza para Despesas do Mês por Categoria */}
        {despesasPorCategoria.length > 0 && (
          <div className="nexus-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#f0f0f0]">
                Despesas de {mesNome} {anoSelecionado} por Categoria
              </h2>
              <button
                onClick={() => {
                  router.push(`/pessoal/gastos-mensais/${anoSelecionado}/${mesSelecionado}`)
                }}
                className="text-xs text-primary hover:text-primary-dark transition-colors"
              >
                Ver detalhes →
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Pizza */}
              <div>
                <ResponsiveContainer width="100%" height={300}>
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
                      animationDuration={800}
                      onClick={(data: any) => {
                        if (data && data.categoria) {
                          router.push(`/pessoal/gastos/categoria/${encodeURIComponent(data.categoria)}`)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {despesasPorCategoria.map((entry, index) => {
                        const colors = [
                          '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
                          '#06b6d4', '#84cc16', '#f97316', '#6366f1',
                          '#3b82f6', '#10b981'
                        ]
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '12px'
                      }}
                      formatter={(value: number, payload: any) => {
                        return [
                          `R$ ${formatarMoeda(value)} (${payload.porcentagem}%)`,
                          payload.categoria
                        ]
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legenda customizada clicável */}
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  {despesasPorCategoria.map((item, index) => {
                    const colors = [
                      '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
                      '#06b6d4', '#84cc16', '#f97316', '#6366f1',
                      '#3b82f6', '#10b981'
                    ]
                    return (
                      <button
                        key={item.categoria}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(`/pessoal/gastos/categoria/${encodeURIComponent(item.categoria)}`)
                        }}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200 cursor-pointer"
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="text-[#dddddd] text-xs font-medium">{item.categoria}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Lista de categorias de despesas */}
              <div className="flex flex-col justify-center">
                <div className="space-y-3">
                  {despesasPorCategoria.slice(0, 10).map((item, index) => {
                    const colors = [
                      '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
                      '#06b6d4', '#84cc16', '#f97316', '#6366f1',
                      '#3b82f6', '#10b981'
                    ]
                    return (
                      <button
                        key={item.categoria}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(`/pessoal/gastos/categoria/${encodeURIComponent(item.categoria)}`)
                        }}
                        className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200 text-left cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="text-[#f0f0f0] text-sm font-medium">{item.categoria}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#f0f0f0] font-semibold">R$ {formatarMoeda(item.valor)}</p>
                          <p className="text-xs text-[#888888] font-medium">
                            {item.porcentagem.toFixed(1)}%
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {despesasPorCategoria.length === 0 && stats.gastosMes === 0 && (
          <div className="nexus-card p-12 text-center">
            <p className="text-[#bbbbbb] text-lg mb-2">
              Nenhuma despesa registrada em {mesNome} {anoSelecionado}
            </p>
            <p className="text-[#666666] text-sm">
              As despesas do mês aparecerão aqui quando registradas
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[200px]">Carregando...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
