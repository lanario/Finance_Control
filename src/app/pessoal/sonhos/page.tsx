'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { formatDate, formatarMoeda } from '@/lib/utils'
import { FiPlus, FiEdit, FiTrash2, FiTarget, FiX, FiDollarSign } from 'react-icons/fi'

interface Sonho {
  id: string
  nome: string
  descricao: string | null
  valor_objetivo: number
  valor_atual: number
  data_objetivo: string | null
  valor_mensal: number | null
  ativo: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export default function SonhosPage() {
  const { session } = useAuth()
  const [sonhos, setSonhos] = useState<Sonho[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSonho, setEditingSonho] = useState<Sonho | null>(null)
  const [saldoDisponivel, setSaldoDisponivel] = useState<number>(0)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_objetivo: '',
    valor_mensal: '',
  })

  useEffect(() => {
    if (session) {
      loadSonhos()
      calcularSaldoDisponivel()
    }
  }, [session])

  // Calcular saldo disponível (receitas - despesas do mês atual)
  const calcularSaldoDisponivel = async () => {
    if (!session?.user?.id) return

    try {
      const hoje = new Date()
      const mesAtual = hoje.getMonth() + 1
      const anoAtual = hoje.getFullYear()

      // Buscar receitas do mês atual
      const { data: receitas } = await supabase
        .from('receitas')
        .select('valor')
        .eq('user_id', session.user.id)
        .eq('mes_referencia', mesAtual)
        .eq('ano_referencia', anoAtual)

      const totalReceitas = receitas?.reduce((sum, r) => sum + r.valor, 0) || 0

      // Buscar compras não parceladas do mês atual
      const startOfMonth = new Date(anoAtual, mesAtual - 1, 1)
      const endOfMonth = new Date(anoAtual, mesAtual, 0)

      const { data: compras } = await supabase
        .from('compras')
        .select('valor')
        .eq('user_id', session.user.id)
        .gte('data', startOfMonth.toISOString().split('T')[0])
        .lte('data', endOfMonth.toISOString().split('T')[0])
        .or('parcelada.is.null,parcelada.eq.false')

      const comprasNaoParceladas = compras?.reduce((sum, c) => sum + c.valor, 0) || 0

      // Buscar parcelas que vencem no mês atual
      const { data: parcelas } = await supabase
        .from('parcelas')
        .select('valor')
        .eq('user_id', session.user.id)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])

      const totalParcelas = parcelas?.reduce((sum, p) => sum + p.valor, 0) || 0

      // O saldo é: Receitas - Despesas
      // As despesas incluem compras + parcelas
      // Os depósitos em sonhos JÁ são registrados como despesas (transferências internas) na tabela compras
      // Portanto, NÃO devemos descontar os depósitos separadamente
      const totalDespesas = comprasNaoParceladas + totalParcelas
      const saldo = totalReceitas - totalDespesas

      setSaldoDisponivel(saldo)
    } catch (error) {
      console.error('Erro ao calcular saldo disponível:', error)
    }
  }

  const loadSonhos = async () => {
    try {
      const { data, error } = await supabase
        .from('sonhos')
        .select('*')
        .eq('user_id', session?.user?.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSonhos(data || [])
    } catch (error) {
      console.error('Erro ao carregar sonhos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular data objetivo dinamicamente baseado no valor mensal e valor atual
  const calcularDataObjetivo = (valorObjetivo: number, valorAtual: number, valorMensal: number | null): string | null => {
    if (!valorMensal || valorMensal <= 0) return null

    const hoje = new Date()
    const valorRestante = valorObjetivo - valorAtual

    if (valorRestante <= 0) return hoje.toISOString().split('T')[0]

    const meses = Math.ceil(valorRestante / valorMensal)
    const dataObjetivo = new Date(hoje)
    dataObjetivo.setMonth(dataObjetivo.getMonth() + meses)

    return dataObjetivo.toISOString().split('T')[0]
  }

  // Calcular meses até objetivo
  const calcularMesesAteObjetivo = (valorObjetivo: number, valorAtual: number, valorMensal: number | null): number | null => {
    if (!valorMensal || valorMensal <= 0) return null

    const valorRestante = valorObjetivo - valorAtual
    if (valorRestante <= 0) return 0

    return Math.ceil(valorRestante / valorMensal)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome || !formData.valor_objetivo) {
      alert('Por favor, preencha o nome e o valor objetivo')
      return
    }

    const valorObjetivo = parseFloat(formData.valor_objetivo)
    if (isNaN(valorObjetivo) || valorObjetivo <= 0) {
      alert('O valor objetivo deve ser um número maior que zero')
      return
    }

    try {
      const valorMensal = formData.valor_mensal ? parseFloat(formData.valor_mensal) : null

      if (editingSonho) {
        const { error } = await supabase
          .from('sonhos')
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            valor_objetivo: valorObjetivo,
            valor_mensal: valorMensal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSonho.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('sonhos')
          .insert({
            nome: formData.nome,
            descricao: formData.descricao || null,
            valor_objetivo: valorObjetivo,
            valor_atual: 0,
            valor_mensal: valorMensal,
            ativo: true,
            user_id: session?.user?.id,
          })

        if (error) throw error
      }

      setShowModal(false)
      setFormData({
        nome: '',
        descricao: '',
        valor_objetivo: '',
        valor_mensal: '',
      })
      setEditingSonho(null)
      loadSonhos()
      calcularSaldoDisponivel()
    } catch (error) {
      console.error('Erro ao salvar sonho:', error)
      alert('Erro ao salvar sonho')
    }
  }

  const handleEdit = (sonho: Sonho) => {
    setEditingSonho(sonho)
    setFormData({
      nome: sonho.nome,
      descricao: sonho.descricao || '',
      valor_objetivo: sonho.valor_objetivo.toString(),
      valor_mensal: sonho.valor_mensal?.toString() || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sonho? Todos os depósitos realizados serão removidos e o valor retornará ao saldo disponível.')) return

    try {
      if (!session?.user?.id) {
        alert('Sessão não encontrada')
        return
      }

      // Buscar informações do sonho antes de excluir
      const { data: sonho } = await supabase
        .from('sonhos')
        .select('nome')
        .eq('id', id)
        .single()

      if (!sonho) {
        alert('Sonho não encontrado')
        return
      }

      // Excluir todas as despesas relacionadas a este sonho na tabela compras
      // As despesas são identificadas pela descrição "Transferência interna - {nome do sonho}"
      const { error: despesasError } = await supabase
        .from('compras')
        .delete()
        .eq('user_id', session.user.id)
        .eq('categoria', 'Transferência Interna')
        .like('descricao', `Transferência interna - ${sonho.nome}%`)

      if (despesasError) {
        console.error('Erro ao excluir despesas relacionadas:', despesasError)
        // Não impedir a exclusão se falhar, mas logar o erro
      }

      // Excluir os depósitos relacionados ao sonho
      const { error: depositosError } = await supabase
        .from('sonhos_depositos')
        .delete()
        .eq('sonho_id', id)

      if (depositosError) throw depositosError

      // Depois, marcar o sonho como inativo
      const { error } = await supabase
        .from('sonhos')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error
      
      // Recarregar dados e recalcular saldo
      loadSonhos()
      calcularSaldoDisponivel()
      
      alert('Sonho excluído com sucesso! As despesas relacionadas foram removidas e o valor retornou ao saldo disponível.')
    } catch (error) {
      console.error('Erro ao excluir sonho:', error)
      alert('Erro ao excluir sonho')
    }
  }

  const handleDeposito = async (sonhoId: string, valor: number) => {
    if (!session?.user?.id) return

    // Validar saldo disponível
    if (valor > saldoDisponivel) {
      alert(`Saldo insuficiente! Você tem apenas R$ ${formatarMoeda(saldoDisponivel)} disponível este mês.`)
      return
    }

    try {
      const hoje = new Date()
      const mes = hoje.getMonth() + 1
      const ano = hoje.getFullYear()
      const dataHoje = hoje.toISOString().split('T')[0]

      // Buscar informações do sonho
      const { data: sonho } = await supabase
        .from('sonhos')
        .select('nome')
        .eq('id', sonhoId)
        .single()

      if (!sonho) {
        alert('Sonho não encontrado')
        return
      }

      // Verificar se já existe depósito para este mês
      const { data: depositoExistente } = await supabase
        .from('sonhos_depositos')
        .select('id, valor')
        .eq('sonho_id', sonhoId)
        .eq('mes', mes)
        .eq('ano', ano)
        .single()

      const valorDeposito = depositoExistente ? depositoExistente.valor + valor : valor

      // Validar novamente considerando depósitos existentes
      if (valorDeposito > saldoDisponivel + (depositoExistente?.valor || 0)) {
        alert(`Saldo insuficiente! Você tem apenas R$ ${formatarMoeda(saldoDisponivel)} disponível este mês.`)
        return
      }

      if (depositoExistente) {
        // Atualizar depósito existente
        const { error } = await supabase
          .from('sonhos_depositos')
          .update({ valor: valorDeposito })
          .eq('id', depositoExistente.id)

        if (error) throw error
      } else {
        // Criar novo depósito
        const { error } = await supabase
          .from('sonhos_depositos')
          .insert({
            sonho_id: sonhoId,
            user_id: session.user.id,
            valor: valor,
            mes: mes,
            ano: ano,
          })

        if (error) throw error
      }

      // Registrar como despesa (transferência interna)
      const { error: despesaError } = await supabase
        .from('compras')
        .insert({
          user_id: session.user.id,
          descricao: `Transferência interna - ${sonho.nome}`,
          valor: valor,
          data: dataHoje,
          categoria: 'Transferência Interna',
          metodo_pagamento: 'pix',
          parcelada: false,
          cartao_id: null,
        })

      if (despesaError) {
        console.error('Erro ao registrar despesa:', despesaError)
        // Não impedir o depósito se falhar o registro da despesa, mas logar o erro
      }

      // Recarregar sonhos e saldo disponível
      loadSonhos()
      calcularSaldoDisponivel()
    } catch (error) {
      console.error('Erro ao fazer depósito:', error)
      alert('Erro ao fazer depósito')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Carregando...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sonhos Infinity</h1>
            <p className="text-gray-400">
              Defina suas metas futuras e acompanhe seu progresso
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSonho(null)
              setFormData({
                nome: '',
                descricao: '',
                valor_objetivo: '',
                valor_mensal: '',
              })
              setShowModal(true)
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Sonho</span>
          </button>
        </div>

        {/* Saldo Disponível */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm mb-1">Saldo Disponível Este Mês</p>
              <p className={`text-3xl font-bold ${saldoDisponivel >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {formatarMoeda(saldoDisponivel)}
              </p>
            </div>
          </div>
        </div>

        {sonhos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <FiTarget className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Nenhum sonho cadastrado
            </p>
            <p className="text-gray-500 text-sm">
              Clique em "Adicionar Sonho" para começar a planejar seus objetivos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sonhos.map((sonho) => {
              const percentual = (sonho.valor_atual / sonho.valor_objetivo) * 100
              const dataObjetivoCalculada = calcularDataObjetivo(sonho.valor_objetivo, sonho.valor_atual, sonho.valor_mensal)
              const mesesAteObjetivo = calcularMesesAteObjetivo(sonho.valor_objetivo, sonho.valor_atual, sonho.valor_mensal)
              const valorRestante = sonho.valor_objetivo - sonho.valor_atual

              return (
                <div
                  key={sonho.id}
                  className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{sonho.nome}</h3>
                      {sonho.descricao && (
                        <p className="text-gray-400 text-sm">{sonho.descricao}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(sonho)}
                        className="text-gray-400 hover:text-primary transition-colors"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sonho.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progresso</span>
                      <span className="text-white font-semibold">{percentual.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percentual, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valor Atual</span>
                      <span className="text-green-400 font-semibold">
                        R$ {formatarMoeda(sonho.valor_atual)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valor Objetivo</span>
                      <span className="text-white font-semibold">
                        R$ {formatarMoeda(sonho.valor_objetivo)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Restante</span>
                      <span className="text-yellow-400 font-semibold">
                        R$ {formatarMoeda(valorRestante)}
                      </span>
                    </div>
                    {sonho.valor_mensal && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valor Mensal (estimado)</span>
                        <span className="text-blue-400 font-semibold">
                          R$ {formatarMoeda(sonho.valor_mensal || 0)}
                        </span>
                      </div>
                    )}
                    {dataObjetivoCalculada && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Data Objetivo (estimada)</span>
                        <span className="text-white font-semibold">
                          {formatDate(dataObjetivoCalculada)}
                        </span>
                      </div>
                    )}
                    {mesesAteObjetivo !== null && mesesAteObjetivo > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tempo Restante (estimado)</span>
                        <span className="text-purple-400 font-semibold">
                          {mesesAteObjetivo} {mesesAteObjetivo === 1 ? 'mês' : 'meses'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const valor = prompt(`Quanto deseja depositar em "${sonho.nome}"?\n\nSaldo disponível: R$ ${formatarMoeda(saldoDisponivel)}`)
                      if (valor) {
                        const valorNum = parseFloat(valor.replace(',', '.'))
                        if (!isNaN(valorNum) && valorNum > 0) {
                          handleDeposito(sonho.id, valorNum)
                        } else {
                          alert('Valor inválido')
                        }
                      }
                    }}
                    className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center space-x-2"
                  >
                    <FiDollarSign className="w-5 h-5" />
                    <span>Depositar</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingSonho ? 'Editar Sonho' : 'Novo Sonho'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome do Sonho *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Casa própria, Carro novo, Viagem..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Descrição do seu sonho..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor Objetivo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_objetivo}
                    onChange={(e) => setFormData({ ...formData, valor_objetivo: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor Mensal Estimado (R$) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_mensal}
                    onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    Valor estimado que você pretende depositar mensalmente. A data objetivo será calculada automaticamente.
                  </p>
                  {formData.valor_mensal && formData.valor_objetivo && (
                    <p className="text-sm text-blue-400 mt-2">
                      Data objetivo estimada: {formatDate(calcularDataObjetivo(
                        parseFloat(formData.valor_objetivo),
                        0,
                        parseFloat(formData.valor_mensal)
                      ) || new Date().toISOString().split('T')[0])}
                    </p>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    {editingSonho ? 'Atualizar' : 'Criar'} Sonho
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
