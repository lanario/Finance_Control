'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { formatDate } from '@/lib/utils'
import { FiPlus, FiEdit, FiTrash2, FiTrendingUp, FiX } from 'react-icons/fi'

interface Investimento {
  id: string
  nome: string
  tipo: string
  valor_investido: number
  valor_atual: number
  data_aquisicao: string
  quantidade: number
  cotacao_aquisicao: number | null
  cotacao_atual: number | null
  taxa_juros: number | null
  periodicidade: 'mensal' | 'semestral' | 'anual' | null
  data_proxima_liquidacao: string | null
  liquidar_em_receitas: boolean
  dividend_yield: number | null
  observacoes: string | null
  user_id: string
}

const tiposInvestimento = [
  'Ações',
  'FIIs',
  'Tesouro Direto',
  'CDB',
  'LCI/LCA',
  'LC',
  'Fundos',
  'Criptomoedas',
  'ETFs',
  'Outros'
]

// Tipos que usam rendimento fixo (taxa de juros)
const tiposComRendimentoFixo = ['CDB', 'LCI/LCA', 'LC', 'Tesouro Direto']

// Tipos que usam cotação (ações, FIIs, etc)
const tiposComCotacao = ['Ações', 'FIIs', 'ETFs', 'Criptomoedas']

export default function InvestimentosPage() {
  const { session } = useAuth()
  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingInvestimento, setEditingInvestimento] = useState<Investimento | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    valor_investido: '',
    valor_atual: '',
    data_aquisicao: new Date().toISOString().split('T')[0],
    quantidade: '1',
    cotacao_aquisicao: '',
    cotacao_atual: '',
    taxa_juros: '',
    periodicidade: '' as 'mensal' | 'semestral' | 'anual' | '',
    data_proxima_liquidacao: '',
    liquidar_em_receitas: true,
    dividend_yield: '',
    observacoes: '',
  })

  useEffect(() => {
    if (session) {
      loadInvestimentos()
      verificarELiquidarRendimentos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Verificar liquidações automaticamente a cada hora
  useEffect(() => {
    if (session) {
      const interval = setInterval(() => {
        verificarELiquidarRendimentos()
      }, 60 * 60 * 1000) // 1 hora

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const loadInvestimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('data_aquisicao', { ascending: false })

      if (error) throw error
      setInvestimentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularValorAtual = (valorInvestido: number, taxaJuros: number | null, periodicidade: string | null, dataAquisicao: string): number => {
    if (!taxaJuros || !periodicidade) return valorInvestido
    
    const hoje = new Date()
    const dataCompra = new Date(dataAquisicao)
    
    // Para investimentos com rendimento fixo, calcular baseado em juros compostos
    // A taxa de juros é anual, então precisamos calcular a taxa equivalente para o período
    let valorAtual = valorInvestido
    
    if (periodicidade === 'mensal') {
      // Taxa mensal = (1 + taxa_anual)^(1/12) - 1
      const taxaMensal = Math.pow(1 + taxaJuros / 100, 1/12) - 1
      const mesesPassados = Math.floor((hoje.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24 * 30))
      valorAtual = valorInvestido * Math.pow(1 + taxaMensal, mesesPassados)
    } else if (periodicidade === 'semestral') {
      // Taxa semestral = (1 + taxa_anual)^(1/2) - 1
      const taxaSemestral = Math.pow(1 + taxaJuros / 100, 1/2) - 1
      const semestresPassados = Math.floor((hoje.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24 * 180))
      valorAtual = valorInvestido * Math.pow(1 + taxaSemestral, semestresPassados)
    } else if (periodicidade === 'anual') {
      const taxaAnual = taxaJuros / 100
      const anosPassados = Math.floor((hoje.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24 * 365))
      valorAtual = valorInvestido * Math.pow(1 + taxaAnual, anosPassados)
    }
    
    return Number(valorAtual.toFixed(2))
  }

  const calcularProximaLiquidacao = (dataReferencia: string, periodicidade: string | null): string | null => {
    if (!periodicidade) return null
    
    const dataRef = new Date(dataReferencia)
    const hoje = new Date()
    let proximaData = new Date(dataRef)
    
    // Ajustar para o mesmo dia do mês
    const diaOriginal = dataRef.getDate()
    
    if (periodicidade === 'mensal') {
      proximaData.setMonth(proximaData.getMonth() + 1)
      proximaData.setDate(diaOriginal)
      // Se o mês não tem esse dia, usar o último dia do mês
      if (proximaData.getDate() !== diaOriginal) {
        proximaData.setDate(0) // Último dia do mês anterior
      }
      // Garantir que seja no futuro
      while (proximaData <= hoje) {
        proximaData.setMonth(proximaData.getMonth() + 1)
        proximaData.setDate(diaOriginal)
        if (proximaData.getDate() !== diaOriginal) {
          proximaData.setDate(0)
        }
      }
    } else if (periodicidade === 'semestral') {
      proximaData.setMonth(proximaData.getMonth() + 6)
      proximaData.setDate(diaOriginal)
      if (proximaData.getDate() !== diaOriginal) {
        proximaData.setDate(0)
      }
      while (proximaData <= hoje) {
        proximaData.setMonth(proximaData.getMonth() + 6)
        proximaData.setDate(diaOriginal)
        if (proximaData.getDate() !== diaOriginal) {
          proximaData.setDate(0)
        }
      }
    } else if (periodicidade === 'anual') {
      proximaData.setFullYear(proximaData.getFullYear() + 1)
      proximaData.setDate(diaOriginal)
      if (proximaData.getDate() !== diaOriginal) {
        proximaData.setDate(0)
      }
      while (proximaData <= hoje) {
        proximaData.setFullYear(proximaData.getFullYear() + 1)
        proximaData.setDate(diaOriginal)
        if (proximaData.getDate() !== diaOriginal) {
          proximaData.setDate(0)
        }
      }
    }
    
    return proximaData.toISOString().split('T')[0]
  }

  const calcularRendimentoPeriodico = (valorInvestido: number, taxaJuros: number, periodicidade: string): number => {
    // Calcula o rendimento para um período específico baseado na taxa anual
    // Para juros compostos, o rendimento de cada período é calculado sobre o valor acumulado
    if (periodicidade === 'mensal') {
      // Taxa mensal equivalente: (1 + taxa_anual)^(1/12) - 1
      const taxaMensal = Math.pow(1 + taxaJuros / 100, 1/12) - 1
      return valorInvestido * taxaMensal
    } else if (periodicidade === 'semestral') {
      // Taxa semestral equivalente: (1 + taxa_anual)^(1/2) - 1
      const taxaSemestral = Math.pow(1 + taxaJuros / 100, 1/2) - 1
      return valorInvestido * taxaSemestral
    } else if (periodicidade === 'anual') {
      return valorInvestido * (taxaJuros / 100)
    }
    return 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const isRendimentoFixo = tiposComRendimentoFixo.includes(formData.tipo)
      const isComCotacao = tiposComCotacao.includes(formData.tipo)
      
      // Para investimentos com cotação, calcular valores automaticamente
      let valorInvestido = 0
      let valorAtual = 0
      
      if (isComCotacao) {
        // Calcular valor investido: Quantidade × Cotação na Aquisição
        if (!formData.quantidade || !formData.cotacao_aquisicao) {
          alert('Para investimentos com cotação, é necessário informar Quantidade e Cotação na Aquisição')
          return
        }
        const quantidade = parseFloat(formData.quantidade)
        const cotacaoAquisicao = parseFloat(formData.cotacao_aquisicao)
        if (isNaN(quantidade) || isNaN(cotacaoAquisicao) || quantidade <= 0 || cotacaoAquisicao <= 0) {
          alert('Quantidade e Cotação na Aquisição devem ser números válidos e maiores que zero')
          return
        }
        valorInvestido = quantidade * cotacaoAquisicao
        
        // Calcular valor atual: Quantidade × Cotação Atual (ou usar o valor informado manualmente se estiver editando)
        if (editingInvestimento && formData.valor_atual && formData.valor_atual.trim() !== '') {
          const parsed = parseFloat(formData.valor_atual)
          if (!isNaN(parsed) && parsed >= 0) {
            valorAtual = parsed
          } else {
            valorAtual = valorInvestido
          }
        } else {
          // Para novos investimentos ou se não houver valor atual manual, calcular automaticamente
          if (formData.cotacao_atual) {
            const cotacaoAtual = parseFloat(formData.cotacao_atual)
            if (!isNaN(cotacaoAtual) && cotacaoAtual > 0) {
              valorAtual = quantidade * cotacaoAtual
            } else {
              valorAtual = valorInvestido // Se cotação atual não fornecida, usar valor investido
            }
          } else {
            valorAtual = valorInvestido // Se cotação atual não fornecida, usar valor investido
          }
        }
      } else {
        // Para outros tipos de investimento, validar valor investido
        if (!formData.valor_investido || formData.valor_investido.trim() === '') {
          alert('Por favor, informe o valor investido')
          return
        }
        
        valorInvestido = parseFloat(formData.valor_investido)
        if (isNaN(valorInvestido) || valorInvestido < 0) {
          alert('O valor investido deve ser um número válido e maior ou igual a zero')
          return
        }
        
        // Calcular valor atual baseado no tipo
        valorAtual = valorInvestido
        if (formData.valor_atual && formData.valor_atual.trim() !== '') {
          const parsed = parseFloat(formData.valor_atual)
          if (!isNaN(parsed) && parsed >= 0) {
            valorAtual = parsed
          }
        } else if (isRendimentoFixo && formData.taxa_juros && formData.periodicidade) {
          // Para investimentos com rendimento fixo que são liquidados automaticamente,
          // o valor_atual inicial é o mesmo que o valor_investido
          // Os rendimentos serão liquidados periodicamente nas receitas
          if (formData.liquidar_em_receitas) {
            valorAtual = valorInvestido // Valor inicial, rendimentos serão liquidados separadamente
          } else {
            // Se não liquidar automaticamente, calcular o valor atual com juros compostos
            valorAtual = calcularValorAtual(
              valorInvestido,
              parseFloat(formData.taxa_juros),
              formData.periodicidade,
              formData.data_aquisicao
            )
          }
        }
      }

      // Preparar dados do investimento, garantindo que valores vazios sejam null
      let taxaJurosValue: number | null = null
      if (isRendimentoFixo && formData.taxa_juros && formData.taxa_juros.trim() !== '') {
        const parsed = parseFloat(formData.taxa_juros)
        if (!isNaN(parsed) && parsed >= 0) {
          taxaJurosValue = parsed
        }
      }
      
      const periodicidadeValue = isRendimentoFixo && formData.periodicidade && formData.periodicidade.trim() !== '' 
        ? formData.periodicidade as 'mensal' | 'semestral' | 'anual'
        : null

      let proximaLiquidacaoValue: string | null = null
      if (isRendimentoFixo && periodicidadeValue && formData.data_aquisicao) {
        const calculado = calcularProximaLiquidacao(formData.data_aquisicao, periodicidadeValue)
        if (calculado) {
          proximaLiquidacaoValue = calculado
        }
      }

      const investimentoData: any = {
        nome: formData.nome,
        tipo: formData.tipo,
        valor_investido: valorInvestido,
        valor_atual: valorAtual,
        data_aquisicao: formData.data_aquisicao,
        quantidade: (() => {
          const parsed = parseFloat(formData.quantidade || '1')
          return !isNaN(parsed) && parsed >= 0 ? parsed : 1
        })(),
        cotacao_aquisicao: (() => {
          if (!isComCotacao || !formData.cotacao_aquisicao || formData.cotacao_aquisicao.trim() === '') return null
          const parsed = parseFloat(formData.cotacao_aquisicao)
          return !isNaN(parsed) ? parsed : null
        })(),
        cotacao_atual: (() => {
          if (!isComCotacao || !formData.cotacao_atual || formData.cotacao_atual.trim() === '') return null
          const parsed = parseFloat(formData.cotacao_atual)
          return !isNaN(parsed) ? parsed : null
        })(),
        taxa_juros: taxaJurosValue,
        periodicidade: periodicidadeValue,
        data_proxima_liquidacao: proximaLiquidacaoValue,
        liquidar_em_receitas: isRendimentoFixo ? (formData.liquidar_em_receitas ?? true) : false,
        dividend_yield: isComCotacao && formData.dividend_yield && formData.dividend_yield.trim() !== '' 
          ? (() => {
              const parsed = parseFloat(formData.dividend_yield)
              return !isNaN(parsed) && parsed >= 0 ? parsed : null
            })()
          : null,
        observacoes: formData.observacoes && formData.observacoes.trim() !== '' ? formData.observacoes.trim() : null,
      }

      if (editingInvestimento) {
        const { error } = await supabase
          .from('investimentos')
          .update(investimentoData)
          .eq('id', editingInvestimento.id)

        if (error) throw error
      } else {
        investimentoData.user_id = session?.user?.id
        const { error } = await supabase
          .from('investimentos')
          .insert([investimentoData])

        if (error) throw error
      }

      // Se for investimento com rendimento fixo e liquidar_em_receitas, verificar se precisa liquidar agora
      if (isRendimentoFixo && formData.liquidar_em_receitas && formData.taxa_juros && formData.periodicidade) {
        await verificarELiquidarRendimentos()
      }

      setShowModal(false)
      setEditingInvestimento(null)
      setFormData({
        nome: '',
        tipo: '',
        valor_investido: '',
        valor_atual: '',
        data_aquisicao: new Date().toISOString().split('T')[0],
        quantidade: '1',
        cotacao_aquisicao: '',
        cotacao_atual: '',
        taxa_juros: '',
        periodicidade: '',
        data_proxima_liquidacao: '',
        liquidar_em_receitas: true,
        dividend_yield: '',
        observacoes: '',
      })
      loadInvestimentos()
    } catch (error: any) {
      console.error('Erro ao salvar investimento:', error)
      // Mostrar mensagem de erro mais detalhada
      const errorMessage = error?.message || error?.error_description || 'Erro desconhecido ao salvar investimento'
      alert(`Erro ao salvar investimento: ${errorMessage}`)
    }
  }

  const verificarELiquidarRendimentos = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      
      // Buscar investimentos que precisam ser liquidados hoje
      const { data: investimentosParaLiquidar, error: fetchError } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', session?.user?.id)
        .eq('liquidar_em_receitas', true)
        .not('data_proxima_liquidacao', 'is', null)
        .lte('data_proxima_liquidacao', hoje)

      if (fetchError) throw fetchError

        if (investimentosParaLiquidar && investimentosParaLiquidar.length > 0) {
        for (const investimento of investimentosParaLiquidar) {
          if (investimento.taxa_juros && investimento.periodicidade && investimento.liquidar_em_receitas) {
            // Para investimentos com liquidação automática, o rendimento é sempre calculado sobre o valor investido inicial
            // Não sobre o valor atual acumulado, pois os rendimentos são liquidados separadamente nas receitas
            const rendimento = calcularRendimentoPeriodico(
              investimento.valor_investido, // Sempre usar valor investido inicial
              investimento.taxa_juros,
              investimento.periodicidade
            )

            // Adicionar rendimento às receitas
            const hojeDate = new Date()
            const mesReferencia = hojeDate.getMonth() + 1
            const anoReferencia = hojeDate.getFullYear()

            const receitaData = {
              descricao: `Rendimento: ${investimento.nome} (${investimento.tipo})`,
              valor: Number(rendimento.toFixed(2)),
              data: hoje,
              tipo: 'extra',
              mes_referencia: mesReferencia,
              ano_referencia: anoReferencia,
              user_id: session?.user?.id,
            }

            const { error: receitaError } = await supabase
              .from('receitas')
              .insert([receitaData])

            if (receitaError) {
              console.error('Erro ao adicionar receita de rendimento:', receitaError)
              continue
            }

            // Para investimentos com liquidação automática, o valor_atual não muda
            // Os rendimentos são liquidados separadamente nas receitas
            // O valor_atual permanece igual ao valor_investido (valor inicial)
            // Calcular próxima liquidação a partir de hoje (quando acabamos de liquidar)
            const proximaLiquidacao = calcularProximaLiquidacao(
              hoje, // Usar hoje como base para a próxima liquidação
              investimento.periodicidade
            )

            const { error: updateError } = await supabase
              .from('investimentos')
              .update({
                data_proxima_liquidacao: proximaLiquidacao,
              })
              .eq('id', investimento.id)

            if (updateError) {
              console.error('Erro ao atualizar investimento após liquidação:', updateError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar e liquidar rendimentos:', error)
    }
  }

  const handleEdit = (investimento: Investimento) => {
    setEditingInvestimento(investimento)
    setFormData({
      nome: investimento.nome,
      tipo: investimento.tipo,
      valor_investido: investimento.valor_investido.toString(),
      valor_atual: investimento.valor_atual.toString(),
      data_aquisicao: investimento.data_aquisicao.split('T')[0],
      quantidade: investimento.quantidade.toString(),
      cotacao_aquisicao: investimento.cotacao_aquisicao?.toString() || '',
      cotacao_atual: investimento.cotacao_atual?.toString() || '',
      taxa_juros: investimento.taxa_juros?.toString() || '',
      periodicidade: investimento.periodicidade || '',
      data_proxima_liquidacao: investimento.data_proxima_liquidacao?.split('T')[0] || '',
      liquidar_em_receitas: investimento.liquidar_em_receitas ?? true,
      dividend_yield: investimento.dividend_yield?.toString() || '',
      observacoes: investimento.observacoes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este investimento?')) return

    try {
      const { error } = await supabase.from('investimentos').delete().eq('id', id)
      if (error) throw error
      loadInvestimentos()
    } catch (error) {
      console.error('Erro ao excluir investimento:', error)
      alert('Erro ao excluir investimento')
    }
  }

  const calcularRentabilidade = (valorInvestido: number, valorAtual: number) => {
    if (valorInvestido === 0) return 0
    return ((valorAtual - valorInvestido) / valorInvestido) * 100
  }

  const calcularRentabilidadeAnualEquivalente = (investimento: Investimento): number => {
    // Para investimentos com rendimento fixo, usar a taxa de juros anual diretamente
    if (investimento.taxa_juros && investimento.taxa_juros > 0) {
      return investimento.taxa_juros
    }
    
    // Para investimentos com cotação (Ações, FIIs, ETFs)
    if (tiposComCotacao.includes(investimento.tipo)) {
      let rentabilidadeValorizacao = 0
      
      // Calcular rentabilidade da valorização da cotação (se houver)
      if (investimento.cotacao_aquisicao && investimento.cotacao_atual && investimento.cotacao_aquisicao > 0) {
        const rentabilidadeTotal = ((investimento.cotacao_atual - investimento.cotacao_aquisicao) / investimento.cotacao_aquisicao) * 100
        
        // Calcular tempo decorrido em anos
        const dataAquisicao = new Date(investimento.data_aquisicao)
        const hoje = new Date()
        const diasDecorridos = (hoje.getTime() - dataAquisicao.getTime()) / (1000 * 60 * 60 * 24)
        const anosDecorridos = diasDecorridos / 365
        
        if (anosDecorridos > 0) {
          // Rentabilidade anual equivalente usando juros compostos
          rentabilidadeValorizacao = (Math.pow(1 + rentabilidadeTotal / 100, 1 / anosDecorridos) - 1) * 100
        } else {
          rentabilidadeValorizacao = rentabilidadeTotal
        }
      }
      
      // Se tiver dividend yield declarado, combinar com a rentabilidade de valorização
      // A rentabilidade total de uma ação = valorização + dividend yield
      if (investimento.dividend_yield && investimento.dividend_yield > 0) {
        // Combinar rentabilidade de valorização com dividend yield
        // Assumindo que ambos são anuais
        return rentabilidadeValorizacao + investimento.dividend_yield
      }
      
      // Caso contrário, retornar apenas a valorização
      return rentabilidadeValorizacao
    }
    
    // Para outros investimentos, calcular rentabilidade baseada em valor investido vs valor atual
    if (investimento.valor_investido > 0) {
      const rentabilidadeTotal = calcularRentabilidade(investimento.valor_investido, investimento.valor_atual)
      
      // Calcular tempo decorrido em anos
      const dataAquisicao = new Date(investimento.data_aquisicao)
      const hoje = new Date()
      const diasDecorridos = (hoje.getTime() - dataAquisicao.getTime()) / (1000 * 60 * 60 * 24)
      const anosDecorridos = diasDecorridos / 365
      
      if (anosDecorridos > 0) {
        // Rentabilidade anual equivalente usando juros compostos
        const rentabilidadeAnual = (Math.pow(1 + rentabilidadeTotal / 100, 1 / anosDecorridos) - 1) * 100
        return rentabilidadeAnual
      }
      
      return rentabilidadeTotal
    }
    
    return 0
  }

  const calcularRentabilidadeTotalPonderada = (): number => {
    if (investimentos.length === 0) return 0
    
    let somaPonderada = 0
    let totalPeso = 0
    
    investimentos.forEach((inv) => {
      const rentabilidadeAnual = calcularRentabilidadeAnualEquivalente(inv)
      const peso = inv.valor_investido
      
      somaPonderada += rentabilidadeAnual * peso
      totalPeso += peso
    })
    
    if (totalPeso === 0) return 0
    
    return somaPonderada / totalPeso
  }

  const totalInvestido = investimentos.reduce((sum, inv) => sum + inv.valor_investido, 0)
  const totalAtual = investimentos.reduce((sum, inv) => sum + inv.valor_atual, 0)
  const rentabilidadeTotal = calcularRentabilidadeTotalPonderada()

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
            <h1 className="text-3xl font-bold text-white mb-2">Investimentos</h1>
            <p className="text-gray-400">
              Gerencie seus investimentos e acompanhe sua carteira
            </p>
          </div>
          <button
            onClick={() => {
              setEditingInvestimento(null)
              setFormData({
                nome: '',
                tipo: '',
                valor_investido: '',
                valor_atual: '',
                data_aquisicao: new Date().toISOString().split('T')[0],
                quantidade: '1',
                cotacao_aquisicao: '',
                cotacao_atual: '',
                taxa_juros: '',
                periodicidade: '',
                data_proxima_liquidacao: '',
                liquidar_em_receitas: true,
                dividend_yield: '',
                observacoes: '',
              })
              setShowModal(true)
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Investimento</span>
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Total Investido</p>
            <p className="text-2xl font-bold text-white">R$ {totalInvestido.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Valor Atual</p>
            <p className={`text-2xl font-bold ${totalAtual >= totalInvestido ? 'text-green-400' : 'text-red-400'}`}>
              R$ {totalAtual.toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Rentabilidade Média Anual</p>
            <p className={`text-2xl font-bold ${rentabilidadeTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {rentabilidadeTotal >= 0 ? '+' : ''}{rentabilidadeTotal.toFixed(2)}% a.a.
            </p>
            <p className={`text-sm mt-1 ${totalAtual >= totalInvestido ? 'text-green-400' : 'text-red-400'}`}>
              {totalAtual >= totalInvestido ? '+' : ''}R$ {(totalAtual - totalInvestido).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Média ponderada por valor investido
            </p>
          </div>
        </div>

        {investimentos.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <FiTrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Nenhum investimento cadastrado
            </p>
            <p className="text-gray-500 text-sm">
              Clique em "Adicionar Investimento" para começar
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Valor Investido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Valor Atual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Rentabilidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {investimentos.map((investimento) => {
                    const rentabilidade = calcularRentabilidade(investimento.valor_investido, investimento.valor_atual)
                    
                    // Calcular rentabilidade periódica para investimentos com rendimento fixo
                    let rentabilidadePeriodica: { valor: number; periodo: string } | null = null
                    if (investimento.taxa_juros && investimento.periodicidade) {
                      const taxaJuros = investimento.taxa_juros
                      let valorPeriodico = 0
                      
                      if (investimento.periodicidade === 'mensal') {
                        // Taxa mensal equivalente: (1 + taxa_anual)^(1/12) - 1
                        valorPeriodico = (Math.pow(1 + taxaJuros / 100, 1/12) - 1) * 100
                      } else if (investimento.periodicidade === 'semestral') {
                        // Taxa semestral equivalente: (1 + taxa_anual)^(1/2) - 1
                        valorPeriodico = (Math.pow(1 + taxaJuros / 100, 1/2) - 1) * 100
                      } else if (investimento.periodicidade === 'anual') {
                        valorPeriodico = taxaJuros
                      }
                      
                      rentabilidadePeriodica = {
                        valor: valorPeriodico,
                        periodo: investimento.periodicidade === 'mensal' ? 'mensal' : 
                                 investimento.periodicidade === 'semestral' ? 'semestral' : 'anual'
                      }
                    }
                    
                    // Para investimentos com cotação, verificar se tem dividend yield declarado
                    let dividendYieldInfo: { valor: number; periodo: string } | null = null
                    if (tiposComCotacao.includes(investimento.tipo) && investimento.dividend_yield && investimento.dividend_yield > 0) {
                      dividendYieldInfo = {
                        valor: investimento.dividend_yield,
                        periodo: 'anual'
                      }
                    }
                    
                    return (
                      <tr key={investimento.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                          {investimento.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/40">
                            {investimento.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-white">
                          R$ {investimento.valor_investido.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${
                          investimento.valor_atual >= investimento.valor_investido ? 'text-green-400' : 'text-red-400'
                        }`}>
                          R$ {investimento.valor_atual.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${
                              rentabilidade >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {rentabilidade >= 0 ? '+' : ''}{rentabilidade.toFixed(2)}%
                            </span>
                            {rentabilidadePeriodica && (
                              <span className="text-xs text-gray-400 mt-1">
                                {rentabilidadePeriodica.valor >= 0 ? '+' : ''}{rentabilidadePeriodica.valor.toFixed(2)}% {rentabilidadePeriodica.periodo === 'mensal' ? 'a.m.' : rentabilidadePeriodica.periodo === 'semestral' ? 'a.s.' : 'a.a.'}
                              </span>
                            )}
                            {dividendYieldInfo && (
                              <span className="text-xs text-blue-400 mt-1">
                                DY: {dividendYieldInfo.valor >= 0 ? '+' : ''}{dividendYieldInfo.valor.toFixed(2)}% a.a.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {formatDate(investimento.data_aquisicao)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(investimento)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <FiEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(investimento.id)}
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingInvestimento ? 'Editar Investimento' : 'Novo Investimento'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingInvestimento(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: Petrobras, CDB Banco X..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => {
                        const novoTipo = e.target.value
                        const novoFormData = { ...formData, tipo: novoTipo }
                        
                        // Se mudou para tipo com cotação e tem valores preenchidos, recalcular
                        if (tiposComCotacao.includes(novoTipo) && formData.quantidade && formData.cotacao_aquisicao) {
                          const qtd = parseFloat(formData.quantidade) || 0
                          const cotacao = parseFloat(formData.cotacao_aquisicao) || 0
                          if (!isNaN(qtd) && !isNaN(cotacao) && qtd > 0 && cotacao > 0) {
                            novoFormData.valor_investido = (qtd * cotacao).toFixed(2)
                          }
                          if (formData.cotacao_atual) {
                            const cotacaoAtual = parseFloat(formData.cotacao_atual) || 0
                            if (!isNaN(cotacaoAtual) && cotacaoAtual > 0) {
                              novoFormData.valor_atual = (qtd * cotacaoAtual).toFixed(2)
                            }
                          }
                        }
                        
                        setFormData(novoFormData)
                      }}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione...</option>
                      {tiposInvestimento.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Valor Investido (R$)
                      {tiposComCotacao.includes(formData.tipo) && !editingInvestimento && (
                        <span className="text-xs text-gray-400 ml-2">(calculado automaticamente)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_investido}
                      onChange={(e) => {
                        const novoFormData = { ...formData, valor_investido: e.target.value }
                        // Para investimentos com rendimento fixo e liquidação automática,
                        // o valor_atual é igual ao valor_investido
                        if (tiposComRendimentoFixo.includes(formData.tipo) && formData.taxa_juros && formData.periodicidade) {
                          const valorInvestido = parseFloat(e.target.value) || 0
                          if (formData.liquidar_em_receitas) {
                            novoFormData.valor_atual = valorInvestido.toString()
                          } else {
                            const valorAtual = calcularValorAtual(
                              valorInvestido,
                              parseFloat(formData.taxa_juros),
                              formData.periodicidade,
                              formData.data_aquisicao
                            )
                            novoFormData.valor_atual = valorAtual.toString()
                          }
                        }
                        setFormData(novoFormData)
                      }}
                      required={!tiposComCotacao.includes(formData.tipo)}
                      disabled={tiposComCotacao.includes(formData.tipo) && !editingInvestimento}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder={tiposComCotacao.includes(formData.tipo) ? "Calculado automaticamente" : "0.00"}
                    />
                    {tiposComCotacao.includes(formData.tipo) && !editingInvestimento && (
                      <p className="text-xs text-gray-500 mt-1">
                        Calculado automaticamente: Quantidade × Cotação na Aquisição
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Valor Atual (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_atual}
                      onChange={(e) => setFormData({ ...formData, valor_atual: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder={tiposComCotacao.includes(formData.tipo) ? "Calculado automaticamente" : "0.00 (calculado automaticamente para rendimento fixo)"}
                      disabled={
                        (tiposComRendimentoFixo.includes(formData.tipo) && formData.taxa_juros && formData.periodicidade && formData.liquidar_em_receitas) ||
                        (tiposComCotacao.includes(formData.tipo) && !editingInvestimento)
                      }
                    />
                    {tiposComCotacao.includes(formData.tipo) && !editingInvestimento && (
                      <p className="text-xs text-gray-500 mt-1">
                        Calculado automaticamente: Quantidade × Cotação Atual
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data de Aquisição
                  </label>
                  <input
                    type="date"
                    value={formData.data_aquisicao}
                    onChange={(e) => {
                      const novoFormData = { ...formData, data_aquisicao: e.target.value }
                      // Recalcular data de próxima liquidação se houver periodicidade
                      if (tiposComRendimentoFixo.includes(formData.tipo) && formData.periodicidade) {
                        const proximaLiquidacao = calcularProximaLiquidacao(e.target.value, formData.periodicidade)
                        novoFormData.data_proxima_liquidacao = proximaLiquidacao || ''
                      }
                      // Para investimentos com rendimento fixo e liquidação automática,
                      // o valor_atual permanece igual ao valor_investido
                      if (tiposComRendimentoFixo.includes(formData.tipo) && formData.taxa_juros && formData.periodicidade) {
                        const valorInvestido = parseFloat(formData.valor_investido) || 0
                        if (formData.liquidar_em_receitas) {
                          novoFormData.valor_atual = valorInvestido.toString()
                        } else {
                          const valorAtual = calcularValorAtual(
                            valorInvestido,
                            parseFloat(formData.taxa_juros),
                            formData.periodicidade,
                            e.target.value
                          )
                          novoFormData.valor_atual = valorAtual.toString()
                        }
                      }
                      setFormData(novoFormData)
                    }}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Campos específicos para investimentos com cotação (Ações, FIIs, etc) */}
                {tiposComCotacao.includes(formData.tipo) && (
                  <div className="space-y-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.quantidade}
                          onChange={(e) => {
                            const quantidade = e.target.value
                            const novoFormData = { ...formData, quantidade }
                            
                            // Calcular valor investido: Quantidade × Cotação na Aquisição
                            if (formData.cotacao_aquisicao && quantidade) {
                              const qtd = parseFloat(quantidade) || 0
                              const cotacao = parseFloat(formData.cotacao_aquisicao) || 0
                              if (!isNaN(qtd) && !isNaN(cotacao) && qtd > 0 && cotacao > 0) {
                                novoFormData.valor_investido = (qtd * cotacao).toFixed(2)
                              }
                            }
                            
                            // Calcular valor atual: Quantidade × Cotação Atual
                            if (formData.cotacao_atual && quantidade) {
                              const qtd = parseFloat(quantidade) || 0
                              const cotacao = parseFloat(formData.cotacao_atual) || 0
                              if (!isNaN(qtd) && !isNaN(cotacao) && qtd > 0 && cotacao > 0) {
                                novoFormData.valor_atual = (qtd * cotacao).toFixed(2)
                              }
                            }
                            
                            setFormData(novoFormData)
                          }}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Cotação na Aquisição (R$)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.cotacao_aquisicao}
                          onChange={(e) => {
                            const cotacaoAquisicao = e.target.value
                            const novoFormData = { ...formData, cotacao_aquisicao: cotacaoAquisicao }
                            
                            // Calcular valor investido: Quantidade × Cotação na Aquisição
                            if (formData.quantidade && cotacaoAquisicao) {
                              const qtd = parseFloat(formData.quantidade) || 0
                              const cotacao = parseFloat(cotacaoAquisicao) || 0
                              if (!isNaN(qtd) && !isNaN(cotacao) && qtd > 0 && cotacao > 0) {
                                novoFormData.valor_investido = (qtd * cotacao).toFixed(2)
                              }
                            }
                            
                            setFormData(novoFormData)
                          }}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="0.0000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Cotação Atual (R$)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.cotacao_atual}
                          onChange={(e) => {
                            const cotacaoAtual = e.target.value
                            const novoFormData = { ...formData, cotacao_atual: cotacaoAtual }
                            
                            // Calcular valor atual: Quantidade × Cotação Atual
                            if (formData.quantidade && cotacaoAtual) {
                              const qtd = parseFloat(formData.quantidade) || 0
                              const cotacao = parseFloat(cotacaoAtual) || 0
                              if (!isNaN(qtd) && !isNaN(cotacao) && qtd > 0 && cotacao > 0) {
                                novoFormData.valor_atual = (qtd * cotacao).toFixed(2)
                              }
                            }
                            
                            setFormData(novoFormData)
                          }}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="0.0000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dividend Yield Anual (%) <span className="text-xs text-gray-400">(opcional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.dividend_yield}
                        onChange={(e) => setFormData({ ...formData, dividend_yield: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: 8.5 para 8.5% a.a. (rentabilidade esperada de dividendos)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Informe a rentabilidade anual esperada de dividendos. Isso será usado no cálculo da rentabilidade média da carteira.
                      </p>
                    </div>
                  </div>
                )}

                {/* Campos específicos para investimentos com rendimento fixo (CDB, LCI/LCA, etc) */}
                {tiposComRendimentoFixo.includes(formData.tipo) && (
                  <div className="space-y-4 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Taxa de Juros Anual (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.taxa_juros}
                          onChange={(e) => {
                            const novoFormData = { ...formData, taxa_juros: e.target.value }
                            // Recalcular valor atual e data de próxima liquidação
                            if (formData.periodicidade && formData.valor_investido) {
                              const valorInvestido = parseFloat(formData.valor_investido) || 0
                              const taxaJuros = parseFloat(e.target.value) || 0
                              if (taxaJuros > 0) {
                                if (formData.liquidar_em_receitas) {
                                  // Se liquidar automaticamente, valor_atual = valor_investido
                                  novoFormData.valor_atual = valorInvestido.toString()
                                } else {
                                  // Se não liquidar, calcular com juros compostos
                                  const valorAtual = calcularValorAtual(
                                    valorInvestido,
                                    taxaJuros,
                                    formData.periodicidade,
                                    formData.data_aquisicao
                                  )
                                  novoFormData.valor_atual = valorAtual.toString()
                                }
                                const proximaLiquidacao = calcularProximaLiquidacao(formData.data_aquisicao, formData.periodicidade)
                                novoFormData.data_proxima_liquidacao = proximaLiquidacao || ''
                              }
                            }
                            setFormData(novoFormData)
                          }}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Ex: 12.5 para 12.5% ao ano"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Periodicidade de Liquidação
                        </label>
                        <select
                          value={formData.periodicidade}
                          onChange={(e) => {
                            const periodicidade = e.target.value as 'mensal' | 'semestral' | 'anual' | ''
                            const novoFormData = { ...formData, periodicidade }
                            // Recalcular valor atual e data de próxima liquidação
                            if (periodicidade && formData.valor_investido && formData.taxa_juros) {
                              const valorInvestido = parseFloat(formData.valor_investido) || 0
                              const taxaJuros = parseFloat(formData.taxa_juros) || 0
                              if (taxaJuros > 0) {
                                if (formData.liquidar_em_receitas) {
                                  // Se liquidar automaticamente, valor_atual = valor_investido
                                  novoFormData.valor_atual = valorInvestido.toString()
                                } else {
                                  // Se não liquidar, calcular com juros compostos
                                  const valorAtual = calcularValorAtual(
                                    valorInvestido,
                                    taxaJuros,
                                    periodicidade,
                                    formData.data_aquisicao
                                  )
                                  novoFormData.valor_atual = valorAtual.toString()
                                }
                                const proximaLiquidacao = calcularProximaLiquidacao(formData.data_aquisicao, periodicidade)
                                novoFormData.data_proxima_liquidacao = proximaLiquidacao || ''
                              }
                            }
                            setFormData(novoFormData)
                          }}
                          required
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Selecione...</option>
                          <option value="mensal">Mensal</option>
                          <option value="semestral">Semestral</option>
                          <option value="anual">Anual</option>
                        </select>
                      </div>
                    </div>
                    {formData.taxa_juros && formData.periodicidade && formData.valor_investido && (
                      <div className="p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-300 mb-1">
                          <span className="font-medium">Rendimento por período:</span>{' '}
                          R$ {calcularRendimentoPeriodico(
                            parseFloat(formData.valor_investido),
                            parseFloat(formData.taxa_juros),
                            formData.periodicidade
                          ).toFixed(2)}
                        </p>
                        {formData.data_proxima_liquidacao && (
                          <p className="text-sm text-gray-300">
                            <span className="font-medium">Próxima liquidação:</span>{' '}
                            {formatDate(formData.data_proxima_liquidacao)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="liquidar_em_receitas"
                        checked={formData.liquidar_em_receitas}
                        onChange={(e) => setFormData({ ...formData, liquidar_em_receitas: e.target.checked })}
                        className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                      />
                      <label htmlFor="liquidar_em_receitas" className="text-sm text-gray-300">
                        Liquidar rendimento automaticamente nas receitas
                      </label>
                    </div>
                    {formData.data_proxima_liquidacao && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Data da Próxima Liquidação
                        </label>
                        <input
                          type="date"
                          value={formData.data_proxima_liquidacao}
                          onChange={(e) => setFormData({ ...formData, data_proxima_liquidacao: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Data em que o próximo rendimento será liquidado (calculada automaticamente)
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Observações adicionais..."
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingInvestimento(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    {editingInvestimento ? 'Atualizar' : 'Salvar'}
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
