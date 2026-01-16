'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  FiTrendingUp,
  FiSearch,
  FiEye,
} from 'react-icons/fi'

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
  cliente_nome?: string | null
  categoria_nome?: string | null
  origem?: 'conta' | 'orcamento' // Identifica se é uma conta a receber ou um orçamento
  orcamento_numero?: string | null // Número do orçamento se for origem orçamento
}

interface Cliente {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
}

interface ResumoContas {
  totalAReceber: number
  totalVencidas: number
  totalRecebidas: number
  totalPendentes: number
}

export default function ReceitasPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [parcelas, setParcelas] = useState<ContaReceber[]>([])
  const [todasContas, setTodasContas] = useState<ContaReceber[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null)
  const [resumo, setResumo] = useState<ResumoContas>({
    totalAReceber: 0,
    totalVencidas: 0,
    totalRecebidas: 0,
    totalPendentes: 0,
  })

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'recebidas' | 'vencidas'>('todas')
  const [filtroCliente, setFiltroCliente] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')

  // Formulário
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
        .from('contas_a_receber')
        .select('*')
        .eq('user_id', userId)
        .eq('parcelada', false)
        .order('data_vencimento', { ascending: true })

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
        .from('parcelas_contas_receber')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: true })

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

      if (filtroDataInicio) {
        parcelasQuery = parcelasQuery.gte('data_vencimento', filtroDataInicio)
      }

      if (filtroDataFim) {
        parcelasQuery = parcelasQuery.lte('data_vencimento', filtroDataFim)
      }

      const { data: parcelasData, error: parcelasError } = await parcelasQuery

      if (parcelasError) throw parcelasError

      // Buscar orçamentos pendentes (em processo) - serão adicionados como receitas pendentes
      let orcamentosPendentesQuery = supabase
        .from('orcamentos')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'em_processo')

      // Aplicar filtros de data nos orçamentos
      if (filtroDataInicio) {
        orcamentosPendentesQuery = orcamentosPendentesQuery.gte('data_emissao', filtroDataInicio)
      }
      if (filtroDataFim) {
        orcamentosPendentesQuery = orcamentosPendentesQuery.lte('data_emissao', filtroDataFim)
      }
      if (filtroCliente) {
        orcamentosPendentesQuery = orcamentosPendentesQuery.eq('cliente_id', filtroCliente)
      }

      const { data: orcamentosPendentes, error: orcamentosPendentesError } = await orcamentosPendentesQuery
      if (orcamentosPendentesError) console.error('Erro ao carregar orçamentos pendentes:', orcamentosPendentesError)

      // Buscar orçamentos concluídos - serão adicionados como receitas recebidas
      let orcamentosConcluidosQuery = supabase
        .from('orcamentos')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'concluido')

      // Aplicar filtros de data nos orçamentos
      if (filtroDataInicio) {
        orcamentosConcluidosQuery = orcamentosConcluidosQuery.gte('data_emissao', filtroDataInicio)
      }
      if (filtroDataFim) {
        orcamentosConcluidosQuery = orcamentosConcluidosQuery.lte('data_emissao', filtroDataFim)
      }
      if (filtroCliente) {
        orcamentosConcluidosQuery = orcamentosConcluidosQuery.eq('cliente_id', filtroCliente)
      }

      const { data: orcamentosConcluidos, error: orcamentosConcluidosError } = await orcamentosConcluidosQuery
      if (orcamentosConcluidosError) console.error('Erro ao carregar orçamentos concluídos:', orcamentosConcluidosError)

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

      // Converter orçamentos pendentes em receitas pendentes
      const orcamentosPendentesProcessados = (orcamentosPendentes || []).map((orcamento: any) => {
        // Para orçamentos em processo, usar data_validade se existir, senão usar uma data futura (30 dias da emissão)
        let dataVencimento = orcamento.data_validade
        if (!dataVencimento) {
          const dataEmissao = new Date(orcamento.data_emissao)
          dataEmissao.setDate(dataEmissao.getDate() + 30) // Adiciona 30 dias da data de emissão
          dataVencimento = dataEmissao.toISOString().split('T')[0]
        }
        
        return {
          id: `orcamento_${orcamento.id}`,
          cliente_id: orcamento.cliente_id,
          categoria_id: null,
          descricao: `Orçamento ${orcamento.numero}`,
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

      // Converter orçamentos concluídos em receitas recebidas
      const orcamentosConcluidosProcessados = (orcamentosConcluidos || []).map((orcamento: any) => ({
        id: `orcamento_${orcamento.id}`,
        cliente_id: orcamento.cliente_id,
        categoria_id: null,
        descricao: `Orçamento ${orcamento.numero}`,
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

      // Aplicar filtros de status nos orçamentos
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

      // Calcular resumo incluindo orçamentos
      calcularResumo(contasProcessadas, parcelasProcessadas, hoje, orcamentosPendentesProcessados, orcamentosConcluidosProcessados)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    }
  }

  const calcularResumo = (
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

    setResumo({
      totalAReceber,
      totalVencidas,
      totalRecebidas,
      totalPendentes,
    })
  }

  useEffect(() => {
    if (session) {
      loadContas()
    }
  }, [filtroStatus, filtroCliente, filtroCategoria, filtroDataInicio, filtroDataFim, buscaTexto, session])

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
    // Verificar se é uma parcela (tem conta_receber_id)
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
      // Deletar parcelas primeiro
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
      const hoje = new Date().toISOString().split('T')[0]
      const table = isParcela ? 'parcelas_contas_receber' : 'contas_a_receber'

      const { error } = await supabase
        .from(table)
        .update({
          recebida: true,
          data_recebimento: hoje,
        })
        .eq('id', id)

      if (error) throw error

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

  const getStatusBadge = (conta: ContaReceber) => {
    const hoje = new Date().toISOString().split('T')[0]
    
    if (conta.recebida) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Recebida</span>
    }
    
    // Para orçamentos em processo, sempre mostrar como pendente, não como vencido
    // pois um orçamento em processo não é necessariamente uma dívida vencida
    if (conta.origem === 'orcamento') {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
    }
    
    // Para contas normais, verificar se está vencida
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
            <h1 className="text-3xl font-bold text-white mb-2">Receitas</h1>
            <p className="text-gray-400">Gerencie todas as receitas da sua empresa</p>
          </div>
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
                  placeholder="Descrição, cliente..."
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
                <option value="recebidas">Recebidas</option>
              </select>
            </div>

            {/* Filtro por cliente */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cliente</label>
              <select
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Todos</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
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
                    Ações
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
                              Orçamento
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
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(conta)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {!conta.recebida && conta.origem === 'conta' && (
                            <button
                              onClick={() => handleMarcarComoRecebida(conta.id, 'conta_receber_id' in conta)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Marcar como recebida"
                            >
                              <FiCheck className="w-5 h-5" />
                            </button>
                          )}
                          {!('conta_receber_id' in conta) && conta.origem === 'conta' && (
                            <>
                              <button
                                onClick={() => handleEdit(conta)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Editar"
                              >
                                <FiEdit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(conta.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Excluir"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {conta.origem === 'orcamento' && (
                            <button
                              onClick={() => router.push(`/empresarial/orcamentos/${conta.id.replace('orcamento_', '')}`)}
                              className="text-purple-400 hover:text-purple-300 transition-colors"
                              title="Ver orçamento"
                            >
                              <FiEye className="w-5 h-5" />
                            </button>
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
                      <select
                        value={formData.cliente_id}
                        onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">Selecione um cliente</option>
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                      <select
                        value={formData.categoria_id}
                        onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categorias.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </option>
                        ))}
                      </select>
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
                        <option value="transferencia">Transferência</option>
                        <option value="boleto">Boleto</option>
                        <option value="cheque">Cheque</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
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
                      {editingConta ? 'Salvar Alterações' : 'Criar Receita'}
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

