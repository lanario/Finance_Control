'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { formatDate, formatarMoeda } from '@/lib/utils'
import { FiArrowLeft, FiShoppingCart, FiEdit, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi'

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
}

interface Parcela {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  cartao_id: string | null
  categoria: string
  numero_parcela: number
  total_parcelas: number
  paga: boolean
  user_id: string
}

interface Cartao {
  id: string
  nome: string
}

interface TipoGasto {
  id: string
  nome: string
  descricao: string | null
  cor: string
  user_id: string
}

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function GastosMensaisPage() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const ano = parseInt(params.ano as string)
  const mes = parseInt(params.mes as string)

  const [compras, setCompras] = useState<Compra[]>([])
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [totalMes, setTotalMes] = useState(0)
  const [ordenacaoCompras, setOrdenacaoCompras] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'data', direcao: 'desc' })
  const [ordenacaoParcelas, setOrdenacaoParcelas] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'data_vencimento', direcao: 'desc' })

  useEffect(() => {
    if (session && ano && mes) {
      loadDados()
    }
  }, [session, ano, mes])

  const loadDados = async () => {
    try {
      setLoading(true)
      const userId = session?.user?.id

      // Buscar cartões
      const { data: cartoesData } = await supabase
        .from('cartoes')
        .select('id, nome')
        .eq('user_id', userId)

      setCartoes(cartoesData || [])

      // Buscar tipos de gastos
      const { data: tiposData } = await supabase
        .from('tipos_gastos')
        .select('*')
        .eq('user_id', userId)

      setTiposGastos(tiposData || [])

      // Buscar compras do mês específico
      const startDate = new Date(ano, mes - 1, 1)
      const endDate = new Date(ano, mes, 0, 23, 59, 59)

      const { data: todasComprasData, error: comprasError } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startDate.toISOString().split('T')[0])
        .lte('data', endDate.toISOString().split('T')[0])
        .order('data', { ascending: false })

      if (comprasError) throw comprasError

      // Filtrar apenas compras NÃO parceladas (compras parceladas são representadas pelas parcelas)
      // Excluir compras onde parcelada = true OU total_parcelas > 1
      const comprasData = todasComprasData?.filter(compra => {
        const isParcelada = compra.parcelada === true || (compra as any).total_parcelas > 1
        return !isParcelada
      }) || []

      // Buscar TODAS as parcelas que vencem no mês específico (baseado na data de vencimento)
      // Incluir todas as parcelas (pagas e não pagas) pois são despesas que vencem naquele mês
      const { data: parcelasData, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startDate.toISOString().split('T')[0])
        .lte('data_vencimento', endDate.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: false })

      if (parcelasError) throw parcelasError

      setCompras(comprasData || [])
      setParcelas(parcelasData || [])
      
      // Calcular total incluindo compras não parceladas e TODAS as parcelas que vencem no mês
      // As parcelas são contabilizadas no mês em que vencem, independente do status de pagamento
      const totalCompras = comprasData?.reduce((sum, compra) => sum + compra.valor, 0) || 0
      const totalParcelas = parcelasData?.reduce((sum, parcela) => sum + parcela.valor, 0) || 0
      const total = totalCompras + totalParcelas
      setTotalMes(total)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCartaoNome = (cartaoId: string | null) => {
    if (!cartaoId) return 'N/A'
    return cartoes.find((c) => c.id === cartaoId)?.nome || 'N/A'
  }

  const getTipoGasto = (categoriaNome: string) => {
    return tiposGastos.find((t) => t.nome === categoriaNome)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta compra?')) return

    try {
      const { error } = await supabase.from('compras').delete().eq('id', id)
      if (error) throw error
      loadDados()
    } catch (error) {
      console.error('Erro ao excluir compra:', error)
      alert('Erro ao excluir compra')
    }
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

  const nomeMes = mesesNomes[mes - 1] || 'Mês'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Despesas de {nomeMes} {ano}
              </h1>
              <p className="text-gray-400">
                Total: <span className="text-red-400 font-semibold">R$ {totalMes.toFixed(2)}</span>
                {parcelas.length > 0 && (
                  <span className="text-gray-500 text-sm ml-2">
                    ({parcelas.filter(p => !p.paga).length} parcela{parcelas.filter(p => !p.paga).length !== 1 ? 's' : ''} pendente{parcelas.filter(p => !p.paga).length !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {compras.length === 0 && parcelas.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <FiShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Nenhuma despesa registrada neste mês
            </p>
            <p className="text-gray-500 text-sm">
              As compras e parcelas aparecerão aqui quando forem cadastradas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compras */}
            {compras.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white">Compras</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-primary text-white">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
                          onClick={() => setOrdenacaoCompras(prev => ({ campo: 'descricao', direcao: prev.campo === 'descricao' && prev.direcao === 'asc' ? 'desc' : 'asc' }))}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Descrição</span>
                            {ordenacaoCompras.campo === 'descricao' && (ordenacaoCompras.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />)}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
                          onClick={() => setOrdenacaoCompras(prev => ({ campo: 'valor', direcao: prev.campo === 'valor' && prev.direcao === 'asc' ? 'desc' : 'asc' }))}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Valor</span>
                            {ordenacaoCompras.campo === 'valor' && (ordenacaoCompras.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />)}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
                          onClick={() => setOrdenacaoCompras(prev => ({ campo: 'data', direcao: prev.campo === 'data' && prev.direcao === 'asc' ? 'desc' : 'asc' }))}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Data</span>
                            {ordenacaoCompras.campo === 'data' && (ordenacaoCompras.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />)}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
                          onClick={() => setOrdenacaoCompras(prev => ({ campo: 'metodo_pagamento', direcao: prev.campo === 'metodo_pagamento' && prev.direcao === 'asc' ? 'desc' : 'asc' }))}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Método de Pagamento</span>
                            {ordenacaoCompras.campo === 'metodo_pagamento' && (ordenacaoCompras.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />)}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
                          onClick={() => setOrdenacaoCompras(prev => ({ campo: 'categoria', direcao: prev.campo === 'categoria' && prev.direcao === 'asc' ? 'desc' : 'asc' }))}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Categoria</span>
                            {ordenacaoCompras.campo === 'categoria' && (ordenacaoCompras.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />)}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {compras
                        .sort((a, b) => {
                          let comparacao = 0
                          switch (ordenacaoCompras.campo) {
                            case 'descricao':
                              comparacao = a.descricao.localeCompare(b.descricao, 'pt-BR')
                              break
                            case 'valor':
                              comparacao = a.valor - b.valor
                              break
                            case 'data':
                              comparacao = new Date(a.data).getTime() - new Date(b.data).getTime()
                              break
                            case 'metodo_pagamento':
                              comparacao = a.metodo_pagamento.localeCompare(b.metodo_pagamento, 'pt-BR')
                              break
                            case 'categoria':
                              comparacao = a.categoria.localeCompare(b.categoria, 'pt-BR')
                              break
                          }
                          return ordenacaoCompras.direcao === 'asc' ? comparacao : -comparacao
                        })
                        .map((compra) => {
                        const tipo = getTipoGasto(compra.categoria)
                        return (
                          <tr key={compra.id} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                              {compra.descricao}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                              R$ {formatarMoeda(compra.valor)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                              {formatDate(compra.data)}
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
                                  onClick={() => router.push(`/pessoal/compras?edit=${compra.id}`)}
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Parcelas */}
            {parcelas.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white">
                    Parcelas que Vencem neste Mês
                  </h2>
                </div>
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
                          Data de Vencimento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Parcela
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Categoria
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {parcelas.map((parcela) => {
                        const tipo = getTipoGasto(parcela.categoria)
                        return (
                          <tr 
                            key={parcela.id} 
                            className={`hover:bg-gray-700/50 transition-colors ${parcela.paga ? 'opacity-60' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                              {parcela.descricao}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap font-semibold ${parcela.paga ? 'text-green-400' : 'text-white'}`}>
                              R$ {parcela.valor.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                              {formatDate(parcela.data_vencimento)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                              {parcela.numero_parcela}/{parcela.total_parcelas}
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
                                  {parcela.categoria}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                                  {parcela.categoria}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {parcela.paga ? (
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/40">
                                  Paga
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/40">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/cartoes`)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Editar (ir para cartões)"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Tem certeza que deseja excluir esta parcela?')) return
                                    try {
                                      const { error } = await supabase
                                        .from('parcelas')
                                        .delete()
                                        .eq('id', parcela.id)
                                      if (error) throw error
                                      loadDados()
                                    } catch (error) {
                                      console.error('Erro ao excluir parcela:', error)
                                      alert('Erro ao excluir parcela')
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Excluir"
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
      </div>
    </MainLayout>
  )
}
