'use client'

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  categoria_id: string | null
}

interface VendasPorCategoria {
  categoria: string
  valor: number
  porcentagem: number
  cor: string
  categoria_id: string | null
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

/** Cores fixas dos gráficos (tema único preto/cinza/neon) */
const CHART_BG = '#1a1a1a'
const CHART_BORDER = '#374151'
const CHART_TEXT = '#e2e8f0'

function DashboardEmpresarialContent() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
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

      // Paralelizar queries do mês atual + vendas pendentes + histórico + dados para gráficos por categoria (evita N+1)
      const [
        contasPagarMesResult,
        parcelasPagarMesResult,
        comprasFinalizadasMesResult,
        contasReceberMesResult,
        parcelasReceberMesResult,
        vendasMesResult,
        parcelasVendasMesResult,
        vendasPendentesResult,
        vendasPorCategoriaMesResult,
        parcelasVendasPorCategoriaMesResult,
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
          .select('valor, categoria_id')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr)
          .eq('parcelada', false),
        supabase
          .from('parcelas_contas_pagar')
          .select('valor, data_vencimento, categoria_id')
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
          .from('vendas')
          .select('valor_final, categoria_id')
          .eq('user_id', userId)
          .gte('data_venda', startOfMonthStr)
          .lte('data_venda', endOfMonthStr)
          .eq('parcelada', false)
          .in('status', ['pendente', 'aprovado']),
        supabase
          .from('parcelas_vendas')
          .select('valor, categoria_id')
          .eq('user_id', userId)
          .gte('data_vencimento', startOfMonthStr)
          .lte('data_vencimento', endOfMonthStr)
          .in('status', ['pendente', 'aprovado']),
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

      // Pedidos pendentes: valor realmente pendente = valor_final da venda − valor já recebido nas parcelas
      const pedidosPendentes = (vendasPendentesResult.data || []) as Array<{ id: string; valor_final: number }>
      let pedidosPendentesValor: number
      if (pedidosPendentes.length === 0) {
        pedidosPendentesValor = 0
      } else {
        const idsPendentes = pedidosPendentes.map((v) => v.id)
        const { data: parcelasRecebidasPendentes } = await supabase
          .from('parcelas_vendas')
          .select('venda_id, valor')
          .eq('user_id', userId)
          .in('venda_id', idsPendentes)
          .eq('recebida', true)
        const recebidoPorVenda: Record<string, number> = {}
        ;(parcelasRecebidasPendentes || []).forEach((p: { venda_id: string; valor: number }) => {
          recebidoPorVenda[p.venda_id] = (recebidoPorVenda[p.venda_id] || 0) + Number(p.valor || 0)
        })
        pedidosPendentesValor = pedidosPendentes.reduce((sum, v) => {
          const valorFinal = Number(v.valor_final || 0)
          const jaRecebido = recebidoPorVenda[v.id] || 0
          return sum + Math.max(0, valorFinal - jaRecebido)
        }, 0)
      }
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

      // Carregar categorias (despesa e receita) para montar gráficos por categoria
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

      // Despesas por categoria: agregar em memória a partir dos dados já carregados (evita N+1)
      if (categoriasDespesasResult.data && categoriasDespesasResult.data.length > 0) {
        const despesasPorCategoriaId: Record<string, number> = {}
        const addValor = (categoriaId: string | null, valor: number) => {
          const key = categoriaId ?? '__sem_categoria__'
          despesasPorCategoriaId[key] = (despesasPorCategoriaId[key] ?? 0) + Number(valor || 0)
        }
        ;(contasPagarMesResult.data || []).forEach((c: { valor: number; categoria_id: string | null }) => addValor(c.categoria_id, c.valor))
        ;(parcelasPagarMesResult.data || []).forEach((p: { valor: number; categoria_id: string | null }) => addValor(p.categoria_id, p.valor))
        ;(comprasFinalizadasMesResult.data || []).forEach((c: { valor_final: number; categoria_id: string | null }) => addValor(c.categoria_id, c.valor_final))

        const categoriasIdToNome = new Map(categoriasDespesasResult.data.map((c) => [c.id, c.nome]))
        const despesasPorCategoriaMap: { [key: string]: number } = {}
        Object.entries(despesasPorCategoriaId).forEach(([id, valor]) => {
          if (valor <= 0) return
          const nome = id === '__sem_categoria__' ? 'Sem categoria' : (categoriasIdToNome.get(id) ?? 'Sem categoria')
          despesasPorCategoriaMap[nome] = (despesasPorCategoriaMap[nome] ?? 0) + valor
        })

        const mapaCorDespesa = new Map(
          (categoriasDespesasResult.data as Array<{ id: string; nome: string; cor?: string | null }>).map((c) => [
            c.nome,
            c.cor && c.cor.trim() ? c.cor : '#6366f1',
          ])
        )
        const mapaIdDespesa = new Map(
          (categoriasDespesasResult.data as Array<{ id: string; nome: string }>).map((c) => [c.nome, c.id])
        )
        const despesasPorCategoriaData: DespesasPorCategoria[] = Object.entries(despesasPorCategoriaMap)
          .map(([categoria, valor]) => ({
            categoria,
            valor: Number(valor.toFixed(2)),
            porcentagem: totalContasPagar > 0
              ? Number(((valor / totalContasPagar) * 100).toFixed(1))
              : 0,
            cor: mapaCorDespesa.get(categoria) ?? COR_SEM_CATEGORIA,
            categoria_id: mapaIdDespesa.get(categoria) ?? null,
          }))
          .sort((a, b) => b.valor - a.valor)

        setDespesasPorCategoria(despesasPorCategoriaData)
      } else {
        setDespesasPorCategoria([])
      }

      // Vendas por categoria: agregar em memória a partir dos dados já carregados (evita N+1)
      if (categoriasReceitasResult.data && categoriasReceitasResult.data.length > 0) {
        const vendasPorCategoriaId: Record<string, number> = {}
        const addVenda = (categoriaId: string | null, valor: number) => {
          const key = categoriaId ?? '__sem_categoria__'
          vendasPorCategoriaId[key] = (vendasPorCategoriaId[key] ?? 0) + Number(valor || 0)
        }
        ;(vendasPorCategoriaMesResult.data || []).forEach((v: { valor_final: number; categoria_id: string | null }) => addVenda(v.categoria_id, v.valor_final))
        ;(parcelasVendasPorCategoriaMesResult.data || []).forEach((p: { valor: number; categoria_id: string | null }) => addVenda(p.categoria_id, p.valor))

        const categoriasReceitaIdToNome = new Map(categoriasReceitasResult.data.map((c) => [c.id, c.nome]))
        const vendasPorCategoriaMap: { [key: string]: number } = {}
        Object.entries(vendasPorCategoriaId).forEach(([id, valor]) => {
          if (valor <= 0) return
          const nome = id === '__sem_categoria__' ? 'Sem categoria' : (categoriasReceitaIdToNome.get(id) ?? 'Sem categoria')
          vendasPorCategoriaMap[nome] = (vendasPorCategoriaMap[nome] ?? 0) + valor
        })

        const totalVendasChart = Object.values(vendasPorCategoriaMap).reduce((s, v) => s + v, 0)
        const mapaCorReceita = new Map(
          (categoriasReceitasResult.data as Array<{ id: string; nome: string; cor?: string | null }>).map((c) => [
            c.nome,
            c.cor && c.cor.trim() ? c.cor : '#10b981',
          ])
        )
        const mapaIdReceita = new Map(
          (categoriasReceitasResult.data as Array<{ id: string; nome: string }>).map((c) => [c.nome, c.id])
        )
        const vendasPorCategoriaData: VendasPorCategoria[] = Object.entries(vendasPorCategoriaMap)
          .map(([categoria, valor]) => ({
            categoria,
            valor: Number(valor.toFixed(2)),
            porcentagem: totalVendasChart > 0
              ? Number(((valor / totalVendasChart) * 100).toFixed(1))
              : 0,
            cor: mapaCorReceita.get(categoria) ?? COR_SEM_CATEGORIA,
            categoria_id: mapaIdReceita.get(categoria) ?? null,
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
            categoria_id: null,
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

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowCheckoutSuccess(true)
      router.replace('/empresarial/dashboard', { scroll: false })
      const t = setTimeout(() => setShowCheckoutSuccess(false), 5000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

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
          <div className="animate-pulse emp-text-primary text-xl">Carregando...</div>
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
        {showCheckoutSuccess && (
          <div className="rounded-xl bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 text-center">
            Pagamento confirmado. Sua assinatura está ativa.
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold emp-text-primary mb-2">Dashboard</h1>
          <p className="emp-text-secondary">
            Visão geral das suas finanças empresariais
          </p>
        </div>

        {/* Seletor de mês: setas + dropdown */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 emp-bg-card rounded-full border emp-border">
            <button
              type="button"
              onClick={mesAnterior}
              className="p-1.5 rounded-full emp-text-muted hover:emp-text-primary transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--emp-bg-card-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              aria-label="Mês anterior"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <select
              value={valorMesSelect}
              onChange={(e) => onChangeMesSelect(e.target.value)}
              className="text-lg font-medium emp-text-primary min-w-[140px] text-center bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none appearance-none py-1 px-2"
              aria-label="Selecionar mês e ano"
            >
              {opcoesMesDropdown.map((opt) => (
                <option key={opt.value} value={opt.value} className="emp-bg-card emp-text-primary">
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={mesProximo}
              className="p-1.5 rounded-full emp-text-muted hover:emp-text-primary transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--emp-bg-card-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
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
                className="emp-bg-card rounded-lg shadow-lg p-6 border emp-border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="emp-text-muted text-sm mb-1">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                    {card.subtitle && (
                      <p className="emp-text-muted text-sm mt-1">{card.subtitle}</p>
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
        <div className="emp-bg-card rounded-lg shadow-lg border emp-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b emp-border-b">
            <h2 className="text-xl font-semibold emp-text-primary">Últimas Movimentações</h2>
            <Link
              href="/empresarial/vendas-receitas"
              className="text-sm font-medium text-neon hover:text-neon-dim transition-colors"
            >
              Ver tudo
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b emp-border-b">
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-muted uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-muted uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-muted uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium emp-text-muted uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--emp-border)]">
                {ultimasMovimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center emp-text-muted">
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
                      <tr key={mov.id} className="transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--emp-bg-main)' }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                isEntrada ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                              }`}
                            >
                              {isEntrada ? (
                                <FiPlus className="w-4 h-4" />
                              ) : (
                                <FiMinus className="w-4 h-4" />
                              )}
                            </div>
                            <span className="emp-text-primary text-sm">{mov.descricao}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm emp-text-secondary">{categoriaLabel}</td>
                        <td className="px-6 py-4 text-sm emp-text-secondary">{dataFormatada}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`text-sm font-medium ${
                              isEntrada ? 'text-green-500' : 'text-red-500'
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
          <div className="emp-bg-card rounded-lg shadow-lg p-6 border emp-border transition-all">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">
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
                        backgroundColor: CHART_BG, 
                        border: `1px solid ${CHART_BORDER}`,
                        borderRadius: '8px',
                        color: CHART_TEXT
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {despesasPorCategoria.map((item) => {
                    const href = item.categoria_id
                      ? `/empresarial/compras-despesas?categoria_id=${encodeURIComponent(item.categoria_id)}`
                      : null
                    const content = (
                      <>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.cor }}
                          />
                          <span className="emp-text-secondary">{item.categoria}</span>
                        </div>
                        <div className="text-right">
                          <span className="emp-text-primary font-semibold">R$ {item.valor.toFixed(2)}</span>
                          <span className="emp-text-muted ml-2">({item.porcentagem}%)</span>
                        </div>
                      </>
                    )
                    return (
                      <div key={item.categoria} className="flex items-center justify-between text-sm">
                        {href ? (
                          <Link
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer hover:opacity-90"
                            title={`Ver compras/despesas da categoria ${item.categoria}`}
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] emp-text-muted">
                <p>Nenhuma despesa registrada neste mês</p>
              </div>
            )}
          </div>

          {/* Gráfico de Vendas por Categoria */}
          <div className="emp-bg-card rounded-lg shadow-lg p-6 border emp-border transition-all">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">
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
                        backgroundColor: CHART_BG, 
                        border: `1px solid ${CHART_BORDER}`,
                        borderRadius: '8px',
                        color: CHART_TEXT
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {vendasPorCategoria.map((item) => {
                    const href = item.categoria_id
                      ? `/empresarial/vendas-receitas?categoria_id=${encodeURIComponent(item.categoria_id)}`
                      : null
                    const content = (
                      <>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.cor }}
                          />
                          <span className="emp-text-secondary">{item.categoria}</span>
                        </div>
                        <div className="text-right">
                          <span className="emp-text-primary font-semibold">R$ {item.valor.toFixed(2)}</span>
                          <span className="emp-text-muted ml-2">({item.porcentagem}%)</span>
                        </div>
                      </>
                    )
                    return (
                      <div key={item.categoria} className="flex items-center justify-between text-sm">
                        {href ? (
                          <Link
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer hover:opacity-90"
                            title={`Ver vendas da categoria ${item.categoria}`}
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] emp-text-muted">
                <p>Nenhuma venda registrada neste mês</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráficos de Despesas, Lucro e Faturamento Mensal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="emp-bg-card rounded-lg shadow-lg p-6 border emp-border transition-all">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">
              Despesas/Gastos da Empresa (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={despesasMensais} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke={CHART_BORDER} 
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_BORDER }}
                />
                <YAxis 
                  stroke={CHART_BORDER} 
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_BORDER }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: CHART_BG, 
                    border: `1px solid ${CHART_BORDER}`,
                    borderRadius: '8px',
                    color: CHART_TEXT
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

          <div className="emp-bg-card rounded-lg shadow-lg p-6 border emp-border transition-all">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">
              Lucro Total Mensal (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={lucroMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke={CHART_BORDER} 
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_BORDER }}
                />
                <YAxis 
                  stroke={CHART_BORDER} 
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_BORDER }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: CHART_BG, 
                    border: `1px solid ${CHART_BORDER}`,
                    borderRadius: '8px',
                    color: CHART_TEXT
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
          <div className="emp-bg-card rounded-lg shadow-lg p-6 border emp-border transition-all">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">
              Faturamento Mensal (Últimos 6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={300} minHeight={300}>
              <BarChart data={faturamentoMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke={CHART_BORDER} 
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_BORDER }}
                />
                <YAxis 
                  stroke={CHART_BORDER} 
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_BORDER }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: CHART_BG, 
                    border: `1px solid ${CHART_BORDER}`,
                    borderRadius: '8px',
                    color: CHART_TEXT
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

export default function DashboardEmpresarialPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[200px]">Carregando...</div>}>
      <DashboardEmpresarialContent />
    </Suspense>
  )
}
