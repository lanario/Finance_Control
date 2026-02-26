'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiCheck,
  FiX,
  FiFilter,
  FiCalendar,
  FiDollarSign,
  FiAlertCircle,
  FiShoppingBag,
  FiSearch,
  FiXCircle,
  FiCreditCard,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'
import { DateInput } from '@/components/ui/DateInput'

interface Compra {
  id: string
  fornecedor_id: string | null
  categoria_id: string | null
  descricao: string
  valor_total: number
  valor_desconto: number
  valor_final: number
  data_compra: string
  forma_pagamento: string | null
  status: 'finalizado' | 'em_andamento' | 'cancelado'
  observacoes: string | null
  fornecedor_nome?: string | null
  categoria_nome?: string | null
  /** Preenchido quando forma_pagamento = cartao_credito (tabela compras) */
  cartao_empresa_id?: string | null
  cartao_nome?: string | null
  /** 'compra' = da tabela compras; 'cartao_empresa' = compras_cartao_empresa; 'conta_pagar' = contas_a_pagar ou parcelas_contas_pagar; 'parcela_cartao' = parcela com vencimento no mês */
  origem?: 'compra' | 'cartao_empresa' | 'conta_pagar' | 'parcela_cartao'
  /** Para origem conta_pagar: id real da conta ou parcela (para link para Despesas) */
  contaPagarId?: string
  isParcelaPagar?: boolean
  /** Quando origem = compra e tem cartão: vem de compras_cartao_empresa */
  parcelada?: boolean
  total_parcelas?: number | null
  /** Parcelas previstas (parcelas_cartao_empresa) quando compra parcelada no cartão */
  parcelasPrevistas?: Array<{ data_vencimento: string; valor: number; numero_parcela: number; paga: boolean }>
}

interface Fornecedor {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
}

interface CartaoEmpresa {
  id: string
  nome: string
  /** Dia do vencimento da fatura (1-31) para cálculo das parcelas */
  vencimento?: number
}

interface ResumoCompras {
  totalCompras: number
  totalFinalizadas: number
  totalEmAndamento: number
  totalCanceladas: number
  valorTotalCompras: number
  valorFinalizadas: number
  valorEmAndamento: number
}

interface ComprasContentProps {
  /** Quando usado na pÃ¡gina unificada: exibe apenas o rÃ³tulo da seÃ§Ã£o em vez do tÃ­tulo principal */
  sectionLabel?: string
  hideMainTitle?: boolean
}

export function ComprasContent({ sectionLabel, hideMainTitle }: ComprasContentProps = {}) {
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const [compras, setCompras] = useState<Compra[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cartoesEmpresa, setCartoesEmpresa] = useState<CartaoEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  /** 'compra' = sem fornecedor (campo oculto); 'compra_com_fornecedor' = fornecedor obrigatÃ³rio */
  const [tipoCompra, setTipoCompra] = useState<'compra' | 'compra_com_fornecedor'>('compra')
  const [statusDropdownAberto, setStatusDropdownAberto] = useState<string | null>(null)
  const [statusDropdownRect, setStatusDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const [resumo, setResumo] = useState<ResumoCompras>({
    totalCompras: 0,
    totalFinalizadas: 0,
    totalEmAndamento: 0,
    totalCanceladas: 0,
    valorTotalCompras: 0,
    valorFinalizadas: 0,
    valorEmAndamento: 0,
  })

  /** Retorna [primeiro dia, último dia] no formato YYYY-MM-DD. Se mes === 'todos', retorna intervalo amplo (últimos 24 meses até 12 meses à frente). */
  function getMonthRange(mes: string): [string, string] {
    if (mes === 'todos') {
      const d = new Date()
      const dataInicio = new Date(d.getFullYear(), d.getMonth() - 24, 1)
      const dataFim = new Date(d.getFullYear(), d.getMonth() + 13, 0) // último dia do mês daqui a 12 meses
      return [
        dataInicio.toISOString().split('T')[0],
        dataFim.toISOString().split('T')[0],
      ]
    }
    const [y, m] = mes.split('-').map(Number)
    const first = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return [first, last]
  }

  /** OpÃ§Ãµes de mÃªs: 12 passados + atual + 24 futuros (projeÃ§Ã£o de parcelamentos) */
  /** OpÃ§Ãµes de mÃªs em ordem cronolÃ³gica (do mais antigo ao mais recente): 12 passados + atual + 24 futuros */
  function getMonthOptions(): { value: string; label: string }[] {
    const opts: { value: string; label: string }[] = []
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth()
    const inicio = new Date(anoAtual, mesAtual - 12, 1)
    const fim = new Date(anoAtual, mesAtual + 24, 1)
    for (let d = new Date(inicio); d <= fim; d.setMonth(d.getMonth() + 1)) {
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      opts.push({ value: `${y}-${String(m).padStart(2, '0')}`, label: `${nomes[m - 1]}/${y}` })
    }
    return opts
  }

  // Filtros (mês padrão = mês atual para exibir somente compras do mês)
  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'finalizadas' | 'em_andamento' | 'canceladas'>('todas')
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // Formulário
  const [formData, setFormData] = useState({
    fornecedor_id: '',
    categoria_id: '',
    descricao: '',
    valor_total: '',
    valor_desconto: '0',
    valor_final: '',
    data_compra: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    cartao_empresa_id: '',
    parcelada: false,
    total_parcelas: '1',
    status: 'em_andamento' as 'finalizado' | 'em_andamento' | 'cancelado',
    observacoes: '',
  })

  // FormulÃ¡rio de categoria
  const [formDataCategoria, setFormDataCategoria] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
  })

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  // Aplicar filtro de categoria vindo da URL (ex.: link do dashboard por categoria)
  useEffect(() => {
    const categoriaId = searchParams.get('categoria_id')
    if (categoriaId) {
      setFiltroCategoria(categoriaId)
    }
  }, [searchParams])

  useEffect(() => {
    if (session) {
      loadCompras()
    }
  }, [filtroStatus, filtroFornecedor, filtroCategoria, filtroMes, buscaTexto, session])

  const loadData = async () => {
    try {
      const userId = session?.user?.id
      
      // Carregar fornecedores
      const { data: fornecedoresData } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      setFornecedores(fornecedoresData || [])

      // Carregar categorias
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('user_id', userId)
        .eq('tipo', 'despesa')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      setCategorias(categoriasData || [])

      // Cartões da empresa (para compras em cartão de crédito; vencimento para cálculo de parcelas)
      const { data: cartoesData } = await supabase
        .from('cartoes_empresa')
        .select('id, nome, vencimento')
        .eq('user_id', userId)
        .order('nome', { ascending: true })
      setCartoesEmpresa((cartoesData || []) as CartaoEmpresa[])

      await loadCompras()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompras = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const [dataInicio, dataFim] = getMonthRange(filtroMes)
      const fornecedoresMap = new Map(fornecedores.map(f => [f.id, f.nome]))
      const categoriasMap = new Map(categorias.map(c => [c.id, c.nome]))
      const { data: cartoesList } = await supabase.from('cartoes_empresa').select('id, nome').eq('user_id', userId)
      const cartoesMap = new Map((cartoesList || []).map((c: { id: string; nome: string }) => [c.id, c.nome]))

      // 1) Compras da tabela compras
      let query = supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .gte('data_compra', dataInicio)
        .lte('data_compra', dataFim)
        .order('data_compra', { ascending: false })

      if (filtroStatus === 'finalizadas') query = query.eq('status', 'finalizado')
      else if (filtroStatus === 'em_andamento') query = query.eq('status', 'em_andamento')
      else if (filtroStatus === 'canceladas') query = query.eq('status', 'cancelado')
      if (filtroFornecedor) query = query.eq('fornecedor_id', filtroFornecedor)
      if (filtroCategoria) query = query.eq('categoria_id', filtroCategoria)

      const { data: comprasData, error: comprasError } = await query
      if (comprasError) throw comprasError

      // Para compras com cartão, buscar compras_cartao_empresa (id, parcelada, total_parcelas) para depois carregar parcelas
      const compraIdsComCartao = (comprasData || [])
        .filter((c: Record<string, unknown>) => c.cartao_empresa_id)
        .map((c: Record<string, unknown>) => c.id as string)
      const cartaoInfoPorCompraId = new Map<string, { id: string; parcelada: boolean; total_parcelas: number | null }>()
      if (compraIdsComCartao.length > 0) {
        const { data: cartaoRows } = await supabase
          .from('compras_cartao_empresa')
          .select('id, compra_id, parcelada, total_parcelas')
          .in('compra_id', compraIdsComCartao)
        cartaoRows?.forEach((r: { id: string; compra_id: string; parcelada: boolean; total_parcelas: number | null }) => {
          cartaoInfoPorCompraId.set(r.compra_id, { id: r.id, parcelada: !!r.parcelada, total_parcelas: r.total_parcelas ?? null })
        })
      }
      // Carregar parcelas previstas (parcelas_cartao_empresa) para compras parceladas
      const compraCartaoIdsParceladas = Array.from(cartaoInfoPorCompraId.values())
        .filter((x) => x.parcelada && x.id)
        .map((x) => x.id)
      const parcelasPorCompraCartaoId = new Map<string, Array<{ data_vencimento: string; valor: number; numero_parcela: number; paga: boolean }>>()
      if (compraCartaoIdsParceladas.length > 0) {
        const { data: parcelasData } = await supabase
          .from('parcelas_cartao_empresa')
          .select('compra_id, data_vencimento, valor, numero_parcela, paga')
          .in('compra_id', compraCartaoIdsParceladas)
          .order('numero_parcela', { ascending: true })
        parcelasData?.forEach((p: { compra_id: string; data_vencimento: string; valor: number; numero_parcela: number; paga: boolean }) => {
            const list = parcelasPorCompraCartaoId.get(p.compra_id) ?? []
            list.push({ data_vencimento: p.data_vencimento, valor: Number(p.valor), numero_parcela: p.numero_parcela, paga: !!p.paga })
            parcelasPorCompraCartaoId.set(p.compra_id, list)
          })
      }

      const comprasTabela: Compra[] = (comprasData || []).map((c: Record<string, unknown>) => {
        const compraId = c.id as string
        const cartaoInfo = cartaoInfoPorCompraId.get(compraId)
        const parcelasPrevistas = cartaoInfo?.id ? parcelasPorCompraCartaoId.get(cartaoInfo.id) ?? undefined : undefined
        return {
          id: compraId,
          fornecedor_id: c.fornecedor_id as string | null,
          categoria_id: c.categoria_id as string | null,
          descricao: c.descricao as string,
          valor_total: Number(c.valor_total),
          valor_desconto: Number(c.valor_desconto ?? 0),
          valor_final: Number(c.valor_final),
          data_compra: c.data_compra as string,
          forma_pagamento: c.forma_pagamento as string | null,
          status: c.status as 'finalizado' | 'em_andamento' | 'cancelado',
          observacoes: c.observacoes as string | null,
          fornecedor_nome: c.fornecedor_id ? fornecedoresMap.get(c.fornecedor_id as string) ?? null : null,
          categoria_nome: c.categoria_id ? categoriasMap.get(c.categoria_id as string) ?? null : null,
          cartao_empresa_id: (c.cartao_empresa_id as string) ?? null,
          cartao_nome: c.cartao_empresa_id ? cartoesMap.get(c.cartao_empresa_id as string) ?? null : null,
          origem: 'compra' as const,
          parcelada: cartaoInfo?.parcelada ?? false,
          total_parcelas: cartaoInfo?.total_parcelas ?? null,
          parcelasPrevistas,
        }
      })

      // 2) Compras diretas no cartão (compras_cartao_empresa sem vínculo com compra)
      const { data: comprasCartaoData, error: comprasCartaoError } = await supabase
        .from('compras_cartao_empresa')
        .select('*')
        .eq('user_id', userId)
        .is('compra_id', null)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false })

      if (comprasCartaoError) throw comprasCartaoError

      const comprasCartao: Compra[] = (comprasCartaoData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        fornecedor_id: null,
        categoria_id: null,
        descricao: c.descricao as string,
        valor_total: Number(c.valor),
        valor_desconto: 0,
        valor_final: Number(c.valor),
        data_compra: c.data as string,
        forma_pagamento: 'cartao_credito',
        status: 'finalizado' as const,
        observacoes: null,
        fornecedor_nome: null,
        categoria_nome: (c.categoria as string) || null,
        cartao_empresa_id: (c.cartao_id as string) ?? null,
        cartao_nome: c.cartao_id ? cartoesMap.get(c.cartao_id as string) ?? null : null,
        origem: 'cartao_empresa' as const,
        parcelada: !!(c.parcelada as boolean),
        total_parcelas: (c.total_parcelas as number) ?? null,
      }))

      // Filtros para compras do cartão (só finalizado; sem fornecedor; categoria por nome)
      let comprasCartaoFiltradas = comprasCartao
      if (filtroStatus === 'em_andamento' || filtroStatus === 'canceladas') comprasCartaoFiltradas = []
      if (filtroFornecedor) comprasCartaoFiltradas = []
      if (filtroCategoria) {
        const nomeCategoria = categorias.find(c => c.id === filtroCategoria)?.nome
        comprasCartaoFiltradas = comprasCartaoFiltradas.filter(c => c.categoria_nome === nomeCategoria)
      }

      // 3) Contas a pagar (mesma fonte do gráfico "Despesas do Mês por Categoria" no dashboard)
      const mapStatusContaPagar = (c: { status?: string | null; paga?: boolean }) => {
        if (c.status === 'cancelado') return 'cancelado' as const
        if (c.paga || c.status === 'aprovado') return 'finalizado' as const
        return 'em_andamento' as const
      }

      let queryContas = supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .eq('parcelada', false)
        .order('data_vencimento', { ascending: false })
      if (filtroStatus === 'finalizadas') queryContas = queryContas.eq('paga', true)
      else if (filtroStatus === 'em_andamento') queryContas = queryContas.eq('paga', false).neq('status', 'cancelado')
      else if (filtroStatus === 'canceladas') queryContas = queryContas.eq('status', 'cancelado')
      if (filtroFornecedor) queryContas = queryContas.eq('fornecedor_id', filtroFornecedor)
      if (filtroCategoria) queryContas = queryContas.eq('categoria_id', filtroCategoria)

      const { data: contasPagarData, error: contasPagarError } = await queryContas
      if (contasPagarError) throw contasPagarError

      const comprasContasPagar: Compra[] = (contasPagarData || []).map((c: Record<string, unknown>) => {
        const status = mapStatusContaPagar({
          status: c.status as string | null,
          paga: c.paga as boolean,
        })
        return {
          id: `conta_pagar_${c.id}`,
          fornecedor_id: c.fornecedor_id as string | null,
          categoria_id: c.categoria_id as string | null,
          descricao: c.descricao as string,
          valor_total: Number(c.valor),
          valor_desconto: 0,
          valor_final: Number(c.valor),
          data_compra: c.data_vencimento as string,
          forma_pagamento: (c.forma_pagamento as string) || null,
          status,
          observacoes: c.observacoes as string | null,
          fornecedor_nome: c.fornecedor_id ? fornecedoresMap.get(c.fornecedor_id as string) ?? null : null,
          categoria_nome: c.categoria_id ? categoriasMap.get(c.categoria_id as string) ?? null : null,
          cartao_empresa_id: null,
          cartao_nome: null,
          origem: 'conta_pagar' as const,
          contaPagarId: c.id as string,
          isParcelaPagar: false,
        }
      })

      let queryParcelas = supabase
        .from('parcelas_contas_pagar')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .order('data_vencimento', { ascending: false })
      if (filtroStatus === 'finalizadas') queryParcelas = queryParcelas.eq('paga', true)
      else if (filtroStatus === 'em_andamento') queryParcelas = queryParcelas.eq('paga', false).neq('status', 'cancelado')
      else if (filtroStatus === 'canceladas') queryParcelas = queryParcelas.eq('status', 'cancelado')
      if (filtroFornecedor) queryParcelas = queryParcelas.eq('fornecedor_id', filtroFornecedor)
      if (filtroCategoria) queryParcelas = queryParcelas.eq('categoria_id', filtroCategoria)

      const { data: parcelasPagarData, error: parcelasPagarError } = await queryParcelas
      if (parcelasPagarError) throw parcelasPagarError

      const comprasParcelasPagar: Compra[] = (parcelasPagarData || []).map((p: Record<string, unknown>) => {
        const status = mapStatusContaPagar({
          status: p.status as string | null,
          paga: p.paga as boolean,
        })
        return {
          id: `parcela_pagar_${p.id}`,
          fornecedor_id: p.fornecedor_id as string | null,
          categoria_id: p.categoria_id as string | null,
          descricao: p.descricao as string,
          valor_total: Number(p.valor),
          valor_desconto: 0,
          valor_final: Number(p.valor),
          data_compra: p.data_vencimento as string,
          forma_pagamento: (p.forma_pagamento as string) || null,
          status,
          observacoes: null,
          fornecedor_nome: p.fornecedor_id ? fornecedoresMap.get(p.fornecedor_id as string) ?? null : null,
          categoria_nome: p.categoria_id ? categoriasMap.get(p.categoria_id as string) ?? null : null,
          cartao_empresa_id: null,
          cartao_nome: null,
          origem: 'conta_pagar' as const,
          contaPagarId: p.id as string,
          isParcelaPagar: true,
        }
      })

      // 4) Parcelas do cartão empresa com vencimento no mês selecionado (aparecem nos meses futuros)
      let comprasParcelasCartao: Compra[] = []
      if (filtroStatus !== 'canceladas') {
        let queryParcelasCartao = supabase
          .from('parcelas_cartao_empresa')
          .select('*')
          .eq('user_id', userId)
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim)
          .order('data_vencimento', { ascending: false })
        if (filtroStatus === 'finalizadas') queryParcelasCartao = queryParcelasCartao.eq('paga', true)
        else if (filtroStatus === 'em_andamento') queryParcelasCartao = queryParcelasCartao.eq('paga', false)
        if (filtroCategoria) {
          const nomeCategoria = categorias.find(c => c.id === filtroCategoria)?.nome
          if (nomeCategoria) queryParcelasCartao = queryParcelasCartao.eq('categoria', nomeCategoria)
        }
        const { data: parcelasCartaoData, error: parcelasCartaoError } = await queryParcelasCartao
        if (parcelasCartaoError) throw parcelasCartaoError
        comprasParcelasCartao = (parcelasCartaoData || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        fornecedor_id: null,
        categoria_id: null,
        descricao: p.descricao as string,
        valor_total: Number(p.valor),
        valor_desconto: 0,
        valor_final: Number(p.valor),
        data_compra: p.data_vencimento as string,
        forma_pagamento: 'cartao_credito',
        status: (p.paga as boolean) ? ('finalizado' as const) : ('em_andamento' as const),
        observacoes: null,
        fornecedor_nome: null,
        categoria_nome: (p.categoria as string) || null,
        cartao_empresa_id: (p.cartao_id as string) ?? null,
        cartao_nome: p.cartao_id ? cartoesMap.get(p.cartao_id as string) ?? null : null,
        origem: 'parcela_cartao' as const,
        total_parcelas: (p.total_parcelas as number) ?? null,
      }))
      }

      const merged = [...comprasTabela, ...comprasCartaoFiltradas, ...comprasContasPagar, ...comprasParcelasPagar, ...comprasParcelasCartao].sort(
        (a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime()
      )

      let comprasFiltradas = merged
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        comprasFiltradas = comprasFiltradas.filter(
          (compra) =>
            compra.descricao.toLowerCase().includes(buscaLower) ||
            (compra.fornecedor_nome?.toLowerCase().includes(buscaLower) ?? false) ||
            (compra.categoria_nome?.toLowerCase().includes(buscaLower) ?? false)
        )
      }

      setCompras(comprasFiltradas)
      calcularResumo(merged)
    } catch (error) {
      console.error('Erro ao carregar compras:', error)
    }
  }

  const calcularResumo = (compras: Compra[]) => {
    const totalCompras = compras.length
    const totalFinalizadas = compras.filter(c => c.status === 'finalizado').length
    const totalEmAndamento = compras.filter(c => c.status === 'em_andamento').length
    const totalCanceladas = compras.filter(c => c.status === 'cancelado').length

    const valorTotalCompras = compras.reduce((sum, c) => sum + Number(c.valor_final), 0)
    const valorFinalizadas = compras
      .filter(c => c.status === 'finalizado')
      .reduce((sum, c) => sum + Number(c.valor_final), 0)
    const valorEmAndamento = compras
      .filter(c => c.status === 'em_andamento')
      .reduce((sum, c) => sum + Number(c.valor_final), 0)

    setResumo({
      totalCompras,
      totalFinalizadas,
      totalEmAndamento,
      totalCanceladas,
      valorTotalCompras,
      valorFinalizadas,
      valorEmAndamento,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      if (tipoCompra === 'compra_com_fornecedor' && !formData.fornecedor_id?.trim()) {
        alert('Selecione um fornecedor para "Compra com fornecedor".')
        return
      }

      const valorTotal = parseFloat(formData.valor_total)
      const valorDesconto = parseFloat(formData.valor_desconto || '0')
      const valorFinal = valorTotal - valorDesconto

      if (valorFinal < 0) {
        alert('O valor final não pode ser negativo')
        return
      }

      const isCartaoCredito = formData.forma_pagamento === 'cartao_credito'
      const cartaoId = (formData.cartao_empresa_id?.trim() || null) as string | null
      const compraData = {
        user_id: userId,
        fornecedor_id: tipoCompra === 'compra_com_fornecedor' ? (formData.fornecedor_id || null) : null,
        categoria_id: formData.categoria_id || null,
        descricao: formData.descricao,
        valor_total: valorTotal,
        valor_desconto: valorDesconto,
        valor_final: valorFinal,
        data_compra: formData.data_compra,
        forma_pagamento: formData.forma_pagamento,
        status: formData.status,
        observacoes: formData.observacoes || null,
        ...(isCartaoCredito && cartaoId ? { cartao_empresa_id: cartaoId } : {}),
      }

      if (editingCompra) {
        if (editingCompra.origem === 'cartao_empresa') {
          // Editar compra direta do cartão (tabela compras_cartao_empresa)
          const categoriaNome = categorias.find(c => c.id === formData.categoria_id)?.nome ?? formData.categoria_id ? 'Outros' : 'Outros'
          const { error } = await supabase
            .from('compras_cartao_empresa')
            .update({
              descricao: formData.descricao,
              valor: valorFinal,
              data: formData.data_compra,
              categoria: categoriaNome,
            })
            .eq('id', editingCompra.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('compras')
            .update(compraData)
            .eq('id', editingCompra.id)
          if (error) throw error
        }
      } else {
        const { data: novaCompra, error } = await supabase.from('compras').insert(compraData).select('id').single()
        if (error) throw error
        if (isCartaoCredito && cartaoId && novaCompra?.id) {
          const categoriaNome = categorias.find(c => c.id === formData.categoria_id)?.nome ?? 'Outros'
          // Número de parcelas: quando "Compra parcelada" marcado, usar valor do formulário (2 a 24)
          const rawTotal = parseInt(String(formData.total_parcelas || ''), 10)
          const totalParcelasNum = formData.parcelada
            ? Math.min(24, Math.max(2, Number.isInteger(rawTotal) && rawTotal >= 2 ? rawTotal : 2))
            : 1
          const parcelada = formData.parcelada && totalParcelasNum >= 2
          const cartao = cartoesEmpresa.find(c => c.id === cartaoId)
          const { data: compraCartaoInserida, error: errCartao } = await supabase
            .from('compras_cartao_empresa')
            .insert({
              user_id: userId,
              cartao_id: cartaoId,
              compra_id: novaCompra.id,
              descricao: formData.descricao,
              valor: valorFinal,
              data: formData.data_compra,
              categoria: categoriaNome,
              metodo_pagamento: 'cartao',
              parcelada,
              total_parcelas: parcelada ? totalParcelasNum : null,
            })
            .select('id')
            .single()
          if (errCartao) {
            console.error('Erro ao salvar compra no cartão:', errCartao)
            throw errCartao
          }
          // Sempre criar N parcelas no futuro quando parcelada: dividir valor total em N partes iguais
          if (parcelada && compraCartaoInserida?.id && totalParcelasNum >= 2) {
            const valorParcelaBase = Math.floor((valorFinal * 100) / totalParcelasNum) / 100
            const parcelasParaCriar: Array<{
              user_id: string
              compra_id: string
              cartao_id: string
              descricao: string
              valor: number
              numero_parcela: number
              total_parcelas: number
              data_vencimento: string
              categoria: string
              paga: boolean
            }> = []
            for (let i = 1; i <= totalParcelasNum; i++) {
              const isLast = i === totalParcelasNum
              const valorParcela = isLast
                ? Math.round((valorFinal - valorParcelaBase * (totalParcelasNum - 1)) * 100) / 100
                : valorParcelaBase
              const dataVencimento = calcularDataVencimentoParcela(formData.data_compra, i, totalParcelasNum, cartao)
              parcelasParaCriar.push({
                user_id: userId,
                compra_id: compraCartaoInserida.id,
                cartao_id: cartaoId,
                descricao: `${formData.descricao} - Parcela ${i}/${totalParcelasNum}`,
                valor: valorParcela,
                numero_parcela: i,
                total_parcelas: totalParcelasNum,
                data_vencimento: dataVencimento,
                categoria: categoriaNome,
                paga: false,
              })
            }
            const { error: errParcelas } = await supabase.from('parcelas_cartao_empresa').insert(parcelasParaCriar)
            if (errParcelas) {
              console.error('Erro ao salvar parcelas do cartão:', errParcelas)
              throw errParcelas
            }
          }
        }
      }

      setShowModal(false)
      setEditingCompra(null)
      resetForm()
      loadCompras()
    } catch (error: unknown) {
      console.error('Erro ao salvar compra:', error)
      const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : 'Erro ao salvar compra'
      alert(msg)
    }
  }

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra)
    setTipoCompra(compra.fornecedor_id ? 'compra_com_fornecedor' : 'compra')
    const categoriaId = compra.categoria_id || (compra.categoria_nome ? categorias.find(c => c.nome === compra.categoria_nome)?.id ?? '' : '')
    const parcelada = !!compra.parcelada
    const totalParcelas = compra.total_parcelas != null && compra.total_parcelas >= 2 ? compra.total_parcelas : 1
    setFormData({
      fornecedor_id: compra.fornecedor_id || '',
      categoria_id: categoriaId,
      descricao: compra.descricao,
      valor_total: compra.valor_total.toString(),
      valor_desconto: compra.valor_desconto.toString(),
      valor_final: compra.valor_final.toString(),
      data_compra: compra.data_compra,
      forma_pagamento: compra.forma_pagamento || 'pix',
      cartao_empresa_id: compra.cartao_empresa_id || '',
      parcelada,
      total_parcelas: String(totalParcelas),
      status: compra.status,
      observacoes: compra.observacoes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (compra: Compra) => {
    if (!confirm('Tem certeza que deseja excluir?')) return
    try {
      if (compra.origem === 'cartao_empresa') {
        const { error } = await supabase.from('compras_cartao_empresa').delete().eq('id', compra.id)
        if (error) throw error
      } else if (compra.origem === 'parcela_cartao') {
        const { error } = await supabase.from('parcelas_cartao_empresa').delete().eq('id', compra.id)
        if (error) throw error
      } else if (compra.origem !== 'conta_pagar') {
        const { error } = await supabase.from('compras').delete().eq('id', compra.id)
        if (error) throw error
      }
      loadCompras()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir')
    }
  }

  const handleAlterarStatus = async (id: string, novoStatus: 'finalizado' | 'em_andamento' | 'cancelado') => {
    try {
      const { error } = await supabase
        .from('compras')
        .update({ status: novoStatus })
        .eq('id', id)
      if (error) throw error
      setStatusDropdownAberto(null)
      setStatusDropdownRect(null)
      loadCompras()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status da compra')
    }
  }

  const abrirStatusDropdown = (compraId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setStatusDropdownAberto(compraId)
    setStatusDropdownRect({
      left: rect.left,
      top: rect.bottom + 6,
      width: Math.max(rect.width, 180),
    })
  }

  const fecharStatusDropdown = () => {
    setStatusDropdownAberto(null)
    setStatusDropdownRect(null)
  }

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      const { data: novaCategoria, error } = await supabase
        .from('categorias')
        .insert({
          user_id: userId,
          nome: formDataCategoria.nome,
          descricao: formDataCategoria.descricao || null,
          cor: formDataCategoria.cor,
          tipo: 'despesa',
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de categorias
      await loadData()

      // Selecionar a categoria recÃ©m-criada no formulÃ¡rio de compra
      setFormData({ ...formData, categoria_id: novaCategoria.id })

      // Fechar modal e resetar form
      setShowModalCategoria(false)
      setFormDataCategoria({
        nome: '',
        descricao: '',
        cor: '#6366f1',
      })

      alert('Categoria criada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error)
      if (error.code === '23505') {
        alert('Já existe uma categoria com este nome para despesas.')
      } else {
        alert('Erro ao criar categoria')
      }
    }
  }

  const resetForm = () => {
    setTipoCompra('compra')
    setFormData({
      fornecedor_id: '',
      categoria_id: '',
      descricao: '',
      valor_total: '',
      valor_desconto: '0',
      valor_final: '',
      data_compra: new Date().toISOString().split('T')[0],
      forma_pagamento: 'pix',
      cartao_empresa_id: '',
      parcelada: false,
      total_parcelas: '1',
      status: 'em_andamento',
      observacoes: '',
    })
    setEditingCompra(null)
  }

  /** Calcula a data de vencimento da parcela: mesesAdicionar = 1 (1ª = próximo mês), 2 (2ª = daqui 2 meses), etc. */
  function calcularDataVencimentoParcela(dataCompra: string, mesesAdicionar: number, _totalParcelas: number, cartao: CartaoEmpresa | undefined): string {
    const [y, m, d] = dataCompra.split('-').map(Number)
    // m é 1-12; trabalhar em meses 0-indexados para JS
    let mes = m - 1 + mesesAdicionar
    let ano = y
    while (mes > 11) {
      mes -= 12
      ano += 1
    }
    const diaVencimento = Math.min(cartao?.vencimento ?? 15, new Date(ano, mes + 1, 0).getDate())
    const dataVenc = new Date(ano, mes, diaVencimento)
    const yy = dataVenc.getFullYear()
    const mm = String(dataVenc.getMonth() + 1).padStart(2, '0')
    const dd = String(dataVenc.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  const getStatusBadge = (status: 'finalizado' | 'em_andamento' | 'cancelado') => {
    switch (status) {
      case 'finalizado':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Finalizado</span>
      case 'em_andamento':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Em Andamento</span>
      case 'cancelado':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Cancelado</span>
    }
  }

  const statusOpcoes: { value: 'finalizado' | 'em_andamento' | 'cancelado'; label: string }[] = [
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

  /** Formata YYYY-MM-DD para DD/MM/YYYY sem alterar o dia (evita -1 por timezone UTC). */
  const formatarData = (data: string) => {
    if (!data) return ''
    const parts = data.split('T')[0].split('-')
    if (parts.length !== 3) return data
    const [y, m, d] = parts
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  // Calcular valor final automaticamente
  useEffect(() => {
    const valorTotal = parseFloat(formData.valor_total || '0')
    const valorDesconto = parseFloat(formData.valor_desconto || '0')
    const valorFinal = Math.max(0, valorTotal - valorDesconto)
    setFormData((prev) => ({ ...prev, valor_final: valorFinal.toString() }))
  }, [formData.valor_total, formData.valor_desconto])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse emp-text-primary text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {hideMainTitle && sectionLabel ? (
              <h2 className="text-xl font-semibold emp-text-primary mb-1">{sectionLabel}</h2>
            ) : (
              <>
                <h1 className="text-3xl font-bold emp-text-primary mb-2">Compras/Despesas</h1>
                <p className="emp-text-muted">Gerencie compras e despesas (contas a pagar)</p>
              </>
            )}
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 hover:opacity-90 emp-text-primary px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nova Compra</span>
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="emp-bg-card rounded-lg p-4 border emp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Total de Compras</p>
                <p className="text-2xl font-bold emp-text-primary mt-1">{resumo.totalCompras}</p>
              </div>
              <FiShoppingBag className="w-8 h-8 text-neon" />
            </div>
          </div>

          <div className="emp-bg-card rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Finalizadas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{resumo.totalFinalizadas}</p>
                <p className="text-xs emp-text-muted mt-1">{formatarMoeda(resumo.valorFinalizadas)}</p>
              </div>
              <FiCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="emp-bg-card rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{resumo.totalEmAndamento}</p>
                <p className="text-xs emp-text-muted mt-1">{formatarMoeda(resumo.valorEmAndamento)}</p>
              </div>
              <FiCalendar className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="emp-bg-card rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="emp-text-muted text-sm">Canceladas</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{resumo.totalCanceladas}</p>
              </div>
              <FiXCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filtros â€” compactos: busca, status, fornecedor, categoria, mÃªs (padrÃ£o atual); ordem mais recente primeiro */}
        <div className="emp-bg-card rounded-lg p-3 border emp-border">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 emp-text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm emp-input-bg border emp-border rounded-lg emp-text-primary placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-neon"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as 'todas' | 'finalizadas' | 'em_andamento' | 'canceladas')}
              className="px-3 py-2 text-sm emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
            >
              <option value="todas">Todas</option>
              <option value="finalizadas">Finalizadas</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="canceladas">Canceladas</option>
            </select>
            <select
              value={filtroFornecedor}
              onChange={(e) => setFiltroFornecedor(e.target.value)}
              className="px-3 py-2 text-sm emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon min-w-[140px]"
            >
              <option value="">Todos fornecedores</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 text-sm emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon min-w-[140px]"
            >
              <option value="">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <label className="text-sm emp-text-muted whitespace-nowrap">Mês:</label>
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="px-3 py-2 text-sm emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon min-w-[140px]"
              >
                <option value="todos">Todos os meses</option>
                {getMonthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Compras */}
        <div className="emp-bg-card rounded-lg border emp-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="emp-input-bg/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium emp-text-secondary uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--emp-border)]">
                {compras.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center emp-text-muted">
                      Nenhuma compra encontrada
                    </td>
                  </tr>
                ) : (
                  compras.map((compra) => (
                    <tr key={compra.id} className="hover:emp-input-bg/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm emp-text-primary">{compra.descricao}</span>
                          {compra.parcelada && compra.parcelasPrevistas && compra.parcelasPrevistas.length > 0 && (
                            <span className="text-xs emp-text-muted">
                              {compra.parcelasPrevistas.length}x {formatarMoeda(compra.parcelasPrevistas[0]?.valor ?? 0)}/mês (pagamentos pendentes)
                            </span>
                          )}
                          {compra.origem === 'parcela_cartao' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-neon/20 text-neon border border-neon/40 w-fit">
                              Parcela cartão
                            </span>
                          )}
                          {compra.origem === 'conta_pagar' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-neon/20 text-neon border border-neon/40 w-fit">
                              Conta a pagar
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm emp-text-secondary">
                        {compra.fornecedor_nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm emp-text-secondary">
                        {compra.categoria_nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold emp-text-primary">
                        <div className="flex flex-col gap-0.5">
                          {formatarMoeda(Number(compra.valor_final))}
                          {compra.parcelada && compra.total_parcelas && compra.total_parcelas > 1 && (
                            <span className="text-xs font-normal emp-text-muted">Total em {compra.total_parcelas} parcelas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm emp-text-secondary">
                        {formatarData(compra.data_compra)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {compra.origem === 'cartao_empresa' || compra.origem === 'parcela_cartao' ? (
                          getStatusBadge(compra.status)
                        ) : compra.origem === 'conta_pagar' ? (
                          getStatusBadge(compra.status)
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => statusDropdownAberto === compra.id ? fecharStatusDropdown() : abrirStatusDropdown(compra.id, e)}
                            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-neon focus:ring-offset-2 focus:ring-offset-[var(--emp-bg-card)] rounded-full"
                            title="Clique para alterar o status"
                          >
                            {getStatusBadge(compra.status)}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {compra.origem === 'conta_pagar' ? (
                            <Link
                              href="/empresarial/despesas"
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neon/20 border border-neon/50 text-neon hover:bg-neon/30 transition-colors"
                            >
                              Ver em Despesas
                            </Link>
                          ) : compra.origem === 'parcela_cartao' ? (
                            <>
                              <Link
                                href="/empresarial/cartoes-empresa"
                                className="px-3 py-1.5 text-xs font-medium rounded-lg emp-bg-card border emp-border emp-text-primary hover:opacity-90 transition-colors"
                              >
                                Ver no Cartão
                              </Link>
                              <ActionButtons
                                onEdit={() => window.open('/empresarial/cartoes-empresa', '_self')}
                                onDelete={() => handleDelete(compra)}
                              />
                            </>
                          ) : (
                            <>
                              {compra.origem !== 'cartao_empresa' && compra.status !== 'finalizado' && (
                                <button
                                  type="button"
                                  onClick={() => handleAlterarStatus(compra.id, 'finalizado')}
                                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:scale-110 transition-all"
                                  title="Confirmar pagamento"
                                >
                                  <FiCheck className="w-4 h-4" />
                                </button>
                              )}
                              <ActionButtons
                                onEdit={() => handleEdit(compra)}
                                onDelete={() => handleDelete(compra)}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dropdown de status em portal (fora da tabela, sempre visível) */}
        {statusDropdownAberto && statusDropdownRect && typeof document !== 'undefined' &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                aria-hidden="true"
                onClick={fecharStatusDropdown}
              />
              <div
                className="fixed z-[9999] py-2 min-w-[200px] rounded-xl shadow-2xl border-2 border-neon/60 emp-bg-card"
                style={{
                  left: statusDropdownRect.left,
                  top: statusDropdownRect.top,
                  width: statusDropdownRect.width,
                }}
              >
                <p className="px-3 py-1.5 text-xs font-semibold emp-text-muted uppercase tracking-wider border-b emp-border mb-1">
                  Alterar status
                </p>
                {statusOpcoes.map((op) => {
                  const isSelected = compras.find((c) => c.id === statusDropdownAberto)?.status === op.value
                  const statusStyles = {
                    finalizado: isSelected
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 font-medium'
                      : 'text-green-300 hover:bg-green-500/10 border border-transparent',
                    em_andamento: isSelected
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium'
                      : 'text-yellow-300 hover:bg-yellow-500/10 border border-transparent',
                    cancelado: isSelected
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-medium'
                      : 'text-red-300 hover:bg-red-500/10 border border-transparent',
                  }
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => handleAlterarStatus(statusDropdownAberto, op.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${statusStyles[op.value]}`}
                    >
                      {op.label}
                    </button>
                  )
                })}
              </div>
            </>,
            document.body
          )}

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="emp-bg-card rounded-lg border emp-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold emp-text-primary">
                    {editingCompra ? 'Editar Compra' : 'Nova Compra'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="emp-text-muted hover:emp-text-primary transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm emp-text-muted mb-2">Tipo de compra</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoCompra('compra')
                          setFormData((prev) => ({ ...prev, fornecedor_id: '' }))
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          tipoCompra === 'compra'
                            ? 'emp-text-primary'
                            : 'emp-input-bg emp-border emp-text-secondary hover:border-gray-500'
                        }`}
                      >
                        Compra
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoCompra('compra_com_fornecedor')}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          tipoCompra === 'compra_com_fornecedor'
                            ? 'emp-text-primary'
                            : 'emp-input-bg emp-border emp-text-secondary hover:border-gray-500'
                        }`}
                      >
                        Compra com fornecedor
                      </button>
                    </div>
                    <p className="text-xs emp-text-muted mt-1">
                      {tipoCompra === 'compra' ? 'Sem vínculo com fornecedor.' : 'Fornecedor obrigatório.'}
                    </p>
                  </div>

                  <div className={`grid grid-cols-1 ${tipoCompra === 'compra_com_fornecedor' ? 'md:grid-cols-2' : ''} gap-4`}>
                    {tipoCompra === 'compra_com_fornecedor' && (
                      <div>
                        <label className="block text-sm emp-text-muted mb-1">Fornecedor *</label>
                        <select
                          value={formData.fornecedor_id}
                          onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                          required={tipoCompra === 'compra_com_fornecedor'}
                          className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                        >
                          <option value="">Selecione um fornecedor</option>
                          {fornecedores.map((fornecedor) => (
                            <option key={fornecedor.id} value={fornecedor.id}>
                              {fornecedor.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Categoria</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={formData.categoria_id}
                          onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                          className="flex-1 px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                        >
                          <option value="">Selecione uma categoria</option>
                          {categorias.map((categoria) => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowModalCategoria(true)}
                          className="px-3 py-2 hover:opacity-90 emp-text-primary rounded-lg transition-colors"
                          title="Nova categoria"
                        >
                          <FiPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Descrição *</label>
                    <input
                      type="text"
                      required
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                      placeholder="Ex: Compra de materiais"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Valor Total *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.valor_total}
                        onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Desconto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.valor_desconto}
                        onChange={(e) => setFormData({ ...formData, valor_desconto: e.target.value })}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Valor Final</label>
                      <input
                        type="text"
                        value={formatarMoeda(parseFloat(formData.valor_final || '0'))}
                        disabled
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateInput
                      label="Data da Compra"
                      labelClassName="emp-text-muted mb-1"
                      value={formData.data_compra}
                      onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                      required
                    />

                    <div>
                      <label className="block text-sm emp-text-muted mb-1">Forma de Pagamento</label>
                      <select
                        value={formData.forma_pagamento}
                        onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value, cartao_empresa_id: e.target.value === 'cartao_credito' ? formData.cartao_empresa_id : '' })}
                        className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="transferencia">Transferência</option>
                        <option value="boleto">Boleto</option>
                        <option value="cheque">Cheque</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="parcelado">Parcelado</option>
                      </select>
                    </div>
                  </div>

                  {formData.forma_pagamento === 'cartao_credito' && (
                    <>
                      <div>
                        <label className="block text-sm emp-text-muted mb-2">Cartão da empresa</label>
                        {cartoesEmpresa.length === 0 ? (
                          <p className="text-sm emp-text-muted py-2">Nenhum cartão cadastrado. Cadastre em Cartões Empresa.</p>
                        ) : (
                          <div className="space-y-1 rounded-lg border emp-border overflow-hidden">
                            {cartoesEmpresa.map((c) => {
                              const selected = formData.cartao_empresa_id === c.id
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, cartao_empresa_id: c.id })}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
                                    selected
                                      ? 'emp-bg-card border-[var(--emp-accent)] bg-[var(--emp-accent)]/10'
                                      : 'emp-input-bg border-transparent hover:bg-black/10 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <FiCreditCard className="w-5 h-5 emp-text-muted flex-shrink-0" />
                                  <span className="emp-text-primary font-medium">{c.nome}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                        <p className="text-xs emp-text-muted mt-1">Se escolher um cartão, a compra também aparecerá na aba Cartão Empresa.</p>
                      </div>
                      {formData.cartao_empresa_id && (
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.parcelada}
                              onChange={(e) => {
                                const checked = e.target.checked
                                const total = checked
                                  ? (Math.max(2, parseInt(formData.total_parcelas || '1', 10) || 1)).toString()
                                  : '1'
                                setFormData({ ...formData, parcelada: checked, total_parcelas: total })
                              }}
                              className="rounded border emp-border emp-input-bg text-[var(--emp-accent)] focus:ring-neon"
                            />
                            <span className="text-sm emp-text-primary">Compra parcelada</span>
                          </label>
                          {formData.parcelada && (
                            <div>
                              <label className="block text-sm emp-text-muted mb-1">Número de parcelas</label>
                              <input
                                type="number"
                                min={2}
                                max={24}
                                value={formData.total_parcelas}
                                onChange={(e) => {
                                  const v = e.target.value
                                  const num = parseInt(v, 10)
                                  setFormData({ ...formData, total_parcelas: v ? (num >= 2 ? String(num) : '2') : '2' })
                                }}
                                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                              />
                              <p className="text-xs emp-text-muted mt-1">Mínimo 2 parcelas. As parcelas aparecem em Cartão Empresa.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                    >
                      <option value="em_andamento">Em Andamento</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                      placeholder="Observações adicionais sobre a compra..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      className="px-4 py-2 emp-input-bg hover:opacity-90 emp-text-primary rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 hover:opacity-90 emp-text-primary rounded-lg transition-colors"
                    >
                      {editingCompra ? 'Salvar Alterações' : 'Criar Compra'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criar Categoria */}
        {showModalCategoria && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="emp-bg-card rounded-lg border emp-border w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold emp-text-primary">Nova Categoria de Compra</h2>
                  <button
                    onClick={() => {
                      setShowModalCategoria(false)
                      setFormDataCategoria({
                        nome: '',
                        descricao: '',
                        cor: '#6366f1',
                      })
                    }}
                    className="emp-text-muted hover:emp-text-primary transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCriarCategoria} className="space-y-4">
                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Nome da Categoria *</label>
                    <input
                      type="text"
                      required
                      value={formDataCategoria.nome}
                      onChange={(e) => setFormDataCategoria({ ...formDataCategoria, nome: e.target.value })}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                      placeholder="Ex: Materiais, Serviços, Equipamentos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Descrição</label>
                    <textarea
                      value={formDataCategoria.descricao}
                      onChange={(e) => setFormDataCategoria({ ...formDataCategoria, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                      placeholder="Descrição da categoria (opcional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm emp-text-muted mb-1">Cor</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formDataCategoria.cor}
                        onChange={(e) => setFormDataCategoria({ ...formDataCategoria, cor: e.target.value })}
                        className="w-16 h-10 emp-input-bg border emp-border rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formDataCategoria.cor}
                        onChange={(e) => setFormDataCategoria({ ...formDataCategoria, cor: e.target.value })}
                        className="flex-1 px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-neon"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModalCategoria(false)
                        setFormDataCategoria({
                          nome: '',
                          descricao: '',
                          cor: '#6366f1',
                        })
                      }}
                      className="px-4 py-2 emp-input-bg hover:opacity-90 emp-text-primary rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 hover:opacity-90 emp-text-primary rounded-lg transition-colors"
                    >
                      Criar Categoria
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
