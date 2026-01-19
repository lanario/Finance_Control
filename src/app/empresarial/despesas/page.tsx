'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  FiTrendingDown,
  FiSearch,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

interface ContaPagar {
  id: string
  fornecedor_id: string | null
  categoria_id: string | null
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  paga: boolean
  status: 'pendente' | 'aprovado' | 'cancelado'
  forma_pagamento: string | null
  observacoes: string | null
  parcelada: boolean
  total_parcelas: number
  parcela_atual: number
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

interface ResumoContas {
  totalAPagar: number
  totalVencidas: number
  totalPagas: number
  totalPendentes: number
  saldoAtual: number
}

export default function DespesasPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [parcelas, setParcelas] = useState<ContaPagar[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModalFornecedor, setShowModalFornecedor] = useState(false)
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null)
  const [resumo, setResumo] = useState<ResumoContas>({
    totalAPagar: 0,
    totalVencidas: 0,
    totalPagas: 0,
    totalPendentes: 0,
    saldoAtual: 0,
  })

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'pagas' | 'vencidas'>('todas')
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
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    observacoes: '',
    parcelada: false,
    total_parcelas: '1',
    status: 'pendente' as 'pendente' | 'aprovado' | 'cancelado',
  })

  // Formulário de fornecedor
  const [formDataFornecedor, setFormDataFornecedor] = useState({
    nome: '',
    cnpj: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
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

      await loadContas()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadContas = async () => {
    try {
      const userId = session?.user?.id
      const now = new Date()
      const hoje = now.toISOString().split('T')[0]

      // Buscar contas não parceladas
      let query = supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('user_id', userId)
        .eq('parcelada', false)
        .order('data_vencimento', { ascending: true })

      // Aplicar filtros
      if (filtroStatus === 'pendentes') {
        // Pendentes: não pagas e não vencidas (data >= hoje)
        query = query.eq('paga', false).gte('data_vencimento', hoje)
      } else if (filtroStatus === 'pagas') {
        query = query.eq('paga', true)
      } else if (filtroStatus === 'vencidas') {
        // Vencidas: não pagas e vencidas (data < hoje) - inclui pendentes vencidas
        query = query.eq('paga', false).lt('data_vencimento', hoje)
      }

      if (filtroFornecedor) {
        query = query.eq('fornecedor_id', filtroFornecedor)
      }

      if (filtroCategoria) {
        query = query.eq('categoria_id', filtroCategoria)
      }

      if (filtroDataInicio) {
        query = query.gte('data_vencimento', filtroDataInicio)
      }

      if (filtroDataFim) {
        query = query.lte('data_vencimento', filtroDataFim)
      }

      const { data: contasData, error: contasError } = await query

      if (contasError) throw contasError

      // Buscar parcelas
      let parcelasQuery = supabase
        .from('parcelas_contas_pagar')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: true })

      // Aplicar mesmos filtros nas parcelas
      if (filtroStatus === 'pendentes') {
        // Pendentes: não pagas e não vencidas (data >= hoje)
        parcelasQuery = parcelasQuery.eq('paga', false).gte('data_vencimento', hoje)
      } else if (filtroStatus === 'pagas') {
        parcelasQuery = parcelasQuery.eq('paga', true)
      } else if (filtroStatus === 'vencidas') {
        // Vencidas: não pagas e vencidas (data < hoje) - inclui pendentes vencidas
        parcelasQuery = parcelasQuery.eq('paga', false).lt('data_vencimento', hoje)
      }

      if (filtroFornecedor) {
        parcelasQuery = parcelasQuery.eq('fornecedor_id', filtroFornecedor)
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

      // Processar dados - buscar nomes de fornecedores e categorias
      const fornecedoresMap = new Map(fornecedores.map(f => [f.id, f.nome]))
      const categoriasMap = new Map(categorias.map(c => [c.id, c.nome]))

      const contasProcessadas = (contasData || []).map((conta: any) => ({
        ...conta,
        status: conta.status || 'pendente',
        fornecedor_nome: conta.fornecedor_id ? fornecedoresMap.get(conta.fornecedor_id) || null : null,
        categoria_nome: conta.categoria_id ? categoriasMap.get(conta.categoria_id) || null : null,
      }))

      const parcelasProcessadas = (parcelasData || []).map((parcela: any) => ({
        ...parcela,
        status: parcela.status || 'pendente',
        fornecedor_nome: parcela.fornecedor_id ? fornecedoresMap.get(parcela.fornecedor_id) || null : null,
        categoria_nome: parcela.categoria_id ? categoriasMap.get(parcela.categoria_id) || null : null,
      }))

      let todasContas = [...contasProcessadas, ...parcelasProcessadas]

      // Aplicar busca por texto
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        todasContas = todasContas.filter(
          (conta) =>
            conta.descricao.toLowerCase().includes(buscaLower) ||
            conta.fornecedor_nome?.toLowerCase().includes(buscaLower) ||
            conta.categoria_nome?.toLowerCase().includes(buscaLower)
        )
      }

      setContas(contasProcessadas)
      setParcelas(parcelasProcessadas)

      // Calcular resumo
      calcularResumo(contasProcessadas, parcelasProcessadas, hoje)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    }
  }

  // Função auxiliar para verificar se uma conta está vencida (independente do status)
  const isVencida = (conta: ContaPagar, hoje: string): boolean => {
    if (conta.paga || conta.status === 'cancelado') {
      return false
    }
    
    // Garantir que as datas estão no formato YYYY-MM-DD para comparação
    const dataVencimento = conta.data_vencimento.split('T')[0] // Remove hora se houver
    const hojeFormatado = hoje.split('T')[0] // Remove hora se houver
    
    // Comparar datas no formato ISO (YYYY-MM-DD)
    return dataVencimento < hojeFormatado
  }

  const calcularResumo = async (contas: ContaPagar[], parcelas: ContaPagar[], hoje: string) => {
    // Filtrar contas canceladas - não entram em nenhuma soma
    const todas = [...contas, ...parcelas].filter((c) => c.status !== 'cancelado')
    
    // Total a pagar: não pagas e não canceladas
    const totalAPagar = todas
      .filter((c) => !c.paga && c.status !== 'cancelado')
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Total vencidas: não pagas, vencidas e não canceladas (inclui pendentes vencidas)
    const totalVencidas = todas
      .filter((c) => isVencida(c, hoje))
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Total pagas: aprovadas ou marcadas como pagas (status aprovado = automaticamente paga)
    const totalPagas = todas
      .filter((c) => c.paga || c.status === 'aprovado')
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Total pendentes: status pendente e NÃO vencidas (se vencida, não entra aqui)
    const totalPendentes = todas
      .filter((c) => c.status === 'pendente' && !isVencida(c, hoje))
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Calcular saldo atual (receitas recebidas - despesas pagas)
    // IMPORTANTE: Validar movimentações para evitar movimentações órfãs
    let saldoAtual = 0
    try {
      const userId = session?.user?.id
      if (userId) {
        // Buscar todas as movimentações do fluxo de caixa
        const { data: fluxoData } = await supabase
          .from('fluxo_caixa')
          .select('id, tipo, valor, origem, origem_id')
          .eq('user_id', userId)

        if (fluxoData) {
          // Buscar IDs de todas as despesas e parcelas existentes
          const idsContas = contas.map(c => c.id)
          const idsParcelas = parcelas.map(p => p.id)
          const idsValidos = new Set([...idsContas, ...idsParcelas])

          // Filtrar apenas movimentações válidas (que têm despesas correspondentes)
          // Para movimentações de 'conta_pagar', verificar se a despesa ainda existe
          const movimentacoesValidas = fluxoData.filter((mov) => {
            if (mov.origem === 'conta_pagar') {
              // Se é uma movimentação de despesa, verificar se a despesa ainda existe
              return idsValidos.has(mov.origem_id || '')
            }
            // Para outras origens (receitas, vendas, etc), considerar válidas
            return true
          })

          // Remover movimentações órfãs automaticamente
          const movimentacoesOrfas = fluxoData.filter((mov) => {
            if (mov.origem === 'conta_pagar') {
              return !idsValidos.has(mov.origem_id || '')
            }
            return false
          })

          if (movimentacoesOrfas.length > 0) {
            console.log(`Removendo ${movimentacoesOrfas.length} movimentações órfãs do fluxo de caixa`)
            const idsOrfas = movimentacoesOrfas.map(m => m.id)
            await supabase
              .from('fluxo_caixa')
              .delete()
              .in('id', idsOrfas)
          }

          // Calcular saldo apenas com movimentações válidas
          const entradas = movimentacoesValidas
            .filter((mov) => mov.tipo === 'entrada')
            .reduce((sum, mov) => sum + Number(mov.valor || 0), 0)
          
          const saidas = movimentacoesValidas
            .filter((mov) => mov.tipo === 'saida')
            .reduce((sum, mov) => sum + Number(mov.valor || 0), 0)
          
          saldoAtual = entradas - saidas // Pode ser negativo
        }
      }
    } catch (error) {
      console.error('Erro ao calcular saldo atual:', error)
    }

    setResumo({
      totalAPagar,
      totalVencidas,
      totalPagas,
      totalPendentes,
      saldoAtual,
    })
  }

  useEffect(() => {
    if (session) {
      loadContas()
    }
  }, [filtroStatus, filtroFornecedor, filtroCategoria, filtroDataInicio, filtroDataFim, buscaTexto, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      const valor = parseFloat(formData.valor)

      if (editingConta) {
        // Editar conta existente
        const { error } = await supabase
          .from('contas_a_pagar')
          .update({
            fornecedor_id: formData.fornecedor_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor: valor,
            data_vencimento: formData.data_vencimento,
            forma_pagamento: formData.forma_pagamento,
            observacoes: formData.observacoes || null,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
            status: formData.status,
          })
          .eq('id', editingConta.id)

        if (error) throw error

        // Se for parcelada, criar parcelas
        if (formData.parcelada) {
          // Deletar parcelas antigas
          await supabase
            .from('parcelas_contas_pagar')
            .delete()
            .eq('conta_pagar_id', editingConta.id)

          // Criar novas parcelas
          const totalParcelas = parseInt(formData.total_parcelas)
          const valorParcela = valor / totalParcelas
          const dataVencimento = new Date(formData.data_vencimento)

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimentoParcela = new Date(dataVencimento)
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + i)

            await supabase.from('parcelas_contas_pagar').insert({
              user_id: userId,
              conta_pagar_id: editingConta.id,
              fornecedor_id: formData.fornecedor_id || null,
              categoria_id: formData.categoria_id || null,
              descricao: `${formData.descricao} - Parcela ${i + 1}/${totalParcelas}`,
              valor: valorParcela,
              data_vencimento: dataVencimentoParcela.toISOString().split('T')[0],
              forma_pagamento: formData.forma_pagamento,
              parcela_numero: i + 1,
              total_parcelas: totalParcelas,
              status: formData.status,
            })
          }
        }
      } else {
        // Criar nova conta
        const { data: novaConta, error } = await supabase
          .from('contas_a_pagar')
          .insert({
            user_id: userId,
            fornecedor_id: formData.fornecedor_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor: valor,
            data_vencimento: formData.data_vencimento,
            forma_pagamento: formData.forma_pagamento,
            observacoes: formData.observacoes || null,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
            status: formData.status,
          })
          .select()
          .single()

        if (error) throw error

        // Se for parcelada, criar parcelas
        if (formData.parcelada && novaConta) {
          const totalParcelas = parseInt(formData.total_parcelas)
          const valorParcela = valor / totalParcelas
          const dataVencimento = new Date(formData.data_vencimento)

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimentoParcela = new Date(dataVencimento)
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + i)

            await supabase.from('parcelas_contas_pagar').insert({
              user_id: userId,
              conta_pagar_id: novaConta.id,
              fornecedor_id: formData.fornecedor_id || null,
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
      setEditingConta(null)
      resetForm()
      loadContas()
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      alert('Erro ao salvar conta')
    }
  }

  const handleEdit = (conta: ContaPagar) => {
    // Verificar se é uma parcela (tem conta_pagar_id)
    const isParcela = 'conta_pagar_id' in conta
    
    if (isParcela) {
      alert('Para editar uma parcela, edite a conta principal que gerou as parcelas.')
      return
    }

    setEditingConta(conta)
    setFormData({
      fornecedor_id: conta.fornecedor_id || '',
      categoria_id: conta.categoria_id || '',
      descricao: conta.descricao,
      valor: conta.valor.toString(),
      data_vencimento: conta.data_vencimento,
      forma_pagamento: conta.forma_pagamento || 'pix',
      observacoes: conta.observacoes || '',
      parcelada: conta.parcelada,
      total_parcelas: conta.total_parcelas.toString(),
      status: conta.status || 'pendente',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    // Buscar a despesa para mostrar informações na confirmação
    const { data: conta } = await supabase
      .from('contas_a_pagar')
      .select('descricao, valor')
      .eq('id', id)
      .single()

    const descricao = conta?.descricao || 'esta despesa'
    const valor = conta?.valor ? formatarMoeda(Number(conta.valor)) : ''

    // Mensagem de confirmação mais detalhada
    const mensagem = `⚠️ ATENÇÃO: Você está prestes a excluir permanentemente "${descricao}"${valor ? ` (${valor})` : ''}.\n\n` +
      `Esta ação irá:\n` +
      `• Remover todos os dados desta despesa\n` +
      `• Remover todas as parcelas relacionadas\n` +
      `• Remover movimentações do fluxo de caixa\n` +
      `• Ajustar o saldo atual\n\n` +
      `Esta ação NÃO pode ser desfeita!\n\n` +
      `Deseja realmente continuar?`

    if (!confirm(mensagem)) return

    try {
      // Buscar IDs das parcelas antes de deletar
      const { data: parcelas } = await supabase
        .from('parcelas_contas_pagar')
        .select('id')
        .eq('conta_pagar_id', id)

      const parcelasIds = parcelas?.map(p => p.id) || []

      // Deletar movimentações do fluxo de caixa da conta principal
      await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('origem', 'conta_pagar')
        .eq('origem_id', id)

      // Deletar movimentações do fluxo de caixa das parcelas
      if (parcelasIds.length > 0) {
        await supabase
          .from('fluxo_caixa')
          .delete()
          .eq('origem', 'conta_pagar')
          .in('origem_id', parcelasIds)
      }

      // Deletar parcelas primeiro
      await supabase.from('parcelas_contas_pagar').delete().eq('conta_pagar_id', id)
      
      // Deletar conta
      const { error } = await supabase.from('contas_a_pagar').delete().eq('id', id)
      if (error) throw error

      // Recarregar dados para atualizar saldo
      await loadContas()
      
      alert('Despesa excluída com sucesso! Todas as movimentações relacionadas foram removidas.')
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      alert('Erro ao excluir conta. Por favor, tente novamente.')
    }
  }

  const handleAlterarStatus = async (id: string, novoStatus: 'pendente' | 'aprovado' | 'cancelado', isParcela: boolean = false) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const table = isParcela ? 'parcelas_contas_pagar' : 'contas_a_pagar'

      // Se mudar para cancelado, garantir que não está marcada como paga
      // Se mudar para aprovado, pode marcar como paga automaticamente
      const updateData: any = {
        status: novoStatus,
      }

      // Buscar a conta atual para verificar status anterior
      const { data: contaAtual, error: contaAtualError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (contaAtualError) throw contaAtualError

      if (novoStatus === 'aprovado') {
        // Ao aprovar, marcar como paga e criar movimentação no fluxo de caixa
        const hoje = new Date().toISOString().split('T')[0]
        updateData.paga = true
        updateData.data_pagamento = hoje

        // Verificar se já existe movimentação no fluxo de caixa
        const { data: movimentacaoExistente } = await supabase
          .from('fluxo_caixa')
          .select('id')
          .eq('origem', 'conta_pagar')
          .eq('origem_id', id)
          .single()

        // Só criar movimentação se não existir
        if (!movimentacaoExistente && contaAtual) {
          await supabase
            .from('fluxo_caixa')
            .insert({
              user_id: userId,
              tipo: 'saida',
              origem: 'conta_pagar',
              origem_id: id,
              descricao: contaAtual.descricao || 'Pagamento de despesa',
              valor: Number(contaAtual.valor),
              data_movimentacao: hoje,
              forma_pagamento: contaAtual.forma_pagamento || null,
              observacoes: contaAtual.observacoes || null,
            })
        }
      } else if (novoStatus === 'cancelado' || novoStatus === 'pendente') {
        // Ao cancelar ou voltar para pendente, desmarcar como paga se estiver paga
        updateData.paga = false
        updateData.data_pagamento = null

        // Remover movimentação do fluxo de caixa se existir
        await supabase
          .from('fluxo_caixa')
          .delete()
          .eq('origem', 'conta_pagar')
          .eq('origem_id', id)
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      loadContas()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status')
    }
  }

  const handleMarcarComoPaga = async (id: string, isParcela: boolean = false) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const hoje = new Date().toISOString().split('T')[0]
      const table = isParcela ? 'parcelas_contas_pagar' : 'contas_a_pagar'

      // Buscar a conta para obter os dados
      const { data: conta, error: contaError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (contaError) throw contaError

      // Atualizar a conta como paga
      const { error: updateError } = await supabase
        .from(table)
        .update({
          paga: true,
          data_pagamento: hoje,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Criar movimentação no fluxo de caixa (saída)
      const { error: fluxoError } = await supabase
        .from('fluxo_caixa')
        .insert({
          user_id: userId,
          tipo: 'saida',
          origem: 'conta_pagar',
          origem_id: id,
          descricao: conta.descricao || 'Pagamento de despesa',
          valor: Number(conta.valor),
          data_movimentacao: hoje,
          forma_pagamento: conta.forma_pagamento || null,
          observacoes: conta.observacoes || null,
        })

      if (fluxoError) {
        console.error('Erro ao criar movimentação no fluxo de caixa:', fluxoError)
        // Não bloqueia a operação se falhar ao criar no fluxo de caixa
      }

      loadContas()
    } catch (error) {
      console.error('Erro ao marcar como paga:', error)
      alert('Erro ao marcar como paga')
    }
  }

  const limparMovimentacoesOrfas = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Buscar todas as despesas e parcelas existentes
      const { data: contasData } = await supabase
        .from('contas_a_pagar')
        .select('id')
        .eq('user_id', userId)

      const { data: parcelasData } = await supabase
        .from('parcelas_contas_pagar')
        .select('id')
        .eq('user_id', userId)

      const idsValidos = new Set([
        ...(contasData || []).map(c => c.id),
        ...(parcelasData || []).map(p => p.id)
      ])

      // Buscar todas as movimentações de despesas
      const { data: movimentacoes } = await supabase
        .from('fluxo_caixa')
        .select('id, origem, origem_id')
        .eq('user_id', userId)
        .eq('origem', 'conta_pagar')

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
          await loadContas()
        } else {
          alert('Nenhuma movimentação órfã encontrada. Tudo está sincronizado!')
        }
      }
    } catch (error) {
      console.error('Erro ao limpar movimentações órfãs:', error)
      alert('Erro ao limpar movimentações órfãs')
    }
  }

  const resetForm = () => {
    setFormData({
      fornecedor_id: '',
      categoria_id: '',
      descricao: '',
      valor: '',
      data_vencimento: new Date().toISOString().split('T')[0],
      forma_pagamento: 'pix',
      observacoes: '',
      parcelada: false,
      total_parcelas: '1',
      status: 'pendente',
    })
    setEditingConta(null)
  }

  const handleCriarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Validação: deve ter CNPJ ou CPF, mas não ambos
      if (formDataFornecedor.cnpj && formDataFornecedor.cpf) {
        alert('Informe apenas CNPJ ou CPF, não ambos.')
        return
      }

      const { data: novoFornecedor, error } = await supabase
        .from('fornecedores')
        .insert({
          user_id: userId,
          nome: formDataFornecedor.nome,
          cnpj: formDataFornecedor.cnpj || null,
          cpf: formDataFornecedor.cpf || null,
          email: formDataFornecedor.email || null,
          telefone: formDataFornecedor.telefone || null,
          endereco: formDataFornecedor.endereco || null,
          observacoes: formDataFornecedor.observacoes || null,
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de fornecedores
      await loadData()

      // Selecionar o fornecedor recém-criado no formulário de despesa
      setFormData({ ...formData, fornecedor_id: novoFornecedor.id })

      // Fechar modal e resetar form
      setShowModalFornecedor(false)
      setFormDataFornecedor({
        nome: '',
        cnpj: '',
        cpf: '',
        email: '',
        telefone: '',
        endereco: '',
        observacoes: '',
      })

      alert('Fornecedor criado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao criar fornecedor:', error)
      alert('Erro ao criar fornecedor')
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

      // Selecionar a categoria recém-criada no formulário de despesa
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

  const getStatusBadge = (conta: ContaPagar) => {
    const hoje = new Date().toISOString().split('T')[0]
    
    // Priorizar status do banco
    if (conta.status === 'cancelado') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Cancelado</span>
    } else if (conta.status === 'aprovado' || conta.paga) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Aprovado</span>
    } else {
      // Verificar se está vencida (mesmo que status seja pendente)
      if (isVencida(conta, hoje)) {
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Vencida</span>
      } else {
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
      }
    }
  }

  // Função para obter o status efetivo (considera vencimento)
  const getStatusEfetivo = (conta: ContaPagar): 'pendente' | 'aprovado' | 'cancelado' | 'vencida' => {
    const hoje = new Date().toISOString().split('T')[0]
    
    if (conta.status === 'cancelado') {
      return 'cancelado'
    } else if (conta.status === 'aprovado' || conta.paga) {
      return 'aprovado'
    } else if (isVencida(conta, hoje)) {
      return 'vencida' // Status efetivo é vencida, mesmo que no banco seja pendente
    } else {
      return 'pendente'
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

  const todasContas = [...contas, ...parcelas].sort((a, b) => 
    new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
  )

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
            <h1 className="text-3xl font-bold text-white mb-2">Despesas</h1>
            <p className="text-gray-400">Gerencie todas as despesas da sua empresa</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nova Despesa</span>
          </button>
        </div>

        {/* Card de Saldo Atual */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Saldo Atual</p>
                <button
                  onClick={limparMovimentacoesOrfas}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                  title="Limpar movimentações órfãs (de despesas excluídas)"
                >
                  Limpar órfãs
                </button>
              </div>
              <p className={`text-3xl font-bold mt-1 ${resumo.saldoAtual >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatarMoeda(resumo.saldoAtual)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {resumo.saldoAtual < 0 ? 'Saldo negativo - Receitas insuficientes' : 'Receitas - Despesas pagas'}
              </p>
            </div>
            <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total a Pagar</p>
                <p className="text-2xl font-bold text-white mt-1">{formatarMoeda(resumo.totalAPagar)}</p>
              </div>
              <FiDollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Vencidas</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{formatarMoeda(resumo.totalVencidas)}</p>
              </div>
              <FiAlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{formatarMoeda(resumo.totalPendentes)}</p>
              </div>
              <FiCalendar className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pagas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{formatarMoeda(resumo.totalPagas)}</p>
              </div>
              <FiCheck className="w-8 h-8 text-green-400" />
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
                <option value="pendentes">Pendentes</option>
                <option value="vencidas">Vencidas</option>
                <option value="pagas">Pagas</option>
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

        {/* Tabela de Contas */}
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
                    Vencimento
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
                {todasContas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  todasContas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{conta.descricao}</div>
                        {conta.parcelada && (
                          <div className="text-xs text-gray-400">
                            Parcela {conta.parcela_atual || 1}/{conta.total_parcelas}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {conta.fornecedor_nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {conta.categoria_nome || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {formatarMoeda(Number(conta.valor))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatarData(conta.data_vencimento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!('conta_pagar_id' in conta) ? (
                          (() => {
                            const hoje = new Date().toISOString().split('T')[0]
                            const statusEfetivo = getStatusEfetivo(conta)
                            const estaVencida = isVencida(conta, hoje)
                            
                            // Se está vencida mas o status no banco é pendente, mostrar badge de vencida + select
                            if (estaVencida && conta.status === 'pendente') {
                              return (
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                    Vencida
                                  </span>
                                  <select
                                    value={conta.status || 'pendente'}
                                    onChange={(e) => handleAlterarStatus(conta.id, e.target.value as 'pendente' | 'aprovado' | 'cancelado', false)}
                                    className="px-2 py-1 text-xs rounded-full bg-gray-700 border border-gray-600 text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                    title="Status no banco: Pendente (mas está vencida)"
                                  >
                                    <option value="pendente">Pendente</option>
                                    <option value="aprovado">Aprovado</option>
                                    <option value="cancelado">Cancelado</option>
                                  </select>
                                </div>
                              )
                            }
                            
                            // Caso normal: mostrar apenas o select com estilo baseado no status
                            return (
                              <select
                                value={conta.status || 'pendente'}
                                onChange={(e) => handleAlterarStatus(conta.id, e.target.value as 'pendente' | 'aprovado' | 'cancelado', false)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all ${
                                  conta.status === 'cancelado'
                                    ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                    : conta.status === 'aprovado' || conta.paga
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : estaVencida
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            )
                          })()
                        ) : (
                          getStatusBadge(conta)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {!conta.paga && conta.status !== 'cancelado' && (
                            <button
                              onClick={() => handleMarcarComoPaga(conta.id, 'conta_pagar_id' in conta)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Marcar como paga"
                            >
                              <FiCheck className="w-5 h-5" />
                            </button>
                          )}
                          {!('conta_pagar_id' in conta) && (
                            <ActionButtons
                              onEdit={() => handleEdit(conta)}
                              onDelete={() => handleDelete(conta.id)}
                            />
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

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingConta ? 'Editar Despesa' : 'Nova Despesa'}
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
                      <div className="flex items-center space-x-2">
                        <select
                          value={formData.fornecedor_id}
                          onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Selecione um fornecedor</option>
                          {fornecedores.map((fornecedor) => (
                            <option key={fornecedor.id} value={fornecedor.id}>
                              {fornecedor.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowModalFornecedor(true)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          title="Adicionar novo fornecedor"
                        >
                          <FiPlus className="w-5 h-5" />
                        </button>
                      </div>
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
                          title="Adicionar nova categoria"
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
                      placeholder="Ex: Pagamento de fornecedor"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Valor *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Data de Vencimento *</label>
                      <input
                        type="date"
                        required
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pendente' | 'aprovado' | 'cancelado' })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        required
                      >
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.status === 'aprovado' && 'Será marcado como paga automaticamente'}
                        {formData.status === 'cancelado' && 'Não entrará em nenhuma soma, apenas registro'}
                        {formData.status === 'pendente' && 'Entrará na soma de contas pendentes'}
                      </p>
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
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Parcelada</label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.parcelada}
                            onChange={(e) => setFormData({ ...formData, parcelada: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-white">Sim</span>
                        </label>
                        {formData.parcelada && (
                          <input
                            type="number"
                            min="1"
                            value={formData.total_parcelas}
                            onChange={(e) => setFormData({ ...formData, total_parcelas: e.target.value })}
                            className="w-20 px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            placeholder="Qtd"
                          />
                        )}
                      </div>
                    </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Observações adicionais..."
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
                      {editingConta ? 'Salvar Alterações' : 'Criar Despesa'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criar Fornecedor */}
        {showModalFornecedor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Novo Fornecedor</h2>
                  <button
                    onClick={() => {
                      setShowModalFornecedor(false)
                      setFormDataFornecedor({
                        nome: '',
                        cnpj: '',
                        cpf: '',
                        email: '',
                        telefone: '',
                        endereco: '',
                        observacoes: '',
                      })
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCriarFornecedor} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formDataFornecedor.nome}
                      onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, nome: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Nome do fornecedor"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={formDataFornecedor.cnpj}
                        onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, cnpj: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formDataFornecedor.cpf}
                        onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, cpf: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={formDataFornecedor.email}
                        onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, email: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formDataFornecedor.telefone}
                        onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, telefone: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formDataFornecedor.endereco}
                      onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, endereco: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Endereço completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Observações</label>
                    <textarea
                      value={formDataFornecedor.observacoes}
                      onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Observações adicionais..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModalFornecedor(false)
                        setFormDataFornecedor({
                          nome: '',
                          cnpj: '',
                          cpf: '',
                          email: '',
                          telefone: '',
                          endereco: '',
                          observacoes: '',
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
                      Criar Fornecedor
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criar Categoria */}
        {showModalCategoria && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Nova Categoria de Despesa</h2>
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
