'use client'

import { useEffect, useState } from 'react'
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
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

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
}

interface Fornecedor {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
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
  const [compras, setCompras] = useState<Compra[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
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
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'finalizadas' | 'em_andamento' | 'canceladas'>('todas')
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // FormulÃ¡rio
  const [formData, setFormData] = useState({
    fornecedor_id: '',
    categoria_id: '',
    descricao: '',
    valor_total: '',
    valor_desconto: '0',
    valor_final: '',
    data_compra: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
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

      // Buscar compras
      let query = supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .order('data_compra', { ascending: false })

      // Aplicar filtros
      if (filtroStatus === 'finalizadas') {
        query = query.eq('status', 'finalizado')
      } else if (filtroStatus === 'em_andamento') {
        query = query.eq('status', 'em_andamento')
      } else if (filtroStatus === 'canceladas') {
        query = query.eq('status', 'cancelado')
      }

      if (filtroFornecedor) {
        query = query.eq('fornecedor_id', filtroFornecedor)
      }

      if (filtroCategoria) {
        query = query.eq('categoria_id', filtroCategoria)
      }

      const [dataInicio, dataFim] = getMonthRange(filtroMes)
      query = query.gte('data_compra', dataInicio).lte('data_compra', dataFim)

      const { data: comprasData, error: comprasError } = await query

      if (comprasError) throw comprasError

      // Processar dados - buscar nomes de fornecedores e categorias
      const fornecedoresMap = new Map(fornecedores.map(f => [f.id, f.nome]))
      const categoriasMap = new Map(categorias.map(c => [c.id, c.nome]))

      const comprasProcessadas = (comprasData || []).map((compra: any) => ({
        ...compra,
        fornecedor_nome: compra.fornecedor_id ? fornecedoresMap.get(compra.fornecedor_id) || null : null,
        categoria_nome: compra.categoria_id ? categoriasMap.get(compra.categoria_id) || null : null,
      }))

      // Aplicar busca por texto
      let comprasFiltradas = comprasProcessadas
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        comprasFiltradas = comprasFiltradas.filter(
          (compra) =>
            compra.descricao.toLowerCase().includes(buscaLower) ||
            compra.fornecedor_nome?.toLowerCase().includes(buscaLower) ||
            compra.categoria_nome?.toLowerCase().includes(buscaLower)
        )
      }

      setCompras(comprasFiltradas)

      // Calcular resumo
      calcularResumo(comprasProcessadas)
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
        alert('O valor final nÃ£o pode ser negativo')
        return
      }

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
      }

      if (editingCompra) {
        // Editar compra existente
        const { error } = await supabase
          .from('compras')
          .update(compraData)
          .eq('id', editingCompra.id)

        if (error) throw error
      } else {
        // Criar nova compra
        const { error } = await supabase.from('compras').insert(compraData)

        if (error) throw error
      }

      setShowModal(false)
      setEditingCompra(null)
      resetForm()
      loadCompras()
    } catch (error) {
      console.error('Erro ao salvar compra:', error)
      alert('Erro ao salvar compra')
    }
  }

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra)
    setTipoCompra(compra.fornecedor_id ? 'compra_com_fornecedor' : 'compra')
    setFormData({
      fornecedor_id: compra.fornecedor_id || '',
      categoria_id: compra.categoria_id || '',
      descricao: compra.descricao,
      valor_total: compra.valor_total.toString(),
      valor_desconto: compra.valor_desconto.toString(),
      valor_final: compra.valor_final.toString(),
      data_compra: compra.data_compra,
      forma_pagamento: compra.forma_pagamento || 'pix',
      status: compra.status,
      observacoes: compra.observacoes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta compra?')) return

    try {
      const { error } = await supabase.from('compras').delete().eq('id', id)
      if (error) throw error

      loadCompras()
    } catch (error) {
      console.error('Erro ao excluir compra:', error)
      alert('Erro ao excluir compra')
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
        alert('JÃ¡ existe uma categoria com este nome para despesas.')
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
      status: 'em_andamento',
      observacoes: '',
    })
    setEditingCompra(null)
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

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
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
        <div className="animate-pulse text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {hideMainTitle && sectionLabel ? (
              <h2 className="text-xl font-semibold text-white mb-1">{sectionLabel}</h2>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">Compras/Despesas</h1>
                <p className="text-gray-400">Gerencie compras e despesas (contas a pagar)</p>
              </>
            )}
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nova Compra</span>
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Compras</p>
                <p className="text-2xl font-bold text-white mt-1">{resumo.totalCompras}</p>
              </div>
              <FiShoppingBag className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Finalizadas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{resumo.totalFinalizadas}</p>
                <p className="text-xs text-gray-500 mt-1">{formatarMoeda(resumo.valorFinalizadas)}</p>
              </div>
              <FiCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{resumo.totalEmAndamento}</p>
                <p className="text-xs text-gray-500 mt-1">{formatarMoeda(resumo.valorEmAndamento)}</p>
              </div>
              <FiCalendar className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Canceladas</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{resumo.totalCanceladas}</p>
              </div>
              <FiXCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filtros â€” compactos: busca, status, fornecedor, categoria, mÃªs (padrÃ£o atual); ordem mais recente primeiro */}
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
              onChange={(e) => setFiltroStatus(e.target.value as 'todas' | 'finalizadas' | 'em_andamento' | 'canceladas')}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todas">Todas</option>
              <option value="finalizadas">Finalizadas</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="canceladas">Canceladas</option>
            </select>
            <select
              value={filtroFornecedor}
              onChange={(e) => setFiltroFornecedor(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
            >
              <option value="">Todos fornecedores</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
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
              <label className="text-sm text-gray-400 whitespace-nowrap">MÃªs:</label>
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

        {/* Tabela de Compras */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    DescriÃ§Ã£o
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    AÃ§Ãµes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {compras.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Nenhuma compra encontrada
                    </td>
                  </tr>
                ) : (
                  compras.map((compra) => (
                    <tr key={compra.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{compra.descricao}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {compra.fornecedor_nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {compra.categoria_nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {formatarMoeda(Number(compra.valor_final))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatarData(compra.data_compra)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => statusDropdownAberto === compra.id ? fecharStatusDropdown() : abrirStatusDropdown(compra.id, e)}
                          className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-full"
                          title="Clique para alterar o status"
                        >
                          {getStatusBadge(compra.status)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {compra.status !== 'finalizado' && (
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
                            onDelete={() => handleDelete(compra.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dropdown de status em portal (fora da tabela, sempre visÃ­vel) */}
        {statusDropdownAberto && statusDropdownRect && typeof document !== 'undefined' &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                aria-hidden="true"
                onClick={fecharStatusDropdown}
              />
              <div
                className="fixed z-[9999] py-2 min-w-[200px] rounded-xl shadow-2xl border-2 border-purple-500 bg-gray-800"
                style={{
                  left: statusDropdownRect.left,
                  top: statusDropdownRect.top,
                  width: statusDropdownRect.width,
                }}
              >
                <p className="px-3 py-1.5 text-xs font-semibold text-purple-300 uppercase tracking-wider border-b border-gray-600 mb-1">
                  Alterar status
                </p>
                {statusOpcoes.map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => handleAlterarStatus(statusDropdownAberto, op.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      compras.find((c) => c.id === statusDropdownAberto)?.status === op.value
                        ? 'bg-purple-600/40 text-white font-medium'
                        : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingCompra ? 'Editar Compra' : 'Nova Compra'}
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
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tipo de compra</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoCompra('compra')
                          setFormData((prev) => ({ ...prev, fornecedor_id: '' }))
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          tipoCompra === 'compra'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        Compra
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoCompra('compra_com_fornecedor')}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          tipoCompra === 'compra_com_fornecedor'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        Compra com fornecedor
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {tipoCompra === 'compra' ? 'Sem vÃ­nculo com fornecedor.' : 'Fornecedor obrigatÃ³rio.'}
                    </p>
                  </div>

                  <div className={`grid grid-cols-1 ${tipoCompra === 'compra_com_fornecedor' ? 'md:grid-cols-2' : ''} gap-4`}>
                    {tipoCompra === 'compra_com_fornecedor' && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Fornecedor *</label>
                        <select
                          value={formData.fornecedor_id}
                          onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                          required={tipoCompra === 'compra_com_fornecedor'}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                      <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={formData.categoria_id}
                          onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          title="Nova categoria"
                        >
                          <FiPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">DescriÃ§Ã£o *</label>
                    <input
                      type="text"
                      required
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Ex: Compra de materiais"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Valor Total *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.valor_total}
                        onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Desconto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.valor_desconto}
                        onChange={(e) => setFormData({ ...formData, valor_desconto: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Valor Final</label>
                      <input
                        type="text"
                        value={formatarMoeda(parseFloat(formData.valor_final || '0'))}
                        disabled
                        className="w-full px-4 py-2 bg-gray-600 border border-gray-600 rounded-lg text-white cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Data da Compra *</label>
                      <input
                        type="date"
                        required
                        value={formData.data_compra}
                        onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Forma de Pagamento</label>
                      <select
                        value={formData.forma_pagamento}
                        onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="transferencia">TransferÃªncia</option>
                        <option value="boleto">Boleto</option>
                        <option value="cheque">Cheque</option>
                        <option value="cartao_debito">CartÃ£o de DÃ©bito</option>
                        <option value="cartao_credito">CartÃ£o de CrÃ©dito</option>
                        <option value="parcelado">Parcelado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="em_andamento">Em Andamento</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">ObservaÃ§Ãµes</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="ObservaÃ§Ãµes adicionais sobre a compra..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      {editingCompra ? 'Salvar AlteraÃ§Ãµes' : 'Criar Compra'}
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
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Nova Categoria de Compra</h2>
                  <button
                    onClick={() => {
                      setShowModalCategoria(false)
                      setFormDataCategoria({
                        nome: '',
                        descricao: '',
                        cor: '#6366f1',
                      })
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCriarCategoria} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome da Categoria *</label>
                    <input
                      type="text"
                      required
                      value={formDataCategoria.nome}
                      onChange={(e) => setFormDataCategoria({ ...formDataCategoria, nome: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Ex: Materiais, Serviços, Equipamentos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">DescriÃ§Ã£o</label>
                    <textarea
                      value={formDataCategoria.descricao}
                      onChange={(e) => setFormDataCategoria({ ...formDataCategoria, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="DescriÃ§Ã£o da categoria (opcional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cor</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formDataCategoria.cor}
                        onChange={(e) => setFormDataCategoria({ ...formDataCategoria, cor: e.target.value })}
                        className="w-16 h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formDataCategoria.cor}
                        onChange={(e) => setFormDataCategoria({ ...formDataCategoria, cor: e.target.value })}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
