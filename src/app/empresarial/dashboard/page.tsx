'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      const userId = session?.user?.id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Buscar fornecedores e clientes
      const { data: fornecedores } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)

      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)

      // Buscar despesas do mês
      const { data: contasPagarMes } = await supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])
        .eq('parcelada', false)

      const { data: parcelasPagarMes } = await supabase
        .from('parcelas_contas_pagar')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])

      // Buscar receitas do mês
      const { data: contasReceberMes } = await supabase
        .from('contas_a_receber')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])
        .eq('parcelada', false)

      const { data: parcelasReceberMes } = await supabase
        .from('parcelas_contas_receber')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])

      // Buscar vendas do mês
      const { data: vendasMes } = await supabase
        .from('vendas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_venda', startOfMonth.toISOString().split('T')[0])
        .lte('data_venda', endOfMonth.toISOString().split('T')[0])
        .eq('parcelada', false)
        .neq('status', 'cancelada')

      const { data: parcelasVendasMes } = await supabase
        .from('parcelas_vendas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])
        .eq('recebida', true)

      // Calcular totais
      const totalContasPagar = (contasPagarMes?.reduce((sum, c) => sum + Number(c.valor), 0) || 0) +
        (parcelasPagarMes?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)

      const totalContasReceber = (contasReceberMes?.reduce((sum, c) => sum + Number(c.valor), 0) || 0) +
        (parcelasReceberMes?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)

      const totalVendas = (vendasMes?.reduce((sum, v) => sum + Number(v.valor_final), 0) || 0) +
        (parcelasVendasMes?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)

      const saldoTotal = totalContasReceber + totalVendas - totalContasPagar

      setStats({
        contasPagarMes: totalContasPagar,
        contasReceberMes: totalContasReceber,
        vendasMes: totalVendas,
        totalFornecedores: fornecedores?.length || 0,
        totalClientes: clientes?.length || 0,
        saldoTotal,
      })

      // Processar fluxo de caixa mensal (últimos 6 meses)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const fluxoCaixaData: FluxoCaixaMensal[] = []
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const mesNome = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        
        // Buscar entradas (receitas + vendas)
        const { data: receitasMes } = await supabase
          .from('contas_a_receber')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('recebida', true)

        const { data: vendasMesPeriodo } = await supabase
          .from('vendas')
          .select('valor_final')
          .eq('user_id', userId)
          .gte('data_venda', monthStart.toISOString().split('T')[0])
          .lte('data_venda', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('status', 'paga')

        const entradas = (receitasMes?.reduce((sum, r) => sum + Number(r.valor), 0) || 0) +
          (vendasMesPeriodo?.reduce((sum, v) => sum + Number(v.valor_final), 0) || 0)

        // Buscar saídas (despesas)
        const { data: pagasMes } = await supabase
          .from('contas_a_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('paga', true)

        const saidas = pagasMes?.reduce((sum, p) => sum + Number(p.valor), 0) || 0
        
        fluxoCaixaData.push({
          mes: mesNome,
          entradas,
          saidas,
          saldo: entradas - saidas,
          ano: monthDate.getFullYear(),
          mesNumero: monthDate.getMonth() + 1,
        })
      }

      setFluxoCaixaMensal(fluxoCaixaData)

      // Processar despesas por categoria
      const { data: categoriasDespesas } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('user_id', userId)
        .eq('tipo', 'despesa')
        .eq('ativo', true)

      const despesasPorCategoriaMap: { [key: string]: number } = {}
      const totalDespesas = totalContasPagar

      if (categoriasDespesas) {
        for (const categoria of categoriasDespesas) {
          const { data: contasCategoria } = await supabase
            .from('contas_a_pagar')
            .select('valor')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
            .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])
            .eq('parcelada', false)

          const valor = contasCategoria?.reduce((sum, c) => sum + Number(c.valor), 0) || 0
          if (valor > 0) {
            despesasPorCategoriaMap[categoria.nome] = valor
          }
        }
      }

      const despesasPorCategoriaData: DespesasPorCategoria[] = Object.entries(despesasPorCategoriaMap)
        .map(([categoria, valor]) => ({
          categoria,
          valor: Number(valor.toFixed(2)),
          porcentagem: totalDespesas > 0
            ? Number(((valor / totalDespesas) * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.valor - a.valor)

      setDespesasPorCategoria(despesasPorCategoriaData)

      // Processar vendas por categoria
      const { data: categoriasReceitas } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('user_id', userId)
        .eq('tipo', 'receita')
        .eq('ativo', true)

      const vendasPorCategoriaMap: { [key: string]: number } = {}

      if (categoriasReceitas) {
        for (const categoria of categoriasReceitas) {
          const { data: vendasCategoria } = await supabase
            .from('vendas')
            .select('valor_final')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_venda', startOfMonth.toISOString().split('T')[0])
            .lte('data_venda', endOfMonth.toISOString().split('T')[0])
            .eq('parcelada', false)
            .neq('status', 'cancelada')

          const valor = vendasCategoria?.reduce((sum, v) => sum + Number(v.valor_final), 0) || 0
          if (valor > 0) {
            vendasPorCategoriaMap[categoria.nome] = valor
          }
        }
      }

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

      // Processar faturamento mensal (últimos 6 meses)
      const faturamentoData: FaturamentoMensal[] = []
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const mesNome = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        
        // Buscar vendas do período
        const { data: vendasFaturamento } = await supabase
          .from('vendas')
          .select('valor_final')
          .eq('user_id', userId)
          .gte('data_venda', monthStart.toISOString().split('T')[0])
          .lte('data_venda', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .neq('status', 'cancelada')

        const { data: parcelasVendasFaturamento } = await supabase
          .from('parcelas_vendas')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('recebida', true)

        const faturamento = (vendasFaturamento?.reduce((sum, v) => sum + Number(v.valor_final), 0) || 0) +
          (parcelasVendasFaturamento?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)
        
        faturamentoData.push({
          mes: mesNome,
          faturamento,
          ano: monthDate.getFullYear(),
          mesNumero: monthDate.getMonth() + 1,
        })
      }

      setFaturamentoMensal(faturamentoData)

      // Processar lucro mensal (últimos 6 meses)
      const lucroData: LucroMensal[] = []
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const mesNome = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        
        // Buscar receitas (receitas + vendas)
        const { data: receitasLucro } = await supabase
          .from('contas_a_receber')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('recebida', true)

        const { data: vendasLucro } = await supabase
          .from('vendas')
          .select('valor_final')
          .eq('user_id', userId)
          .gte('data_venda', monthStart.toISOString().split('T')[0])
          .lte('data_venda', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('status', 'paga')

        const { data: parcelasVendasLucro } = await supabase
          .from('parcelas_vendas')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('recebida', true)

        const receitas = (receitasLucro?.reduce((sum, r) => sum + Number(r.valor), 0) || 0) +
          (vendasLucro?.reduce((sum, v) => sum + Number(v.valor_final), 0) || 0) +
          (parcelasVendasLucro?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)

        // Buscar despesas (despesas)
        const { data: despesasLucro } = await supabase
          .from('contas_a_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('paga', true)

        const { data: parcelasDespesasLucro } = await supabase
          .from('parcelas_contas_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('paga', true)

        const despesas = (despesasLucro?.reduce((sum, d) => sum + Number(d.valor), 0) || 0) +
          (parcelasDespesasLucro?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)

        const lucro = receitas - despesas
        
        lucroData.push({
          mes: mesNome,
          lucro,
          receitas,
          despesas,
          ano: monthDate.getFullYear(),
          mesNumero: monthDate.getMonth() + 1,
        })
      }

      setLucroMensal(lucroData)

      // Processar despesas mensais (últimos 6 meses)
      const despesasMensaisData: DespesasMensais[] = []
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const mesNome = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        
        // Buscar despesas do período
        const { data: despesasPeriodo } = await supabase
          .from('contas_a_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('parcelada', false)
          .eq('paga', true)

        const { data: parcelasDespesasPeriodo } = await supabase
          .from('parcelas_contas_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', monthStart.toISOString().split('T')[0])
          .lte('data_vencimento', monthEnd.toISOString().split('T')[0])
          .eq('paga', true)

        const despesas = (despesasPeriodo?.reduce((sum, d) => sum + Number(d.valor), 0) || 0) +
          (parcelasDespesasPeriodo?.reduce((sum, p) => sum + Number(p.valor), 0) || 0)
        
        despesasMensaisData.push({
          mes: mesNome,
          despesas,
          ano: monthDate.getFullYear(),
          mesNumero: monthDate.getMonth() + 1,
        })
      }

      setDespesasMensais(despesasMensaisData)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS_PURPLE = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']
  const COLORS_GREEN = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']

  const statCards = [
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
  ]

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

            return (
              <div
                key={index}
                className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
              >
                {cardContent}
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
            <ResponsiveContainer width="100%" height={300}>
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="entradas" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Entradas"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saidas" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Saídas"
                  dot={{ fill: '#ef4444', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Saldo"
                  dot={{ fill: '#6366f1', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Despesas por Categoria */}
          {despesasPorCategoria.length > 0 && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
              <h2 className="text-xl font-semibold text-white mb-4">
                Despesas do Mês por Categoria
              </h2>
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
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
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
            </div>
          )}

          {/* Gráfico de Vendas por Categoria */}
          {vendasPorCategoria.length > 0 && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
              <h2 className="text-xl font-semibold text-white mb-4">
                Vendas do Mês por Categoria
              </h2>
              <ResponsiveContainer width="100%" height={300}>
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
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
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
            </div>
          )}
        </div>

        {/* Gráficos de Faturamento e Lucro Mensal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Faturamento Mensal */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Faturamento Mensal (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Bar 
                  dataKey="faturamento" 
                  fill="#8b5cf6" 
                  name="Faturamento"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Lucro Total Mensal */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Lucro Total Mensal (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Bar 
                  dataKey="lucro" 
                  fill="#10b981" 
                  name="Lucro"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Despesas/Gastos da Empresa */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all">
            <h2 className="text-xl font-semibold text-white mb-4">
              Despesas/Gastos da Empresa (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Bar 
                  dataKey="despesas" 
                  fill="#ef4444" 
                  name="Despesas"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
