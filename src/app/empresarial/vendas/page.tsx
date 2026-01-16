'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiEdit,
  FiTrash2,
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
  status: 'pendente' | 'paga' | 'cancelada'
  parcelada: boolean
  total_parcelas: number
  observacoes: string | null
  cliente_nome?: string | null
  categoria_nome?: string | null
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

interface ResumoVendas {
  totalVendas: number
  totalPendentes: number
  totalPagas: number
  totalCanceladas: number
  valorTotalVendas: number
  valorPendente: number
  valorRecebido: number
}

export default function VendasPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [parcelas, setParcelas] = useState<ParcelaVenda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [resumo, setResumo] = useState<ResumoVendas>({
    totalVendas: 0,
    totalPendentes: 0,
    totalPagas: 0,
    totalCanceladas: 0,
    valorTotalVendas: 0,
    valorPendente: 0,
    valorRecebido: 0,
  })

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'pagas' | 'canceladas'>('todas')
  const [filtroCliente, setFiltroCliente] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // Formulário
  const [formData, setFormData] = useState({
    cliente_id: '',
    categoria_id: '',
    descricao: '',
    valor_total: '',
    valor_desconto: '0',
    valor_final: '',
    data_venda: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    status: 'pendente' as 'pendente' | 'paga' | 'cancelada',
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

      // Buscar vendas não parceladas
      let query = supabase
        .from('vendas')
        .select('*')
        .eq('user_id', userId)
        .eq('parcelada', false)
        .order('data_venda', { ascending: false })

      // Aplicar filtros
      if (filtroStatus === 'pendentes') {
        query = query.eq('status', 'pendente')
      } else if (filtroStatus === 'pagas') {
        query = query.eq('status', 'paga')
      } else if (filtroStatus === 'canceladas') {
        query = query.eq('status', 'cancelada')
      }

      if (filtroCliente) {
        query = query.eq('cliente_id', filtroCliente)
      }

      if (filtroCategoria) {
        query = query.eq('categoria_id', filtroCategoria)
      }

      if (filtroDataInicio) {
        query = query.gte('data_venda', filtroDataInicio)
      }

      if (filtroDataFim) {
        query = query.lte('data_venda', filtroDataFim)
      }

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

      if (filtroDataInicio) {
        parcelasQuery = parcelasQuery.gte('data_vencimento', filtroDataInicio)
      }

      if (filtroDataFim) {
        parcelasQuery = parcelasQuery.lte('data_vencimento', filtroDataFim)
      }

      const { data: parcelasData, error: parcelasError } = await parcelasQuery

      if (parcelasError) throw parcelasError

      // Processar dados - buscar nomes de clientes e categorias
      const clientesMap = new Map(clientes.map(c => [c.id, c.nome]))
      const categoriasMap = new Map(categorias.map(c => [c.id, c.nome]))

      const vendasProcessadas = (vendasData || []).map((venda: any) => ({
        ...venda,
        cliente_nome: venda.cliente_id ? clientesMap.get(venda.cliente_id) || null : null,
        categoria_nome: venda.categoria_id ? categoriasMap.get(venda.categoria_id) || null : null,
      }))

      const parcelasProcessadas = (parcelasData || []).map((parcela: any) => ({
        ...parcela,
        cliente_nome: parcela.cliente_id ? clientesMap.get(parcela.cliente_id) || null : null,
        categoria_nome: parcela.categoria_id ? categoriasMap.get(parcela.categoria_id) || null : null,
      }))

      // Aplicar filtro de status nas parcelas (baseado em recebida)
      let parcelasFiltradas = parcelasProcessadas
      if (filtroStatus === 'pendentes') {
        parcelasFiltradas = parcelasFiltradas.filter(p => !p.recebida)
      } else if (filtroStatus === 'pagas') {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.recebida)
      } else if (filtroStatus === 'canceladas') {
        parcelasFiltradas = []
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
    const todasVendas = [...vendas]
    
    const totalVendas = todasVendas.length
    const totalPendentes = todasVendas.filter(v => v.status === 'pendente').length
    const totalPagas = todasVendas.filter(v => v.status === 'paga').length
    const totalCanceladas = todasVendas.filter(v => v.status === 'cancelada').length

    const valorTotalVendas = todasVendas.reduce((sum, v) => sum + Number(v.valor_final), 0)
    const valorPendente = todasVendas
      .filter(v => v.status === 'pendente')
      .reduce((sum, v) => sum + Number(v.valor_final), 0) +
      parcelas
        .filter(p => !p.recebida)
        .reduce((sum, p) => sum + Number(p.valor), 0)
    const valorRecebido = todasVendas
      .filter(v => v.status === 'paga')
      .reduce((sum, v) => sum + Number(v.valor_final), 0) +
      parcelas
        .filter(p => p.recebida)
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
  }, [filtroStatus, filtroCliente, filtroCategoria, filtroDataInicio, filtroDataFim, buscaTexto, session])

  const calcularValorFinal = () => {
    const valorTotal = parseFloat(formData.valor_total) || 0
    const valorDesconto = parseFloat(formData.valor_desconto) || 0
    const valorFinal = Math.max(0, valorTotal - valorDesconto)
    setFormData(prev => ({ ...prev, valor_final: valorFinal.toFixed(2) }))
  }

  useEffect(() => {
    calcularValorFinal()
  }, [formData.valor_total, formData.valor_desconto])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      const valorTotal = parseFloat(formData.valor_total)
      const valorDesconto = parseFloat(formData.valor_desconto) || 0
      const valorFinal = Math.max(0, valorTotal - valorDesconto)

      if (editingVenda) {
        // Editar venda existente
        const { error } = await supabase
          .from('vendas')
          .update({
            cliente_id: formData.cliente_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor_total: valorTotal,
            valor_desconto: valorDesconto,
            valor_final: valorFinal,
            data_venda: formData.data_venda,
            forma_pagamento: formData.forma_pagamento,
            status: formData.status,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
            observacoes: formData.observacoes || null,
          })
          .eq('id', editingVenda.id)

        if (error) throw error

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
        const { data: novaVenda, error } = await supabase
          .from('vendas')
          .insert({
            user_id: userId,
            cliente_id: formData.cliente_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor_total: valorTotal,
            valor_desconto: valorDesconto,
            valor_final: valorFinal,
            data_venda: formData.data_venda,
            forma_pagamento: formData.forma_pagamento,
            status: formData.status,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
            observacoes: formData.observacoes || null,
          })
          .select()
          .single()

        if (error) throw error

        // Se for parcelada, criar parcelas
        if (formData.parcelada && novaVenda) {
          const totalParcelas = parseInt(formData.total_parcelas)
          const valorParcela = valorFinal / totalParcelas
          const dataVenda = new Date(formData.data_venda)

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimentoParcela = new Date(dataVenda)
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + i)

            await supabase.from('parcelas_vendas').insert({
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
            })
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
    setFormData({
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
            status: 'paga',
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
      cliente_id: '',
      categoria_id: '',
      descricao: '',
      valor_total: '',
      valor_desconto: '0',
      valor_final: '',
      data_venda: new Date().toISOString().split('T')[0],
      forma_pagamento: 'pix',
      status: 'pendente',
      parcelada: false,
      total_parcelas: '1',
      observacoes: '',
    })
    setEditingVenda(null)
  }

  const getStatusBadge = (venda: Venda) => {
    if (venda.status === 'paga') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Paga</span>
    } else if (venda.status === 'cancelada') {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Cancelada</span>
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
    }
  }

  const getStatusBadgeParcela = (parcela: ParcelaVenda) => {
    const hoje = new Date().toISOString().split('T')[0]
    
    if (parcela.recebida) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Recebida</span>
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

  const todasVendas = [...vendas, ...parcelas.map(p => ({
    id: p.id,
    cliente_id: p.cliente_id,
    categoria_id: p.categoria_id,
    descricao: p.descricao,
    valor_total: p.valor,
    valor_desconto: 0,
    valor_final: p.valor,
    data_venda: p.data_vencimento,
    forma_pagamento: p.forma_pagamento,
    status: p.recebida ? 'paga' as const : 'pendente' as const,
    parcelada: true,
    total_parcelas: p.total_parcelas,
    observacoes: null,
    cliente_nome: p.cliente_nome,
    categoria_nome: p.categoria_nome,
    parcela_numero: p.parcela_numero,
    recebida: p.recebida,
  }))]

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
            <h1 className="text-3xl font-bold text-white">Vendas</h1>
            <p className="text-gray-400 mt-1">Gerencie suas vendas e recebimentos</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nova Venda</span>
          </button>
        </div>

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

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, cliente ou categoria..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todas">Todas</option>
              <option value="pendentes">Pendentes</option>
              <option value="pagas">Pagas</option>
              <option value="canceladas">Canceladas</option>
            </select>

            {/* Cliente */}
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>

            {/* Categoria */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {todasVendas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      Nenhuma venda encontrada
                    </td>
                  </tr>
                ) : (
                  todasVendas.map((venda) => {
                    const isParcela = 'parcela_numero' in venda && (venda as any).parcela_numero !== undefined
                    const statusBadge = isParcela 
                      ? getStatusBadgeParcela(venda as any)
                      : getStatusBadge(venda as Venda)
                    
                    return (
                      <tr key={venda.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatarData(venda.data_venda)}
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {!isParcela && (
                              <>
                                <button
                                  onClick={() => handleEdit(venda as Venda)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(venda.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <FiTrash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            {((!isParcela && (venda as Venda).status === 'pendente') || (isParcela && !(venda as any).recebida)) && (
                              <button
                                onClick={() => handleMarcarComoPaga(venda.id, isParcela)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                title="Marcar como paga"
                              >
                                <FiCheck className="w-5 h-5" />
                              </button>
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
                  {editingVenda ? 'Editar Venda' : 'Nova Venda'}
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descrição da venda"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Valor Total */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor Total</label>
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
                      <option value="paga">Paga</option>
                      <option value="cancelada">Cancelada</option>
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
      </div>
    </MainLayoutEmpresarial>
  )
}

