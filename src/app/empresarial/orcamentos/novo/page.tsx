'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiArrowLeft, FiPlus, FiTrash2, FiSave, FiFileText } from 'react-icons/fi'

interface Cliente {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  endereco: string | null
}

interface ItemOrcamento {
  item_numero: number
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto: number
  valor_total: number
  observacoes: string
}

export default function NovoOrcamentoPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [numero, setNumero] = useState('')
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0])
  const [dataValidade, setDataValidade] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [status, setStatus] = useState('rascunho')
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [descontoGeral, setDescontoGeral] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [condicoesPagamento, setCondicoesPagamento] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  
  // Dados do usuário
  const [perfilUsuario, setPerfilUsuario] = useState<{
    nome: string | null
    empresa_nome: string | null
    empresa_cnpj: string | null
    telefone: string | null
    celular: string | null
    endereco: string | null
    email: string | null
  } | null>(null)

  useEffect(() => {
    if (session) {
      loadClientes()
      gerarNumeroOrcamento()
      loadPerfilUsuario()
    }
  }, [session])

  const loadPerfilUsuario = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const { data: perfil, error } = await supabase
        .from('perfis')
        .select('nome, empresa_nome, empresa_cnpj, telefone, celular, endereco')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error)
      }

      setPerfilUsuario({
        nome: perfil?.nome || null,
        empresa_nome: perfil?.empresa_nome || null,
        empresa_cnpj: perfil?.empresa_cnpj || null,
        telefone: perfil?.telefone || null,
        email: session.user.email || null,
      })
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error)
    }
  }

  const loadClientes = async () => {
    try {
      const userId = session?.user?.id
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone, endereco')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const gerarNumeroOrcamento = async () => {
    try {
      const userId = session?.user?.id
      const ano = new Date().getFullYear()
      const { count } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', `${ano}-01-01`)
        .lte('created_at', `${ano}-12-31`)

      const proximoNumero = (count || 0) + 1
      setNumero(`ORC-${ano}-${String(proximoNumero).padStart(4, '0')}`)
    } catch (error) {
      console.error('Erro ao gerar número:', error)
      setNumero(`ORC-${new Date().getFullYear()}-0001`)
    }
  }

  const handleClienteChange = (clienteIdValue: string) => {
    setClienteId(clienteIdValue)
    const cliente = clientes.find(c => c.id === clienteIdValue)
    setClienteSelecionado(cliente || null)
  }

  const handleAddItem = () => {
    const novoItem: ItemOrcamento = {
      item_numero: itens.length + 1,
      descricao: '',
      quantidade: 1,
      unidade: 'un',
      valor_unitario: 0,
      desconto: 0,
      valor_total: 0,
      observacoes: '',
    }
    setItens([...itens, novoItem])
  }

  const handleRemoveItem = (index: number) => {
    const novosItens = itens.filter((_, i) => i !== index)
    // Renumerar itens
    const itensRenumerados = novosItens.map((item, i) => ({
      ...item,
      item_numero: i + 1,
    }))
    setItens(itensRenumerados)
  }

  const handleItemChange = (index: number, field: keyof ItemOrcamento, value: any) => {
    const novosItens = [...itens]
    novosItens[index] = {
      ...novosItens[index],
      [field]: value,
    }

    // Recalcular valor total do item
    const quantidade = field === 'quantidade' ? parseFloat(value) || 0 : novosItens[index].quantidade
    const valorUnitario = field === 'valor_unitario' ? parseFloat(value) || 0 : novosItens[index].valor_unitario
    const desconto = field === 'desconto' ? parseFloat(value) || 0 : novosItens[index].desconto

    const subtotal = quantidade * valorUnitario
    const valorTotal = subtotal - desconto

    novosItens[index].quantidade = quantidade
    novosItens[index].valor_unitario = valorUnitario
    novosItens[index].desconto = desconto
    novosItens[index].valor_total = valorTotal >= 0 ? valorTotal : 0

    setItens(novosItens)
  }

  const calcularTotais = () => {
    const valorTotal = itens.reduce((sum, item) => sum + item.valor_total, 0)
    const valorFinal = valorTotal - descontoGeral
    return { valorTotal, valorFinal: valorFinal >= 0 ? valorFinal : 0 }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (itens.length === 0) {
      alert('Adicione pelo menos um item ao orçamento.')
      return
    }

    setLoading(true)
    try {
      const userId = session?.user?.id
      const { valorTotal, valorFinal } = calcularTotais()

      // Salvar orçamento
      const orcamentoData = {
        user_id: userId,
        cliente_id: clienteId || null,
        numero,
        data_emissao: dataEmissao,
        data_validade: dataValidade || null,
        status,
        valor_total: valorTotal,
        desconto: descontoGeral,
        valor_final: valorFinal,
        observacoes: observacoes || null,
        condicoes_pagamento: condicoesPagamento || null,
        prazo_entrega: prazoEntrega || null,
        cliente_nome: clienteSelecionado?.nome || null,
        cliente_email: clienteSelecionado?.email || null,
        cliente_telefone: clienteSelecionado?.telefone || null,
        cliente_endereco: clienteSelecionado?.endereco || null,
      }

      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert([orcamentoData])
        .select()
        .single()

      if (orcamentoError) throw orcamentoError

      // Salvar itens
      const itensData = itens.map(item => ({
        orcamento_id: orcamento.id,
        user_id: userId,
        item_numero: item.item_numero,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        valor_total: item.valor_total,
        observacoes: item.observacoes || null,
      }))

      const { error: itensError } = await supabase
        .from('orcamento_itens')
        .insert(itensData)

      if (itensError) throw itensError

      router.push('/empresarial/orcamentos')
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error)
      alert('Erro ao salvar orçamento')
    } finally {
      setLoading(false)
    }
  }

  const { valorTotal, valorFinal } = calcularTotais()

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/empresarial/orcamentos')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Criar orçamento</h1>
              <p className="text-gray-400">Total = soma dos itens - desconto.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do usuário (snapshot) */}
          {perfilUsuario && (
            <div className="bg-blue-900/20 rounded-lg border border-blue-700/50 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <FiFileText className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Dados do usuário (snapshot)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Nome: </span>
                  <span className="text-white">{perfilUsuario.nome || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">CPF/CNPJ: </span>
                  <span className="text-white">{perfilUsuario.empresa_cnpj || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Fixo: </span>
                  <span className="text-white">{perfilUsuario.telefone || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Endereço: </span>
                  <span className="text-white">{perfilUsuario.endereco || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email: </span>
                  <span className="text-white">{perfilUsuario.email || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Celular: </span>
                  <span className="text-white">{perfilUsuario.celular || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Informações Básicas */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cliente
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                >
                  <option value="">(Sem cliente)</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data inicial
                </label>
                <input
                  type="date"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Validade
                </label>
                <input
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                >
                  <option value="rascunho">Aberto</option>
                  <option value="enviado">Enviado</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Rejeitado</option>
                  <option value="convertido">Convertido</option>
                </select>
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Itens</h2>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <FiFileText className="w-5 h-5" />
                  <span>Gerenciar Itens</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>+ Adicionar item</span>
                </button>
              </div>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhum item adicionado. Clique em "+ Adicionar item" para começar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {itens.map((item, index) => {
                  const subtotalItem = item.quantidade * item.valor_unitario
                  return (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-400 mb-1">Qtd.</label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                            required
                            min="0"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                          />
                        </div>
                        <div className="col-span-6">
                          <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={item.descricao}
                              onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                              required
                              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                              placeholder="Descrição do item"
                            />
                            <button
                              type="button"
                              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                            >
                              Q Buscar
                            </button>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.valor_unitario}
                            onChange={(e) => handleItemChange(index, 'valor_unitario', e.target.value)}
                            required
                            min="0"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                            placeholder="0,00"
                          />
                        </div>
                        <div className="col-span-3 flex items-end space-x-2">
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">Subtotal do item:</p>
                            <p className="text-white font-semibold">R$ {subtotalItem.toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <FiTrash2 className="w-4 h-4" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Outras informações (opcional) */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Outras informações (opcional)</h2>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
              placeholder="Observações, condições, prazos..."
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/empresarial/orcamentos')}
              className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || itens.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              <span>{loading ? 'Salvando...' : 'Salvar Orçamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </MainLayoutEmpresarial>
  )
}
