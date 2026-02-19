'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiCheck,
  FiX,
  FiCalendar,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
  FiSearch,
  FiEye,
  FiTrash2,
  FiFileText,
} from 'react-icons/fi'
import ActionButtons from '@/components/Empresarial/ActionButtons'

interface ContaReceber {
  id: string
  cliente_id: string | null
  categoria_id: string | null
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento: string | null
  recebida: boolean
  forma_recebimento: string | null
  observacoes: string | null
  parcelada: boolean
  total_parcelas: number
  parcela_atual: number
  status?: 'pendente' | 'aprovado' | 'cancelado'
  cliente_nome?: string | null
  categoria_nome?: string | null
  origem?: 'conta' | 'orcamento' // Identifica se Ã© uma conta a receber ou um orÃ§amento
  orcamento_numero?: string | null // NÃºmero do orÃ§amento se for origem orÃ§amento
}

interface Cliente {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
}

interface Contrato {
  id: string
  cliente_id: string | null
  categoria_id: string | null
  nome_contrato: string
  descricao: string | null
  valor_mensal: number
  data_inicio: string
  data_fim: string | null
  dia_vencimento: number
  forma_recebimento: string | null
  observacoes: string | null
  detalhes_contrato: string | null
  ativo: boolean
  cliente_nome?: string | null
  categoria_nome?: string | null
}

interface ResumoContas {
  totalAReceber: number
  totalVencidas: number
  totalRecebidas: number
  totalPendentes: number
  saldoAtual: number
}

interface ReceitasContentProps {
  sectionLabel?: string
  hideMainTitle?: boolean
}

export function ReceitasContent({ sectionLabel, hideMainTitle }: ReceitasContentProps = {}) {
  const { session } = useAuth()
  const router = useRouter()
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [parcelas, setParcelas] = useState<ContaReceber[]>([])
  const [todasContas, setTodasContas] = useState<ContaReceber[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModalCliente, setShowModalCliente] = useState(false)
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [showModalContrato, setShowModalContrato] = useState(false)
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null)
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null)
  const [resumo, setResumo] = useState<ResumoContas>({
    totalAReceber: 0,
    totalVencidas: 0,
    totalRecebidas: 0,
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
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'recebidas' | 'vencidas'>('todas')
  const [filtroCliente, setFiltroCliente] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // FormulÃ¡rio
  const [formData, setFormData] = useState({
    cliente_id: '',
    categoria_id: '',
    descricao: '',
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    forma_recebimento: 'pix',
    observacoes: '',
    parcelada: false,
    total_parcelas: '1',
  })

  // FormulÃ¡rio de cliente
  const [formDataCliente, setFormDataCliente] = useState({
    nome: '',
    razao_social: '',
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

  // FormulÃ¡rio de contrato
  const [formDataContrato, setFormDataContrato] = useState({
    cliente_id: '',
    categoria_id: '',
    nome_contrato: '',
    descricao: '',
    valor_mensal: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    dia_vencimento: new Date().getDate().toString(),
    forma_recebimento: 'pix',
    observacoes: '',
    detalhes_contrato: '',
    ativo: true,
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

      // Carregar contratos (passar clientes e categorias como parÃ¢metro)
      await loadContratos(clientesData || [], categoriasData || [])

      await loadContas()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadContratos = async (clientesList: Cliente[] = [], categoriasList: Categoria[] = []) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Se nÃ£o foram passados, buscar do estado
      const clientesParaUsar = clientesList.length > 0 ? clientesList : clientes
      const categoriasParaUsar = categoriasList.length > 0 ? categoriasList : categorias

      const { data: contratosData, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('user_id', userId)
        .order('nome_contrato', { ascending: true })

      if (error) throw error

      // Processar contratos - buscar nomes de clientes e categorias
      const clientesMap = new Map(clientesParaUsar.map(c => [c.id, c.nome]))
      const categoriasMap = new Map(categoriasParaUsar.map(c => [c.id, c.nome]))

      const contratosProcessados = (contratosData || []).map((contrato: any) => ({
        ...contrato,
        cliente_nome: contrato.cliente_id ? clientesMap.get(contrato.cliente_id) || null : null,
        categoria_nome: contrato.categoria_id ? categoriasMap.get(contrato.categoria_id) || null : null,
      }))

      setContratos(contratosProcessados)

      // Gerar receitas dos contratos ativos automaticamente
      await gerarReceitasContratos(contratosProcessados)
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
    }
  }

  const gerarReceitasContratos = async (contratosList: Contrato[]) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0) // Zerar horas para comparaÃ§Ã£o
      const anoAtual = hoje.getFullYear()
      const mesAtual = hoje.getMonth() + 1

      // Filtrar apenas contratos ativos
      const contratosAtivos = contratosList.filter(c => c.ativo)

      for (const contrato of contratosAtivos) {
        // Verificar se a data de inÃ­cio jÃ¡ passou
        const dataInicio = new Date(contrato.data_inicio)
        dataInicio.setHours(0, 0, 0, 0)
        if (dataInicio > hoje) continue

        // Verificar se tem data de fim e se jÃ¡ passou
        if (contrato.data_fim) {
          const dataFim = new Date(contrato.data_fim)
          dataFim.setHours(23, 59, 59, 999) // Fim do dia
          if (dataFim < hoje) continue
        }

        // Verificar se jÃ¡ foi gerada receita para este mÃªs
        const { data: jaGerada } = await supabase
          .from('contratos_receitas_geradas')
          .select('id')
          .eq('contrato_id', contrato.id)
          .eq('ano', anoAtual)
          .eq('mes', mesAtual)
          .single()

        if (jaGerada) continue // JÃ¡ foi gerada para este mÃªs

        // Calcular data de vencimento (dia do mÃªs especificado)
        const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate()
        const diaVencimento = Math.min(contrato.dia_vencimento, ultimoDiaMes)
        const dataVencimento = new Date(anoAtual, mesAtual - 1, diaVencimento)

        // Criar receita para este mÃªs
        const { data: novaReceita, error: receitaError } = await supabase
          .from('contas_a_receber')
          .insert({
            user_id: userId,
            cliente_id: contrato.cliente_id,
            categoria_id: contrato.categoria_id,
            descricao: `${contrato.nome_contrato} - ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
            valor: Number(contrato.valor_mensal),
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            forma_recebimento: contrato.forma_recebimento || 'pix',
            observacoes: contrato.observacoes || `Receita gerada automaticamente do contrato: ${contrato.nome_contrato}`,
            parcelada: false,
            total_parcelas: 1,
          })
          .select()
          .single()

        if (receitaError) {
          console.error('Erro ao criar receita do contrato:', receitaError)
          continue
        }

        // Registrar que foi gerada
        await supabase
          .from('contratos_receitas_geradas')
          .insert({
            contrato_id: contrato.id,
            ano: anoAtual,
            mes: mesAtual,
            conta_receber_id: novaReceita.id,
          })
      }

      // Recarregar contas apÃ³s gerar receitas
      await loadContas()
    } catch (error) {
      console.error('Erro ao gerar receitas dos contratos:', error)
    }
  }

  const loadContas = async () => {
    try {
      const userId = session?.user?.id
      const now = new Date()
      const hoje = now.toISOString().split('T')[0]

      // Buscar contas nÃ£o parceladas (mais recente primeiro)
      let query = supabase
        .from('contas_a_receber')
        .select('*')
        .eq('user_id', userId)
        .eq('parcelada', false)
        .order('data_vencimento', { ascending: false })

      // Aplicar filtros
      if (filtroStatus === 'pendentes') {
        query = query.eq('recebida', false)
      } else if (filtroStatus === 'recebidas') {
        query = query.eq('recebida', true)
      } else if (filtroStatus === 'vencidas') {
        query = query.eq('recebida', false).lt('data_vencimento', hoje)
      }

      if (filtroCliente) {
        query = query.eq('cliente_id', filtroCliente)
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
        .from('parcelas_contas_receber')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: false })

      // Aplicar mesmos filtros nas parcelas
      if (filtroStatus === 'pendentes') {
        parcelasQuery = parcelasQuery.eq('recebida', false)
      } else if (filtroStatus === 'recebidas') {
        parcelasQuery = parcelasQuery.eq('recebida', true)
      } else if (filtroStatus === 'vencidas') {
        parcelasQuery = parcelasQuery.eq('recebida', false).lt('data_vencimento', hoje)
      }

      if (filtroCliente) {
        parcelasQuery = parcelasQuery.eq('cliente_id', filtroCliente)
      }

      if (filtroCategoria) {
        parcelasQuery = parcelasQuery.eq('categoria_id', filtroCategoria)
      }

      const [dataInicioP, dataFimP] = getMonthRange(filtroMes)
      parcelasQuery = parcelasQuery.gte('data_vencimento', dataInicioP).lte('data_vencimento', dataFimP)

      const { data: parcelasData, error: parcelasError } = await parcelasQuery

      if (parcelasError) throw parcelasError

      // Buscar orÃ§amentos pendentes (em processo) - serÃ£o adicionados como receitas pendentes
      let orcamentosPendentesQuery = supabase
        .from('orcamentos')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'em_processo')

      const [dataInicioOrc, dataFimOrc] = getMonthRange(filtroMes)
      orcamentosPendentesQuery = orcamentosPendentesQuery.gte('data_emissao', dataInicioOrc).lte('data_emissao', dataFimOrc)
      if (filtroCliente) {
        orcamentosPendentesQuery = orcamentosPendentesQuery.eq('cliente_id', filtroCliente)
      }

      const { data: orcamentosPendentes, error: orcamentosPendentesError } = await orcamentosPendentesQuery
      if (orcamentosPendentesError) console.error('Erro ao carregar orÃ§amentos pendentes:', orcamentosPendentesError)

      // Buscar orÃ§amentos concluÃ­dos - serÃ£o adicionados como receitas recebidas
      let orcamentosConcluidosQuery = supabase
        .from('orcamentos')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'concluido')

      orcamentosConcluidosQuery = orcamentosConcluidosQuery.gte('data_emissao', dataInicioOrc).lte('data_emissao', dataFimOrc)
      if (filtroCliente) {
        orcamentosConcluidosQuery = orcamentosConcluidosQuery.eq('cliente_id', filtroCliente)
      }

      const { data: orcamentosConcluidos, error: orcamentosConcluidosError } = await orcamentosConcluidosQuery
      if (orcamentosConcluidosError) console.error('Erro ao carregar orÃ§amentos concluÃ­dos:', orcamentosConcluidosError)

      // Processar dados - buscar nomes de clientes e categorias
      const clientesMap = new Map(clientes.map(c => [c.id, c.nome]))
      const categoriasMap = new Map(categorias.map(c => [c.id, c.nome]))

      const contasProcessadas = (contasData || []).map((conta: any) => ({
        ...conta,
        cliente_nome: conta.cliente_id ? clientesMap.get(conta.cliente_id) || null : null,
        categoria_nome: conta.categoria_id ? categoriasMap.get(conta.categoria_id) || null : null,
        origem: 'conta' as const,
      }))

      const parcelasProcessadas = (parcelasData || []).map((parcela: any) => ({
        ...parcela,
        cliente_nome: parcela.cliente_id ? clientesMap.get(parcela.cliente_id) || null : null,
        categoria_nome: parcela.categoria_id ? categoriasMap.get(parcela.categoria_id) || null : null,
        origem: 'conta' as const,
      }))

      // Converter orÃ§amentos pendentes em receitas pendentes
      const orcamentosPendentesProcessados = (orcamentosPendentes || []).map((orcamento: any) => {
        // Para orÃ§amentos em processo, usar data_validade se existir, senÃ£o usar uma data futura (30 dias da emissÃ£o)
        let dataVencimento = orcamento.data_validade
        if (!dataVencimento) {
          const dataEmissao = new Date(orcamento.data_emissao)
          dataEmissao.setDate(dataEmissao.getDate() + 30) // Adiciona 30 dias da data de emissÃ£o
          dataVencimento = dataEmissao.toISOString().split('T')[0]
        }
        
        return {
          id: `orcamento_${orcamento.id}`,
          cliente_id: orcamento.cliente_id,
          categoria_id: null,
          descricao: `OrÃ§amento ${orcamento.numero}`,
          valor: Number(orcamento.valor_final || orcamento.valor_total || 0),
          data_vencimento: dataVencimento,
          data_recebimento: null,
          recebida: false,
          forma_recebimento: null,
          observacoes: orcamento.observacoes,
          parcelada: false,
          total_parcelas: 1,
          parcela_atual: 1,
          cliente_nome: orcamento.cliente_nome || (orcamento.cliente_id ? clientesMap.get(orcamento.cliente_id) || null : null),
          categoria_nome: null,
          origem: 'orcamento' as const,
          orcamento_numero: orcamento.numero,
        }
      })

      // Converter orÃ§amentos concluÃ­dos em receitas recebidas
      const orcamentosConcluidosProcessados = (orcamentosConcluidos || []).map((orcamento: any) => ({
        id: `orcamento_${orcamento.id}`,
        cliente_id: orcamento.cliente_id,
        categoria_id: null,
        descricao: `OrÃ§amento ${orcamento.numero}`,
        valor: Number(orcamento.valor_final || orcamento.valor_total || 0),
        data_vencimento: orcamento.data_validade || orcamento.data_emissao,
        data_recebimento: orcamento.updated_at ? orcamento.updated_at.split('T')[0] : orcamento.data_emissao,
        recebida: true,
        forma_recebimento: null,
        observacoes: orcamento.observacoes,
        parcelada: false,
        total_parcelas: 1,
        parcela_atual: 1,
        cliente_nome: orcamento.cliente_nome || (orcamento.cliente_id ? clientesMap.get(orcamento.cliente_id) || null : null),
        categoria_nome: null,
        origem: 'orcamento' as const,
        orcamento_numero: orcamento.numero,
      }))

      // Aplicar filtros de status nos orÃ§amentos
      let orcamentosFiltrados: ContaReceber[] = []
      if (filtroStatus === 'todas' || filtroStatus === 'pendentes' || filtroStatus === 'vencidas') {
        orcamentosFiltrados = [...orcamentosFiltrados, ...orcamentosPendentesProcessados]
      }
      if (filtroStatus === 'todas' || filtroStatus === 'recebidas') {
        orcamentosFiltrados = [...orcamentosFiltrados, ...orcamentosConcluidosProcessados]
      }

      let todasContas = [...contasProcessadas, ...parcelasProcessadas, ...orcamentosFiltrados]

      // Aplicar busca por texto
      if (buscaTexto) {
        const buscaLower = buscaTexto.toLowerCase()
        todasContas = todasContas.filter(
          (conta) =>
            conta.descricao.toLowerCase().includes(buscaLower) ||
            conta.cliente_nome?.toLowerCase().includes(buscaLower) ||
            conta.categoria_nome?.toLowerCase().includes(buscaLower) ||
            conta.orcamento_numero?.toLowerCase().includes(buscaLower)
        )
      }

      setContas(contasProcessadas)
      setParcelas(parcelasProcessadas)
      setTodasContas(todasContas.sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      ))

      // Calcular resumo incluindo orÃ§amentos
      calcularResumo(contasProcessadas, parcelasProcessadas, hoje, orcamentosPendentesProcessados, orcamentosConcluidosProcessados)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    }
  }

  const calcularResumo = async (
    contas: ContaReceber[], 
    parcelas: ContaReceber[], 
    hoje: string,
    orcamentosPendentes: ContaReceber[] = [],
    orcamentosConcluidos: ContaReceber[] = []
  ) => {
    const todas = [...contas, ...parcelas, ...orcamentosPendentes, ...orcamentosConcluidos]
    
    const totalAReceber = todas
      .filter((c) => !c.recebida)
      .reduce((sum, c) => sum + Number(c.valor), 0)

    const totalVencidas = todas
      .filter((c) => !c.recebida && c.data_vencimento < hoje)
      .reduce((sum, c) => sum + Number(c.valor), 0)

    const totalRecebidas = todas
      .filter((c) => c.recebida)
      .reduce((sum, c) => sum + Number(c.valor), 0)

    const totalPendentes = todas
      .filter((c) => !c.recebida && c.data_vencimento >= hoje)
      .reduce((sum, c) => sum + Number(c.valor), 0)

    // Calcular saldo atual (receitas recebidas - despesas pagas)
    let saldoAtual = 0
    try {
      const userId = session?.user?.id
      if (userId) {
        const { data: fluxoData } = await supabase
          .from('fluxo_caixa')
          .select('tipo, valor')
          .eq('user_id', userId)

        if (fluxoData) {
          const entradas = fluxoData
            .filter((mov) => mov.tipo === 'entrada')
            .reduce((sum, mov) => sum + Number(mov.valor || 0), 0)
          
          const saidas = fluxoData
            .filter((mov) => mov.tipo === 'saida')
            .reduce((sum, mov) => sum + Number(mov.valor || 0), 0)
          
          saldoAtual = entradas - saidas // Pode ser negativo
        }
      }
    } catch (error) {
      console.error('Erro ao calcular saldo atual:', error)
    }

    setResumo({
      totalAReceber,
      totalVencidas,
      totalRecebidas,
      totalPendentes,
      saldoAtual,
    })
  }

  useEffect(() => {
    if (session) {
      loadContas()
    }
  }, [filtroStatus, filtroCliente, filtroCategoria, filtroMes, buscaTexto, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      const valor = parseFloat(formData.valor)

      if (editingConta) {
        // Editar conta existente
        const { error } = await supabase
          .from('contas_a_receber')
          .update({
            cliente_id: formData.cliente_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor: valor,
            data_vencimento: formData.data_vencimento,
            forma_recebimento: formData.forma_recebimento,
            observacoes: formData.observacoes || null,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
          })
          .eq('id', editingConta.id)

        if (error) throw error

        // Se for parcelada, criar parcelas
        if (formData.parcelada) {
          // Deletar parcelas antigas
          await supabase
            .from('parcelas_contas_receber')
            .delete()
            .eq('conta_receber_id', editingConta.id)

          // Criar novas parcelas
          const totalParcelas = parseInt(formData.total_parcelas)
          const valorParcela = valor / totalParcelas
          const dataVencimento = new Date(formData.data_vencimento)

          for (let i = 0; i < totalParcelas; i++) {
            const dataVencimentoParcela = new Date(dataVencimento)
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + i)

            await supabase.from('parcelas_contas_receber').insert({
              user_id: userId,
              conta_receber_id: editingConta.id,
              cliente_id: formData.cliente_id || null,
              categoria_id: formData.categoria_id || null,
              descricao: `${formData.descricao} - Parcela ${i + 1}/${totalParcelas}`,
              valor: valorParcela,
              data_vencimento: dataVencimentoParcela.toISOString().split('T')[0],
              forma_recebimento: formData.forma_recebimento,
              parcela_numero: i + 1,
              total_parcelas: totalParcelas,
            })
          }
        }
      } else {
        // Criar nova conta
        const { data: novaConta, error } = await supabase
          .from('contas_a_receber')
          .insert({
            user_id: userId,
            cliente_id: formData.cliente_id || null,
            categoria_id: formData.categoria_id || null,
            descricao: formData.descricao,
            valor: valor,
            data_vencimento: formData.data_vencimento,
            forma_recebimento: formData.forma_recebimento,
            observacoes: formData.observacoes || null,
            parcelada: formData.parcelada,
            total_parcelas: formData.parcelada ? parseInt(formData.total_parcelas) : 1,
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

            await supabase.from('parcelas_contas_receber').insert({
              user_id: userId,
              conta_receber_id: novaConta.id,
              cliente_id: formData.cliente_id || null,
              categoria_id: formData.categoria_id || null,
              descricao: `${formData.descricao} - Parcela ${i + 1}/${totalParcelas}`,
              valor: valorParcela,
              data_vencimento: dataVencimentoParcela.toISOString().split('T')[0],
              forma_recebimento: formData.forma_recebimento,
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

  const handleEdit = (conta: ContaReceber) => {
    // Verificar se Ã© uma parcela (tem conta_receber_id)
    const isParcela = 'conta_receber_id' in conta
    
    if (isParcela) {
      alert('Para editar uma parcela, edite a conta principal que gerou as parcelas.')
      return
    }

    setEditingConta(conta)
    setFormData({
      cliente_id: conta.cliente_id || '',
      categoria_id: conta.categoria_id || '',
      descricao: conta.descricao,
      valor: conta.valor.toString(),
      data_vencimento: conta.data_vencimento,
      forma_recebimento: conta.forma_recebimento || 'pix',
      observacoes: conta.observacoes || '',
      parcelada: conta.parcelada,
      total_parcelas: conta.total_parcelas.toString(),
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      const userId = session?.user?.id
      if (!userId) return

      // Deletar movimentaÃ§Ãµes do fluxo de caixa relacionadas
      await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('user_id', userId)
        .eq('origem', 'conta_receber')
        .eq('origem_id', id)

      // Deletar parcelas primeiro (e suas movimentaÃ§Ãµes)
      const { data: parcelas } = await supabase
        .from('parcelas_contas_receber')
        .select('id')
        .eq('conta_receber_id', id)

      if (parcelas && parcelas.length > 0) {
        const parcelasIds = parcelas.map(p => p.id)
        // Deletar movimentaÃ§Ãµes das parcelas
        await supabase
          .from('fluxo_caixa')
          .delete()
          .eq('user_id', userId)
          .eq('origem', 'conta_receber')
          .in('origem_id', parcelasIds)
      }

      // Deletar parcelas
      await supabase.from('parcelas_contas_receber').delete().eq('conta_receber_id', id)
      
      // Deletar conta
      const { error } = await supabase.from('contas_a_receber').delete().eq('id', id)
      if (error) throw error

      loadContas()
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      alert('Erro ao excluir conta')
    }
  }

  const handleMarcarComoRecebida = async (id: string, isParcela: boolean = false) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const hoje = new Date().toISOString().split('T')[0]
      const table = isParcela ? 'parcelas_contas_receber' : 'contas_a_receber'

      // Buscar a conta para obter os dados
      const { data: conta, error: contaError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (contaError) throw contaError

      // Atualizar a conta como recebida
      const { error: updateError } = await supabase
        .from(table)
        .update({
          recebida: true,
          data_recebimento: hoje,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Criar movimentaÃ§Ã£o no fluxo de caixa (entrada)
      const { error: fluxoError } = await supabase
        .from('fluxo_caixa')
        .insert({
          user_id: userId,
          tipo: 'entrada',
          origem: 'conta_receber',
          origem_id: id,
          descricao: conta.descricao || 'Recebimento de receita',
          valor: Number(conta.valor),
          data_movimentacao: hoje,
          forma_pagamento: conta.forma_recebimento || null,
          observacoes: conta.observacoes || null,
        })

      if (fluxoError) {
        console.error('Erro ao criar movimentaÃ§Ã£o no fluxo de caixa:', fluxoError)
        // NÃ£o bloqueia a operaÃ§Ã£o se falhar ao criar no fluxo de caixa
      }

      loadContas()
    } catch (error) {
      console.error('Erro ao marcar como recebida:', error)
      alert('Erro ao marcar como recebida')
    }
  }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      categoria_id: '',
      descricao: '',
      valor: '',
      data_vencimento: new Date().toISOString().split('T')[0],
      forma_recebimento: 'pix',
      observacoes: '',
      parcelada: false,
      total_parcelas: '1',
    })
    setEditingConta(null)
  }

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      // ValidaÃ§Ã£o: deve ter CNPJ ou CPF, mas nÃ£o ambos
      if (formDataCliente.cnpj && formDataCliente.cpf) {
        alert('Informe apenas CNPJ ou CPF, nÃ£o ambos.')
        return
      }

      const { data: novoCliente, error } = await supabase
        .from('clientes')
        .insert({
          user_id: userId,
          nome: formDataCliente.nome,
          razao_social: formDataCliente.razao_social || null,
          cnpj: formDataCliente.cnpj || null,
          cpf: formDataCliente.cpf || null,
          email: formDataCliente.email || null,
          telefone: formDataCliente.telefone || null,
          endereco: formDataCliente.endereco || null,
          observacoes: formDataCliente.observacoes || null,
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de clientes
      await loadData()

      // Selecionar o cliente recÃ©m-criado no formulÃ¡rio de receita
      setFormData({ ...formData, cliente_id: novoCliente.id })

      // Fechar modal e resetar form
      setShowModalCliente(false)
      setFormDataCliente({
        nome: '',
        razao_social: '',
        cnpj: '',
        cpf: '',
        email: '',
        telefone: '',
        endereco: '',
        observacoes: '',
      })

      alert('Cliente criado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error)
      alert('Erro ao criar cliente')
    }
  }

  const handleCriarContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      const { data: novoContrato, error } = await supabase
        .from('contratos')
        .insert({
          user_id: userId,
          cliente_id: formDataContrato.cliente_id || null,
          categoria_id: formDataContrato.categoria_id || null,
          nome_contrato: formDataContrato.nome_contrato,
          descricao: formDataContrato.descricao || null,
          valor_mensal: parseFloat(formDataContrato.valor_mensal),
          data_inicio: formDataContrato.data_inicio,
          data_fim: formDataContrato.data_fim || null,
          dia_vencimento: parseInt(formDataContrato.dia_vencimento),
          forma_recebimento: formDataContrato.forma_recebimento,
          observacoes: formDataContrato.observacoes || null,
          detalhes_contrato: formDataContrato.detalhes_contrato || null,
          ativo: formDataContrato.ativo,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de contratos primeiro
      await loadContratos()

      // Gerar receitas para o mÃªs atual se o contrato estiver ativo
      if (formDataContrato.ativo) {
        const contratoProcessado: Contrato = {
          ...novoContrato,
          cliente_nome: clientes.find(c => c.id === novoContrato.cliente_id)?.nome || null,
          categoria_nome: categorias.find(c => c.id === novoContrato.categoria_id)?.nome || null,
        }
        await gerarReceitasContratos([contratoProcessado])
      }

      // Fechar modal e resetar form
      setShowModalContrato(false)
      setFormDataContrato({
        cliente_id: '',
        categoria_id: '',
        nome_contrato: '',
        descricao: '',
        valor_mensal: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        dia_vencimento: new Date().getDate().toString(),
        forma_recebimento: 'pix',
        observacoes: '',
        detalhes_contrato: '',
        ativo: true,
      })
      setEditingContrato(null)

      alert('Contrato criado com sucesso! Receitas serÃ£o geradas automaticamente todo mÃªs.')
    } catch (error: any) {
      console.error('Erro ao criar contrato:', error)
      alert('Erro ao criar contrato')
    }
  }

  const handleEditarContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId || !editingContrato) return

      const { error } = await supabase
        .from('contratos')
        .update({
          cliente_id: formDataContrato.cliente_id || null,
          categoria_id: formDataContrato.categoria_id || null,
          nome_contrato: formDataContrato.nome_contrato,
          descricao: formDataContrato.descricao || null,
          valor_mensal: parseFloat(formDataContrato.valor_mensal),
          data_inicio: formDataContrato.data_inicio,
          data_fim: formDataContrato.data_fim || null,
          dia_vencimento: parseInt(formDataContrato.dia_vencimento),
          forma_recebimento: formDataContrato.forma_recebimento,
          observacoes: formDataContrato.observacoes || null,
          detalhes_contrato: formDataContrato.detalhes_contrato || null,
          ativo: formDataContrato.ativo,
        })
        .eq('id', editingContrato.id)

      if (error) throw error

      // Atualizar lista de contratos
      await loadContratos()

      // Fechar modal e resetar form
      setShowModalContrato(false)
      setFormDataContrato({
        cliente_id: '',
        categoria_id: '',
        nome_contrato: '',
        descricao: '',
        valor_mensal: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        dia_vencimento: new Date().getDate().toString(),
        forma_recebimento: 'pix',
        observacoes: '',
        detalhes_contrato: '',
        ativo: true,
      })
      setEditingContrato(null)

      alert('Contrato atualizado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao atualizar contrato:', error)
      alert('Erro ao atualizar contrato')
    }
  }

  const handleDeleteContrato = async (id: string) => {
    const contrato = contratos.find(c => c.id === id)
    const mensagem = `âš ï¸ ATENÃ‡ÃƒO: VocÃª estÃ¡ prestes a excluir permanentemente o contrato "${contrato?.nome_contrato || 'este contrato'}".\n\n` +
      `Esta aÃ§Ã£o irÃ¡:\n` +
      `â€¢ Remover todos os dados do contrato\n` +
      `â€¢ NÃƒO removerÃ¡ as receitas jÃ¡ geradas\n` +
      `â€¢ ImpedirÃ¡ a geraÃ§Ã£o de novas receitas\n\n` +
      `Esta aÃ§Ã£o NÃƒO pode ser desfeita!\n\n` +
      `Deseja realmente continuar?`

    if (!confirm(mensagem)) return

    try {
      // Deletar registros de receitas geradas
      await supabase
        .from('contratos_receitas_geradas')
        .delete()
        .eq('contrato_id', id)

      // Deletar contrato
      const { error } = await supabase
        .from('contratos')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadContratos()
      alert('Contrato excluÃ­do com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir contrato:', error)
      alert('Erro ao excluir contrato')
    }
  }

  const handleEditContrato = (contrato: Contrato) => {
    setEditingContrato(contrato)
    setFormDataContrato({
      cliente_id: contrato.cliente_id || '',
      categoria_id: contrato.categoria_id || '',
      nome_contrato: contrato.nome_contrato,
      descricao: contrato.descricao || '',
      valor_mensal: contrato.valor_mensal.toString(),
      data_inicio: contrato.data_inicio,
      data_fim: contrato.data_fim || '',
      dia_vencimento: contrato.dia_vencimento.toString(),
      forma_recebimento: contrato.forma_recebimento || 'pix',
      observacoes: contrato.observacoes || '',
      detalhes_contrato: contrato.detalhes_contrato || '',
      ativo: contrato.ativo,
    })
    setShowModalContrato(true)
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
          tipo: 'receita',
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de categorias
      await loadData()

      // Selecionar a categoria recÃ©m-criada no formulÃ¡rio de receita
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
        alert('JÃ¡ existe uma categoria com este nome para receitas.')
      } else {
        alert('Erro ao criar categoria')
      }
    }
  }

  const handleAlterarStatus = async (id: string, novoStatus: 'pendente' | 'aprovado' | 'cancelado', isParcela: boolean = false) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const table = isParcela ? 'parcelas_contas_receber' : 'contas_a_receber'

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
        // Ao aprovar, marcar como recebida
        const hoje = new Date().toISOString().split('T')[0]
        updateData.recebida = true
        updateData.data_recebimento = hoje
      } else if (novoStatus === 'cancelado' || novoStatus === 'pendente') {
        // Ao cancelar ou voltar para pendente, desmarcar como recebida se estiver recebida
        updateData.recebida = false
        updateData.data_recebimento = null
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

  const isVencida = (conta: ContaReceber, hoje: string): boolean => {
    return conta.data_vencimento < hoje
  }

  const getStatusEfetivo = (conta: ContaReceber): 'pendente' | 'aprovado' | 'cancelado' | 'vencida' => {
    const hoje = new Date().toISOString().split('T')[0]
    const status = conta.status || 'pendente'
    
    if (status === 'cancelado') {
      return 'cancelado'
    } else if (status === 'aprovado' || conta.recebida) {
      return 'aprovado'
    } else if (isVencida(conta, hoje)) {
      return 'vencida'
    } else {
      return 'pendente'
    }
  }

  const getStatusBadge = (conta: ContaReceber) => {
    const hoje = new Date().toISOString().split('T')[0]
    
    if (conta.status === 'aprovado' || conta.recebida) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Recebida</span>
    } else if (conta.status === 'cancelado') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Cancelado</span>
    }
    
    // Para orÃ§amentos em processo, sempre mostrar como pendente, nÃ£o como vencido
    // pois um orÃ§amento em processo nÃ£o Ã© necessariamente uma dÃ­vida vencida
    if (conta.origem === 'orcamento') {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
    }
    
    // Para contas normais, verificar se estÃ¡ vencida
    if (conta.data_vencimento < hoje) {
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

  const limparMovimentacoesOrfas = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Buscar todas as receitas e parcelas existentes
      const { data: contasData } = await supabase
        .from('contas_a_receber')
        .select('id')
        .eq('user_id', userId)

      const { data: parcelasData } = await supabase
        .from('parcelas_contas_receber')
        .select('id')
        .eq('user_id', userId)

      const idsValidos = new Set([
        ...(contasData || []).map(c => c.id),
        ...(parcelasData || []).map(p => p.id)
      ])

      // Buscar todas as movimentaÃ§Ãµes de receitas
      const { data: movimentacoes } = await supabase
        .from('fluxo_caixa')
        .select('id, origem, origem_id')
        .eq('user_id', userId)
        .eq('origem', 'conta_receber')

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
                <h1 className="text-3xl font-bold text-white mb-2">Vendas/Receitas</h1>
                <p className="text-gray-400">Gerencie vendas e receitas (contas a receber)</p>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setEditingContrato(null)
                setFormDataContrato({
                  cliente_id: '',
                  categoria_id: '',
                  nome_contrato: '',
                  descricao: '',
                  valor_mensal: '',
                  data_inicio: new Date().toISOString().split('T')[0],
                  data_fim: '',
                  dia_vencimento: new Date().getDate().toString(),
                  forma_recebimento: 'pix',
                  observacoes: '',
                  detalhes_contrato: '',
                  ativo: true,
                })
                setShowModalContrato(true)
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Novo Contrato</span>
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Nova Receita</span>
            </button>
          </div>
        </div>

        {/* Card de Saldo Atual */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Saldo Atual</p>
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
                <p className="text-gray-400 text-sm">Total a Receber</p>
                <p className="text-2xl font-bold text-white mt-1">{formatarMoeda(resumo.totalAReceber)}</p>
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
                <p className="text-gray-400 text-sm">Recebidas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{formatarMoeda(resumo.totalRecebidas)}</p>
              </div>
              <FiCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* SeÃ§Ã£o de Contratos */}
        {contratos.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Contratos Ativos</h2>
              <span className="text-sm text-gray-400">{contratos.filter(c => c.ativo).length} ativo(s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contratos.map((contrato) => (
                <div key={contrato.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{contrato.nome_contrato}</h3>
                      <p className="text-sm text-gray-400 mt-1">{contrato.cliente_nome || 'Sem cliente'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${contrato.ativo ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {contrato.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Valor Mensal:</span>
                      <span className="text-white font-semibold">{formatarMoeda(contrato.valor_mensal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Vencimento:</span>
                      <span className="text-white">Dia {contrato.dia_vencimento}</span>
                    </div>
                    {contrato.data_fim && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">TÃ©rmino:</span>
                        <span className="text-white">{formatarData(contrato.data_fim)}</span>
                      </div>
                    )}
                  </div>
                  {contrato.detalhes_contrato && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-xs text-gray-400 line-clamp-2">{contrato.detalhes_contrato}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-end mt-4">
                    <ActionButtons
                      onEdit={() => handleEditContrato(contrato)}
                      onDelete={() => handleDeleteContrato(contrato.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros â€” compactos: busca, status, cliente, categoria, mÃªs (padrÃ£o atual); ordem mais recente primeiro */}
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
              onChange={(e) => setFiltroStatus(e.target.value as 'todas' | 'pendentes' | 'recebidas' | 'vencidas')}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todas">Todas</option>
              <option value="pendentes">Pendentes</option>
              <option value="vencidas">Vencidas</option>
              <option value="recebidas">Recebidas</option>
            </select>
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
            >
              <option value="">Todos clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
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
                    Cliente
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
                      Nenhuma receita encontrada
                    </td>
                  </tr>
                ) : (
                  todasContas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-white">{conta.descricao}</div>
                          {conta.origem === 'orcamento' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              OrÃ§amento
                            </span>
                          )}
                        </div>
                        {conta.parcelada && (
                          <div className="text-xs text-gray-400">
                            Parcela {conta.parcela_atual || 1}/{conta.total_parcelas}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {conta.cliente_nome || '-'}
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
                        {!('conta_receber_id' in conta) && conta.origem === 'conta' ? (
                          (() => {
                            const hoje = new Date().toISOString().split('T')[0]
                            const statusEfetivo = getStatusEfetivo(conta)
                            const estaVencida = isVencida(conta, hoje)
                            
                            // Se estÃ¡ vencida mas o status no banco Ã© pendente, mostrar badge de vencida + select
                            if (estaVencida && (conta.status || 'pendente') === 'pendente') {
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
                                    : conta.status === 'aprovado' || conta.recebida
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
                          {!conta.recebida && conta.origem === 'conta' && conta.status !== 'cancelado' && (
                            (!('conta_receber_id' in conta) && conta.status !== 'aprovado') || ('conta_receber_id' in conta) ? (
                              <button
                                onClick={() => handleMarcarComoRecebida(conta.id, 'conta_receber_id' in conta)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                title="Marcar como recebida"
                              >
                                <FiCheck className="w-5 h-5" />
                              </button>
                            ) : null
                          )}
                          {!('conta_receber_id' in conta) && conta.origem === 'conta' && (
                            <ActionButtons
                              onEdit={() => handleEdit(conta)}
                              onDelete={() => handleDelete(conta.id)}
                            />
                          )}
                          {conta.origem === 'orcamento' && (
                            <ActionButtons
                              onView={() => router.push(`/empresarial/orcamentos/${conta.id.replace('orcamento_', '')}`)}
                              showEdit={false}
                              showDelete={false}
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
                    {editingConta ? 'Editar Receita' : 'Nova Receita'}
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
                      <label className="block text-sm text-gray-400 mb-1">Cliente</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={formData.cliente_id}
                          onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Selecione um cliente</option>
                          {clientes.map((cliente) => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowModalCliente(true)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          title="Adicionar novo cliente"
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
                      placeholder="Ex: Recebimento de cliente"
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
                      <label className="block text-sm text-gray-400 mb-1">Forma de Recebimento</label>
                      <select
                        value={formData.forma_recebimento}
                        onChange={(e) => setFormData({ ...formData, forma_recebimento: e.target.value })}
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
                      {editingConta ? 'Salvar AlteraÃ§Ãµes' : 'Criar Receita'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criar Cliente */}
        {showModalCliente && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Novo Cliente</h2>
                  <button
                    onClick={() => {
                      setShowModalCliente(false)
                      setFormDataCliente({
                        nome: '',
                        razao_social: '',
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

                <form onSubmit={handleCriarCliente} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formDataCliente.nome}
                      onChange={(e) => setFormDataCliente({ ...formDataCliente, nome: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">RazÃ£o Social</label>
                    <input
                      type="text"
                      value={formDataCliente.razao_social}
                      onChange={(e) => setFormDataCliente({ ...formDataCliente, razao_social: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="RazÃ£o social (opcional)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={formDataCliente.cnpj}
                        onChange={(e) => setFormDataCliente({ ...formDataCliente, cnpj: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formDataCliente.cpf}
                        onChange={(e) => setFormDataCliente({ ...formDataCliente, cpf: e.target.value })}
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
                        value={formDataCliente.email}
                        onChange={(e) => setFormDataCliente({ ...formDataCliente, email: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formDataCliente.telefone}
                        onChange={(e) => setFormDataCliente({ ...formDataCliente, telefone: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">EndereÃ§o</label>
                    <input
                      type="text"
                      value={formDataCliente.endereco}
                      onChange={(e) => setFormDataCliente({ ...formDataCliente, endereco: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="EndereÃ§o completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">ObservaÃ§Ãµes</label>
                    <textarea
                      value={formDataCliente.observacoes}
                      onChange={(e) => setFormDataCliente({ ...formDataCliente, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="ObservaÃ§Ãµes adicionais..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModalCliente(false)
                        setFormDataCliente({
                          nome: '',
                          razao_social: '',
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
                      Criar Cliente
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
                  <h2 className="text-2xl font-bold text-white">Nova Categoria de Receita</h2>
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
                      placeholder="Ex: Vendas, Serviços, Produtos"
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

        {/* Modal de Criar/Editar Contrato */}
        {showModalContrato && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingContrato ? 'Editar Contrato' : 'Novo Contrato'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModalContrato(false)
                      setEditingContrato(null)
                      setFormDataContrato({
                        cliente_id: '',
                        categoria_id: '',
                        nome_contrato: '',
                        descricao: '',
                        valor_mensal: '',
                        data_inicio: new Date().toISOString().split('T')[0],
                        data_fim: '',
                        dia_vencimento: new Date().getDate().toString(),
                        forma_recebimento: 'pix',
                        observacoes: '',
                        detalhes_contrato: '',
                        ativo: true,
                      })
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={editingContrato ? handleEditarContrato : handleCriarContrato} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome do Contrato *</label>
                    <input
                      type="text"
                      required
                      value={formDataContrato.nome_contrato}
                      onChange={(e) => setFormDataContrato({ ...formDataContrato, nome_contrato: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Ex: Contrato de ManutenÃ§Ã£o Mensal"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Cliente</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={formDataContrato.cliente_id}
                          onChange={(e) => setFormDataContrato({ ...formDataContrato, cliente_id: e.target.value })}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Selecione um cliente</option>
                          {clientes.map((cliente) => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowModalCliente(true)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          title="Adicionar novo cliente"
                        >
                          <FiPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={formDataContrato.categoria_id}
                          onChange={(e) => setFormDataContrato({ ...formDataContrato, categoria_id: e.target.value })}
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
                    <label className="block text-sm text-gray-400 mb-1">DescriÃ§Ã£o</label>
                    <input
                      type="text"
                      value={formDataContrato.descricao}
                      onChange={(e) => setFormDataContrato({ ...formDataContrato, descricao: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Breve descriÃ§Ã£o do contrato"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Valor Mensal *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formDataContrato.valor_mensal}
                        onChange={(e) => setFormDataContrato({ ...formDataContrato, valor_mensal: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Dia de Vencimento *</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={formDataContrato.dia_vencimento}
                        onChange={(e) => setFormDataContrato({ ...formDataContrato, dia_vencimento: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        placeholder="1-31"
                      />
                      <p className="text-xs text-gray-500 mt-1">Dia do mÃªs em que a receita vence</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Forma de Recebimento</label>
                      <select
                        value={formDataContrato.forma_recebimento}
                        onChange={(e) => setFormDataContrato({ ...formDataContrato, forma_recebimento: e.target.value })}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Data de InÃ­cio *</label>
                      <input
                        type="date"
                        required
                        value={formDataContrato.data_inicio}
                        onChange={(e) => setFormDataContrato({ ...formDataContrato, data_inicio: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Data de TÃ©rmino</label>
                      <input
                        type="date"
                        value={formDataContrato.data_fim}
                        onChange={(e) => setFormDataContrato({ ...formDataContrato, data_fim: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Deixe em branco para contrato sem tÃ©rmino</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Detalhes do Contrato</label>
                    <textarea
                      value={formDataContrato.detalhes_contrato}
                      onChange={(e) => setFormDataContrato({ ...formDataContrato, detalhes_contrato: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="Detalhes adicionais do contrato, termos, condiÃ§Ãµes, etc..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">ObservaÃ§Ãµes</label>
                    <textarea
                      value={formDataContrato.observacoes}
                      onChange={(e) => setFormDataContrato({ ...formDataContrato, observacoes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="ObservaÃ§Ãµes adicionais..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formDataContrato.ativo}
                        onChange={(e) => setFormDataContrato({ ...formDataContrato, ativo: e.target.checked })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-white">Contrato Ativo (gerarÃ¡ receitas automaticamente)</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModalContrato(false)
                        setEditingContrato(null)
                        setFormDataContrato({
                          cliente_id: '',
                          categoria_id: '',
                          nome_contrato: '',
                          descricao: '',
                          valor_mensal: '',
                          data_inicio: new Date().toISOString().split('T')[0],
                          data_fim: '',
                          dia_vencimento: new Date().getDate().toString(),
                          forma_recebimento: 'pix',
                          observacoes: '',
                          detalhes_contrato: '',
                          ativo: true,
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
                      {editingContrato ? 'Salvar AlteraÃ§Ãµes' : 'Criar Contrato'}
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

