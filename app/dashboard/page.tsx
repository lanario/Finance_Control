'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
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

export default function DashboardPage() {
  const { session } = useAuth()
  const router = useRouter()
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

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      const userId = session?.user?.id

      // Buscar cartões
      const { data: cartoes } = await supabase
        .from('cartoes')
        .select('*')
        .eq('user_id', userId)

      // Buscar compras do mês atual
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Buscar compras do mês atual
      const { data: todasComprasMes } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startOfMonth.toISOString().split('T')[0])
        .lte('data', endOfMonth.toISOString().split('T')[0])

      // Filtrar apenas compras NÃO parceladas (compras parceladas são representadas pelas parcelas)
      // Excluir compras onde parcelada = true OU total_parcelas > 1
      const comprasMes = todasComprasMes?.filter(compra => {
        const isParcelada = compra.parcelada === true || (compra as any).total_parcelas > 1
        return !isParcelada
      }) || []

      // Buscar TODAS as parcelas que vencem no mês atual (pagas e não pagas)
      // As parcelas devem ser contabilizadas no mês em que vencem, independente do status de pagamento
      const { data: parcelasMes } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])

      // Buscar receitas do mês atual (baseado no mês de referência)
      const { data: receitasMes } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', userId)
        .eq('mes_referencia', now.getMonth() + 1)
        .eq('ano_referencia', now.getFullYear())

      // Buscar todas as compras dos últimos 6 meses
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const { data: todasCompras6Meses } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .gte('data', sixMonthsAgo.toISOString())
        .order('data', { ascending: true })

      // Filtrar apenas compras NÃO parceladas (compras parceladas são representadas pelas parcelas)
      // Excluir compras onde parcelada = true OU total_parcelas > 1
      const compras6Meses = todasCompras6Meses?.filter(compra => {
        const isParcelada = compra.parcelada === true || (compra as any).total_parcelas > 1
        return !isParcelada
      }) || []

      // Buscar TODAS as parcelas dos últimos 6 meses (baseado na data de vencimento)
      // Incluir todas as parcelas (pagas e não pagas) pois são despesas que vencem naquele mês
      const { data: parcelas6Meses } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', sixMonthsAgo.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true })

      // Calcular total de gastos do mês atual (compras não parceladas + parcelas que vencem no mês)
      const totalGastosCompras = comprasMes?.reduce((sum, compra) => sum + compra.valor, 0) || 0
      const totalGastosParcelas = parcelasMes?.reduce((sum, parcela) => sum + parcela.valor, 0) || 0
      const totalGastos = totalGastosCompras + totalGastosParcelas
      const totalReceitas = receitasMes?.reduce((sum, receita) => sum + receita.valor, 0) || 0

      // Processar dados mensais (últimos 6 meses para o gráfico de linha)
      const gastosPorMes: { [key: string]: number } = {}
      const mesesNomes = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ]

      // Inicializar últimos 6 meses com zero
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        gastosPorMes[key] = 0
      }

      // Agregar gastos por mês (últimos 6 meses) - Compras não parceladas
      // As compras já foram filtradas acima, então apenas adicionar ao cálculo mensal
      compras6Meses?.forEach((compra) => {
        const compraDate = new Date(compra.data)
        const key = `${compraDate.getFullYear()}-${String(compraDate.getMonth() + 1).padStart(2, '0')}`
        if (gastosPorMes[key] !== undefined) {
          gastosPorMes[key] += compra.valor
        }
      })

      // Agregar parcelas por mês (baseado na data de vencimento) - TODAS as parcelas
      // As parcelas são contabilizadas no mês em que vencem, independente do status de pagamento
      parcelas6Meses?.forEach((parcela) => {
        const vencimentoDate = new Date(parcela.data_vencimento)
        const key = `${vencimentoDate.getFullYear()}-${String(vencimentoDate.getMonth() + 1).padStart(2, '0')}`
        if (gastosPorMes[key] !== undefined) {
          gastosPorMes[key] += parcela.valor
        }
      })

      // Converter para array formatado (já está ordenado pela chave)
      const gastosMensaisData: GastosMensais[] = Object.keys(gastosPorMes)
        .sort() // Ordena as chaves (formato YYYY-MM)
        .map((key) => {
          const [ano, mes] = key.split('-')
          const anoNumero = parseInt(ano)
          const mesNumero = parseInt(mes)
          return {
            mes: `${mesesNomes[mesNumero - 1]}/${ano.slice(2)}`,
            gastos: gastosPorMes[key],
            ano: anoNumero,
            mesNumero: mesNumero,
          }
        })

      // Buscar investimentos
      const { data: investimentosData } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', userId)
        .order('data_aquisicao', { ascending: false })

      setInvestimentos(investimentosData || [])

      // Processar investimentos por tipo
      const investimentosPorTipoMap: { [key: string]: { valor_investido: number; valor_atual: number } } = {}
      const totalInvestidoGeral = investimentosData?.reduce((sum, inv) => sum + inv.valor_investido, 0) || 0

      investimentosData?.forEach((investimento) => {
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
      
      // Agregar compras do mês por categoria
      comprasMes?.forEach((compra) => {
        const categoria = compra.categoria || 'Outros'
        if (!despesasPorCategoriaMap[categoria]) {
          despesasPorCategoriaMap[categoria] = 0
        }
        despesasPorCategoriaMap[categoria] += compra.valor
      })
      
      // Agregar parcelas do mês por categoria - TODAS as parcelas (pagas e não pagas)
      parcelasMes?.forEach((parcela) => {
        const categoria = parcela.categoria || 'Outros'
        if (!despesasPorCategoriaMap[categoria]) {
          despesasPorCategoriaMap[categoria] = 0
        }
        // Contar todas as parcelas que vencem no mês, independente de estarem pagas
        despesasPorCategoriaMap[categoria] += parcela.valor
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
        totalCartoes: cartoes?.length || 0,
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
      value: `R$ ${stats.gastosMes.toFixed(2)}`,
      icon: FiTrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      clickable: true,
      href: () => {
        const now = new Date()
        const ano = now.getFullYear()
        const mes = now.getMonth() + 1
        return `/gastos-mensais/${ano}/${mes}`
      },
    },
    {
      title: 'Receitas do Mês',
      value: `R$ ${stats.receitasMes.toFixed(2)}`,
      icon: FiTrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      clickable: true,
      href: '/receitas',
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
      value: `R$ ${(stats.receitasMes - stats.gastosMes).toFixed(2)}`,
      icon: FiDollarSign,
      color: 'text-primary',
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

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Visão geral das suas finanças pessoais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon
            const isClickable = (card as any).clickable
            
            const cardContent = (
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
            )
            
            if (isClickable) {
              const href = typeof (card as any).href === 'function' 
                ? (card as any).href() 
                : (card as any).href
              
              return (
                <button
                  key={index}
                  onClick={() => router.push(href)}
                  className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer w-full text-left"
                >
                  {cardContent}
                </button>
              )
            }
            
            return (
              <div
                key={index}
                className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
              >
                {cardContent}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Despesas Mensais */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Despesas Mensais
              </h2>
              <span className="text-xs text-gray-400">Últimos 6 meses • Clique para detalhes</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={gastosMensais} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                style={{ cursor: 'pointer' }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload as GastosMensais
                    router.push(`/gastos-mensais/${payload.ano}/${payload.mesNumero}`)
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
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Despesas']}
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
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </div>

          {/* Gráfico de Investimentos - Barras */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
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
                      return [`R$ ${value.toFixed(2)} (${porcentagem}%)`, 'Investido']
                    }
                    return [`R$ ${value.toFixed(2)} (${rentabilidadeNum >= 0 ? '+' : ''}${rentabilidade}%)`, 'Valor Atual']
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
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum investimento cadastrado</p>
                <button
                  onClick={() => router.push('/investimentos')}
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
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Despesas do Mês por Categoria
              </h2>
              <button
                onClick={() => {
                  const now = new Date()
                  const ano = now.getFullYear()
                  const mes = now.getMonth() + 1
                  router.push(`/gastos-mensais/${ano}/${mes}`)
                }}
                className="text-xs text-primary hover:text-primary-dark transition-colors"
              >
                Ver detalhes →
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    onClick={() => {
                      const now = new Date()
                      const ano = now.getFullYear()
                      const mes = now.getMonth() + 1
                      router.push(`/gastos-mensais/${ano}/${mes}`)
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
                        `R$ ${value.toFixed(2)} (${payload.porcentagem}%)`,
                        payload.categoria
                      ]
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                    formatter={(value) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
              
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
                        onClick={() => {
                          const now = new Date()
                          const ano = now.getFullYear()
                          const mes = now.getMonth() + 1
                          router.push(`/gastos-mensais/${ano}/${mes}`)
                        }}
                        className="w-full flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="text-white text-sm font-medium">{item.categoria}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">R$ {item.valor.toFixed(2)}</p>
                          <p className="text-xs text-gray-400 font-medium">
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
          <div className="bg-gray-800 rounded-lg shadow-lg p-12 border border-gray-700 text-center">
            <p className="text-gray-400 text-lg mb-2">
              Nenhuma despesa registrada no mês atual
            </p>
            <p className="text-gray-500 text-sm">
              As despesas do mês aparecerão aqui quando registradas
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

