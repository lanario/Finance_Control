'use client'

import { useEffect, useState } from 'react'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiCheck,
  FiX,
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

interface DespesasContentProps {
  sectionLabel?: string
  hideMainTitle?: boolean
}

export function DespesasContent({ sectionLabel, hideMainTitle }: DespesasContentProps = {}) {
  const { session } = useAuth()
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
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'pagas' | 'vencidas'>('todas')
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // FormulÃ¡rio
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

  // FormulÃ¡rio de fornecedor
  const [formDataFornecedor, setFormDataFornecedor] = useState({
    nome: '',
    cnpj: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
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

      // Buscar contas nÃ£o parceladas (mais recente primeiro)
      let query = supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('user_id', userId)
        .eq('parcelada', false)
        .order('data_vencimento', { ascending: false })

      // Aplicar filtros
      if (filtroStatus === 'pendentes') {
        // Pendentes: nÃ£o pagas e nÃ£o vencidas (data >= hoje)
        query = query.eq('paga', false).gte('data_vencimento', hoje)
      } else if (filtroStatus === 'pagas') {
        query = query.eq('paga', true)
      } else if (filtroStatus === 'vencidas') {
        // Vencidas: nÃ£o pagas e vencidas (data < hoje) - inclui pendentes vencidas
        query = query.eq('paga', false).lt('data_vencimento', hoje)
      }

      if (filtroFornecedor) {
        query = query.eq('fornecedor_id', filtroFornecedor)
      }

      if (filtroCategoria) {
        query = query.eq('categoria_id', filtroCategoria)
      }

      const [dataInicio, dataFim] = getMonthRange(filtroMes)
      query = query.gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim)

      const { data: contasData, error: contasError } = await query

      if (contasError) throw contasError

      // Buscar parcelas (mais recente primeiro)
      let parcelasQuery = supabase
        .from('parcelas_contas_pagar')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: false })

      // Aplicar mesmos filtros nas parcelas
      if (filtroStatus === 'pendentes') {
        // Pendentes: nÃ£o pagas e nÃ£o vencidas (data >= hoje)
        parcelasQuery = parcelasQuery.eq('paga', false).gte('data_vencimento', hoje)
      } else if (filtroStatus === 'pagas') {
        parcelasQuery = parcelasQuery.eq('paga', true)
      } else if (filtroStatus === 'vencidas') {
        // Vencidas: nÃ£o pagas e vencidas (data < hoje) - inclui pendentes vencidas
        parcelasQuery = parcelasQuery.eq('paga', false).lt('data_vencimento', hoje)
      }

      if (filtroFornecedor) {
        parcelasQuery = parcelasQuery.eq('fornecedor_id', filtroFornecedor)
      }

      if (filtroCategoria) {
        parcelasQuery = parcelasQuery.eq('categoria_id', filtroCategoria)
      }

      const [dataInicioP, dataFimP] = getMonthRange(filtroMes)
      parcelasQuery = parcelasQuery.gte('data_vencimento', dataInicioP).lte('data_vencimento', dataFimP)

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

  // FunÃ§Ã£o auxiliar para verificar se uma conta estÃ¡ vencida (independente do status)
  const isVencida = (conta: ContaPagar, hoje: string): boolean => {
    if (conta.paga || conta.status === 'cancelado') {
      return false
    }
    
    // Garantir que as datas estÃ£o no formato YYYY-MM-DD para comparaÃ§Ã£o
    const dataVencimento = conta.data_vencimento.split('T')[0] // Remove hora se houver
    const hojeFormatado = hoje.split('T')[0] // Remove hora se houver
    
    // Comparar datas no formato ISO (YYYY-MM-DD)
    return dataVencimento < hojeFormatado
  }

  const calcularResumo = async (contas: ContaPagar[], parcelas: ContaPagar[], hoje: string) => {
    // Filtrar contas canceladas - nÃ£o entram em nenhuma soma
    const todas = [...contas, ...parcelas].filter((c) => c.status !== 'cancelado')
    
    // Total a pagar: nÃ£o pagas e nÃ£o canceladas
    const totalAPagar = todas
      .filter((c) => !c.paga && c.status !== 'cancelado')
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Total vencidas: nÃ£o pagas, vencidas e nÃ£o canceladas (inclui pendentes vencidas)
    const totalVencidas = todas
      .filter((c) => isVencida(c, hoje))
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Total pagas: aprovadas ou marcadas como pagas (status aprovado = automaticamente paga)
    const totalPagas = todas
      .filter((c) => c.paga || c.status === 'aprovado')
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Total pendentes: status pendente e NÃƒO vencidas (se vencida, nÃ£o entra aqui)
    const totalPendentes = todas
      .filter((c) => c.status === 'pendente' && !isVencida(c, hoje))
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Calcular saldo atual (receitas recebidas - despesas pagas)
    // IMPORTANTE: Validar movimentaÃ§Ãµes para evitar movimentaÃ§Ãµes Ã³rfÃ£s
    let saldoAtual = 0
    try {
      const userId = session?.user?.id
      if (userId) {
        // Buscar todas as movimentaÃ§Ãµes do fluxo de caixa
        const { data: fluxoData } = await supabase
          .from('fluxo_caixa')
          .select('id, tipo, valor, origem, origem_id')
          .eq('user_id', userId)

        if (fluxoData) {
          // Buscar IDs de todas as despesas e parcelas existentes
          const idsContas = contas.map(c => c.id)
          const idsParcelas = parcelas.map(p => p.id)
          const idsValidos = new Set([...idsContas, ...idsParcelas])

          // Filtrar apenas movimentaÃ§Ãµes vÃ¡lidas (que tÃªm despesas correspondentes)
          // Para movimentaÃ§Ãµes de 'conta_pagar', verificar se a despesa ainda existe
          const movimentacoesValidas = fluxoData.filter((mov) => {
            if (mov.origem === 'conta_pagar') {
              // Se Ã© uma movimentaÃ§Ã£o de despesa, verificar se a despesa ainda existe
              return idsValidos.has(mov.origem_id || '')
            }
            // Para outras origens (receitas, vendas, etc), considerar vÃ¡lidas
            return true
          })

          // Remover movimentaÃ§Ãµes Ã³rfÃ£s automaticamente
          const movimentacoesOrfas = fluxoData.filter((mov) => {
            if (mov.origem === 'conta_pagar') {
              return !idsValidos.has(mov.origem_id || '')
            }
            return false
          })

          if (movimentacoesOrfas.length > 0) {
            console.log(`Removendo ${movimentacoesOrfas.length} movimentaÃ§Ãµes Ã³rfÃ£s do fluxo de caixa`)
            const idsOrfas = movimentacoesOrfas.map(m => m.id)
            await supabase
              .from('fluxo_caixa')
              .delete()
              .in('id', idsOrfas)
          }

          // Calcular saldo apenas com movimentaÃ§Ãµes vÃ¡lidas
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
  }, [filtroStatus, filtroFornecedor, filtroCategoria, filtroMes, buscaTexto, session])

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
    // Verificar se Ã© uma parcela (tem conta_pagar_id)
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
    // Buscar a despesa para mostrar informaÃ§Ãµes na confirmaÃ§Ã£o
    const { data: conta } = await supabase
      .from('contas_a_pagar')
      .select('descricao, valor')
      .eq('id', id)
      .single()

    const descricao = conta?.descricao || 'esta despesa'
    const valor = conta?.valor ? formatarMoeda(Number(conta.valor)) : ''

    // Mensagem de confirmaÃ§Ã£o mais detalhada
    const mensagem = `âš ï¸ ATENÃ‡ÃƒO: VocÃª estÃ¡ prestes a excluir permanentemente "${descricao}"${valor ? ` (${valor})` : ''}.\n\n` +
      `Esta aÃ§Ã£o irÃ¡:\n` +
      `â€¢ Remover todos os dados desta despesa\n` +
      `â€¢ Remover todas as parcelas relacionadas\n` +
      `â€¢ Remover movimentaÃ§Ãµes do fluxo de caixa\n` +
      `â€¢ Ajustar o saldo atual\n\n` +
      `Esta aÃ§Ã£o NÃƒO pode ser desfeita!\n\n` +
      `Deseja realmente continuar?`

    if (!confirm(mensagem)) return

    try {
      // Buscar IDs das parcelas antes de deletar
      const { data: parcelas } = await supabase
        .from('parcelas_contas_pagar')
        .select('id')
        .eq('conta_pagar_id', id)

      const parcelasIds = parcelas?.map(p => p.id) || []

      // Deletar movimentaÃ§Ãµes do fluxo de caixa da conta principal
      await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('origem', 'conta_pagar')
        .eq('origem_id', id)

      // Deletar movimentaÃ§Ãµes do fluxo de caixa das parcelas
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
      
      alert('Despesa excluÃ­da com sucesso! Todas as movimentaÃ§Ãµes relacionadas foram removidas.')
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

      // Se mudar para cancelado, garantir que nÃ£o estÃ¡ marcada como paga
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
        // Ao aprovar, marcar como paga e criar movimentaÃ§Ã£o no fluxo de caixa
        const hoje = new Date().toISOString().split('T')[0]
        updateData.paga = true
        updateData.data_pagamento = hoje

        // Verificar se jÃ¡ existe movimentaÃ§Ã£o no fluxo de caixa
        const { data: movimentacaoExistente } = await supabase
          .from('fluxo_caixa')
          .select('id')
          .eq('origem', 'conta_pagar')
          .eq('origem_id', id)
          .single()

        // SÃ³ criar movimentaÃ§Ã£o se nÃ£o existir
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

        // Remover movimentaÃ§Ã£o do fluxo de caixa se existir
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

      // Criar movimentaÃ§Ã£o no fluxo de caixa (saÃ­da)
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
        console.error('Erro ao criar movimentaÃ§Ã£o no fluxo de caixa:', fluxoError)
        // NÃ£o bloqueia a operaÃ§Ã£o se falhar ao criar no fluxo de caixa
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

      // Buscar todas as movimentaÃ§Ãµes de despesas
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

          alert(`${movimentacoesOrfas.length} movimentaÃ§Ã£o(Ãµes) Ã³rfÃ£(s) foram removida(s). O saldo serÃ¡ recalculado.`)
          await loadContas()
        } else {
          alert('Nenhuma movimentaÃ§Ã£o Ã³rfÃ£ encontrada. Tudo estÃ¡ sincronizado!')
        }
      }
    } catch (error) {
      console.error('Erro ao limpar movimentaÃ§Ãµes Ã³rfÃ£s:', error)
      alert('Erro ao limpar movimentaÃ§Ãµes Ã³rfÃ£s')
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

      // ValidaÃ§Ã£o: deve ter CNPJ ou CPF, mas nÃ£o ambos
      if (formDataFornecedor.cnpj && formDataFornecedor.cpf) {
        alert('Informe apenas CNPJ ou CPF, nÃ£o ambos.')
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

      // Selecionar o fornecedor recÃ©m-criado no formulÃ¡rio de despesa
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

      // Selecionar a categoria recÃ©m-criada no formulÃ¡rio de despesa
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

  const getStatusBadge = (conta: ContaPagar) => {
    const hoje = new Date().toISOString().split('T')[0]
    
    // Priorizar status do banco
    if (conta.status === 'cancelado') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Cancelado</span>
    } else if (conta.status === 'aprovado' || conta.paga) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Aprovado</span>
    } else {
      // Verificar se estÃ¡ vencida (mesmo que status seja pendente)
      if (isVencida(conta, hoje)) {
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Vencida</span>
      } else {
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
      }
    }
  }

  // FunÃ§Ã£o para obter o status efetivo (considera vencimento)
  const getStatusEfetivo = (conta: ContaPagar): 'pendente' | 'aprovado' | 'cancelado' | 'vencida' => {
    const hoje = new Date().toISOString().split('T')[0]
    
    if (conta.status === 'cancelado') {
      return 'cancelado'
    } else if (conta.status === 'aprovado' || conta.paga) {
      return 'aprovado'
    } else if (isVencida(conta, hoje)) {
      return 'vencida' // Status efetivo Ã© vencida, mesmo que no banco seja pendente
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
    new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
  )

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
                  title="Limpar movimentaÃ§Ãµes Ã³rfÃ£s (de despesas excluÃ­das)"
                >
                  Limpar Ã³rfÃ£s
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
              onChange={(e) => setFiltroStatus(e.target.value as 'todas' | 'pendentes' | 'pagas' | 'vencidas')}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todas">Todas</option>
              <option value="pendentes">Pendentes</option>
              <option value="vencidas">Vencidas</option>
              <option value="pagas">Pagas</option>
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

        {/* Tabela de Contas */}
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
                    Vencimento
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
                            
                            // Se estÃ¡ vencida mas o status no banco Ã© pendente, mostrar badge de vencida + select
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
                                    title="Status no banco: Pendente (mas estÃ¡ vencida)"
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
                    <label className="block text-sm text-gray-400 mb-1">DescriÃ§Ã£o *</label>
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
                        {formData.status === 'aprovado' && 'SerÃ¡ marcado como paga automaticamente'}
                        {formData.status === 'cancelado' && 'NÃ£o entrarÃ¡ em nenhuma soma, apenas registro'}
                        {formData.status === 'pendente' && 'EntrarÃ¡ na soma de contas pendentes'}
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
                        <option value="transferencia">TransferÃªncia</option>
                        <option value="boleto">Boleto</option>
                        <option value="cheque">Cheque</option>
                        <option value="cartao_debito">CartÃ£o de DÃ©bito</option>
                        <option value="cartao_credito">CartÃ£o de CrÃ©dito</option>
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
                    <label className="block text-sm text-gray-400 mb-1">ObservaÃ§Ãµes</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="ObservaÃ§Ãµes adicionais..."
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
                      {editingConta ? 'Salvar AlteraÃ§Ãµes' : 'Criar Despesa'}
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
                    <label className="block text-sm text-gray-400 mb-1">EndereÃ§o</label>
                    <input
                      type="text"
                      value={formDataFornecedor.endereco}
                      onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, endereco: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="EndereÃ§o completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">ObservaÃ§Ãµes</label>
                    <textarea
                      value={formDataFornecedor.observacoes}
                      onChange={(e) => setFormDataFornecedor({ ...formDataFornecedor, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="ObservaÃ§Ãµes adicionais..."
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
