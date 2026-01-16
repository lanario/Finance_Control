'use client'

import { useEffect, useState } from 'react'
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
  FiXCircle,
} from 'react-icons/fi'

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

export default function ComprasPage() {
  const { session } = useAuth()
  const [compras, setCompras] = useState<Compra[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [resumo, setResumo] = useState<ResumoCompras>({
    totalCompras: 0,
    totalFinalizadas: 0,
    totalEmAndamento: 0,
    totalCanceladas: 0,
    valorTotalCompras: 0,
    valorFinalizadas: 0,
    valorEmAndamento: 0,
  })

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'finalizadas' | 'em_andamento' | 'canceladas'>('todas')
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
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
    status: 'em_andamento' as 'finalizado' | 'em_andamento' | 'cancelado',
    observacoes: '',
  })

  // Formulário de categoria
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
  }, [filtroStatus, filtroFornecedor, filtroCategoria, filtroDataInicio, filtroDataFim, buscaTexto, session])

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

      if (filtroDataInicio) {
        query = query.gte('data_compra', filtroDataInicio)
      }

      if (filtroDataFim) {
        query = query.lte('data_compra', filtroDataFim)
      }

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

      const valorTotal = parseFloat(formData.valor_total)
      const valorDesconto = parseFloat(formData.valor_desconto || '0')
      const valorFinal = valorTotal - valorDesconto

      if (valorFinal < 0) {
        alert('O valor final não pode ser negativo')
        return
      }

      const compraData = {
        user_id: userId,
        fornecedor_id: formData.fornecedor_id || null,
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

      // Selecionar a categoria recém-criada no formulário de compra
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
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Compras</h1>
            <p className="text-gray-400">Gerencie todas as compras realizadas com fornecedores</p>
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

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <FiFilter className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por texto */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Buscar</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Descrição, fornecedor..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="todas">Todas</option>
                <option value="finalizadas">Finalizadas</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="canceladas">Canceladas</option>
              </select>
            </div>

            {/* Filtro por fornecedor */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fornecedor</label>
              <select
                value={filtroFornecedor}
                onChange={(e) => setFiltroFornecedor(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Todos</option>
                {fornecedores.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por categoria */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Categoria</label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por data início */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data Início</label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Filtro por data fim */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
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
                    Descrição
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
                    Ações
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
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(compra.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(compra)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Editar"
                          >
                            <FiEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(compra.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Excluir"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Fornecedor</label>
                      <select
                        value={formData.fornecedor_id}
                        onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
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
                    <label className="block text-sm text-gray-400 mb-1">Descrição *</label>
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
                        <option value="transferencia">Transferência</option>
                        <option value="boleto">Boleto</option>
                        <option value="cheque">Cheque</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
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
                    <label className="block text-sm text-gray-400 mb-1">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
                    <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                    <textarea
                      value={formDataCategoria.descricao}
                      onChange={(e) => setFormDataCategoria({ ...formDataCategoria, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Descrição da categoria (opcional)"
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
    </MainLayoutEmpresarial>
  )
}

