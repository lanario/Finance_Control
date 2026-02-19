'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiShoppingBag,
  FiClock,
  FiPlus,
  FiMinus,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import {
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
  saldoEmCaixa: number
  saldoResultante: number
  receitas: number
  despesas: number
  pedidosPendentesValor: number
  pedidosPendentesQtd: number
}

interface DespesasPorCategoria {
  categoria: string
  valor: number
  porcentagem: number
  cor: string
}

interface VendasPorCategoria {
  categoria: string
  valor: number
  porcentagem: number
  cor: string
}

/** Cor usada para "Sem categoria" nos gráficos quando não há categoria associada */
const COR_SEM_CATEGORIA = '#6b7280'

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

interface Movimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  descricao: string
  valor: number
  data_movimentacao: string
  origem: string
  categoria_nome?: string
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function DashboardEmpresarialPage() {
  const { session } = useAuth()
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const [mesSelecionado, setMesSelecionado] = useState({ ano: now.getFullYear(), mes: now.getMonth() + 1 })
  const [stats, setStats] = useState<DashboardStats>({
    saldoEmCaixa: 0,
    saldoResultante: 0,
    receitas: 0,
    despesas: 0,
    pedidosPendentesValor: 0,
    pedidosPendentesQtd: 0,
  })
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<DespesasPorCategoria[]>([])
  const [vendasPorCategoria, setVendasPorCategoria] = useState<VendasPorCategoria[]>([])
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([])
  const [lucroMensal, setLucroMensal] = useState<LucroMensal[]>([])
  const [despesasMensais, setDespesasMensais] = useState<DespesasMensais[]>([])
  const [ultimasMovimentacoes, setUltimasMovimentacoes] = useState<Movimentacao[]>([])
  const [loading, setLoading] = useState(true)

  // Helper para calcular datas dos últimos 6 meses (terminando no mês selecionado)
  const getMonthsRange = useCallback((ano: number, mes: number) => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(ano, mes - 1 - (5 - i), 1)
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

  // Função otimizada para carregar dados em paralelo (filtrada pelo mês selecionado)
  const loadDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    const { ano, mes } = mesSelecionado
    try {
      const userId = session.user.id
      const startOfMonth = new Date(ano, mes - 1, 1)
      const endOfMonth = new Date(ano, mes, 0)
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
      const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

      // Último dia do mês passado (para Saldo em Caixa = acumulado até então)
      const endOfLastMonth = new Date(ano, mes - 1, 0)
      const startHistorico = new Date(ano - 5, 0, 1) // 5 anos atrás
      const startHistoricoStr = startHistorico.toISOString().split('T')[0]
      const endOfLastMonthStr = endOfLastMonth.toISOString().split('T')[0]

      // Paralelizar queries do mês atual + vendas pendentes + histórico para saldo em caixa (+ compras finalizadas)
      const [
        contasPagarMesResult,
        parcelasPagarMesResult,
        comprasFinalizadasMesResult,
        contasReceberMesResult,
        parcelasReceberMesResult,
        vendasMesResult,
        parcelasVendasMesResult,
        vendasPendentesResult,
        histContasReceber,
        histParcelasReceber,
        histVendas,
        histParcelasVendas,
        histContasPagar,
        histParcelasPagar,
        histComprasFinalizadas,
      ] = await Promise.all([
        supabase
          .from('contas_a_pagar')
          .select('valor')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr)
          .eq('parcelada', false),
        supabase
          .from('parcelas_contas_pagar')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('compras')
          .select('valor_final, data_compra, categoria_id')
          .eq('user_id', userId)
          .eq('status', 'finalizado')
          .gte('data_compra', startOfMonthStr)
          .lte('data_compra', endOfMonthStr),
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
        supabase
          .from('vendas')
          .select('id, valor_final')
          .eq('user_id', userId)
          .eq('status', 'pendente'),
        supabase
          .from('contas_a_receber')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', startHistoricoStr)
          .lte('data_vencimento', endOfLastMonthStr)
          .eq('parcelada', false),
        supabase
          .from('parcelas_contas_receber')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', startHistoricoStr)
          .lte('data_vencimento', endOfLastMonthStr),
        supabase
          .from('vendas')
          .select('valor_final, data_venda')
          .eq('user_id', userId)
          .gte('data_venda', startHistoricoStr)
          .lte('data_venda', endOfLastMonthStr)
          .eq('parcelada', false)
          .eq('status', 'aprovado'),
        supabase
          .from('parcelas_vendas')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', startHistoricoStr)
          .lte('data_vencimento', endOfLastMonthStr)
          .eq('status', 'aprovado'),
        supabase
          .from('contas_a_pagar')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', startHistoricoStr)
          .lte('data_vencimento', endOfLastMonthStr)
          .eq('parcelada', false),
        supabase
          .from('parcelas_contas_pagar')
          .select('valor, data_vencimento')
          .eq('user_id', userId)
          .gte('data_vencimento', startHistoricoStr)
          .lte('data_vencimento', endOfLastMonthStr),
        supabase
          .from('compras')
          .select('valor_final, data_compra')
          .eq('user_id', userId)
          .eq('status', 'finalizado')
          .gte('data_compra', startHistoricoStr)
          .lte('data_compra', endOfLastMonthStr),
      ])

      // Totais do mês atual (receitas = contas a receber + vendas aprovadas; despesas = contas a pagar + compras finalizadas)
      const totalComprasFinalizadasMes =
        (comprasFinalizadasMesResult.data?.reduce((sum, c) => sum + Number(c.valor_final || 0), 0) || 0)
      const totalContasPagar =
        (contasPagarMesResult.data?.reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0) +
        (parcelasPagarMesResult.data?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0) +
        totalComprasFinalizadasMes

      const totalContasReceber =
        (contasReceberMesResult.data?.reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0) +
        (parcelasReceberMesResult.data?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0)

      const totalVendas =
        (vendasMesResult.data?.reduce((sum, v) => sum + Number(v.valor_final || 0), 0) || 0) +
        (parcelasVendasMesResult.data?.reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0)

      const receitasMes = totalContasReceber + totalVendas
      const despesasMes = totalContasPagar
      const saldoResultanteMes = receitasMes - despesasMes

      // Pedidos pendentes: soma do valor e quantidade de vendas com status pendente
      const pedidosPendentes = (vendasPendentesResult.data || []) as Array<{ id: string; valor_final: number }>
      const pedidosPendentesValor = pedidosPendentes.reduce((sum, v) => sum + Number(v.valor_final || 0), 0)
      const pedidosPendentesQtd = pedidosPendentes.length

      // Saldo em Caixa: acumulado dos saldos resultantes de todos os meses anteriores ao atual
      const receitasPorMes: Record<string, number> = {}
      const despesasPorMes: Record<string, number> = {}

      const addReceita = (valor: number, dataStr: string) => {
        const key = dataStr.slice(0, 7)
        receitasPorMes[key] = (receitasPorMes[key] || 0) + Number(valor || 0)
      }
      const addDespesa = (valor: number, dataStr: string) => {
        const key = dataStr.slice(0, 7)
        despesasPorMes[key] = (despesasPorMes[key] || 0) + Number(valor || 0)
      }

      ;(histContasReceber.data || []).forEach((r: { valor: number; data_vencimento: string }) =>
        addReceita(r.valor, r.data_vencimento)
      )
      ;(histParcelasReceber.data || []).forEach((r: { valor: number; data_vencimento: string }) =>
        addReceita(r.valor, r.data_vencimento)
      )
      ;(histVendas.data || []).forEach((v: { valor_final: number; data_venda: string }) =>
        addReceita(v.valor_final, v.data_venda)
      )
      ;(histParcelasVendas.data || []).forEach((p: { valor: number; data_vencimento: string }) =>
        addReceita(p.valor, p.data_vencimento)
      )
      ;(histContasPagar.data || []).forEach((c: { valor: number; data_vencimento: string }) =>
        addDespesa(c.valor, c.data_vencimento)
      )
      ;(histParcelasPagar.data || []).forEach((p: { valor: number; data_vencimento: string }) =>
        addDespesa(p.valor, p.data_vencimento)
      )
      ;(histComprasFinalizadas.data || []).forEach((c: { valor_final: number; data_compra: string }) =>
        addDespesa(c.valor_final, c.data_compra)
      )

      let saldoEmCaixa = 0
      const currentMonthKey = `${ano}-${String(mes).padStart(2, '0')}`
      Object.keys(receitasPorMes)
        .filter((key) => key < currentMonthKey)
        .forEach((key) => {
          const rec = receitasPorMes[key] || 0
          const desp = despesasPorMes[key] || 0
          saldoEmCaixa += rec - desp
        })

      setStats({
        saldoEmCaixa,
        saldoResultante: saldoResultanteMes,
        receitas: receitasMes,
        despesas: despesasMes,
        pedidosPendentesValor,
        pedidosPendentesQtd,
      })

      // Carregar dados históricos em paralelo (últimos 6 meses até o mês selecionado)
      const monthsRange = getMonthsRange(ano, mes)
      
      // Preparar todas as queries para os 6 meses em paralelo (inclui compras finalizadas)
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
          supabase
            .from('compras')
            .select('valor_final')
            .eq('user_id', userId)
            .eq('status', 'finalizado')
            .gte('data_compra', startStr)
            .lte('data_compra', endStr),
        ]
      })

      const historicalResults = await Promise.all(historicalQueries)
      
      // Processar resultados históricos
      const faturamentoData: FaturamentoMensal[] = []
      const lucroData: LucroMensal[] = []
      const despesasMensaisData: DespesasMensais[] = []

      monthsRange.forEach((month, index) => {
        const baseIndex = index * 6
        const receitas = (historicalResults[baseIndex]?.data || []) as Array<{ valor: number }>
        const vendas = (historicalResults[baseIndex + 1]?.data || []) as Array<{ valor_final: number }>
        const parcelasVendas = (historicalResults[baseIndex + 2]?.data || []) as Array<{ valor: number }>
        const pagas = (historicalResults[baseIndex + 3]?.data || []) as Array<{ valor: number }>
        const parcelasPagas = (historicalResults[baseIndex + 4]?.data || []) as Array<{ valor: number }>
        const comprasFinalizadas = (historicalResults[baseIndex + 5]?.data || []) as Array<{ valor_final: number }>

        const entradas = 
          (receitas.reduce((sum, r) => sum + Number(r.valor || 0), 0)) +
          (vendas.reduce((sum, v) => sum + Number(v.valor_final || 0), 0)) +
          (parcelasVendas.reduce((sum, p) => sum + Number(p.valor || 0), 0))
        
        const saidas = 
          (pagas.reduce((sum, p) => sum + Number(p.valor || 0), 0)) +
          (parcelasPagas.reduce((sum, p) => sum + Number(p.valor || 0), 0)) +
          (comprasFinalizadas.reduce((sum, c) => sum + Number(c.valor_final || 0), 0))

        const faturamento = 
          (vendas.reduce((sum, v) => sum + Number(v.valor_final || 0), 0)) +
          (parcelasVendas.reduce((sum, p) => sum + Number(p.valor || 0), 0))

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

      setFaturamentoMensal(faturamentoData)
      setLucroMensal(lucroData)
      setDespesasMensais(despesasMensaisData)

      // Carregar despesas e vendas por categoria (paralelizado) — incluir cor para refletir cores da aba Categorias
      const [categoriasDespesasResult, categoriasReceitasResult] = await Promise.all([
        supabase
          .from('categorias')
          .select('id, nome, cor')
          .eq('user_id', userId)
          .eq('tipo', 'despesa')
          .eq('ativo', true),
        supabase
          .from('categorias')
          .select('id, nome, cor')
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
          const contasNaoParceladas = (categoriaResults[baseIndex]?.data || []) as Array<{ valor: number }>
          const parcelas = (categoriaResults[baseIndex + 1]?.data || []) as Array<{ valor: number }>
          
          const valor = 
            contasNaoParceladas.reduce((sum, c) => sum + Number(c.valor || 0), 0) +
            parcelas.reduce((sum, p) => sum + Number(p.valor || 0), 0)
          
          if (valor > 0) {
            despesasPorCategoriaMap[categoria.nome] = valor
          }
        })
        const categoriasIdToNome = new Map(categoriasDespesasResult.data.map((c) => [c.id, c.nome]))
        ;(comprasFinalizadasMesResult.data || []).forEach((c: { valor_final: number; categoria_id: string | null }) => {
          const nome = (c.categoria_id && categoriasIdToNome.get(c.categoria_id)) || 'Sem categoria'
          despesasPorCategoriaMap[nome] = (despesasPorCategoriaMap[nome] || 0) + Number(c.valor_final || 0)
        })

        const mapaCorDespesa = new Map(
          (categoriasDespesasResult.data as Array<{ id: string; nome: string; cor?: string | null }>).map((c) => [
            c.nome,
            c.cor && c.cor.trim() ? c.cor : '#6366f1',
          ])
        )
        const despesasPorCategoriaData: DespesasPorCategoria[] = Object.entries(despesasPorCategoriaMap)
          .map(([categoria, valor]) => ({
            categoria,
            valor: Number(valor.toFixed(2)),
            porcentagem: totalContasPagar > 0
              ? Number(((valor / totalContasPagar) * 100).toFixed(1))
              : 0,
            cor: mapaCorDespesa.get(categoria) ?? COR_SEM_CATEGORIA,
          }))
          .sort((a, b) => b.valor - a.valor)

        setDespesasPorCategoria(despesasPorCategoriaData)
      } else {
        setDespesasPorCategoria([])
      }

      // Buscar vendas por categoria (inclui pendente e aprovado para refletir todas as vendas do mês)
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
            .in('status', ['pendente', 'aprovado']),
          supabase
            .from('parcelas_vendas')
            .select('valor')
            .eq('user_id', userId)
            .eq('categoria_id', categoria.id)
            .gte('data_vencimento', startOfMonthStr)
            .lte('data_vencimento', endOfMonthStr)
            .in('status', ['pendente', 'aprovado'])
        ])

        // Incluir vendas sem categoria (categoria_id null)
        const queriesSemCategoria = [
          supabase
            .from('vendas')
            .select('valor_final')
            .eq('user_id', userId)
            .is('categoria_id', null)
            .gte('data_venda', startOfMonthStr)
            .lte('data_venda', endOfMonthStr)
            .eq('parcelada', false)
            .in('status', ['pendente', 'aprovado']),
          supabase
            .from('parcelas_vendas')
            .select('valor')
            .eq('user_id', userId)
            .is('categoria_id', null)
            .gte('data_vencimento', startOfMonthStr)
            .lte('data_vencimento', endOfMonthStr)
            .in('status', ['pendente', 'aprovado'])
        ]

        const [categoriaResults, semCatVendas, semCatParcelas] = await Promise.all([
          Promise.all(categoriaQueries),
          queriesSemCategoria[0],
          queriesSemCategoria[1],
        ])

        const vendasPorCategoriaMap: { [key: string]: number } = {}
        categoriasReceitasResult.data.forEach((categoria, index) => {
          const baseIndex = index * 2
          const vendasNaoParceladas = (categoriaResults[baseIndex]?.data || []) as Array<{ valor_final: number }>
          const parcelas = (categoriaResults[baseIndex + 1]?.data || []) as Array<{ valor: number }>
          
          const valor = 
            vendasNaoParceladas.reduce((sum, v) => sum + Number(v.valor_final || 0), 0) +
            parcelas.reduce((sum, p) => sum + Number(p.valor || 0), 0)
          
          if (valor > 0) {
            vendasPorCategoriaMap[categoria.nome] = valor
          }
        })

        const totalSemCat =
          ((semCatVendas.data || []) as Array<{ valor_final: number }>).reduce((s, v) => s + Number(v.valor_final || 0), 0) +
          ((semCatParcelas.data || []) as Array<{ valor: number }>).reduce((s, p) => s + Number(p.valor || 0), 0)
        if (totalSemCat > 0) {
          vendasPorCategoriaMap['Sem categoria'] = totalSemCat
        }

        const totalVendasChart = Object.values(vendasPorCategoriaMap).reduce((s, v) => s + v, 0)
        const mapaCorReceita = new Map(
          (categoriasReceitasResult.data as Array<{ id: string; nome: string; cor?: string | null }>).map((c) => [
            c.nome,
            c.cor && c.cor.trim() ? c.cor : '#10b981',
          ])
        )
        const vendasPorCategoriaData: VendasPorCategoria[] = Object.entries(vendasPorCategoriaMap)
          .map(([categoria, valor]) => ({
            categoria,
            valor: Number(valor.toFixed(2)),
            porcentagem: totalVendasChart > 0
              ? Number(((valor / totalVendasChart) * 100).toFixed(1))
              : 0,
            cor: mapaCorReceita.get(categoria) ?? COR_SEM_CATEGORIA,
          }))
          .sort((a, b) => b.valor - a.valor)

        setVendasPorCategoria(vendasPorCategoriaData)
      } else {
        // Sem categorias de receita: buscar todas as vendas do mês para exibir pelo menos o total
        const [vendasSemCatResult, parcelasSemCatResult] = await Promise.all([
          supabase
            .from('vendas')
            .select('valor_final')
            .eq('user_id', userId)
            .gte('data_venda', startOfMonthStr)
            .lte('data_venda', endOfMonthStr)
            .eq('parcelada', false)
            .in('status', ['pendente', 'aprovado']),
          supabase
            .from('parcelas_vendas')
            .select('valor')
            .eq('user_id', userId)
            .gte('data_vencimento', startOfMonthStr)
            .lte('data_vencimento', endOfMonthStr)
            .in('status', ['pendente', 'aprovado'])
        ])
        const totalGeral =
          (vendasSemCatResult.data?.reduce((s, v) => s + Number(v.valor_final || 0), 0) || 0) +
          (parcelasSemCatResult.data?.reduce((s, p) => s + Number(p.valor || 0), 0) || 0)
        if (totalGeral > 0) {
          setVendasPorCategoria([{
            categoria: 'Vendas',
            valor: Number(totalGeral.toFixed(2)),
            porcentagem: 100,
            cor: COR_SEM_CATEGORIA,
          }])
        } else {
          setVendasPorCategoria([])
        }
      }

      // Últimas movimentações: montar a partir das mesmas fontes dos totais (compras, contas a pagar/receber, vendas)
      const mapCategoriaIdToNome = new Map<string, string>()
      ;(categoriasDespesasResult.data || []).forEach((c: { id: string; nome: string }) => mapCategoriaIdToNome.set(c.id, c.nome))
      ;(categoriasReceitasResult.data || []).forEach((c: { id: string; nome: string }) => mapCategoriaIdToNome.set(c.id, c.nome))

      const [
        comprasMovResult,
        contasPagarMovResult,
        parcelasPagarMovResult,
        contasReceberMovResult,
        parcelasReceberMovResult,
        vendasMovResult,
        parcelasVendasMovResult,
      ] = await Promise.all([
        supabase
          .from('compras')
          .select('id, descricao, valor_final, data_compra, categoria_id')
          .eq('user_id', userId)
          .eq('status', 'finalizado')
          .gte('data_compra', startOfMonthStr)
          .lte('data_compra', endOfMonthStr),
        supabase
          .from('contas_a_pagar')
          .select('id, descricao, valor, data_vencimento, categoria_id')
          .eq('user_id', userId)
          .eq('parcelada', false)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('parcelas_contas_pagar')
          .select('id, descricao, valor, data_vencimento, categoria_id')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('contas_a_receber')
          .select('id, descricao, valor, data_vencimento, categoria_id')
          .eq('user_id', userId)
          .eq('parcelada', false)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('parcelas_contas_receber')
          .select('id, descricao, valor, data_vencimento, categoria_id')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
        supabase
          .from('vendas')
          .select('id, descricao, valor_final, data_venda, categoria_id')
          .eq('user_id', userId)
          .eq('parcelada', false)
          .eq('status', 'aprovado')
          .gte('data_venda', startOfMonthStr)
          .lte('data_venda', endOfMonthStr),
        supabase
          .from('parcelas_vendas')
          .select('id, descricao, valor, data_vencimento, categoria_id')
          .eq('user_id', userId)
          .eq('status', 'aprovado')
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr),
      ])

      const listaBruta: Movimentacao[] = []
      ;(comprasMovResult.data || []).forEach((c: { id: string; descricao: string | null; valor_final: number; data_compra: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: c.id,
          tipo: 'saida',
          descricao: c.descricao || 'Compra',
          valor: Number(c.valor_final),
          data_movimentacao: c.data_compra,
          origem: 'compra',
          categoria_nome: c.categoria_id ? mapCategoriaIdToNome.get(c.categoria_id) : undefined,
        })
      })
      ;(contasPagarMovResult.data || []).forEach((c: { id: string; descricao: string | null; valor: number; data_vencimento: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: c.id,
          tipo: 'saida',
          descricao: c.descricao || 'Conta a pagar',
          valor: Number(c.valor),
          data_movimentacao: c.data_vencimento,
          origem: 'conta_pagar',
          categoria_nome: c.categoria_id ? mapCategoriaIdToNome.get(c.categoria_id) : undefined,
        })
      })
      ;(parcelasPagarMovResult.data || []).forEach((p: { id: string; descricao: string | null; valor: number; data_vencimento: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: p.id,
          tipo: 'saida',
          descricao: p.descricao || 'Parcela (conta a pagar)',
          valor: Number(p.valor),
          data_movimentacao: p.data_vencimento,
          origem: 'conta_pagar',
          categoria_nome: p.categoria_id ? mapCategoriaIdToNome.get(p.categoria_id) : undefined,
        })
      })
      ;(contasReceberMovResult.data || []).forEach((c: { id: string; descricao: string | null; valor: number; data_vencimento: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: c.id,
          tipo: 'entrada',
          descricao: c.descricao || 'Conta a receber',
          valor: Number(c.valor),
          data_movimentacao: c.data_vencimento,
          origem: 'conta_receber',
          categoria_nome: c.categoria_id ? mapCategoriaIdToNome.get(c.categoria_id) : undefined,
        })
      })
      ;(parcelasReceberMovResult.data || []).forEach((p: { id: string; descricao: string | null; valor: number; data_vencimento: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: p.id,
          tipo: 'entrada',
          descricao: p.descricao || 'Parcela (conta a receber)',
          valor: Number(p.valor),
          data_movimentacao: p.data_vencimento,
          origem: 'conta_receber',
          categoria_nome: p.categoria_id ? mapCategoriaIdToNome.get(p.categoria_id) : undefined,
        })
      })
      ;(vendasMovResult.data || []).forEach((v: { id: string; descricao: string | null; valor_final: number; data_venda: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: v.id,
          tipo: 'entrada',
          descricao: v.descricao || 'Venda',
          valor: Number(v.valor_final),
          data_movimentacao: v.data_venda,
          origem: 'venda',
          categoria_nome: v.categoria_id ? mapCategoriaIdToNome.get(v.categoria_id) : undefined,
        })
      })
      ;(parcelasVendasMovResult.data || []).forEach((p: { id: string; descricao: string | null; valor: number; data_vencimento: string; categoria_id: string | null }) => {
        listaBruta.push({
          id: p.id,
          tipo: 'entrada',
          descricao: p.descricao || 'Parcela (venda)',
          valor: Number(p.valor),
          data_movimentacao: p.data_vencimento,
          origem: 'venda',
          categoria_nome: p.categoria_id ? mapCategoriaIdToNome.get(p.categoria_id) : undefined,
        })
      })

      const movimentacoesFormatadas: Movimentacao[] = listaBruta
        .sort((a, b) => b.data_movimentacao.localeCompare(a.data_movimentacao))
        .slice(0, 15)
      setUltimasMovimentacoes(movimentacoesFormatadas)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, getMonthsRange, mesSelecionado])

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData()
    }
  }, [session?.user?.id, loadDashboardData])

  interface StatCard {
    title: string
    value: string
    icon: typeof FiDollarSign
    color: string
    bgColor: string
    subtitle?: string
  }

  const statCards = useMemo<StatCard[]>(() => [
    {
      title: 'Saldo em Caixa',
      value: `R$ ${stats.saldoEmCaixa.toFixed(2)}`,
      icon: FiDollarSign,
      color: stats.saldoEmCaixa >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: stats.saldoEmCaixa >= 0 ? 'bg-green-500/20' : 'bg-red-500/20',
    },
    {
      title: 'Saldo Resultante',
      value: `R$ ${stats.saldoResultante.toFixed(2)}`,
      icon: FiTrendingUp,
      color: stats.saldoResultante >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: stats.saldoResultante >= 0 ? 'bg-green-500/20' : 'bg-red-500/20',
    },
    {
      title: 'Receitas',
      value: `R$ ${stats.receitas.toFixed(2)}`,
      icon: FiTrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Despesas',
      value: `R$ ${stats.despesas.toFixed(2)}`,
      icon: FiTrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
    {
      title: 'Pedidos Pendentes',
      value: `R$ ${stats.pedidosPendentesValor.toFixed(2)}`,
      subtitle: `${stats.pedidosPendentesQtd} pedido(s)`,
      icon: FiClock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
  ], [stats])

  /** Opções de mês para o dropdown: ordem cronológica (12 passados + atual + 24 futuros) */
  const opcoesMesDropdown = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth()
    const inicio = new Date(anoAtual, mesAtual - 12, 1)
    const fim = new Date(anoAtual, mesAtual + 24, 1)
    for (let d = new Date(inicio); d <= fim; d.setMonth(d.getMonth() + 1)) {
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      opts.push({
        value: `${y}-${String(m).padStart(2, '0')}`,
        label: `${MESES_NOMES[m - 1].slice(0, 3)}/${y}`,
      })
    }
    return opts
  }, [])

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  const mesAnterior = () => {
    setMesSelecionado((prev) => {
      if (prev.mes === 1) return { ano: prev.ano - 1, mes: 12 }
      return { ano: prev.ano, mes: prev.mes - 1 }
    })
  }

  const mesProximo = () => {
    setMesSelecionado((prev) => {
      if (prev.mes === 12) return { ano: prev.ano + 1, mes: 1 }
      return { ano: prev.ano, mes: prev.mes + 1 }
    })
  }

  const labelMesAno = `${MESES_NOMES[mesSelecionado.mes - 1]} ${mesSelecionado.ano}`

  const valorMesSelect = `${mesSelecionado.ano}-${String(mesSelecionado.mes).padStart(2, '0')}`

  const onChangeMesSelect = (value: string) => {
    const [anoStr, mesStr] = value.split('-')
    setMesSelecionado({ ano: Number(anoStr), mes: Number(mesStr) })
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

        {/* Seletor de mês: setas + dropdown */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-gray-800 rounded-full border border-gray-700">
            <button
              type="button"
              onClick={mesAnterior}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Mês anterior"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <select
              value={valorMesSelect}
              onChange={(e) => onChangeMesSelect(e.target.value)}
              className="text-lg font-medium text-white min-w-[140px] text-center bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none appearance-none py-1 pr-8 bg-[length:1.25rem] bg-[right_0.25rem_center] bg-no-repeat"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")" }}
              aria-label="Selecionar mês e ano"
            >
              {opcoesMesDropdown.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={mesProximo}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Próximo mês"
            >
              <FiChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div
                key={index}
                className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                    {card.subtitle && (
                      <p className="text-gray-500 text-sm mt-1">{card.subtitle}</p>
                    )}
                  </div>
                  <div className={`${card.bgColor} p-3 rounded-full`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Últimas Movimentações */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Últimas Movimentações</h2>
            <Link
              href="/empresarial/vendas-receitas"
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ver tudo
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {ultimasMovimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      Nenhuma movimentação recente
                    </td>
                  </tr>
                ) : (
                  ultimasMovimentacoes.map((mov) => {
                    const isEntrada = mov.tipo === 'entrada'
                    const categoriaLabel =
                      mov.categoria_nome ||
                      (mov.origem === 'venda'
                        ? 'Venda'
                        : mov.origem === 'compra'
                          ? 'Compra'
                          : mov.origem === 'conta_pagar'
                            ? 'Despesa'
                            : mov.origem === 'conta_receber'
                              ? 'Receita'
                              : 'Outro')
                    const dataFormatada = new Date(mov.data_movimentacao + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                    const valorFormatado = new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(mov.valor)
                    return (
                      <tr key={mov.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                isEntrada ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {isEntrada ? (
                                <FiPlus className="w-4 h-4" />
                              ) : (
                                <FiMinus className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-white text-sm">{mov.descricao}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{categoriaLabel}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{dataFormatada}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`text-sm font-medium ${
                              isEntrada ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isEntrada ? `+ ${valorFormatado}` : `- ${valorFormatado}`}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <Cell key={`cell-${index}`} fill={entry.cor} />
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
                  {despesasPorCategoria.map((item) => (
                    <div key={item.categoria} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.cor }}
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
                        <Cell key={`cell-${index}`} fill={entry.cor} />
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
                  {vendasPorCategoria.map((item) => (
                    <div key={item.categoria} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.cor }}
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

        {/* Gráficos de Despesas, Lucro e Faturamento Mensal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-red-500/50 transition-all">
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
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
