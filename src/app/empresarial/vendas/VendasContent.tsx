'use client'

import { useEffect, useState } from 'react'
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
  FiAlertCircle,
  FiShoppingBag,
  FiSearch,
  FiTrendingUp,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

interface Venda {
  id: string
  cliente_id: string | null
  categoria_id: string | null
  descricao: string
  valor_total: number
  valor_desconto: number
  valor_final: number
  data_venda: string
  forma_pagamento: string | null
  status: 'pendente' | 'aprovado' | 'cancelado'
  parcelada: boolean
  total_parcelas: number
  observacoes: string | null
  tipo_venda?: 'servico' | 'produto'
  produto_id?: string | null
  servico_id?: string | null
  preco_custo?: number
  margem_lucro?: number
  cliente_nome?: string | null
  categoria_nome?: string | null
  produto_nome?: string | null
  servico_nome?: string | null
}

interface ParcelaVenda {
  id: string
  venda_id: string
  cliente_id: string | null
  categoria_id: string | null
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento: string | null
  recebida: boolean
  forma_pagamento: string | null
  parcela_numero: number
  total_parcelas: number
  status?: 'pendente' | 'aprovado' | 'cancelado'
  cliente_nome?: string | null
  categoria_nome?: string | null
}

interface Cliente {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
}

interface Produto {
  id: string
  nome: string
  valor_unitario: number
  preco_custo?: number
}

interface Servico {
  id: string
  nome: string
  valor_unitario: number
  descricao?: string
}

interface ResumoVendas {
  totalVendas: number
  totalPendentes: number
  totalPagas: number
  totalCanceladas: number
  valorTotalVendas: number
  valorPendente: number
  valorRecebido: number
}

interface VendasContentProps {
  sectionLabel?: string
  hideMainTitle?: boolean
}

export function VendasContent({ sectionLabel, hideMainTitle }: VendasContentProps = {}) {
  const { session } = useAuth()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [parcelas, setParcelas] = useState<ParcelaVenda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModalProduto, setShowModalProduto] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'servico' | 'produto'>('servico')
  
  // FormulÃ¡rios para criar produto/serviÃ§o
  const [formDataProduto, setFormDataProduto] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    valor_unitario: '',
    preco_custo: '',
    categoria_id: '',
    unidade: 'un',
    estoque: '0',
    estoque_minimo: '0',
    observacoes: '',
  })

  const [resumo, setResumo] = useState<ResumoVendas>({
    totalVendas: 0,
    totalPendentes: 0,
    totalPagas: 0,
    totalCanceladas: 0,
    valorTotalVendas: 0,
    valorPendente: 0,
    valorRecebido: 0,
  })

  /** Retorna [primeiro dia, Ãºltimo dia] do mÃªs no formato YYYY-MM-DD */
  function getMonthRange(mes: string): [string, string] {
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

  // Filtros (mÃªs padrÃ£o = atual; ordem = mais recente primeiro)
  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'aprovadas' | 'canceladas'>('todas')
  const [filtroCliente, setFiltroCliente] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // FormulÃ¡rio
  const [formData, setFormData] = useState({
    tipo_venda: 'servico' as 'servico' | 'produto',
    cliente_id: '',
    categoria_id: '',
    produto_id: '',
    servico_id: '',
    descricao: '',
    valor_total: '',
    preco_custo: '',
    valor_desconto: '0',
    valor_final: '',
    data_venda: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    status: 'pendente' as 'pendente' | 'aprovado' | 'cancelado',
    parcelada: false,
    total_parcelas: '1',
    observacoes: '',
  })

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      const userId = session?.user?.id
      
      // Carregar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      setClientes(clientesData || [])

      // Carregar categorias
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('user_id', userId)
        .eq('tipo', 'receita')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      setCategorias(categoriasData || [])

      // Carregar produtos
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('id, nome, valor_unitario')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      setProdutos(produtosData || [])

      // Carregar serviÃ§os
      const { data: servicosData } = await supabase
        .from('servicos')
        .select('id, nome, valor_unitario, descricao')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      setServicos(servicosData || [])

      await loadVendas()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVendas = async () => {
    try {
      const userId = session?.user?.id

      // Buscar vendas nÃ£o parceladas
      let query = supabase
        .from('vendas')
        .select('*')
        .eq('user_id', userId)
        .eq('parcelada', false)
        .order('data_venda', { ascending: false })

      // Aplicar filtros
      if (filtroStatus === 'pendentes') {
        query = query.eq('status', 'pendente')
      } else if (filtroStatus === 'aprovadas') {
        query = query.eq('status', 'aprovado')
      } else if (filtroStatus === 'canceladas') {
        query = query.eq('status', 'cancelado')
      }

      if (filtroCliente) {
        query = query.eq('cliente_id', filtroCliente)
      }

      if (filtroCategoria) {
        query = query.eq('categoria_id', filtroCategoria)
      }

      const [dataInicio, dataFim] = getMonthRange(filtroMes)
      query = query.gte('data_venda', dataInicio).lte('data_venda', dataFim)

      const { data: vendasData, error: vendasError } = await query

      if (vendasError) throw vendasError

      // Buscar parcelas
      let parcelasQuery = supabase
        .from('parcelas_vendas')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: true })

      // Aplicar mesmos filtros nas parcelas
      if (filtroCliente) {
        parcelasQuery = parcelasQuery.eq('cliente_id', filtroCliente)
      }

      if (filtroCategoria) {
        parcelasQuery = parcelasQuery.eq('categoria_id', filtroCategoria)
      }

      const [dataInicioP, dataFimP] = getMonthRange(filtroMes)
      parcelasQuery = parcelasQuery.gte('data_vencimento', dataInicioP).lte('data_vencimento', dataFimP)

      const { data: parcelasData, error: parcelasError } = await parcelasQuery

      if (parcelasError) throw parcelasError

      // Processar dados - buscar nomes de clientes, categorias, produtos e serviÃ§os
      const clientesMap = new Map(clientes.map(c => [c.id, c.nome]))
      const categoriasMap = new Map(categorias.map(c => [c.id, c.nome]))
      const produtosMap = new Map(produtos.map(p => [p.id, p.nome]))
      const servicosMap = new Map(servicos.map(s => [s.id, s.nome]))

      const vendasProcessadas = (vendasData || []).map((venda: any) => ({
        ...venda,
        cliente_nome: venda.cliente_id ? clientesMap.get(venda.cliente_id) || null : null,
        categoria_nome: venda.categoria_id ? categoriasMap.get(venda.categoria_id) || null : null,
        produto_nome: venda.produto_id ? produtosMap.get(venda.produto_id) || null : null,
        servico_nome: venda.servico_id ? servicosMap.get(venda.servico_id) || null : null,
        tipo_venda: venda.tipo_venda || 'servico',
        preco_custo: venda.preco_custo || 0,
        margem_lucro: venda.margem_lucro || 0,
      }))

      const parcelasProcessadas = (parcelasData || []).map((parcela: any) => ({
        ...parcela,
        cliente_nome: parcela.cliente_id ? clientesMap.get(parcela.cliente_id) || null : null,
        categoria_nome: parcela.categoria_id ? categoriasMap.get(parcela.categoria_id) || null : null,
      }))

      // Aplicar filtro de status nas parcelas (baseado em status ou recebida)
      let parcelasFiltradas = parcelasProcessadas
      if (filtroStatus === 'pendentes') {
        parcelasFiltradas = parcelasFiltradas.filter(p => (p.status || 'pendente') === 'pendente' && !p.recebida)
      } else if (filtroStatus === 'aprovadas') {
        parcelasFiltradas = parcelasFiltradas.filter(p => (p.status || 'pendente') === 'aprovado' || p.recebida)
      } else if (filtroStatus === 'canceladas') {
        parcelasFiltradas = parcelasFiltradas.filter(p => (p.status || 'pendente') === 'cancelado')
      }

      // Aplicar busca por texto
      let vendasFiltradas = vendasProcessadas
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        vendasFiltradas = vendasFiltradas.filter(
          (venda) =>
            venda.descricao.toLowerCase().includes(buscaLower) ||
            venda.cliente_nome?.toLowerCase().includes(buscaLower) ||
            venda.categoria_nome?.toLowerCase().includes(buscaLower)
        )
        parcelasFiltradas = parcelasFiltradas.filter(
          (parcela) =>
            parcela.descricao.toLowerCase().includes(buscaLower) ||
            parcela.cliente_nome?.toLowerCase().includes(buscaLower) ||
            parcela.categoria_nome?.toLowerCase().includes(buscaLower)
        )
      }

      setVendas(vendasFiltradas)
      setParcelas(parcelasFiltradas)

      // Calcular resumo
      calcularResumo(vendasProcessadas, parcelasProcessadas)
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    }
  }

  const calcularResumo = (vendas: Venda[], parcelas: ParcelaVenda[]) => {
    // Filtrar vendas e parcelas pela aba ativa
    const vendasFiltradas = vendas.filter(v => (v.tipo_venda || 'servico') === abaAtiva)
    const parcelasFiltradas = parcelas.filter(p => {
      // Para parcelas, precisamos verificar o tipo da venda principal
      // Por enquanto, vamos considerar todas as parcelas (pode ser melhorado depois)
      return true
    })
    
    const totalVendas = vendasFiltradas.length
    const totalPendentes = vendasFiltradas.filter(v => v.status === 'pendente').length
    const totalPagas = vendasFiltradas.filter(v => v.status === 'aprovado').length
    const totalCanceladas = vendasFiltradas.filter(v => v.status === 'cancelado').length

    const valorTotalVendas = vendasFiltradas.reduce((sum, v) => sum + Number(v.valor_final), 0)
    const valorPendente = vendasFiltradas
      .filter(v => v.status === 'pendente')
      .reduce((sum, v) => sum + Number(v.valor_final), 0) +
      parcelasFiltradas
        .filter(p => (p.status || 'pendente') === 'pendente' && !p.recebida)
        .reduce((sum, p) => sum + Number(p.valor), 0)
    const valorRecebido = vendasFiltradas
      .filter(v => v.status === 'aprovado')
      .reduce((sum, v) => sum + Number(v.valor_final), 0) +
      parcelasFiltradas
        .filter(p => (p.status || 'pendente') === 'aprovado' || p.recebida)
        .reduce((sum, p) => sum + Number(p.valor), 0)

    setResumo({
      totalVendas,
      totalPendentes,
      totalPagas,
      totalCanceladas,
      valorTotalVendas,
      valorPendente,
      valorRecebido,
    })
  }

  useEffect(() => {
    if (session) {
      loadVendas()
    }
  }, [filtroStatus, filtroCliente, filtroCategoria, filtroMes, buscaTexto, abaAtiva, session])

  const calcularValorFinal = () => {
    const valorTotal = parseFloat(formData.valor_total) || 0
    const valorDesconto = parseFloat(formData.valor_desconto) || 0
    const valorFinal = Math.max(0, valorTotal - valorDesconto)
    setFormData(prev => ({ ...prev, valor_final: valorFinal.toFixed(2) }))
  }

  useEffect(() => {
    calcularValorFinal()
  }, [formData.valor_total, formData.valor_desconto])

  const calcularMargemLucro = () => {
    if (formData.tipo_venda === 'produto') {
      const precoCusto = parseFloat(formData.preco_custo) || 0
      const valorFinal = parseFloat(formData.valor_final) || 0
      
      if (precoCusto > 0 && valorFinal > 0) {
        const margem = ((valorFinal - precoCusto) / precoCusto) * 100
        return margem.toFixed(2)
      }
    }
    return '0'
  }

  // Quando selecionar um produto, preencher automaticamente
  useEffect(() => {
    if (formData.tipo_venda === 'produto' && formData.produto_id) {
      const produtoSelecionado = produtos.find(p => p.id === formData.produto_id)
      if (produtoSelecionado) {
        setFormData(prev => ({
          ...prev,
          descricao: produtoSelecionado.nome,
          valor_total: produtoSelecionado.valor_unitario.toString(),
        }))
      }
    }
  }, [formData.produto_id, formData.tipo_venda, produtos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      const valorTotal = parseFloat(formData.valor_total)
      const valorDesconto = parseFloat(formData.valor_desconto) || 0
      const valorFinal = Math.max(0, valorTotal - valorDesconto)

      if (editingVenda) {
        // Verificar se o status mudou
        const statusAnterior = editingVenda.status || 'pendente'
        const novoStatus = formData.status

        // Editar venda existente
        const precoCusto = formData.tipo_venda === 'produto' ? parseFloat(formData.preco_custo) || 0 : 0
        const { error } = await supabase
          .from('vendas')
          .update({
            tipo_venda: formData.tipo_venda,
            produto_id: formData.tipo_venda === 'produto' ? (formData.produto_id || null) : null,
            servico_id: formData.tipo_venda === 'servico' ? (formData.servico_id || null) : null,
            preco_custo: precoCusto,
            cliente_id: formData.cliente_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor_total: valorTotal,
            valor_desconto: valorDesconto,
            valor_final: valorFinal,
            data_venda: formData.data_venda,
            forma_pagamento: formData.forma_pagamento,
            status: novoStatus,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
            observacoes: formData.observacoes || null,
          })
          .eq('id', editingVenda.id)

        if (error) throw error

        // Atualizar fluxo de caixa se o status mudou
        if (statusAnterior !== novoStatus) {
          if (novoStatus === 'aprovado' && statusAnterior !== 'aprovado') {
            // Criar movimentaÃ§Ã£o no fluxo de caixa
            await supabase.from('fluxo_caixa').insert({
              user_id: userId,
              tipo: 'entrada',
              origem: 'venda',
              origem_id: editingVenda.id,
              descricao: `Venda: ${formData.descricao}`,
              valor: valorFinal,
              data_movimentacao: formData.data_venda,
              forma_pagamento: formData.forma_pagamento || 'pix',
            })
          } else if ((novoStatus === 'cancelado' || novoStatus === 'pendente') && statusAnterior === 'aprovado') {
            // Remover movimentaÃ§Ã£o do fluxo de caixa
            await supabase
              .from('fluxo_caixa')
              .delete()
              .eq('user_id', userId)
              .eq('origem', 'venda')
              .eq('origem_id', editingVenda.id)
          }
        }

        // Se for parcelada, criar parcelas
        if (formData.parcelada) {
          // Deletar parcelas antigas
          await supabase
            .from('parcelas_vendas')
            .delete()
            .eq('venda_id', editingVenda.id)

          // Criar novas parcelas
          const totalParcelas = parseInt(formData.total_parcelas)
          const valorParcela = valorFinal / totalParcelas
          const dataVenda = new Date(formData.data_venda)

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimentoParcela = new Date(dataVenda)
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + i)

            await supabase.from('parcelas_vendas').insert({
              user_id: userId,
              venda_id: editingVenda.id,
              cliente_id: formData.cliente_id || null,
              categoria_id: formData.categoria_id || null,
              descricao: `${formData.descricao} - Parcela ${i + 1}/${totalParcelas}`,
              valor: valorParcela,
              data_vencimento: dataVencimentoParcela.toISOString().split('T')[0],
              forma_pagamento: formData.forma_pagamento,
              parcela_numero: i + 1,
              total_parcelas: totalParcelas,
            })
          }
        }
      } else {
        // Criar nova venda
        const statusVenda = formData.status
        const precoCusto = formData.tipo_venda === 'produto' ? parseFloat(formData.preco_custo) || 0 : 0
        const { data: novaVenda, error } = await supabase
          .from('vendas')
          .insert({
            user_id: userId,
            tipo_venda: formData.tipo_venda,
            produto_id: formData.tipo_venda === 'produto' ? (formData.produto_id || null) : null,
            servico_id: formData.tipo_venda === 'servico' ? (formData.servico_id || null) : null,
            preco_custo: precoCusto,
            cliente_id: formData.cliente_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor_total: valorTotal,
            valor_desconto: valorDesconto,
            valor_final: valorFinal,
            data_venda: formData.data_venda,
            forma_pagamento: formData.forma_pagamento,
            status: statusVenda,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
            observacoes: formData.observacoes || null,
          })
          .select()
          .single()

        if (error) throw error

        // Se status for aprovado, criar movimentaÃ§Ã£o no fluxo de caixa
        if (statusVenda === 'aprovado' && novaVenda && !formData.parcelada) {
          await supabase.from('fluxo_caixa').insert({
            user_id: userId,
            tipo: 'entrada',
            origem: 'venda',
            origem_id: novaVenda.id,
            descricao: `Venda: ${formData.descricao}`,
            valor: valorFinal,
            data_movimentacao: formData.data_venda,
            forma_pagamento: formData.forma_pagamento || 'pix',
          })
        }

        // Se for parcelada, criar parcelas
        if (formData.parcelada && novaVenda) {
          const totalParcelas = parseInt(formData.total_parcelas)
          const valorParcela = valorFinal / totalParcelas
          const dataVenda = new Date(formData.data_venda)

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimentoParcela = new Date(dataVenda)
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + i)

            const parcelaStatus = statusVenda === 'aprovado' ? 'aprovado' : 'pendente'
            const { data: novaParcela } = await supabase.from('parcelas_vendas').insert({
              user_id: userId,
              venda_id: novaVenda.id,
              cliente_id: formData.cliente_id || null,
              categoria_id: formData.categoria_id || null,
              descricao: `${formData.descricao} - Parcela ${i + 1}/${totalParcelas}`,
              valor: valorParcela,
              data_vencimento: dataVencimentoParcela.toISOString().split('T')[0],
              forma_pagamento: formData.forma_pagamento,
              parcela_numero: i + 1,
              total_parcelas: totalParcelas,
              status: parcelaStatus,
            }).select().single()

            // Se parcela for aprovada, criar movimentaÃ§Ã£o no fluxo de caixa
            if (parcelaStatus === 'aprovado' && novaParcela) {
              await supabase.from('fluxo_caixa').insert({
                user_id: userId,
                tipo: 'entrada',
                origem: 'venda',
                origem_id: novaParcela.id,
                descricao: `${formData.descricao} - Parcela ${i + 1}/${totalParcelas}`,
                valor: valorParcela,
                data_movimentacao: dataVencimentoParcela.toISOString().split('T')[0],
                forma_pagamento: formData.forma_pagamento || 'pix',
              })
            }
          }
        }
      }

      setShowModal(false)
      setEditingVenda(null)
      resetForm()
      loadVendas()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('Erro ao salvar venda')
    }
  }

  const handleEdit = (venda: Venda) => {
    setEditingVenda(venda)
    const tipoVenda = venda.tipo_venda || 'servico'
    // Atualizar a aba ativa para corresponder ao tipo da venda sendo editada
    setAbaAtiva(tipoVenda)
    setFormData({
      tipo_venda: tipoVenda,
      produto_id: venda.produto_id || '',
      servico_id: (venda as any).servico_id || '',
      preco_custo: venda.preco_custo?.toString() || '',
      cliente_id: venda.cliente_id || '',
      categoria_id: venda.categoria_id || '',
      descricao: venda.descricao,
      valor_total: venda.valor_total.toString(),
      valor_desconto: venda.valor_desconto.toString(),
      valor_final: venda.valor_final.toString(),
      data_venda: venda.data_venda,
      forma_pagamento: venda.forma_pagamento || 'pix',
      status: venda.status,
      parcelada: venda.parcelada,
      total_parcelas: venda.total_parcelas.toString(),
      observacoes: venda.observacoes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return

    try {
      const userId = session?.user?.id
      if (!userId) return

      // Deletar movimentaÃ§Ãµes do fluxo de caixa relacionadas Ã  venda principal
      await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('user_id', userId)
        .eq('origem', 'venda')
        .eq('origem_id', id)

      // Buscar parcelas antes de deletar
      const { data: parcelas } = await supabase
        .from('parcelas_vendas')
        .select('id')
        .eq('venda_id', id)

      if (parcelas && parcelas.length > 0) {
        const parcelasIds = parcelas.map(p => p.id)
        // Deletar movimentaÃ§Ãµes das parcelas
        await supabase
          .from('fluxo_caixa')
          .delete()
          .eq('user_id', userId)
          .eq('origem', 'venda')
          .in('origem_id', parcelasIds)
      }

      // Deletar parcelas primeiro
      await supabase.from('parcelas_vendas').delete().eq('venda_id', id)
      
      // Deletar venda
      const { error } = await supabase.from('vendas').delete().eq('id', id)
      if (error) throw error

      loadVendas()
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      alert('Erro ao excluir venda')
    }
  }

  const handleMarcarComoPaga = async (id: string, isParcela: boolean = false) => {
    try {
      if (isParcela) {
        const hoje = new Date().toISOString().split('T')[0]
        const { error } = await supabase
          .from('parcelas_vendas')
          .update({
            recebida: true,
            data_recebimento: hoje,
          })
          .eq('id', id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vendas')
          .update({
            status: 'aprovado',
          })
          .eq('id', id)

        if (error) throw error
      }

      loadVendas()
    } catch (error) {
      console.error('Erro ao marcar como paga:', error)
      alert('Erro ao marcar como paga')
    }
  }

  const resetForm = () => {
    setFormData({
      tipo_venda: abaAtiva,
      produto_id: '',
      servico_id: '',
      preco_custo: '',
      cliente_id: '',
      categoria_id: '',
      descricao: '',
      valor_total: '',
      valor_desconto: '0',
      valor_final: '',
      data_venda: new Date().toISOString().split('T')[0],
      forma_pagamento: 'pix',
      status: 'pendente' as 'pendente' | 'aprovado' | 'cancelado',
      parcelada: false,
      total_parcelas: '1',
      observacoes: '',
    })
    setEditingVenda(null)
  }

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      const { error } = await supabase
        .from('produtos')
        .insert({
          user_id: userId,
          nome: formDataProduto.nome,
          codigo: formDataProduto.codigo || null,
          descricao: formDataProduto.descricao || null,
          valor_unitario: parseFloat(formDataProduto.valor_unitario) || 0,
          categoria_id: formDataProduto.categoria_id || null,
          unidade: formDataProduto.unidade,
          estoque: parseFloat(formDataProduto.estoque) || 0,
          estoque_minimo: parseFloat(formDataProduto.estoque_minimo) || 0,
          observacoes: formDataProduto.observacoes || null,
          ativo: true,
        })

      if (error) throw error

      alert('Produto criado com sucesso!')
      setShowModalProduto(false)
      setFormDataProduto({
        nome: '',
        codigo: '',
        descricao: '',
        valor_unitario: '',
        preco_custo: '',
        categoria_id: '',
        unidade: 'un',
        estoque: '0',
        estoque_minimo: '0',
        observacoes: '',
      })
      await loadData()
    } catch (error) {
      console.error('Erro ao criar produto:', error)
      alert('Erro ao criar produto')
    }
  }

  const handleAlterarStatus = async (id: string, novoStatus: 'pendente' | 'aprovado' | 'cancelado', isParcela: boolean = false) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const table = isParcela ? 'parcelas_vendas' : 'vendas'

      const updateData: any = {
        status: novoStatus,
      }

      // Buscar a venda atual para verificar status anterior
      const { data: vendaAtual, error: vendaAtualError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (vendaAtualError) throw vendaAtualError

      const statusAnterior = vendaAtual.status || 'pendente'
      const hoje = new Date().toISOString().split('T')[0]

      if (novoStatus === 'aprovado') {
        // Ao aprovar, marcar como recebida/paga
        if (isParcela) {
          updateData.recebida = true
          updateData.data_recebimento = hoje
        }

        // Criar movimentaÃ§Ã£o no fluxo de caixa apenas se nÃ£o estava aprovado antes
        if (statusAnterior !== 'aprovado') {
          const valor = isParcela ? Number(vendaAtual.valor) : Number(vendaAtual.valor_final)
          const descricao = isParcela 
            ? vendaAtual.descricao 
            : `Venda: ${vendaAtual.descricao}`
          const dataMovimentacao = isParcela ? vendaAtual.data_vencimento : vendaAtual.data_venda

          await supabase.from('fluxo_caixa').insert({
            user_id: userId,
            tipo: 'entrada',
            origem: 'venda',
            origem_id: id,
            descricao,
            valor,
            data_movimentacao: dataMovimentacao,
            forma_pagamento: vendaAtual.forma_pagamento || 'pix',
          })
        }
      } else if (novoStatus === 'cancelado' || novoStatus === 'pendente') {
        // Ao cancelar ou voltar para pendente, desmarcar como recebida se estiver recebida
        if (isParcela) {
          updateData.recebida = false
          updateData.data_recebimento = null
        }

        // Remover movimentaÃ§Ã£o do fluxo de caixa se estava aprovado antes
        if (statusAnterior === 'aprovado') {
          await supabase
            .from('fluxo_caixa')
            .delete()
            .eq('user_id', userId)
            .eq('origem', 'venda')
            .eq('origem_id', id)
        }
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      loadVendas()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status')
    }
  }

  const isVencida = (venda: Venda | ParcelaVenda, hoje: string): boolean => {
    const dataVencimento = 'data_vencimento' in venda ? venda.data_vencimento : venda.data_venda
    return dataVencimento < hoje
  }

  const getStatusEfetivo = (venda: Venda | ParcelaVenda): 'pendente' | 'aprovado' | 'cancelado' | 'vencida' => {
    const hoje = new Date().toISOString().split('T')[0]
    const status = 'status' in venda ? venda.status : (venda as ParcelaVenda).status || 'pendente'
    
    if (status === 'cancelado') {
      return 'cancelado'
    } else if (status === 'aprovado' || ('recebida' in venda && venda.recebida)) {
      return 'aprovado'
    } else if (isVencida(venda, hoje)) {
      return 'vencida'
    } else {
      return 'pendente'
    }
  }

  const getStatusBadge = (venda: Venda) => {
    if (venda.status === 'aprovado') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Recebido</span>
    } else if (venda.status === 'cancelado') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Cancelado</span>
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
    }
  }

  const getStatusBadgeParcela = (parcela: ParcelaVenda) => {
    const hoje = new Date().toISOString().split('T')[0]
    
    if (parcela.status === 'aprovado' || parcela.recebida) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Recebida</span>
    } else if (parcela.status === 'cancelado') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Cancelado</span>
    } else if (parcela.data_vencimento < hoje) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Vencida</span>
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
    }
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

  const limparMovimentacoesOrfas = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Buscar todas as vendas e parcelas existentes
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('id')
        .eq('user_id', userId)

      const { data: parcelasData } = await supabase
        .from('parcelas_vendas')
        .select('id')
        .eq('user_id', userId)

      const idsValidos = new Set([
        ...(vendasData || []).map(v => v.id),
        ...(parcelasData || []).map(p => p.id)
      ])

      // Buscar todas as movimentaÃ§Ãµes de vendas
      const { data: movimentacoes } = await supabase
        .from('fluxo_caixa')
        .select('id, origem, origem_id')
        .eq('user_id', userId)
        .eq('origem', 'venda')

      if (movimentacoes) {
        const movimentacoesOrfas = movimentacoes.filter(
          mov => !idsValidos.has(mov.origem_id || '')
        )

        if (movimentacoesOrfas.length > 0) {
          const idsOrfas = movimentacoesOrfas.map(m => m.id)
          const { error } = await supabase
            .from('fluxo_caixa')
            .delete()
            .in('id', idsOrfas)

          if (error) throw error

          alert(`${movimentacoesOrfas.length} movimentação(ões) órfã(s) foram removida(s). O saldo será recalculado.`)
          await loadVendas()
        } else {
          alert('Nenhuma movimentação órfã encontrada. Tudo está sincronizado!')
        }
      }
    } catch (error) {
      console.error('Erro ao limpar movimentações órfãs:', error)
      alert('Erro ao limpar movimentações órfãs')
    }
  }

  const todasVendas = [...vendas, ...parcelas.map(p => ({
    id: p.id,
    venda_id: p.venda_id,
    cliente_id: p.cliente_id,
    categoria_id: p.categoria_id,
    descricao: p.descricao,
    valor_total: p.valor,
    valor_desconto: 0,
    valor_final: p.valor,
    data_venda: p.data_vencimento,
    forma_pagamento: p.forma_pagamento,
    status: p.status || (p.recebida ? 'aprovado' as const : 'pendente' as const),
    parcelada: true,
    total_parcelas: p.total_parcelas,
    observacoes: null,
    cliente_nome: p.cliente_nome,
    categoria_nome: p.categoria_nome,
    parcela_numero: p.parcela_numero,
    recebida: p.recebida,
    tipo_venda: (p as any).tipo_venda || 'servico' as 'servico' | 'produto',
  }))]

  // Filtrar vendas pela aba ativa
  const vendasFiltradas = todasVendas.filter(venda => {
    const tipoVenda = (venda as Venda).tipo_venda || 'servico'
    return tipoVenda === abaAtiva
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {hideMainTitle && sectionLabel ? (
              <h2 className="text-xl font-semibold text-white">{sectionLabel}</h2>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white">Vendas/Receitas</h1>
                <p className="text-gray-400 mt-1">Gerencie vendas e receitas (contas a receber)</p>
              </>
            )}
          </div>
          <button
            onClick={() => {
              resetForm()
              setFormData(prev => ({ ...prev, tipo_venda: abaAtiva }))
              setShowModal(true)
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              abaAtiva === 'servico'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <FiPlus className="w-5 h-5" />
            <span>Nova {abaAtiva === 'servico' ? 'Venda de Serviço' : 'Venda de Produto'}</span>
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-1">
          <div className="flex gap-2">
            <button
              onClick={() => setAbaAtiva('servico')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                abaAtiva === 'servico'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FiShoppingBag className="w-5 h-5" />
                <span>Vendas por Serviço</span>
              </div>
            </button>
            <button
              onClick={() => setAbaAtiva('produto')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                abaAtiva === 'produto'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FiShoppingBag className="w-5 h-5" />
                <span>Vendas por Produto</span>
              </div>
            </button>
          </div>
        </div>

        {/* Botão para cadastrar novo produto (serviços são cadastrados em Produtos e Serviços) */}
        {abaAtiva === 'produto' && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowModalProduto(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
            >
              <FiPlus className="w-4 h-4" />
              <span>Cadastrar Novo Produto</span>
            </button>
          </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Vendas</p>
                <p className="text-2xl font-bold text-white mt-1">{resumo.totalVendas}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FiShoppingBag className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{resumo.totalPendentes}</p>
                <p className="text-sm text-gray-400 mt-1">{formatarMoeda(resumo.valorPendente)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pagas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{resumo.totalPagas}</p>
                <p className="text-sm text-gray-400 mt-1">{formatarMoeda(resumo.valorRecebido)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FiCheck className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Valor Total</p>
                <p className="text-2xl font-bold text-white mt-1">{formatarMoeda(resumo.valorTotalVendas)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros â€” compactos: busca, status, cliente, categoria, mÃªs (padrÃ£o atual); ordem mais recente primeiro */}
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as 'todas' | 'pendentes' | 'aprovadas' | 'canceladas')}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todas">Todas</option>
              <option value="pendentes">Pendentes</option>
              <option value="aprovadas">Aprovadas</option>
              <option value="canceladas">Canceladas</option>
            </select>
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
            >
              <option value="">Todos clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
            >
              <option value="">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <label className="text-sm text-gray-400 whitespace-nowrap">Mês:</label>
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[110px]"
              >
                {getMonthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Margem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {vendasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      Nenhuma venda de {abaAtiva === 'servico' ? 'serviço' : 'produto'} encontrada
                    </td>
                  </tr>
                ) : (
                  vendasFiltradas.map((venda) => {
                    const isParcela = 'parcela_numero' in venda && (venda as any).parcela_numero !== undefined
                    const statusBadge = isParcela 
                      ? getStatusBadgeParcela(venda as any)
                      : getStatusBadge(venda as Venda)
                    
                    return (
                      <tr key={venda.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatarData(venda.data_venda)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const tipoVenda = (venda as Venda).tipo_venda || 'servico'
                            return (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                tipoVenda === 'produto'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              }`}>
                                {tipoVenda === 'produto' ? 'Produto' : 'Serviço'}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {venda.descricao}
                          {isParcela && (
                            <span className="ml-2 text-xs text-gray-400">
                              (Parcela {venda.total_parcelas > 1 ? `${(venda as any).parcela_numero}/${venda.total_parcelas}` : ''})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {venda.cliente_nome || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {venda.categoria_nome || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {formatarMoeda(venda.valor_final)}
                          {venda.valor_desconto > 0 && (
                            <span className="block text-xs text-gray-400 line-through">
                              {formatarMoeda(venda.valor_total)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {(() => {
                            const tipoVenda = (venda as Venda).tipo_venda || 'servico'
                            const margemLucro = (venda as Venda).margem_lucro || 0
                            if (tipoVenda === 'produto' && margemLucro > 0) {
                              return (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  margemLucro >= 50
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : margemLucro >= 30
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                  {margemLucro.toFixed(1)}%
                                </span>
                              )
                            }
                            return <span className="text-gray-500">-</span>
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!isParcela ? (
                            (() => {
                              const hoje = new Date().toISOString().split('T')[0]
                              const statusEfetivo = getStatusEfetivo(venda as Venda)
                              const estaVencida = isVencida(venda as Venda, hoje)
                              
                              // Se está vencida mas o status no banco é pendente, mostrar badge de vencida + select
                              if (estaVencida && (venda as Venda).status === 'pendente') {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                      Vencida
                                    </span>
                                    <select
                                      value={(venda as Venda).status || 'pendente'}
                                      onChange={(e) => handleAlterarStatus(venda.id, e.target.value as 'pendente' | 'aprovado' | 'cancelado', false)}
                                      className="px-2 py-1 text-xs rounded-full bg-gray-700 border border-gray-600 text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                      title="Status no banco: Pendente (mas está vencida)"
                                    >
                                      <option value="pendente">Pendente</option>
                                      <option value="aprovado">Recebido</option>
                                      <option value="cancelado">Cancelado</option>
                                    </select>
                                  </div>
                                )
                              }
                              
                              // Caso normal: mostrar apenas o select com estilo baseado no status
                              return (
                                <select
                                  value={(venda as Venda).status || 'pendente'}
                                  onChange={(e) => handleAlterarStatus(venda.id, e.target.value as 'pendente' | 'aprovado' | 'cancelado', false)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-full border focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all ${
                                    (venda as Venda).status === 'cancelado'
                                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                      : (venda as Venda).status === 'aprovado'
                                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                      : estaVencida
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                  }`}
                                >
                                  <option value="pendente">Pendente</option>
                                  <option value="aprovado">Recebido</option>
                                  <option value="cancelado">Cancelado</option>
                                </select>
                              )
                            })()
                          ) : (
                            (() => {
                              const parcela = venda as any
                              const statusParcela = parcela.status || (parcela.recebida ? 'aprovado' : 'pendente')
                              const hoje = new Date().toISOString().split('T')[0]
                              const estaVencidaParcela = parcela.data_vencimento && parcela.data_vencimento < hoje && statusParcela !== 'aprovado' && statusParcela !== 'cancelado'
                              return (
                                <select
                                  value={statusParcela}
                                  onChange={(e) => handleAlterarStatus(venda.id, e.target.value as 'pendente' | 'aprovado' | 'cancelado', true)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-full border focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all ${
                                    statusParcela === 'cancelado'
                                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                      : statusParcela === 'aprovado' || parcela.recebida
                                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                      : estaVencidaParcela
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                  }`}
                                  title="Alterar status da parcela"
                                >
                                  <option value="pendente">Pendente</option>
                                  <option value="aprovado">Recebida</option>
                                  <option value="cancelado">Cancelado</option>
                                </select>
                              )
                            })()
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {!isParcela ? (
                              <ActionButtons
                                onEdit={() => handleEdit(venda as Venda)}
                                onDelete={() => handleDelete(venda.id)}
                              />
                            ) : (
                              <ActionButtons
                                onEdit={async () => {
                                  const vendaId = (venda as any).venda_id
                                  if (!vendaId) return
                                  const { data: parent, error } = await supabase
                                    .from('vendas')
                                    .select('*')
                                    .eq('id', vendaId)
                                    .single()
                                  if (error || !parent) {
                                    alert('Não foi possível carregar a venda principal. Tente novamente.')
                                    return
                                  }
                                  handleEdit(parent as Venda)
                                }}
                                onDelete={() => handleDelete((venda as any).venda_id)}
                                editTitle="Editar venda parcelada (altera todas as parcelas)"
                                deleteTitle="Excluir venda e todas as parcelas"
                              />
                            )}
                            {((!isParcela && (venda as Venda).status !== 'cancelado') || (isParcela && (venda as any).status !== 'cancelado')) && (
                              (!isParcela && (venda as Venda).status !== 'aprovado') || (isParcela && !(venda as any).recebida && (venda as any).status !== 'aprovado') ? (
                                <button
                                  onClick={() => handleMarcarComoPaga(venda.id, isParcela)}
                                  className="text-green-400 hover:text-green-300 transition-colors"
                                  title="Marcar como paga"
                                >
                                  <FiCheck className="w-5 h-5" />
                                </button>
                              ) : null
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
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
                  {editingVenda 
                    ? `Editar Venda de ${formData.tipo_venda === 'servico' ? 'Serviço' : 'Produto'}`
                    : `Nova Venda de ${formData.tipo_venda === 'servico' ? 'Serviço' : 'Produto'}`
                  }
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
                {/* Badge indicando o tipo de venda */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    formData.tipo_venda === 'produto'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {formData.tipo_venda === 'produto' ? 'Venda de Produto' : 'Venda de Serviço'}
                  </span>
                </div>

                {formData.tipo_venda === 'produto' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Produto</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.produto_id}
                        onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um produto</option>
                        {produtos.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.nome} - {formatarMoeda(produto.valor_unitario)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowModalProduto(true)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Cadastrar novo produto"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {formData.tipo_venda === 'servico' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Serviço</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.servico_id}
                        onChange={(e) => {
                          const servicoSelecionado = servicos.find(s => s.id === e.target.value)
                          setFormData({ 
                            ...formData, 
                            servico_id: e.target.value,
                            descricao: servicoSelecionado?.nome || formData.descricao,
                            valor_total: servicoSelecionado ? servicoSelecionado.valor_unitario.toString() : formData.valor_total
                          })
                        }}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Selecione um serviço</option>
                        {servicos.map((servico) => (
                          <option key={servico.id} value={servico.id}>
                            {servico.nome} - {formatarMoeda(servico.valor_unitario)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cliente</label>
                    <select
                      value={formData.cliente_id}
                      onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                    <select
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição *</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={formData.tipo_venda === 'produto' ? 'Nome do produto' : 'Descrição do serviço'}
                  />
                </div>

                {formData.tipo_venda === 'produto' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Custo *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.preco_custo}
                      onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-400 mt-1">Preço que você pagou pelo produto</p>
                  </div>
                )}

                <div className={`grid grid-cols-1 md:grid-cols-${formData.tipo_venda === 'produto' ? '4' : '3'} gap-4`}>
                  {/* Valor Total */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {formData.tipo_venda === 'produto' ? 'Preço de Venda' : 'Valor Total'} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_total}
                      onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Valor Desconto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Desconto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_desconto}
                      onChange={(e) => setFormData({ ...formData, valor_desconto: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Valor Final */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor Final</label>
                    <input
                      type="text"
                      value={formatarMoeda(parseFloat(formData.valor_final) || 0)}
                      disabled
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white cursor-not-allowed"
                    />
                  </div>

                  {/* Margem de Lucro (apenas para produtos) */}
                  {formData.tipo_venda === 'produto' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Margem de Lucro</label>
                      <input
                        type="text"
                        value={`${calcularMargemLucro()}%`}
                        disabled
                        className={`w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white cursor-not-allowed ${
                          parseFloat(calcularMargemLucro()) >= 50
                            ? 'text-green-400'
                            : parseFloat(calcularMargemLucro()) >= 30
                            ? 'text-yellow-400'
                            : parseFloat(calcularMargemLucro()) > 0
                            ? 'text-red-400'
                            : ''
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Data Venda */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data da Venda</label>
                    <input
                      type="date"
                      value={formData.data_venda}
                      onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
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
                      <option value="parcelado">Parcelado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="aprovado">Recebido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  {/* Parcelada */}
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.parcelada}
                        onChange={(e) => setFormData({ ...formData, parcelada: e.target.checked })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">Venda Parcelada</span>
                    </label>
                    {formData.parcelada && (
                      <input
                        type="number"
                        min="1"
                        value={formData.total_parcelas}
                        onChange={(e) => setFormData({ ...formData, total_parcelas: e.target.value })}
                        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Parcelas"
                      />
                    )}
                  </div>
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
                    {editingVenda ? 'Salvar Alterações' : 'Criar Venda'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Criar Produto */}
        {showModalProduto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Cadastrar Novo Produto</h2>
                <button
                  onClick={() => setShowModalProduto(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCriarProduto} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Produto *</label>
                    <input
                      type="text"
                      value={formDataProduto.nome}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, nome: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Notebook Dell"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Código (SKU)</label>
                    <input
                      type="text"
                      value={formDataProduto.codigo}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, codigo: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Código do produto"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <textarea
                    value={formDataProduto.descricao}
                    onChange={(e) => setFormDataProduto({ ...formDataProduto, descricao: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição do produto"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Venda *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formDataProduto.valor_unitario}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, valor_unitario: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Custo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formDataProduto.preco_custo}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, preco_custo: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                    <select
                      value={formDataProduto.categoria_id}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, categoria_id: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Unidade</label>
                    <input
                      type="text"
                      value={formDataProduto.unidade}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, unidade: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="un, kg, m, etc"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estoque Inicial</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formDataProduto.estoque}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, estoque: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estoque Mínimo</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formDataProduto.estoque_minimo}
                      onChange={(e) => setFormDataProduto({ ...formDataProduto, estoque_minimo: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                  <textarea
                    value={formDataProduto.observacoes}
                    onChange={(e) => setFormDataProduto({ ...formDataProduto, observacoes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModalProduto(false)}
                    className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Criar Produto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
  )
}
