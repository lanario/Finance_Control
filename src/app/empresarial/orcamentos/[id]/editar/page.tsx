'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiArrowLeft, FiPlus, FiTrash2, FiSave, FiChevronDown, FiChevronUp, FiImage, FiX } from 'react-icons/fi'
import Image from 'next/image'

interface Cliente {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  endereco: string | null
}

interface ItemOrcamento {
  id?: string
  item_numero: number
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  desconto: number
  valor_total: number
  observacoes: string
}

export default function EditarOrcamentoPage() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orcamentoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [numero, setNumero] = useState('')
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0])
  const [dataValidade, setDataValidade] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [status, setStatus] = useState('em_processo')
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [descontoGeral, setDescontoGeral] = useState(0)
  const [observacoes, setObservacoes] = useState('')
  const [condicoesPagamento, setCondicoesPagamento] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  
  // Personalização básica (mantida apenas para compatibilidade com dados existentes)
  const [corPrimaria, setCorPrimaria] = useState('#6366f1')
  const [corSecundaria, setCorSecundaria] = useState('#8b5cf6')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [cabecalhoPersonalizado, setCabecalhoPersonalizado] = useState('')
  const [rodapePersonalizado, setRodapePersonalizado] = useState('')

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<'dados' | 'estilo'>('dados')

  // Verificar se deve abrir direto na aba de estilo (via query param)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('aba') === 'estilo') {
        setAbaAtiva('estilo')
      }
    }
  }, [])

  // Estilo - Cores
  const [corTexto, setCorTexto] = useState('#111827')
  const [corFundo, setCorFundo] = useState('#FFFFFF')
  const [corBordas, setCorBordas] = useState('#111827')
  const [corHeader, setCorHeader] = useState('#FFFFFF')
  const [corTextoHeader, setCorTextoHeader] = useState('#111827')

  // Estilo - Fontes
  const [fonteTituloHeader, setFonteTituloHeader] = useState(18)
  const [fonteTituloSecao, setFonteTituloSecao] = useState(12)
  const [fonteFamilia, setFonteFamilia] = useState('Arial')

  // Estilo - Marca d'água
  const [marcaDaguaOpacidade, setMarcaDaguaOpacidade] = useState(100)
  const [marcaDaguaRotacao, setMarcaDaguaRotacao] = useState(0)
  const [marcaDaguaPosicaoPersonalizada, setMarcaDaguaPosicaoPersonalizada] = useState(true)
  const [marcaDaguaPosicaoX, setMarcaDaguaPosicaoX] = useState(10)
  const [marcaDaguaPosicaoY, setMarcaDaguaPosicaoY] = useState(10)
  const [marcaDaguaTamanho, setMarcaDaguaTamanho] = useState(120)
  const [marcaDaguaFormato, setMarcaDaguaFormato] = useState('quadrado')
  const [marcaDaguaUrl, setMarcaDaguaUrl] = useState<string | null>(null)

  // Estilo - Layout
  const [paddingPagina, setPaddingPagina] = useState(28)
  const [paddingHeader, setPaddingHeader] = useState(14)
  const [espacamentoSecoes, setEspacamentoSecoes] = useState(14)

  // Upload de logo
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Seções colapsadas
  const [coresExpandida, setCoresExpandida] = useState(true)
  const [fontesExpandida, setFontesExpandida] = useState(false)
  const [marcaDaguaExpandida, setMarcaDaguaExpandida] = useState(true)
  const [layoutExpandido, setLayoutExpandido] = useState(true)
  const [logoExpandido, setLogoExpandido] = useState(false)

  useEffect(() => {
    if (session && orcamentoId) {
      loadData()
    }
  }, [session, orcamentoId])

  const loadData = async () => {
    try {
      const userId = session?.user?.id

      // Carregar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone, endereco')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome', { ascending: true })
      setClientes(clientesData || [])

      // Carregar orçamento
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', orcamentoId)
        .eq('user_id', userId)
        .single()

      if (orcamentoError) throw orcamentoError

      if (orcamento) {
        setNumero(orcamento.numero)
        setDataEmissao(orcamento.data_emissao)
        setDataValidade(orcamento.data_validade || '')
        setClienteId(orcamento.cliente_id || '')
        setStatus(orcamento.status)
        setDescontoGeral(orcamento.desconto || 0)
        setObservacoes(orcamento.observacoes || '')
        setCondicoesPagamento(orcamento.condicoes_pagamento || '')
        setPrazoEntrega(orcamento.prazo_entrega || '')
        // Manter valores do banco apenas para compatibilidade (não serão editados na aba de dados)
        setCorPrimaria(orcamento.cor_primaria || '#6366f1')
        setCorSecundaria(orcamento.cor_secundaria || '#8b5cf6')
        setLogoUrl(orcamento.logo_url || null)
        setCabecalhoPersonalizado(orcamento.cabecalho_personalizado || '')
        setRodapePersonalizado(orcamento.rodape_personalizado || '')
        
        // Carregar configurações de estilo do template padrão (localStorage)
        const templateSalvo = localStorage.getItem(`orcamento_template_${userId}`)
        if (templateSalvo) {
          try {
            const template = JSON.parse(templateSalvo)
            setCorTexto(template.corTexto || '#111827')
            setCorFundo(template.corFundo || '#FFFFFF')
            setCorBordas(template.corBordas || '#111827')
            setCorHeader(template.corHeader || '#FFFFFF')
            setCorTextoHeader(template.corTextoHeader || '#111827')
            setFonteTituloHeader(template.fonteTituloHeader || 18)
            setFonteTituloSecao(template.fonteTituloSecao || 12)
            setFonteFamilia(template.fonteFamilia || 'Arial')
            setMarcaDaguaOpacidade(template.marcaDaguaOpacidade || 100)
            setMarcaDaguaRotacao(template.marcaDaguaRotacao || 0)
            setMarcaDaguaPosicaoPersonalizada(template.marcaDaguaPosicaoPersonalizada !== undefined ? template.marcaDaguaPosicaoPersonalizada : true)
            setMarcaDaguaPosicaoX(template.marcaDaguaPosicaoX || 10)
            setMarcaDaguaPosicaoY(template.marcaDaguaPosicaoY || 10)
            setMarcaDaguaTamanho(template.marcaDaguaTamanho || 120)
            setMarcaDaguaFormato(template.marcaDaguaFormato || 'quadrado')
            setMarcaDaguaUrl(template.marcaDaguaUrl || null)
            setPaddingPagina(template.paddingPagina || 28)
            setPaddingHeader(template.paddingHeader || 14)
            setEspacamentoSecoes(template.espacamentoSecoes || 14)
            // Carregar logo do template se existir
            if (template.logoUrl) {
              setLogoUrl(template.logoUrl)
            }
            // Carregar cores do template
            if (template.corPrimaria) {
              setCorPrimaria(template.corPrimaria)
            }
            if (template.corSecundaria) {
              setCorSecundaria(template.corSecundaria)
            }
          } catch (e) {
            console.error('Erro ao carregar template:', e)
          }
        }

        if (orcamento.cliente_id) {
          const cliente = clientesData?.find(c => c.id === orcamento.cliente_id)
          setClienteSelecionado(cliente || null)
        }
      }

      // Carregar itens
      const { data: itensData, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('user_id', userId)
        .order('item_numero', { ascending: true })

      if (itensError) throw itensError
      setItens((itensData || []).map(item => ({
        id: item.id,
        item_numero: item.item_numero,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        valor_total: item.valor_total,
        observacoes: item.observacoes || '',
      })))
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar orçamento')
      router.push('/empresarial/orcamentos')
    } finally {
      setLoading(false)
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


  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (itens.length === 0) {
      alert('Adicione pelo menos um item ao orçamento.')
      return
    }

    setSaving(true)
    try {
      const userId = session?.user?.id
      const { valorTotal, valorFinal } = calcularTotais()

      // Atualizar orçamento
      const orcamentoData = {
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
        // Manter valores antigos do banco (não alterar mais via edição de dados)
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        logo_url: logoUrl || null,
        cabecalho_personalizado: cabecalhoPersonalizado || null,
        rodape_personalizado: rodapePersonalizado || null,
        cliente_nome: clienteSelecionado?.nome || null,
        cliente_email: clienteSelecionado?.email || null,
        cliente_telefone: clienteSelecionado?.telefone || null,
        cliente_endereco: clienteSelecionado?.endereco || null,
      }

      const { error: orcamentoError } = await supabase
        .from('orcamentos')
        .update(orcamentoData)
        .eq('id', orcamentoId)

      if (orcamentoError) throw orcamentoError

      // Deletar itens antigos
      await supabase
        .from('orcamento_itens')
        .delete()
        .eq('orcamento_id', orcamentoId)

      // Inserir novos itens
      const itensData = itens.map(item => ({
        orcamento_id: orcamentoId,
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
      setSaving(false)
    }
  }

  const { valorTotal, valorFinal } = calcularTotais()

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-white text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
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
              <h1 className="text-3xl font-bold text-white mb-2">Editar Orçamento</h1>
              <p className="text-gray-400">Edite o orçamento {numero}</p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8">
            <button
              type="button"
              onClick={() => setAbaAtiva('dados')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                abaAtiva === 'dados'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Dados do Orçamento
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('estilo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                abaAtiva === 'estilo'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Orçamento (estilo)
            </button>
          </nav>
        </div>

        {abaAtiva === 'dados' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Número do Orçamento
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cliente
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data de Emissão
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
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
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
                  <option value="em_processo">Em processo</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Itens do Orçamento */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Itens do Orçamento</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors"
              >
                <FiPlus className="w-5 h-5" />
                <span>Adicionar Item</span>
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Descrição</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Quantidade</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Unidade</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Valor Unitário</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Desconto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Total</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {itens.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300">{item.item_numero}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.descricao}
                            onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                            required
                            className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                            placeholder="Descrição do item"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                            required
                            min="0"
                            className="w-20 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.unidade}
                            onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
                            className="w-20 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                            placeholder="un"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.valor_unitario}
                            onChange={(e) => handleItemChange(index, 'valor_unitario', e.target.value)}
                            required
                            min="0"
                            className="w-24 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.desconto}
                            onChange={(e) => handleItemChange(index, 'desconto', e.target.value)}
                            min="0"
                            className="w-24 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-800"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 text-white font-semibold">
                          R$ {item.valor_total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totais e Observações */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Totais e Observações</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Desconto Geral (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={descontoGeral}
                  onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Condições de Pagamento
                </label>
                <input
                  type="text"
                  value={condicoesPagamento}
                  onChange={(e) => setCondicoesPagamento(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                  placeholder="Ex: 30/60/90 dias"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prazo de Entrega
                </label>
                <input
                  type="text"
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                  placeholder="Ex: 15 dias úteis"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-800"
                placeholder="Observações adicionais sobre o orçamento"
              />
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Subtotal:</span>
                <span className="text-white font-semibold">R$ {valorTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Desconto:</span>
                <span className="text-red-400">- R$ {descontoGeral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-white font-bold text-lg">Total:</span>
                <span className="text-white font-bold text-lg">R$ {valorFinal.toFixed(2)}</span>
              </div>
            </div>
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
              disabled={saving || itens.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
            {/* Painel Esquerdo - Configurações de Estilo */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Orçamento (estilo)</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (!session?.user?.id) return
                    const templateConfig = {
                      corPrimaria,
                      corSecundaria,
                      corTexto,
                      corFundo,
                      corBordas,
                      corHeader,
                      corTextoHeader,
                      fonteTituloHeader,
                      fonteTituloSecao,
                      fonteFamilia,
                      marcaDaguaOpacidade,
                      marcaDaguaRotacao,
                      marcaDaguaPosicaoPersonalizada,
                      marcaDaguaPosicaoX,
                      marcaDaguaPosicaoY,
                      marcaDaguaTamanho,
                      marcaDaguaFormato,
                      marcaDaguaUrl,
                      paddingPagina,
                      paddingHeader,
                      espacamentoSecoes,
                      logoUrl,
                    }
                    localStorage.setItem(`orcamento_template_${session.user.id}`, JSON.stringify(templateConfig))
                    alert('Template padrão salvo com sucesso!')
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Salvar Template</span>
                </button>
              </div>

              {/* Cores */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setCoresExpandida(!coresExpandida)}
                  className="w-full flex items-center justify-between text-white font-medium mb-4"
                >
                  <span>Cores</span>
                  {coresExpandida ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {coresExpandida && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor Primária</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corPrimaria}
                          onChange={(e) => setCorPrimaria(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corPrimaria}
                          onChange={(e) => setCorPrimaria(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Usada no header e bordas</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor Secundária</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corSecundaria}
                          onChange={(e) => setCorSecundaria(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corSecundaria}
                          onChange={(e) => setCorSecundaria(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Usada em títulos</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor do Texto</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corTexto}
                          onChange={(e) => setCorTexto(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corTexto}
                          onChange={(e) => setCorTexto(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor de Fundo</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corFundo}
                          onChange={(e) => setCorFundo(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corFundo}
                          onChange={(e) => setCorFundo(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor das Bordas</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corBordas}
                          onChange={(e) => setCorBordas(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corBordas}
                          onChange={(e) => setCorBordas(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor do Header</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corHeader}
                          onChange={(e) => setCorHeader(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corHeader}
                          onChange={(e) => setCorHeader(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cor do Texto do Header</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={corTextoHeader}
                          onChange={(e) => setCorTextoHeader(e.target.value)}
                          className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={corTextoHeader}
                          onChange={(e) => setCorTextoHeader(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fontes */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setFontesExpandida(!fontesExpandida)}
                  className="w-full flex items-center justify-between text-white font-medium mb-4"
                >
                  <span>Fontes</span>
                  {fontesExpandida ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {fontesExpandida && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Tamanho do Título do Header: {fonteTituloHeader}px
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="48"
                        value={fonteTituloHeader}
                        onChange={(e) => setFonteTituloHeader(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Tamanho dos Títulos de Seção: {fonteTituloSecao}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        value={fonteTituloSecao}
                        onChange={(e) => setFonteTituloSecao(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Família da Fonte</label>
                      <select
                        value={fonteFamilia}
                        onChange={(e) => setFonteFamilia(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Marca d'água */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setMarcaDaguaExpandida(!marcaDaguaExpandida)}
                  className="w-full flex items-center justify-between text-white font-medium mb-4"
                >
                  <span>Marca d'água</span>
                  {marcaDaguaExpandida ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {marcaDaguaExpandida && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Opacidade: {marcaDaguaOpacidade}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={marcaDaguaOpacidade}
                        onChange={(e) => setMarcaDaguaOpacidade(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Controla a transparência da marca d'água</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Rotação: {marcaDaguaRotacao}°
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={marcaDaguaRotacao}
                        onChange={(e) => setMarcaDaguaRotacao(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Rotação da marca d'água em graus (0-360)</p>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marcaDaguaPosicaoPersonalizada}
                          onChange={(e) => setMarcaDaguaPosicaoPersonalizada(e.target.checked)}
                          className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-white text-sm">Usar posição personalizada</span>
                      </label>
                    </div>
                    {marcaDaguaPosicaoPersonalizada && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Posição X (px)</label>
                          <input
                            type="number"
                            value={marcaDaguaPosicaoX}
                            onChange={(e) => setMarcaDaguaPosicaoX(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Posição Y (px)</label>
                          <input
                            type="number"
                            value={marcaDaguaPosicaoY}
                            onChange={(e) => setMarcaDaguaPosicaoY(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Tamanho: {marcaDaguaTamanho}px
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="300"
                        value={marcaDaguaTamanho}
                        onChange={(e) => setMarcaDaguaTamanho(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Tamanho da marca d'água em pixels</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Formato</label>
                      <select
                        value={marcaDaguaFormato}
                        onChange={(e) => setMarcaDaguaFormato(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      >
                        <option value="quadrado">Quadrado</option>
                        <option value="circular">Circular</option>
                        <option value="retangular">Retangular</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setLogoExpandido(!logoExpandido)}
                  className="w-full flex items-center justify-between text-white font-medium mb-4"
                >
                  <span>Logo</span>
                  {logoExpandido ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {logoExpandido && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Logo do Orçamento
                      </label>
                      <div className="flex items-center space-x-4">
                        {logoUrl && (
                          <div className="relative">
                            <Image
                              src={logoUrl}
                              alt="Logo"
                              width={100}
                              height={100}
                              className="object-contain rounded-lg border border-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => setLogoUrl(null)}
                              className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file || !session?.user?.id) return

                              if (!file.type.startsWith('image/')) {
                                alert('Por favor, selecione apenas imagens.')
                                return
                              }

                              if (file.size > 5 * 1024 * 1024) {
                                alert('A imagem deve ter no máximo 5MB.')
                                return
                              }

                              setUploadingLogo(true)
                              try {
                                console.log('Iniciando upload do logo...')
                                console.log('User ID:', session.user.id)
                                
                                const fileName = `logo-template-${session.user.id}-${Date.now()}.${file.name.split('.').pop()}`
                                const filePath = `orcamentos/${session.user.id}/${fileName}`

                                console.log('Caminho do arquivo:', filePath)
                                console.log('Tamanho do arquivo:', file.size, 'bytes')

                                const { data: uploadData, error: uploadError } = await supabase.storage
                                  .from('Logo')
                                  .upload(filePath, file, { 
                                    upsert: true,
                                    contentType: file.type
                                  })

                                if (uploadError) {
                                  console.error('Erro detalhado do upload:', uploadError)
                                  console.error('Código do erro:', uploadError.statusCode)
                                  console.error('Mensagem do erro:', uploadError.message)
                                  
                                  // Mensagens de erro mais específicas
                                  if (uploadError.message?.includes('Bucket') || uploadError.message?.includes('bucket') || uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
                                    throw new Error('Bucket "Logo" não encontrado ou não acessível. Verifique:\n1. Se o bucket existe no Storage\n2. Se está usando o projeto correto do Supabase\n3. Se as variáveis de ambiente estão corretas')
                                  } else if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission') || uploadError.message?.includes('row-level security') || uploadError.statusCode === '403') {
                                    throw new Error('Erro de permissão. Execute o SQL de políticas do Storage (016_configurar_storage.sql) no SQL Editor do Supabase.')
                                  } else if (uploadError.statusCode === '401') {
                                    throw new Error('Erro de autenticação. Faça login novamente.')
                                  } else {
                                    throw new Error(`Erro: ${uploadError.message || 'Erro desconhecido'}`)
                                  }
                                }

                                console.log('Upload bem-sucedido:', uploadData)

                                const { data: { publicUrl } } = supabase.storage
                                  .from('Logo')
                                  .getPublicUrl(filePath)

                                console.log('URL pública gerada:', publicUrl)
                                setLogoUrl(publicUrl)
                                alert('Logo enviado com sucesso!')
                              } catch (error: any) {
                                console.error('Erro completo ao fazer upload do logo:', error)
                                const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Erro desconhecido ao fazer upload'
                                alert(`Erro ao fazer upload do logo:\n\n${errorMessage}\n\nVerifique o console do navegador (F12) para mais detalhes.`)
                              } finally {
                                setUploadingLogo(false)
                                e.target.value = ''
                              }
                            }}
                            disabled={uploadingLogo}
                            className="hidden"
                          />
                          <span className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                            <FiImage className="w-5 h-5" />
                            <span>{uploadingLogo ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Layout */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setLayoutExpandido(!layoutExpandido)}
                  className="w-full flex items-center justify-between text-white font-medium mb-4"
                >
                  <span>Layout</span>
                  {layoutExpandido ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {layoutExpandido && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Padding da Página: {paddingPagina}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={paddingPagina}
                        onChange={(e) => setPaddingPagina(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Padding do Header: {paddingHeader}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={paddingHeader}
                        onChange={(e) => setPaddingHeader(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Espaçamento entre Seções: {espacamentoSecoes}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={espacamentoSecoes}
                        onChange={(e) => setEspacamentoSecoes(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Painel Direito - Preview */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-y-auto">
              <h2 className="text-xl font-semibold text-white mb-4">Preview do Orçamento</h2>
              {logoUrl && (
                <div className="mb-2 text-xs text-gray-400">
                  Logo carregada: {logoUrl.substring(0, 50)}...
                </div>
              )}
              {!logoUrl && (
                <div className="mb-2 text-xs text-yellow-400">
                  ⚠️ Nenhuma logo carregada. Adicione uma logo na seção "Logo" acima.
                </div>
              )}
              
              <div className="bg-white rounded-lg shadow-lg p-8" style={{ fontFamily: fonteFamilia }}>
                {/* Header */}
                <div
                  style={{
                    backgroundColor: corHeader,
                    color: corTextoHeader,
                    padding: `${paddingHeader}px`,
                    borderBottom: `2px solid ${corPrimaria}`,
                    marginBottom: `${espacamentoSecoes}px`,
                    position: 'relative',
                    minHeight: logoUrl ? '140px' : 'auto',
                  }}
                >
                  {/* Logo no canto superior esquerdo */}
                  {logoUrl && (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${paddingHeader}px`,
                        left: `${paddingHeader}px`,
                        zIndex: 10,
                        width: '120px',
                        height: '120px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Conteúdo do header com espaçamento para logo */}
                  <div style={{ 
                    marginLeft: logoUrl ? '140px' : '0',
                    paddingTop: logoUrl ? '0' : '0',
                  }}>
                    <h1
                      style={{
                        fontSize: `${fonteTituloHeader}px`,
                        fontWeight: 'bold',
                        color: corTextoHeader,
                        marginBottom: '8px',
                      }}
                    >
                      Orçamento
                    </h1>
                    <div style={{ fontSize: '12px', color: corTextoHeader }}>
                      EMISSÃO: {formatarData(dataEmissao)} {dataValidade && `• VALIDADE: ${formatarData(dataValidade)}`}
                    </div>
                  </div>
                </div>

                {/* Prestador e Cliente */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: `${espacamentoSecoes}px`,
                    marginBottom: `${espacamentoSecoes}px`,
                    padding: `${paddingPagina}px`,
                    border: `1px solid ${corBordas}`,
                    borderRadius: '4px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                      PRESTADOR
                    </h3>
                    <p style={{ color: corTexto, fontSize: '12px' }}>Exemplo Empresa LTDA</p>
                    <p style={{ color: corTexto, fontSize: '12px' }}>CNPJ: 12.345.678/0001-90</p>
                    <p style={{ color: corTexto, fontSize: '12px' }}>Endereço: Rua Exemplo, 123</p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                      CLIENTE
                    </h3>
                    {clienteSelecionado ? (
                      <>
                        <p style={{ color: corTexto, fontSize: '12px' }}>{clienteSelecionado.nome}</p>
                        {clienteSelecionado.email && (
                          <p style={{ color: corTexto, fontSize: '12px' }}>{clienteSelecionado.email}</p>
                        )}
                        {clienteSelecionado.endereco && (
                          <p style={{ color: corTexto, fontSize: '12px' }}>{clienteSelecionado.endereco}</p>
                        )}
                      </>
                    ) : (
                      <p style={{ color: corTexto, fontSize: '12px' }}>Cliente Exemplo</p>
                    )}
                  </div>
                </div>

                {/* Tabela de Produtos */}
                <div style={{ marginBottom: `${espacamentoSecoes}px` }}>
                  <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                    PRODUTOS/SERVIÇOS
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${corBordas}` }}>
                    <thead>
                      <tr style={{ backgroundColor: corPrimaria + '20' }}>
                        <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          QTD.
                        </th>
                        <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          DESCRIÇÃO
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          VALOR
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                          SUBTOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.length > 0 ? (
                        itens.map((item, index) => (
                          <tr key={index}>
                            <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                              {item.quantidade}
                            </td>
                            <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                              {item.descricao || 'Produto Exemplo ' + (index + 1)}
                            </td>
                            <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'right' }}>
                              {formatarMoeda(item.valor_unitario)}
                            </td>
                            <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'right' }}>
                              {formatarMoeda(item.valor_total)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'center' }}>
                            Nenhum item adicionado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totais */}
                <div
                  style={{
                    marginBottom: `${espacamentoSecoes}px`,
                    padding: `${paddingPagina}px`,
                    border: `1px solid ${corBordas}`,
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: corTexto, fontSize: '12px' }}>Quantidade Total: {itens.reduce((sum, item) => sum + item.quantidade, 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: corTexto, fontSize: '12px' }}>Subtotal:</span>
                    <span style={{ color: corTexto, fontSize: '12px' }}>{formatarMoeda(valorTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: corTexto, fontSize: '12px' }}>Desconto:</span>
                    <span style={{ color: corTexto, fontSize: '12px' }}>{formatarMoeda(descontoGeral)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${corBordas}` }}>
                    <span style={{ color: corTexto, fontSize: '14px', fontWeight: 'bold' }}>TOTAL:</span>
                    <span style={{ color: corTexto, fontSize: '14px', fontWeight: 'bold' }}>{formatarMoeda(valorFinal)}</span>
                  </div>
                </div>

                {/* Observações */}
                {observacoes && (
                  <div style={{ marginBottom: `${espacamentoSecoes}px` }}>
                    <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                      OBSERVAÇÕES
                    </h3>
                    <p style={{ color: corTexto, fontSize: '12px' }}>{observacoes}</p>
                  </div>
                )}

                {/* Marca d'água */}
                {marcaDaguaUrl && (
                  <div
                    style={{
                      position: 'relative',
                      opacity: marcaDaguaOpacidade / 100,
                      transform: `rotate(${marcaDaguaRotacao}deg)`,
                      left: marcaDaguaPosicaoPersonalizada ? `${marcaDaguaPosicaoX}px` : '50%',
                      top: marcaDaguaPosicaoPersonalizada ? `${marcaDaguaPosicaoY}px` : '50%',
                      width: `${marcaDaguaTamanho}px`,
                      height: `${marcaDaguaTamanho}px`,
                      borderRadius: marcaDaguaFormato === 'circular' ? '50%' : '0',
                    }}
                  >
                    <img
                      src={marcaDaguaUrl}
                      alt="Marca d'água"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: marcaDaguaFormato === 'circular' ? '50%' : '0',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botão Salvar (sempre visível) */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => router.push('/empresarial/orcamentos')}
            className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving || itens.length === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-5 h-5" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
