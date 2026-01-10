'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { FiPlus, FiEdit, FiTrash2, FiShoppingCart, FiTag, FiX } from 'react-icons/fi'

interface Compra {
  id: string
  descricao: string
  valor: number
  data: string
  cartao_id: string | null
  categoria: string
  metodo_pagamento: string
  user_id: string
  parcelada?: boolean
  total_parcelas?: number
}

interface Cartao {
  id: string
  nome: string
  bandeira?: string
  limite?: number
  fechamento?: number
  vencimento?: number
  cor?: string
  user_id?: string
}

interface TipoGasto {
  id: string
  nome: string
  descricao: string | null
  cor: string
  user_id: string
}

export default function ComprasPage() {
  const { session } = useAuth()
  const [compras, setCompras] = useState<Compra[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'compras' | 'tipos'>('compras')
  const [showModal, setShowModal] = useState(false)
  const [showTipoModal, setShowTipoModal] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [editingTipo, setEditingTipo] = useState<TipoGasto | null>(null)
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    metodo_pagamento: 'cartao',
    cartao_id: '',
    categoria: '',
    parcelada: false,
    total_parcelas: '1',
  })
  const [tipoFormData, setTipoFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#6b7280',
  })

  useEffect(() => {
    if (session) {
      loadCartoes()
      loadCompras()
      loadTiposGastos()
    }
  }, [session])

  const loadCartoes = async () => {
    try {
      const { data, error } = await supabase
        .from('cartoes')
        .select('id, nome')
        .eq('user_id', session?.user?.id)
        .order('nome')

      if (error) throw error
      setCartoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
    }
  }

  const loadTiposGastos = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_gastos')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('nome')

      if (error) throw error
      setTiposGastos(data || [])
    } catch (error) {
      console.error('Erro ao carregar tipos de gastos:', error)
    }
  }

  const loadCompras = async () => {
    try {
      const { data, error } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('data', { ascending: false })

      if (error) throw error
      setCompras(data || [])
    } catch (error) {
      console.error('Erro ao carregar compras:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularDataVencimentoParcela = (dataCompra: Date, numeroParcela: number, cartaoId: string | null) => {
    if (!cartaoId) {
      // Se não há cartão, usar mês seguinte baseado na data da compra
      const data = new Date(dataCompra)
      data.setMonth(data.getMonth() + numeroParcela - 1)
      return data
    }

    // Buscar informações do cartão
    const cartao = cartoes.find(c => c.id === cartaoId)
    if (!cartao) {
      const data = new Date(dataCompra)
      data.setMonth(data.getMonth() + numeroParcela - 1)
      return data
    }

    // Calcular vencimento baseado no dia de fechamento do cartão
    const dataBase = new Date(dataCompra)
    let mesVencimento = dataBase.getMonth() + numeroParcela - 1
    let anoVencimento = dataBase.getFullYear()

    // Ajustar mês e ano se necessário
    while (mesVencimento > 11) {
      mesVencimento -= 12
      anoVencimento += 1
    }

    // Usar o dia de fechamento como dia de vencimento da parcela
    const ultimoDia = new Date(anoVencimento, mesVencimento + 1, 0).getDate()
    const diaVencimento = Math.min(cartao.vencimento || 15, ultimoDia)

    return new Date(anoVencimento, mesVencimento, diaVencimento)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const valorTotal = parseFloat(formData.valor)
      const totalParcelas = parseInt(formData.total_parcelas) || 1
      // Compra é parcelada se: checkbox marcado + método é cartão + mais de 1 parcela
      const isParcelada = formData.parcelada === true && formData.metodo_pagamento === 'cartao' && totalParcelas > 1

      const compraData: any = {
        descricao: formData.descricao,
        valor: valorTotal, // Mantém o valor total para histórico, mas não será usado nos cálculos se parcelada
        data: formData.data,
        metodo_pagamento: formData.metodo_pagamento,
        categoria: formData.categoria,
        user_id: session?.user?.id,
        parcelada: !!isParcelada, // Garantir que seja boolean (true ou false, nunca null)
        total_parcelas: isParcelada ? totalParcelas : null,
      }

      // Só adiciona cartao_id se o método for cartão
      if (formData.metodo_pagamento === 'cartao') {
        compraData.cartao_id = formData.cartao_id || null
      } else {
        compraData.cartao_id = null
      }

      if (editingCompra) {
        // Atualizar compra existente
        const { error } = await supabase
          .from('compras')
          .update(compraData)
          .eq('id', editingCompra.id)

        if (error) throw error

        // Se estava parcelada e não está mais, remover parcelas
        if (!isParcelada) {
          await supabase
            .from('parcelas')
            .delete()
            .eq('compra_id', editingCompra.id)
        } else if (isParcelada && formData.cartao_id) {
          // Se agora está parcelada, remover parcelas antigas e criar novas
          await supabase
            .from('parcelas')
            .delete()
            .eq('compra_id', editingCompra.id)

          // Criar novas parcelas
          const valorParcelaBase = valorTotal / totalParcelas
          const valorParcelaArredondado = Math.round(valorParcelaBase * 100) / 100
          const somaParcelasArredondadas = valorParcelaArredondado * (totalParcelas - 1)
          const valorUltimaParcela = valorTotal - somaParcelasArredondadas
          
          const dataCompra = new Date(formData.data)
          const parcelas = []

          for (let i = 1; i <= totalParcelas; i++) {
            const dataVencimento = calcularDataVencimentoParcela(dataCompra, i, formData.cartao_id)
            const valorParcela = i === totalParcelas ? Math.round(valorUltimaParcela * 100) / 100 : valorParcelaArredondado
            
            parcelas.push({
              user_id: session?.user?.id,
              compra_id: editingCompra.id,
              cartao_id: formData.cartao_id,
              descricao: `${formData.descricao} - Parcela ${i}/${totalParcelas}`,
              valor: valorParcela,
              numero_parcela: i,
              total_parcelas: totalParcelas,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              categoria: formData.categoria,
              paga: false,
            })
          }

          const { error: parcelasError } = await supabase
            .from('parcelas')
            .insert(parcelas)

          if (parcelasError) throw parcelasError
        }
      } else {
        // Criar nova compra
        const { data: novaCompra, error: compraError } = await supabase
          .from('compras')
          .insert([compraData])
          .select()
          .single()

        if (compraError) throw compraError

        // Se for parcelada, criar as parcelas
        if (isParcelada && novaCompra && formData.cartao_id && totalParcelas > 1) {
          // Calcular valor de cada parcela (dividir o total)
          const valorParcelaBase = valorTotal / totalParcelas
          // Arredondar para 2 casas decimais
          const valorParcelaArredondado = Math.round(valorParcelaBase * 100) / 100
          // Calcular o valor da última parcela para compensar qualquer diferença de arredondamento
          const somaParcelasArredondadas = valorParcelaArredondado * (totalParcelas - 1)
          const valorUltimaParcela = Math.round((valorTotal - somaParcelasArredondadas) * 100) / 100
          
          const dataCompra = new Date(formData.data)
          const parcelas = []

          for (let i = 1; i <= totalParcelas; i++) {
            const dataVencimento = calcularDataVencimentoParcela(dataCompra, i, formData.cartao_id)
            // Última parcela recebe o ajuste para garantir que a soma seja exata
            const valorParcela = i === totalParcelas ? valorUltimaParcela : valorParcelaArredondado
            
            parcelas.push({
              user_id: session?.user?.id,
              compra_id: novaCompra.id,
              cartao_id: formData.cartao_id,
              descricao: `${formData.descricao} - Parcela ${i}/${totalParcelas}`,
              valor: Number(valorParcela.toFixed(2)), // Garantir 2 casas decimais
              numero_parcela: i,
              total_parcelas: totalParcelas,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              categoria: formData.categoria,
              paga: false,
            })
          }

          const { error: parcelasError } = await supabase
            .from('parcelas')
            .insert(parcelas)

          if (parcelasError) {
            console.error('Erro ao criar parcelas:', parcelasError)
            throw parcelasError
          }
        } else if (isParcelada && (!novaCompra || !formData.cartao_id || totalParcelas <= 1)) {
          // Se deveria ser parcelada mas não pode ser criada, avisar o usuário
          console.warn('Compra marcada como parcelada mas não foi possível criar parcelas:', {
            isParcelada,
            novaCompra,
            cartao_id: formData.cartao_id,
            totalParcelas
          })
        }
      }

      setShowModal(false)
      setEditingCompra(null)
      setFormData({
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        metodo_pagamento: 'cartao',
        cartao_id: '',
        categoria: '',
        parcelada: false,
        total_parcelas: '1',
      })
      loadCompras()
    } catch (error) {
      console.error('Erro ao salvar compra:', error)
      alert('Erro ao salvar compra')
    }
  }

  const handleTipoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const tipoData = {
        nome: tipoFormData.nome,
        descricao: tipoFormData.descricao || null,
        cor: tipoFormData.cor,
        user_id: session?.user?.id,
      }

      if (editingTipo) {
        const { error } = await supabase
          .from('tipos_gastos')
          .update(tipoData)
          .eq('id', editingTipo.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('tipos_gastos').insert([tipoData])
        if (error) throw error
      }

      setShowTipoModal(false)
      setEditingTipo(null)
      setTipoFormData({
        nome: '',
        descricao: '',
        cor: '#6b7280',
      })
      loadTiposGastos()
    } catch (error) {
      console.error('Erro ao salvar tipo de gasto:', error)
      alert('Erro ao salvar tipo de gasto')
    }
  }

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra)
    setFormData({
      descricao: compra.descricao,
      valor: compra.valor.toString(),
      data: compra.data.split('T')[0],
      metodo_pagamento: compra.metodo_pagamento || 'cartao',
      cartao_id: compra.cartao_id || '',
      categoria: compra.categoria,
      parcelada: (compra as any).parcelada || false,
      total_parcelas: ((compra as any).total_parcelas || 1).toString(),
    })
    setShowModal(true)
  }

  const handleEditTipo = (tipo: TipoGasto) => {
    setEditingTipo(tipo)
    setTipoFormData({
      nome: tipo.nome,
      descricao: tipo.descricao || '',
      cor: tipo.cor,
    })
    setShowTipoModal(true)
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

  const handleDeleteTipo = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de gasto? As compras associadas não serão excluídas.')) return

    try {
      const { error } = await supabase.from('tipos_gastos').delete().eq('id', id)
      if (error) throw error
      loadTiposGastos()
    } catch (error) {
      console.error('Erro ao excluir tipo de gasto:', error)
      alert('Erro ao excluir tipo de gasto')
    }
  }

  const getCartaoNome = (cartaoId: string | null) => {
    if (!cartaoId) return 'N/A'
    return cartoes.find((c) => c.id === cartaoId)?.nome || 'N/A'
  }

  const getTipoGasto = (categoriaNome: string) => {
    return tiposGastos.find((t) => t.nome === categoriaNome)
  }

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Compras</h1>
            <p className="text-gray-400">
              Gerencie suas compras e tipos de gastos
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg p-1 border border-gray-700 inline-flex">
          <button
            onClick={() => setActiveTab('compras')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              activeTab === 'compras'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Compras
          </button>
          <button
            onClick={() => setActiveTab('tipos')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              activeTab === 'tipos'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tipos de Gastos
          </button>
        </div>

        {/* Tab Content - Compras */}
        {activeTab === 'compras' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingCompra(null)
              setFormData({
                descricao: '',
                valor: '',
                data: new Date().toISOString().split('T')[0],
                metodo_pagamento: 'cartao',
                cartao_id: '',
                categoria: '',
                parcelada: false,
                total_parcelas: '1',
              })
                  setShowModal(true)
                }}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
              >
                <FiPlus className="w-5 h-5" />
                <span>Adicionar Compra</span>
              </button>
            </div>

            {compras.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
                <FiShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">
                  Nenhuma compra cadastrada
                </p>
                <p className="text-gray-500 text-sm">
                  Clique em "Adicionar Compra" para começar
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-primary text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Descrição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Método de Pagamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Categoria
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {compras.map((compra) => {
                        const tipo = getTipoGasto(compra.categoria)
                        return (
                          <tr key={compra.id} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                              {compra.descricao}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-white font-semibold">
                                R$ {compra.valor.toFixed(2)}
                              </div>
                              {compra.parcelada && compra.total_parcelas && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {compra.total_parcelas}x parcelas
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                              {new Date(compra.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {compra.metodo_pagamento === 'pix' ? (
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/40">
                                  💳 PIX
                                </span>
                              ) : compra.metodo_pagamento === 'dinheiro' ? (
                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/40">
                                  💵 Dinheiro
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/40">
                                  💳 {getCartaoNome(compra.cartao_id || '')}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {tipo ? (
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: `${tipo.cor}20`,
                                    color: tipo.cor,
                                    border: `1px solid ${tipo.cor}40`,
                                  }}
                                >
                                  {compra.categoria}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                                  {compra.categoria}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(compra)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(compra.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <FiTrash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content - Tipos de Gastos */}
        {activeTab === 'tipos' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingTipo(null)
                  setTipoFormData({
                    nome: '',
                    descricao: '',
                    cor: '#6b7280',
                  })
                  setShowTipoModal(true)
                }}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
              >
                <FiPlus className="w-5 h-5" />
                <span>Adicionar Tipo de Gasto</span>
              </button>
            </div>

            {tiposGastos.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
                <FiTag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">
                  Nenhum tipo de gasto cadastrado
                </p>
                <p className="text-gray-500 text-sm">
                  Crie tipos de gastos para organizar suas compras
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tiposGastos.map((tipo) => (
                  <div
                    key={tipo.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${tipo.cor}20`,
                            border: `2px solid ${tipo.cor}40`,
                          }}
                        >
                          <FiTag
                            className="w-5 h-5"
                            style={{ color: tipo.cor }}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {tipo.nome}
                          </h3>
                          {tipo.descricao && (
                            <p className="text-sm text-gray-400">
                              {tipo.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTipo(tipo)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTipo(tipo.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de Compra */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingCompra ? 'Editar Compra' : 'Nova Compra'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingCompra(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Supermercado, Restaurante..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Método de Pagamento
                  </label>
                  <select
                    value={formData.metodo_pagamento}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        metodo_pagamento: e.target.value,
                        cartao_id: e.target.value !== 'cartao' ? '' : formData.cartao_id
                      })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  >
                    <option value="cartao">💳 Cartão de Crédito</option>
                    <option value="pix">💳 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="debito">💳 Cartão de Débito</option>
                  </select>
                  
                  {formData.metodo_pagamento === 'cartao' && (
                    <>
                      <select
                        value={formData.cartao_id}
                        onChange={(e) =>
                          setFormData({ ...formData, cartao_id: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                      >
                        <option value="">Selecione um cartão...</option>
                        {cartoes.map((cartao) => (
                          <option key={cartao.id} value={cartao.id}>
                            {cartao.nome}
                          </option>
                        ))}
                      </select>
                      {formData.cartao_id && (
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.parcelada}
                              onChange={(e) =>
                                setFormData({ 
                                  ...formData, 
                                  parcelada: e.target.checked,
                                  total_parcelas: e.target.checked ? formData.total_parcelas : '1'
                                })
                              }
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-300">Compra parcelada</span>
                          </label>
                          {formData.parcelada && (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Número de Parcelas
                              </label>
                              <input
                                type="number"
                                min="2"
                                max="24"
                                value={formData.total_parcelas}
                                onChange={(e) =>
                                  setFormData({ ...formData, total_parcelas: e.target.value })
                                }
                                required={formData.parcelada}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Ex: 3, 6, 12..."
                              />
                              {formData.valor && formData.total_parcelas && parseInt(formData.total_parcelas) > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Valor por parcela: R$ {(parseFloat(formData.valor) / parseInt(formData.total_parcelas)).toFixed(2)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {formData.metodo_pagamento === 'pix' && (
                    <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm">
                        💳 Pagamento via PIX registrado
                      </p>
                    </div>
                  )}
                  
                  {formData.metodo_pagamento === 'dinheiro' && (
                    <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        💵 Pagamento em dinheiro registrado
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de Gasto
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione um tipo de gasto...</option>
                    {tiposGastos.map((tipo) => (
                      <option key={tipo.id} value={tipo.nome}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                  {tiposGastos.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nenhum tipo de gasto cadastrado. Crie um na aba "Tipos de Gastos"
                    </p>
                  )}
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCompra(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Tipo de Gasto */}
        {showTipoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingTipo ? 'Editar Tipo de Gasto' : 'Novo Tipo de Gasto'}
                </h2>
                <button
                  onClick={() => {
                    setShowTipoModal(false)
                    setEditingTipo(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleTipoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome do Tipo de Gasto
                  </label>
                  <input
                    type="text"
                    value={tipoFormData.nome}
                    onChange={(e) =>
                      setTipoFormData({ ...tipoFormData, nome: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Alimentação, Transporte..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    value={tipoFormData.descricao}
                    onChange={(e) =>
                      setTipoFormData({ ...tipoFormData, descricao: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Descrição do tipo de gasto..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={tipoFormData.cor}
                      onChange={(e) =>
                        setTipoFormData({ ...tipoFormData, cor: e.target.value })
                      }
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tipoFormData.cor}
                      onChange={(e) =>
                        setTipoFormData({ ...tipoFormData, cor: e.target.value })
                      }
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTipoModal(false)
                      setEditingTipo(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
