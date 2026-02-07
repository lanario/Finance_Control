'use client'

import { useEffect, useState, useCallback } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { formatDate, formatarMoeda } from '@/lib/utils'
import { FiPlus, FiEdit, FiTrash2, FiCreditCard, FiChevronDown, FiChevronUp, FiX, FiCheck, FiUpload, FiFileText } from 'react-icons/fi'

// Importação dinâmica do pdf-extractor apenas quando necessário (evita problemas no build)
type TransacaoExtraida = {
  descricao: string
  valor: number
  data: string
  categoria?: string
}

interface Cartao {
  id: string
  nome: string
  bandeira: string
  limite: number
  fechamento: number
  vencimento: number
  cor: string
  user_id: string
}

interface Compra {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string
  metodo_pagamento: string
  cartao_id: string | null
  parcelada?: boolean
  total_parcelas?: number
}

interface Parcela {
  id: string
  compra_id: string | null
  cartao_id: string | null
  descricao: string
  valor: number
  numero_parcela: number
  total_parcelas: number
  data_vencimento: string
  categoria: string
  paga: boolean
  data_pagamento: string | null
  user_id: string
}

interface Fatura {
  mes: number
  ano: number
  mesNome: string
  dataFechamento: string
  dataVencimento: string
  compras: Compra[]
  parcelas: Parcela[]
  total: number
  paga: boolean
  dataPagamento: string | null
}

interface FaturaPaga {
  id: string
  cartao_id: string
  mes_referencia: number
  ano_referencia: number
  data_pagamento: string
  total_pago: number
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

export default function CartoesPage() {
  const { session } = useAuth()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [comprasPorCartao, setComprasPorCartao] = useState<{ [key: string]: Compra[] }>({})
  const [parcelasPorCartao, setParcelasPorCartao] = useState<{ [key: string]: Parcela[] }>({})
  const [faturasPorCartao, setFaturasPorCartao] = useState<{ [key: string]: Fatura[] }>({})
  const [faturasPagas, setFaturasPagas] = useState<{ [key: string]: FaturaPaga[] }>({})
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  // Mapeamento de compras recorrentes: compra_id -> {mes, ano}
  const [comprasRecorrentesMap, setComprasRecorrentesMap] = useState<{ [key: string]: { mes: number; ano: number } }>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showParcelaModal, setShowParcelaModal] = useState(false)
  const [showCompraModal, setShowCompraModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfCartaoId, setPdfCartaoId] = useState<string | null>(null)
  const [transacoesExtraidas, setTransacoesExtraidas] = useState<TransacaoExtraida[]>([])
  const [processandoPdf, setProcessandoPdf] = useState(false)
  const [mesReferencia, setMesReferencia] = useState<number>(new Date().getMonth() + 1)
  const [anoReferencia, setAnoReferencia] = useState<number>(new Date().getFullYear())
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [formDataCategoria, setFormDataCategoria] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
  })
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null)
  const [editingParcela, setEditingParcela] = useState<Parcela | null>(null)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [cartaoExpanded, setCartaoExpanded] = useState<string | null>(null)
  const [parcelasCartaoExpanded, setParcelasCartaoExpanded] = useState<string | null>(null)
  // Estado para controlar quais faturas estão expandidas: { cartaoId-faturaKey: true }
  const [faturasExpandidas, setFaturasExpandidas] = useState<{ [key: string]: boolean }>({})
  const [parcelaFormData, setParcelaFormData] = useState({
    cartao_id: '',
    descricao: '',
    valor: '',
    total_parcelas: '1',
    numero_parcela: '1',
    data_vencimento: '',
    categoria: '',
  })
  const [compraFormData, setCompraFormData] = useState({
    cartao_id: '',
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    categoria: '',
    metodo_pagamento: 'cartao',
  })
  const [formData, setFormData] = useState({
    nome: '',
    bandeira: '',
    limite: '',
    fechamento: '',
    vencimento: '',
    cor: '#1e3a5f',
  })

  useEffect(() => {
    if (session) {
      loadCartoes()
      loadTiposGastos()
    }
  }, [session])

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

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userId = session?.user?.id
      if (!userId) return

      const { data: novaCategoria, error } = await supabase
        .from('tipos_gastos')
        .insert({
          user_id: userId,
          nome: formDataCategoria.nome,
          descricao: formDataCategoria.descricao || null,
          cor: formDataCategoria.cor,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de categorias
      await loadTiposGastos()

      // Selecionar a categoria recém-criada nos formulários
      setParcelaFormData({ ...parcelaFormData, categoria: novaCategoria.nome })
      setCompraFormData({ ...compraFormData, categoria: novaCategoria.nome })
      
      // Se estiver no modal de PDF, atualizar a categoria nas transações que não têm categoria
      if (showPdfModal && transacoesExtraidas.length > 0) {
        const transacoesAtualizadas = transacoesExtraidas.map(t => 
          !t.categoria ? { ...t, categoria: novaCategoria.nome } : t
        )
        setTransacoesExtraidas(transacoesAtualizadas)
      }

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
        alert('Já existe uma categoria com este nome.')
      } else {
        alert('Erro ao criar categoria')
      }
    }
  }

  useEffect(() => {
    if (cartoes.length > 0 && session) {
      loadFaturasPagas()
      loadParcelasPorCartao()
      loadComprasPorCartao()
      loadComprasRecorrentes()
    }
  }, [cartoes, session])

  useEffect(() => {
    if (cartoes.length > 0 && (Object.keys(parcelasPorCartao).length > 0 || Object.keys(comprasPorCartao).length > 0)) {
      calcularFaturas()
    }
  }, [parcelasPorCartao, comprasPorCartao, faturasPagas, cartoes, comprasRecorrentesMap])

  const loadCartoes = async () => {
    try {
      const { data, error } = await supabase
        .from('cartoes')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('nome')

      if (error) throw error
      setCartoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFaturasPagas = async () => {
    try {
      const userId = session?.user?.id
      const { data: faturasPagasData, error } = await supabase
        .from('faturas_pagas')
        .select('*')
        .eq('user_id', userId)
        .order('data_pagamento', { ascending: false })

      if (error) throw error

      // Agrupar faturas pagas por cartão
      const faturasPagasMap: { [key: string]: FaturaPaga[] } = {}
      faturasPagasData?.forEach((fatura) => {
        if (!faturasPagasMap[fatura.cartao_id]) {
          faturasPagasMap[fatura.cartao_id] = []
        }
        faturasPagasMap[fatura.cartao_id].push(fatura)
      })

      setFaturasPagas(faturasPagasMap)
    } catch (error) {
      console.error('Erro ao carregar faturas pagas:', error)
    }
  }

  const getUltimoFechamento = (cartaoId: string): Date | null => {
    const faturasPagasDoCartao = faturasPagas[cartaoId] || []
    if (faturasPagasDoCartao.length === 0) return null

    // Ordenar por data de pagamento (mais recente primeiro)
    const maisRecente = [...faturasPagasDoCartao].sort((a, b) => {
      return new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()
    })[0]

    // Retornar a data de pagamento como último fechamento
    return new Date(maisRecente.data_pagamento)
  }

  const calcularPeriodoFatura = (dataCompra: Date, cartao: Cartao) => {
    const dia = dataCompra.getDate()
    const mes = dataCompra.getMonth()
    const ano = dataCompra.getFullYear()

    // Verificar se existe um fechamento antecipado (fatura paga)
    const ultimoFechamento = getUltimoFechamento(cartao.id)
    
    if (ultimoFechamento) {
      // Se a compra foi feita APÓS o último fechamento antecipado, 
      // ela pertence à próxima fatura após esse fechamento
      if (dataCompra > ultimoFechamento) {
        const mesUltimoFechamento = ultimoFechamento.getMonth()
        const anoUltimoFechamento = ultimoFechamento.getFullYear()
        
        // Próxima fatura após o último fechamento (mês seguinte ao pagamento)
        let mesFatura = mesUltimoFechamento + 1
        let anoFatura = anoUltimoFechamento
        if (mesFatura > 11) {
          mesFatura = 0
          anoFatura = anoUltimoFechamento + 1
        }
        
        // Se já passou o próximo fechamento programado após o pagamento,
        // usar a lógica normal a partir da data da compra
        const proximoFechamentoProgramado = new Date(anoFatura, mesFatura, cartao.fechamento)
        
        if (dataCompra < proximoFechamentoProgramado) {
          // Compra está na fatura após o último fechamento antecipado
          return { mes: mesFatura, ano: anoFatura }
        }
        // Se passou, continua com a lógica normal abaixo
      } else {
        // Compra foi antes do último fechamento, usar lógica normal
        // (deve estar em uma fatura anterior)
      }
    }

    // Lógica de fatura baseada no dia de fechamento do cartão
    // Se a compra for feita ANTES do dia de fechamento: fatura do mês atual
    // Se a compra for feita NO DIA ou DEPOIS do dia de fechamento: fatura do próximo mês
    let mesFatura = mes
    let anoFatura = ano

    if (dia >= cartao.fechamento) {
      // Compra no dia de fechamento ou depois → fatura do próximo mês
      mesFatura = mes + 1
      if (mesFatura > 11) {
        mesFatura = 0
        anoFatura = ano + 1
      }
    }
    // Se dia < cartao.fechamento, a compra fica na fatura do mês atual (mesFatura = mes)

    return { mes: mesFatura, ano: anoFatura }
  }

  const calcularDataFechamento = (mes: number, ano: number, diaFechamento: number) => {
    // Último dia do mês para garantir que não ultrapasse
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    const dia = Math.min(diaFechamento, ultimoDia)
    return new Date(ano, mes, dia)
  }

  const calcularDataVencimento = (mesFechamento: number, anoFechamento: number, diaVencimento: number) => {
    // Vencimento é sempre no mês seguinte ao fechamento
    let mesVencimento = mesFechamento + 1
    let anoVencimento = anoFechamento
    if (mesVencimento > 11) {
      mesVencimento = 0
      anoVencimento = anoFechamento + 1
    }
    const ultimoDia = new Date(anoVencimento, mesVencimento + 1, 0).getDate()
    const dia = Math.min(diaVencimento, ultimoDia)
    return new Date(anoVencimento, mesVencimento, dia)
  }

  const loadParcelasPorCartao = async () => {
    try {
      const userId = session?.user?.id
      const parcelasPorCartaoMap: { [key: string]: Parcela[] } = {}

      // Buscar todas as parcelas (pagas e não pagas)
      const { data: parcelas, error } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .not('cartao_id', 'is', null)
        .order('data_vencimento', { ascending: true })

      if (error) throw error

      // Agrupar parcelas por cartão
      parcelas?.forEach((parcela) => {
        if (parcela.cartao_id) {
          if (!parcelasPorCartaoMap[parcela.cartao_id]) {
            parcelasPorCartaoMap[parcela.cartao_id] = []
          }
          parcelasPorCartaoMap[parcela.cartao_id].push(parcela)
        }
      })

      setParcelasPorCartao(parcelasPorCartaoMap)
    } catch (error) {
      console.error('Erro ao carregar parcelas por cartão:', error)
    }
  }

  const loadComprasRecorrentes = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      // Buscar todas as compras recorrentes mensais
      const { data: comprasRecorrentesMensais, error } = await supabase
        .from('compras_recorrentes_mensais')
        .select('compra_id, mes, ano')
        .eq('user_id', userId)

      if (error) throw error

      // Criar mapeamento: compra_id -> {mes, ano}
      const map: { [key: string]: { mes: number; ano: number } } = {}
      comprasRecorrentesMensais?.forEach((item) => {
        map[item.compra_id] = { mes: item.mes, ano: item.ano }
      })

      setComprasRecorrentesMap(map)
    } catch (error) {
      console.error('Erro ao carregar compras recorrentes:', error)
    }
  }

  const loadComprasPorCartao = async () => {
    try {
      const userId = session?.user?.id
      const comprasPorCartaoMap: { [key: string]: Compra[] } = {}

      // Buscar todas as compras que são de cartão de crédito e NÃO são parceladas
      // (compras parceladas são exibidas como parcelas)
      const { data: compras, error } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .eq('metodo_pagamento', 'cartao')
        .not('cartao_id', 'is', null)
        .order('data', { ascending: false })

      if (error) throw error

      // Filtrar apenas compras não parceladas (compras parceladas são representadas pelas parcelas)
      // Excluir compras onde parcelada = true OU total_parcelas > 1
      const comprasNaoParceladas = compras?.filter((compra) => {
        const isParcelada = compra.parcelada === true || compra.total_parcelas > 1
        return !isParcelada
      }) || []

      // Agrupar compras por cartão
      comprasNaoParceladas.forEach((compra) => {
        if (compra.cartao_id) {
          if (!comprasPorCartaoMap[compra.cartao_id]) {
            comprasPorCartaoMap[compra.cartao_id] = []
          }
          comprasPorCartaoMap[compra.cartao_id].push(compra)
        }
      })

      setComprasPorCartao(comprasPorCartaoMap)
    } catch (error) {
      console.error('Erro ao carregar compras por cartão:', error)
    }
  }

  /**
   * Calcula o limite disponível do cartão, considerando:
   * - Todas as parcelas não pagas (consomem limite)
   * - Todas as compras não recorrentes (consomem limite)
   * - Apenas compras recorrentes do mês atual ou meses já passados (consomem limite)
   * - Compras recorrentes de meses futuros NÃO consomem limite
   */
  const calcularLimiteDisponivel = (cartaoId: string, limite: number): number => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1 // 1-12
    const anoAtual = hoje.getFullYear()

    // Buscar todas as parcelas não pagas do cartão
    const parcelasDoCartao = (parcelasPorCartao[cartaoId] || []).filter(p => !p.paga)
    const totalParcelas = parcelasDoCartao.reduce((sum, p) => sum + p.valor, 0)

    // Buscar todas as compras do cartão
    const comprasDoCartao = comprasPorCartao[cartaoId] || []
    
    // Calcular total de compras que consomem limite
    let totalCompras = 0
    comprasDoCartao.forEach((compra) => {
      // Verificar se é uma compra recorrente
      const compraRecorrente = comprasRecorrentesMap[compra.id]
      
      if (compraRecorrente) {
        // É uma compra recorrente: só consome limite se for do mês atual ou meses passados
        const mesRecorrente = compraRecorrente.mes
        const anoRecorrente = compraRecorrente.ano
        
        // Comparar ano e mês
        if (anoRecorrente < anoAtual || (anoRecorrente === anoAtual && mesRecorrente <= mesAtual)) {
          // Mês atual ou passado: consome limite
          totalCompras += compra.valor
        }
        // Mês futuro: não consome limite (não adiciona ao total)
      } else {
        // Não é compra recorrente: sempre consome limite
        totalCompras += compra.valor
      }
    })

    const totalGasto = totalParcelas + totalCompras
    return limite - totalGasto
  }

  const calcularFaturas = (comprasMap?: { [key: string]: Compra[] }) => {
    try {
      const comprasPorCartaoMap = comprasMap || comprasPorCartao
      const faturasMap: { [key: string]: Fatura[] } = {}

      cartoes.forEach((cartao) => {
        const comprasDoCartao = comprasPorCartaoMap[cartao.id] || []
        // Para cálculo de faturas, usar apenas parcelas não pagas
        const parcelasDoCartao = (parcelasPorCartao[cartao.id] || []).filter(p => !p.paga)
        const faturasMapTemp: { [key: string]: Fatura } = {}

        // Verificar quais faturas foram pagas
        const faturasPagasDoCartao = faturasPagas[cartao.id] || []
        const faturasPagasMap: { [key: string]: FaturaPaga } = {}
        faturasPagasDoCartao.forEach((faturaPaga) => {
          const key = `${faturaPaga.ano_referencia}-${String(faturaPaga.mes_referencia).padStart(2, '0')}`
          faturasPagasMap[key] = faturaPaga
        })

        // Adicionar compras às faturas
        comprasDoCartao.forEach((compra) => {
          const dataCompra = new Date(compra.data)
          const { mes, ano } = calcularPeriodoFatura(dataCompra, cartao)

          const key = `${ano}-${String(mes + 1).padStart(2, '0')}`
          if (!faturasMapTemp[key]) {
            // Data de fechamento é no mês da fatura
            const dataFechamento = calcularDataFechamento(mes, ano, cartao.fechamento)
            // Data de vencimento é no mês seguinte ao fechamento
            const dataVencimento = calcularDataVencimento(mes, ano, cartao.vencimento)

            // Verificar se a fatura foi paga
            const faturaPaga = faturasPagasMap[key]
            const paga = !!faturaPaga
            const dataPagamento = faturaPaga ? faturaPaga.data_pagamento : null

            faturasMapTemp[key] = {
              mes,
              ano,
              mesNome: mesesNomes[mes],
              dataFechamento: dataFechamento.toISOString().split('T')[0],
              dataVencimento: dataVencimento.toISOString().split('T')[0],
              compras: [],
              parcelas: [],
              total: 0,
              paga,
              dataPagamento,
            }
          }

          faturasMapTemp[key].compras.push(compra)
          faturasMapTemp[key].total += compra.valor
        })

        // Adicionar parcelas às faturas baseado na data de vencimento
        parcelasDoCartao.forEach((parcela) => {
          const dataVencimento = new Date(parcela.data_vencimento)
          const mes = dataVencimento.getMonth()
          const ano = dataVencimento.getFullYear()

          const key = `${ano}-${String(mes + 1).padStart(2, '0')}`
          if (!faturasMapTemp[key]) {
            const dataFechamento = calcularDataFechamento(mes, ano, cartao.fechamento)
            const dataVencFatura = calcularDataVencimento(mes, ano, cartao.vencimento)

            const faturaPaga = faturasPagasMap[key]
            const paga = !!faturaPaga
            const dataPagamento = faturaPaga ? faturaPaga.data_pagamento : null

            faturasMapTemp[key] = {
              mes,
              ano,
              mesNome: mesesNomes[mes],
              dataFechamento: dataFechamento.toISOString().split('T')[0],
              dataVencimento: dataVencFatura.toISOString().split('T')[0],
              compras: [],
              parcelas: [],
              total: 0,
              paga,
              dataPagamento,
            }
          }

          faturasMapTemp[key].parcelas.push(parcela)
          faturasMapTemp[key].total += parcela.valor
        })

        // Ordenar compras dentro de cada fatura por data (mais recente primeiro)
        Object.values(faturasMapTemp).forEach((fatura) => {
          fatura.compras.sort((a, b) => {
            const dataA = new Date(a.data).getTime()
            const dataB = new Date(b.data).getTime()
            return dataB - dataA // Mais recente primeiro
          })
          // Ordenar parcelas por data de vencimento
          fatura.parcelas.sort((a, b) => {
            const dataA = new Date(a.data_vencimento).getTime()
            const dataB = new Date(b.data_vencimento).getTime()
            return dataA - dataB // Mais antiga primeiro
          })
        })

        // Converter para array e ordenar faturas:
        // 1. Não pagas primeiro, ordenadas por data de vencimento (mais próximo primeiro)
        // 2. Pagas no final, também ordenadas por data de vencimento
        const faturasArray = Object.values(faturasMapTemp).sort((a, b) => {
          // Primeiro, separar pagas e não pagas
          const aPaga = a.paga ? 1 : 0
          const bPaga = b.paga ? 1 : 0
          
          if (aPaga !== bPaga) {
            return aPaga - bPaga // Não pagas (0) vêm antes de pagas (1)
          }
          
          // Se ambas têm o mesmo status, ordenar por data de vencimento
          const dataVencA = new Date(a.dataVencimento).getTime()
          const dataVencB = new Date(b.dataVencimento).getTime()
          return dataVencA - dataVencB // Mais próximo primeiro
        })

        faturasMap[cartao.id] = faturasArray
      })

      setFaturasPorCartao(faturasMap)
    } catch (error) {
      console.error('Erro ao calcular faturas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const cartaoData = {
        nome: formData.nome,
        bandeira: formData.bandeira,
        limite: parseFloat(formData.limite),
        fechamento: parseInt(formData.fechamento),
        vencimento: parseInt(formData.vencimento),
        cor: formData.cor,
        user_id: session?.user?.id,
      }

      if (editingCartao) {
        const { error } = await supabase
          .from('cartoes')
          .update(cartaoData)
          .eq('id', editingCartao.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('cartoes').insert([cartaoData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingCartao(null)
      setFormData({
        nome: '',
        bandeira: '',
        limite: '',
        fechamento: '',
        vencimento: '',
        cor: '#1e3a5f',
      })
      loadCartoes()
    } catch (error) {
      console.error('Erro ao salvar cartão:', error)
      alert('Erro ao salvar cartão')
    }
  }

  const handleEdit = (cartao: Cartao) => {
    setEditingCartao(cartao)
    setFormData({
      nome: cartao.nome,
      bandeira: cartao.bandeira,
      limite: cartao.limite.toString(),
      fechamento: cartao.fechamento.toString(),
      vencimento: cartao.vencimento.toString(),
      cor: cartao.cor || '#1e3a5f',
    })
    setShowModal(true)
  }

  const handleMarcarFaturaPaga = async (cartaoId: string, mes: number, ano: number, total: number) => {
    try {
      const dataPagamento = new Date().toISOString().split('T')[0]
      
      const { error } = await supabase
        .from('faturas_pagas')
        .upsert({
          cartao_id: cartaoId,
          user_id: session?.user?.id,
          mes_referencia: mes + 1, // mes é 0-indexed, banco espera 1-12
          ano_referencia: ano,
          data_pagamento: dataPagamento,
          total_pago: total,
        }, {
          onConflict: 'cartao_id,mes_referencia,ano_referencia'
        })

      if (error) throw error

      // Recarregar dados
      await loadFaturasPagas()
      await loadComprasPorCartao()
    } catch (error) {
      console.error('Erro ao marcar fatura como paga:', error)
      alert('Erro ao marcar fatura como paga')
    }
  }

  const handleDesmarcarFaturaPaga = async (cartaoId: string, mes: number, ano: number) => {
    if (!confirm('Deseja desmarcar esta fatura como paga? As compras serão redistribuídas.')) return

    try {
      const { error } = await supabase
        .from('faturas_pagas')
        .delete()
        .eq('cartao_id', cartaoId)
        .eq('mes_referencia', mes + 1)
        .eq('ano_referencia', ano)

      if (error) throw error

      // Recarregar dados
      await loadFaturasPagas()
      await loadComprasPorCartao()
      await loadParcelasPorCartao()
    } catch (error) {
      console.error('Erro ao desmarcar fatura:', error)
      alert('Erro ao desmarcar fatura')
    }
  }

  const handleMarcarParcelaPaga = async (parcelaId: string) => {
    try {
      const dataPagamento = new Date().toISOString().split('T')[0]
      
      const { error } = await supabase
        .from('parcelas')
        .update({
          paga: true,
          data_pagamento: dataPagamento,
        })
        .eq('id', parcelaId)

      if (error) throw error

      // Recarregar dados
      await loadParcelasPorCartao()
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error)
      alert('Erro ao marcar parcela como paga')
    }
  }

  const handleDesmarcarParcelaPaga = async (parcelaId: string) => {
    try {
      const { error } = await supabase
        .from('parcelas')
        .update({
          paga: false,
          data_pagamento: null,
        })
        .eq('id', parcelaId)

      if (error) throw error

      // Recarregar dados
      await loadParcelasPorCartao()
    } catch (error) {
      console.error('Erro ao desmarcar parcela:', error)
      alert('Erro ao desmarcar parcela')
    }
  }

  const calcularDataVencimentoParcelaFutura = (dataInicial: Date, mesesAdicionar: number, cartaoId: string | null) => {
    if (!cartaoId) {
      const data = new Date(dataInicial)
      data.setMonth(data.getMonth() + mesesAdicionar)
      return data
    }

    const cartao = cartoes.find(c => c.id === cartaoId)
    if (!cartao) {
      const data = new Date(dataInicial)
      data.setMonth(data.getMonth() + mesesAdicionar)
      return data
    }

    const dataBase = new Date(dataInicial)
    let mesVencimento = dataBase.getMonth() + mesesAdicionar
    let anoVencimento = dataBase.getFullYear()

    // Ajustar mês e ano se necessário
    while (mesVencimento > 11) {
      mesVencimento -= 12
      anoVencimento += 1
    }

    const ultimoDia = new Date(anoVencimento, mesVencimento + 1, 0).getDate()
    const diaVencimentoCartao = cartao.vencimento ?? 15
    const diaVencimento = Math.min(diaVencimentoCartao, ultimoDia)

    return new Date(anoVencimento, mesVencimento, diaVencimento)
  }

  const handleSubmitParcela = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const numeroParcela = parseInt(parcelaFormData.numero_parcela)
      const totalParcelas = parseInt(parcelaFormData.total_parcelas)
      const valorParcela = parseFloat(parcelaFormData.valor)

      if (editingParcela) {
        // Atualizar parcela existente
        const parcelaData: any = {
          cartao_id: parcelaFormData.cartao_id,
          descricao: parcelaFormData.descricao,
          valor: valorParcela,
          numero_parcela: numeroParcela,
          total_parcelas: totalParcelas,
          data_vencimento: parcelaFormData.data_vencimento,
          categoria: parcelaFormData.categoria,
        }

        const { error } = await supabase
          .from('parcelas')
          .update(parcelaData)
          .eq('id', editingParcela.id)

        if (error) throw error
      } else {
        // Criar novas parcelas (parcela atual + parcelas futuras)
        if (!parcelaFormData.data_vencimento) {
          alert('Por favor, informe a data de vencimento da primeira parcela')
          return
        }

        const dataInicial = new Date(parcelaFormData.data_vencimento)
        if (isNaN(dataInicial.getTime())) {
          alert('Data de vencimento inválida')
          return
        }

        const parcelasParaCriar = []

        // Criar parcelas do numero_parcela atual até o total_parcelas
        for (let i = numeroParcela; i <= totalParcelas; i++) {
          // Calcular quantos meses adicionar à data inicial (0 para a primeira, 1 para a segunda, etc)
          const mesesAdicionar = i - numeroParcela
          
          const dataVencimento = calcularDataVencimentoParcelaFutura(dataInicial, mesesAdicionar, parcelaFormData.cartao_id)
          
          parcelasParaCriar.push({
            user_id: session?.user?.id,
            compra_id: null, // Parcela individual sem compra associada
            cartao_id: parcelaFormData.cartao_id,
            descricao: totalParcelas > 1 ? `${parcelaFormData.descricao} - Parcela ${i}/${totalParcelas}` : parcelaFormData.descricao,
            valor: valorParcela,
            numero_parcela: i,
            total_parcelas: totalParcelas,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            categoria: parcelaFormData.categoria,
            paga: false,
          })
        }

        if (parcelasParaCriar.length === 0) {
          alert('Erro: Nenhuma parcela para criar')
          return
        }

        const { data, error } = await supabase
          .from('parcelas')
          .insert(parcelasParaCriar)
          .select()

        if (error) {
          console.error('Erro ao inserir parcelas:', error)
          alert(`Erro ao criar parcelas: ${error.message}`)
          throw error
        }

        console.log(`Parcelas criadas com sucesso: ${parcelasParaCriar.length} parcelas`)
      }

      setShowParcelaModal(false)
      setEditingParcela(null)
      setParcelaFormData({
        cartao_id: '',
        descricao: '',
        valor: '',
        total_parcelas: '1',
        numero_parcela: '1',
        data_vencimento: '',
        categoria: '',
      })
      await loadParcelasPorCartao()
    } catch (error) {
      console.error('Erro ao salvar parcela:', error)
      alert('Erro ao salvar parcela')
    }
  }

  const handleEditParcela = (parcela: Parcela) => {
    setEditingParcela(parcela)
    setParcelaFormData({
      cartao_id: parcela.cartao_id || '',
      descricao: parcela.descricao,
      valor: parcela.valor.toString(),
      total_parcelas: parcela.total_parcelas.toString(),
      numero_parcela: parcela.numero_parcela.toString(),
      data_vencimento: parcela.data_vencimento.split('T')[0],
      categoria: parcela.categoria,
    })
    setShowParcelaModal(true)
  }

  const handleDeleteParcela = async (parcelaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta parcela?')) return

    try {
      const { error } = await supabase
        .from('parcelas')
        .delete()
        .eq('id', parcelaId)

      if (error) throw error

      await loadParcelasPorCartao()
    } catch (error) {
      console.error('Erro ao excluir parcela:', error)
      alert('Erro ao excluir parcela')
    }
  }

  const handleEditCompra = (compra: Compra) => {
    setEditingCompra(compra)
    setCompraFormData({
      cartao_id: compra.cartao_id || '',
      descricao: compra.descricao,
      valor: compra.valor.toString(),
      data: compra.data.split('T')[0],
      categoria: compra.categoria,
      metodo_pagamento: compra.metodo_pagamento || 'cartao',
    })
    setShowCompraModal(true)
  }

  const handleDeleteCompra = async (compraId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta compra?')) return

    try {
      const { error } = await supabase
        .from('compras')
        .delete()
        .eq('id', compraId)

      if (error) throw error

      await loadComprasPorCartao()
    } catch (error) {
      console.error('Erro ao excluir compra:', error)
      alert('Erro ao excluir compra')
    }
  }

  const handleSubmitCompra = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const compraData: any = {
        cartao_id: compraFormData.cartao_id || null,
        descricao: compraFormData.descricao,
        valor: parseFloat(compraFormData.valor),
        data: compraFormData.data,
        categoria: compraFormData.categoria,
        metodo_pagamento: 'cartao', // Sempre cartão na página de cartões
        parcelada: false,
        total_parcelas: null,
      }

      if (editingCompra) {
        // Atualizar compra existente
        const { error } = await supabase
          .from('compras')
          .update(compraData)
          .eq('id', editingCompra.id)

        if (error) throw error
      } else {
        // Criar nova compra
        compraData.user_id = session?.user?.id

        const { error } = await supabase
          .from('compras')
          .insert([compraData])

        if (error) throw error
      }

      setShowCompraModal(false)
      setEditingCompra(null)
      setCompraFormData({
        cartao_id: '',
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        categoria: '',
        metodo_pagamento: 'cartao',
      })
      await loadComprasPorCartao()
    } catch (error) {
      console.error('Erro ao salvar compra:', error)
      alert('Erro ao salvar compra')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return

    try {
      const { error } = await supabase.from('cartoes').delete().eq('id', id)
      if (error) throw error
      loadCartoes()
    } catch (error) {
      console.error('Erro ao excluir cartão:', error)
      alert('Erro ao excluir cartão')
    }
  }

  const toggleCartao = (cartaoId: string) => {
    setCartaoExpanded((prev) => {
      // Se o cartão clicado já está expandido, fecha
      if (prev === cartaoId) {
        return null
      }
      // Caso contrário, expande apenas o cartão clicado
      return cartaoId
    })
  }

  const toggleParcelasCartao = (cartaoId: string) => {
    if (parcelasCartaoExpanded === cartaoId) {
      setParcelasCartaoExpanded(null)
    } else {
      setParcelasCartaoExpanded(cartaoId)
    }
  }

  const toggleFatura = (cartaoId: string, faturaKey: string) => {
    const key = `${cartaoId}-${faturaKey}`
    setFaturasExpandidas((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleUploadPdf = (cartaoId: string) => {
    setPdfCartaoId(cartaoId)
    setTransacoesExtraidas([])
    setMesReferencia(new Date().getMonth() + 1)
    setAnoReferencia(new Date().getFullYear())
    setShowPdfModal(true)
  }

  const handleProcessarPdf = async (file: File) => {
    if (!pdfCartaoId || !session?.user?.id) return

    setProcessandoPdf(true)
    try {
      // Importar dinamicamente apenas quando necessário (evita problemas no build)
      const pdfExtractor = await import('@/lib/pdf-extractor')
      
      // Extrair texto do PDF
      const texto = await pdfExtractor.extrairTextoDoPDF(file)
      
      // Extrair mês e ano de referência
      const referencia = pdfExtractor.extrairMesAnoReferencia(texto)
      if (referencia) {
        setMesReferencia(referencia.mes)
        setAnoReferencia(referencia.ano)
      }

      // Extrair transações
      const transacoes = pdfExtractor.extrairTransacoesDoTexto(texto)
      
      // Ajustar todas as datas para usar o dia atual com o mês e ano selecionados
      const hoje = new Date()
      const diaAtual = hoje.getDate()
      const transacoesComDataAjustada = transacoes.map(transacao => {
        const dataAjustada = new Date(anoReferencia, mesReferencia - 1, diaAtual)
        return {
          ...transacao,
          data: dataAjustada.toISOString().split('T')[0]
        }
      })
      
      setTransacoesExtraidas(transacoesComDataAjustada)

      if (transacoes.length === 0) {
        alert('Nenhuma transação encontrada no PDF. Verifique se o arquivo é uma fatura válida.')
      }
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error)
      alert(`Erro ao processar PDF: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setProcessandoPdf(false)
    }
  }

  const handleConfirmarTransacoes = async () => {
    if (!pdfCartaoId || !session?.user?.id || transacoesExtraidas.length === 0) return

    setUploadingPdf(true)
    try {
      // Criar compras a partir das transações
      // Usar sempre o dia atual com o mês e ano selecionados
      const hoje = new Date()
      const diaAtual = hoje.getDate()
      
      // Verificar se o dia atual existe no mês selecionado
      const ultimoDiaDoMes = new Date(anoReferencia, mesReferencia, 0).getDate()
      const diaAjustado = Math.min(diaAtual, ultimoDiaDoMes)
      
      const dataBase = new Date(anoReferencia, mesReferencia - 1, diaAjustado)
      const dataFormatada = dataBase.toISOString().split('T')[0]
      
      const comprasParaInserir = transacoesExtraidas.map(transacao => ({
        user_id: session.user.id,
        cartao_id: pdfCartaoId,
        descricao: transacao.descricao,
        valor: transacao.valor,
        data: dataFormatada, // Todas as compras terão a mesma data (dia atual do mês/ano selecionado)
        categoria: transacao.categoria || tiposGastos[0]?.nome || 'Outros',
        metodo_pagamento: 'cartao',
        parcelada: false,
        total_parcelas: null,
      }))

      const { error: comprasError } = await supabase
        .from('compras')
        .insert(comprasParaInserir)

      if (comprasError) throw comprasError

      // Recarregar dados
      await loadComprasPorCartao()
      
      setShowPdfModal(false)
      setTransacoesExtraidas([])
      setPdfCartaoId(null)
      
      alert(`${transacoesExtraidas.length} despesa(s) criada(s) com sucesso!`)
    } catch (error: any) {
      console.error('Erro ao criar despesas:', error)
      alert(`Erro ao criar despesas: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setUploadingPdf(false)
    }
  }

  const formatarDataParaInput = (dataISO: string): string => {
    // Converter de YYYY-MM-DD para DD/MM/YYYY
    if (dataISO.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dataISO.split('-')
      return `${day}/${month}/${year}`
    }
    return dataISO
  }

  const parsearDataDoInput = (dataFormatada: string): string => {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    const partes = dataFormatada.split('/')
    if (partes.length === 3) {
      const [day, month, year] = partes
      // Validar se a data é válida
      const dia = parseInt(day)
      const mes = parseInt(month)
      const ano = parseInt(year)
      
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
        // Verificar se o dia existe no mês
        const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
        const diaAjustado = Math.min(dia, ultimoDiaDoMes)
        
        return `${ano}-${String(mes).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`
      }
    }
    // Se já estiver no formato correto, retornar como está
    if (dataFormatada.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dataFormatada
    }
    // Se não conseguir parsear, retornar data atual
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  }

  const aplicarMascaraData = (valor: string): string => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '')
    
    // Aplica a máscara DD/MM/YYYY
    if (numeros.length <= 2) {
      return numeros
    } else if (numeros.length <= 4) {
      return `${numeros.slice(0, 2)}/${numeros.slice(2)}`
    } else {
      return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4, 8)}`
    }
  }

  const handleEditarTransacao = (index: number, campo: keyof TransacaoExtraida, valor: string | number) => {
    const novasTransacoes = [...transacoesExtraidas]
    
    if (campo === 'data' && typeof valor === 'string') {
      // Se o valor já está no formato DD/MM/YYYY, converter para YYYY-MM-DD
      const dataISO = parsearDataDoInput(valor)
      novasTransacoes[index] = {
        ...novasTransacoes[index],
        [campo]: dataISO,
      }
    } else {
      novasTransacoes[index] = {
        ...novasTransacoes[index],
        [campo]: valor,
      }
    }
    
    setTransacoesExtraidas(novasTransacoes)
  }

  const handleRemoverTransacao = (index: number) => {
    const novasTransacoes = transacoesExtraidas.filter((_, i) => i !== index)
    setTransacoesExtraidas(novasTransacoes)
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
            <h1 className="text-3xl font-bold text-white mb-2">Cartões</h1>
            <p className="text-gray-400">
              Gerencie seus cartões de crédito e suas faturas
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setEditingCartao(null)
                setFormData({
                  nome: '',
                  bandeira: '',
                  limite: '',
                  fechamento: '',
                  vencimento: '',
                  cor: '#1e3a5f',
                })
                setShowModal(true)
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Adicionar Cartão</span>
            </button>
            <button
              onClick={() => {
                setEditingParcela(null)
                setParcelaFormData({
                  cartao_id: '',
                  descricao: '',
                  valor: '',
                  total_parcelas: '1',
                  numero_parcela: '1',
                  data_vencimento: '',
                  categoria: '',
                })
                setShowParcelaModal(true)
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Adicionar Parcela</span>
            </button>
          </div>
        </div>

        {cartoes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <FiCreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              Nenhum cartão cadastrado
            </p>
            <p className="text-gray-500 text-sm">
              Clique em "Adicionar Cartão" para começar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              {cartoes.filter((_, index) => index % 2 === 0).map((cartao, index) => {
                const faturas = faturasPorCartao[cartao.id] || []
                const isExpanded = cartaoExpanded === cartao.id
                // Calcular limite disponível corretamente (excluindo compras recorrentes de meses futuros)
                const limiteDisponivel = calcularLimiteDisponivel(cartao.id, cartao.limite)
                const totalGasto = cartao.limite - limiteDisponivel

                return (
                  <div
                    key={`cartao-${cartao.id}-${index}`}
                    className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200 flex flex-col"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: cartao.cor || '#1e3a5f',
                    }}
                  >
                  {/* Cabeçalho do Cartão */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 
                            className="text-2xl font-semibold text-white"
                            style={{ color: cartao.cor || '#ffffff' }}
                          >
                            {cartao.nome}
                          </h3>
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium border"
                            style={{
                              backgroundColor: `${cartao.cor || '#1e3a5f'}20`,
                              color: cartao.cor || '#1e3a5f',
                              borderColor: `${cartao.cor || '#1e3a5f'}40`,
                            }}
                          >
                            {cartao.bandeira}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Limite:</span>
                            <p className="text-white font-semibold">
                              R$ {formatarMoeda(cartao.limite)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Gasto Total:</span>
                            <p className="text-red-400 font-semibold">
                              R$ {formatarMoeda(totalGasto)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Disponível:</span>
                            <p className="text-green-400 font-semibold">
                              R$ {formatarMoeda(limiteDisponivel)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Fechamento:</span>
                            <p className="text-white">Dia {cartao.fechamento}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Vencimento:</span>
                            <p className="text-white">Dia {cartao.vencimento}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleUploadPdf(cartao.id)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-green-400 transition-colors"
                          title="Upload PDF da Fatura"
                        >
                          <FiUpload className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(cartao)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cartao.id)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Botão para expandir/recolher faturas */}
                    {faturas.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleCartao(cartao.id)
                        }}
                        className="w-full flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-left mt-4"
                      >
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <FiChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <FiChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-white font-medium">
                            Faturas ({faturas.length})
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          Total: R$ {formatarMoeda(totalGasto)}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Lista de Faturas */}
                  {isExpanded && faturas.length > 0 && (
                    <div className="border-t border-gray-700">
                      <div className="p-6 space-y-4">
                        {faturas.map((fatura, index) => {
                          const faturaKey = `${fatura.ano}-${String(fatura.mes + 1).padStart(2, '0')}`
                          const faturaExpandidaKey = `${cartao.id}-${faturaKey}`
                          const isFaturaExpandida = faturasExpandidas[faturaExpandidaKey] || false

                          return (
                            <div
                              key={faturaKey}
                              className={`rounded-lg border ${
                                fatura.paga 
                                  ? 'bg-green-900/20 border-green-700/50' 
                                  : 'bg-gray-700/50 border-gray-600'
                              }`}
                            >
                              {/* Cabeçalho da fatura com botão para expandir/recolher */}
                              <button
                                type="button"
                                onClick={() => toggleFatura(cartao.id, faturaKey)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors rounded-t-lg"
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  {isFaturaExpandida ? (
                                    <FiChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <FiChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h4 className="text-lg font-semibold text-white">
                                        Fatura {fatura.mesNome}/{fatura.ano}
                                      </h4>
                                      {fatura.paga && (
                                        <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40 flex items-center space-x-1">
                                          <FiCheck className="w-3 h-3" />
                                          <span>Paga</span>
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-400">
                                      Fecha: {formatDate(fatura.dataFechamento)} • 
                                      Vence: {formatDate(fatura.dataVencimento)}
                                    </p>
                                    {fatura.paga && fatura.dataPagamento && (
                                      <p className="text-xs text-green-400 mt-1">
                                        Paga em: {formatDate(fatura.dataPagamento)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4 flex items-center space-x-4">
                                  <div>
                                    <p className={`text-xl font-bold ${fatura.paga ? 'text-green-400' : 'text-red-400'}`}>
                                      R$ {formatarMoeda(fatura.total)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {fatura.compras.length} compra{fatura.compras.length !== 1 ? 's' : ''}
                                      {fatura.parcelas.length > 0 && ` • ${fatura.parcelas.length} parcela${fatura.parcelas.length !== 1 ? 's' : ''}`}
                                    </p>
                                  </div>
                                  {!fatura.paga && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano, fatura.total)
                                      }}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Marcar como Paga
                                    </button>
                                  )}
                                  {fatura.paga && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDesmarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano)
                                      }}
                                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Desmarcar
                                    </button>
                                  )}
                                </div>
                              </button>

                              {/* Conteúdo expandido da fatura */}
                              {isFaturaExpandida && (
                                <div className="p-4 pt-0 border-t border-gray-600/50">
                                  {/* Lista de compras da fatura */}
                                  {fatura.compras.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-xs text-gray-400 font-medium mb-2">Compras:</p>
                                      {fatura.compras.map((compra) => (
                                        <div
                                          key={compra.id}
                                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600"
                                        >
                                          <div className="flex-1">
                                            <p className="text-white font-medium">{compra.descricao}</p>
                                            <p className="text-xs text-gray-400">
                                              {formatDate(compra.data)} • {compra.categoria}
                                            </p>
                                          </div>
                                          <div className="flex items-center space-x-2 ml-4">
                                            <p className="text-white font-semibold">
                                              R$ {formatarMoeda(compra.valor)}
                                            </p>
                                            <button
                                              onClick={() => handleEditCompra(compra)}
                                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Editar compra"
                                            >
                                              <FiEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteCompra(compra.id)}
                                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Excluir compra"
                                            >
                                              <FiTrash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Lista de parcelas da fatura */}
                                  {fatura.parcelas.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-xs text-gray-400 font-medium mb-2">Parcelas:</p>
                                      {fatura.parcelas.map((parcela) => (
                                        <div
                                          key={parcela.id}
                                          className={`flex items-center justify-between p-3 rounded-lg border ${
                                            parcela.paga
                                              ? 'bg-green-900/20 border-green-700/50'
                                              : 'bg-gray-800 border-gray-600'
                                          }`}
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                              <p className="text-white font-medium">{parcela.descricao}</p>
                                              {parcela.paga && (
                                                <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40">
                                                  Paga
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                              Vence: {formatDate(parcela.data_vencimento)} • {parcela.categoria}
                                              {parcela.numero_parcela && ` • ${parcela.numero_parcela}/${parcela.total_parcelas}`}
                                            </p>
                                          </div>
                                          <div className="flex items-center space-x-2 ml-4">
                                            <p className={`font-semibold ${parcela.paga ? 'text-green-400' : 'text-white'}`}>
                                              R$ {formatarMoeda(parcela.valor)}
                                            </p>
                                            {!parcela.paga && (
                                              <button
                                                onClick={() => handleMarcarParcelaPaga(parcela.id)}
                                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                                title="Marcar como paga"
                                              >
                                                <FiCheck className="w-4 h-4" />
                                              </button>
                                            )}
                                            {parcela.paga && (
                                              <button
                                                onClick={() => handleDesmarcarParcelaPaga(parcela.id)}
                                                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                                title="Desmarcar como paga"
                                              >
                                                <FiX className="w-4 h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleEditParcela(parcela)}
                                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Editar parcela"
                                            >
                                              <FiEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteParcela(parcela.id)}
                                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Excluir parcela"
                                            >
                                              <FiTrash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {faturas.length === 0 && (
                    <div className="border-t border-gray-700 p-6">
                      <p className="text-gray-400 text-center">
                        Nenhuma compra registrada neste cartão
                      </p>
                    </div>
                  )}

                  {/* Seção de Parcelas do Cartão */}
                  {(() => {
                    const parcelasDoCartao = parcelasPorCartao[cartao.id] || []
                    const parcelasAtivas = parcelasDoCartao.filter(p => !p.paga)
                    const totalPendente = parcelasAtivas.reduce((sum, p) => sum + p.valor, 0)
                    const totalGeral = parcelasDoCartao.reduce((sum, p) => sum + p.valor, 0)
                    const parcelasExpanded = parcelasCartaoExpanded === cartao.id

                    if (parcelasDoCartao.length === 0) return null

                    return (
                      <div className="border-t border-gray-700">
                        <button
                          onClick={() => toggleParcelasCartao(cartao.id)}
                          className="w-full flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="flex items-center space-x-3">
                            {parcelasExpanded ? (
                              <FiChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <FiChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-white font-medium">
                              Parcelas ({parcelasDoCartao.length})
                            </span>
                            {parcelasAtivas.length > 0 && (
                              <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs font-medium border border-red-600/40">
                                {parcelasAtivas.length} pendente{parcelasAtivas.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${parcelasAtivas.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              R$ {formatarMoeda(totalPendente)} pendente
                            </span>
                          </div>
                        </button>

                        {parcelasExpanded && (
                          <div className="p-6 space-y-2">
                            {parcelasDoCartao
                              .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
                              .map((parcela) => (
                                <div
                                  key={parcela.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    parcela.paga
                                      ? 'bg-gray-900/50 border-gray-700/50 opacity-60'
                                      : 'bg-gray-800 border-gray-600'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      {parcela.paga && (
                                        <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40">
                                          Paga
                                        </span>
                                      )}
                                      <p className={`font-medium ${parcela.paga ? 'text-gray-400' : 'text-white'}`}>
                                        {parcela.descricao}
                                      </p>
                                      {parcela.numero_parcela && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          parcela.paga
                                            ? 'bg-gray-700 text-gray-400'
                                            : 'bg-gray-600 text-gray-300'
                                        }`}>
                                          {parcela.numero_parcela}/{parcela.total_parcelas}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-xs mt-1 ${parcela.paga ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Vence: {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')} • {parcela.categoria}
                                      {parcela.paga && parcela.data_pagamento && (
                                        <span className="ml-2">• Paga em: {formatDate(parcela.data_pagamento)}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <p className={`font-semibold ${parcela.paga ? 'text-gray-400' : 'text-white'}`}>
                                      R$ {parcela.valor.toFixed(2)}
                                    </p>
                                    {!parcela.paga ? (
                                      <button
                                        onClick={() => handleMarcarParcelaPaga(parcela.id)}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                        title="Marcar como paga"
                                      >
                                        <FiCheck className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleDesmarcarParcelaPaga(parcela.id)}
                                        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                        title="Desmarcar como paga"
                                      >
                                        <FiX className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleEditParcela(parcela)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        parcela.paga
                                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                      }`}
                                      title="Editar parcela"
                                    >
                                      <FiEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteParcela(parcela.id)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        parcela.paga
                                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                          : 'bg-red-600 hover:bg-red-700 text-white'
                                      }`}
                                      title="Excluir parcela"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
            </div>
            <div className="flex flex-col gap-4">
              {cartoes.filter((_, index) => index % 2 === 1).map((cartao, index) => {
                const faturas = faturasPorCartao[cartao.id] || []
                const isExpanded = cartaoExpanded === cartao.id
                // Calcular limite disponível corretamente (excluindo compras recorrentes de meses futuros)
                const limiteDisponivel = calcularLimiteDisponivel(cartao.id, cartao.limite)
                const totalGasto = cartao.limite - limiteDisponivel

                return (
                  <div
                    key={`cartao-${cartao.id}-${index}`}
                    className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200 flex flex-col"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: cartao.cor || '#1e3a5f',
                    }}
                  >
                  {/* Cabeçalho do Cartão */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 
                            className="text-2xl font-semibold text-white"
                            style={{ color: cartao.cor || '#ffffff' }}
                          >
                            {cartao.nome}
                          </h3>
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium border"
                            style={{
                              backgroundColor: `${cartao.cor || '#1e3a5f'}20`,
                              color: cartao.cor || '#1e3a5f',
                              borderColor: `${cartao.cor || '#1e3a5f'}40`,
                            }}
                          >
                            {cartao.bandeira}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Limite:</span>
                            <p className="text-white font-semibold">
                              R$ {formatarMoeda(cartao.limite)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Gasto Total:</span>
                            <p className="text-red-400 font-semibold">
                              R$ {formatarMoeda(totalGasto)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Disponível:</span>
                            <p className="text-green-400 font-semibold">
                              R$ {formatarMoeda(limiteDisponivel)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Fechamento:</span>
                            <p className="text-white">Dia {cartao.fechamento}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Vencimento:</span>
                            <p className="text-white">Dia {cartao.vencimento}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleUploadPdf(cartao.id)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-green-400 transition-colors"
                          title="Upload PDF da Fatura"
                        >
                          <FiUpload className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(cartao)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cartao.id)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Botão para expandir/recolher faturas */}
                    {faturas.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleCartao(cartao.id)
                        }}
                        className="w-full flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-left mt-4"
                      >
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <FiChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <FiChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-white font-medium">
                            Faturas ({faturas.length})
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">
                          Total: R$ {formatarMoeda(totalGasto)}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Lista de Faturas */}
                  {isExpanded && faturas.length > 0 && (
                    <div className="border-t border-gray-700">
                      <div className="p-6 space-y-4">
                        {faturas.map((fatura, index) => {
                          const faturaKey = `${fatura.ano}-${String(fatura.mes + 1).padStart(2, '0')}`
                          const faturaExpandidaKey = `${cartao.id}-${faturaKey}`
                          const isFaturaExpandida = faturasExpandidas[faturaExpandidaKey] || false

                          return (
                            <div
                              key={faturaKey}
                              className={`rounded-lg border ${
                                fatura.paga 
                                  ? 'bg-green-900/20 border-green-700/50' 
                                  : 'bg-gray-700/50 border-gray-600'
                              }`}
                            >
                              {/* Cabeçalho da fatura com botão para expandir/recolher */}
                              <button
                                type="button"
                                onClick={() => toggleFatura(cartao.id, faturaKey)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors rounded-t-lg"
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  {isFaturaExpandida ? (
                                    <FiChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <FiChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h4 className="text-lg font-semibold text-white">
                                        Fatura {fatura.mesNome}/{fatura.ano}
                                      </h4>
                                      {fatura.paga && (
                                        <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40 flex items-center space-x-1">
                                          <FiCheck className="w-3 h-3" />
                                          <span>Paga</span>
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-400">
                                      Fecha: {formatDate(fatura.dataFechamento)} • 
                                      Vence: {formatDate(fatura.dataVencimento)}
                                    </p>
                                    {fatura.paga && fatura.dataPagamento && (
                                      <p className="text-xs text-green-400 mt-1">
                                        Paga em: {formatDate(fatura.dataPagamento)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4 flex items-center space-x-4">
                                  <div>
                                    <p className={`text-xl font-bold ${fatura.paga ? 'text-green-400' : 'text-red-400'}`}>
                                      R$ {formatarMoeda(fatura.total)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {fatura.compras.length} compra{fatura.compras.length !== 1 ? 's' : ''}
                                      {fatura.parcelas.length > 0 && ` • ${fatura.parcelas.length} parcela${fatura.parcelas.length !== 1 ? 's' : ''}`}
                                    </p>
                                  </div>
                                  {!fatura.paga && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano, fatura.total)
                                      }}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Marcar como Paga
                                    </button>
                                  )}
                                  {fatura.paga && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDesmarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano)
                                      }}
                                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Desmarcar
                                    </button>
                                  )}
                                </div>
                              </button>

                              {/* Conteúdo expandido da fatura */}
                              {isFaturaExpandida && (
                                <div className="p-4 pt-0 border-t border-gray-600/50">
                                  {/* Lista de compras da fatura */}
                                  {fatura.compras.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-xs text-gray-400 font-medium mb-2">Compras:</p>
                                      {fatura.compras.map((compra) => (
                                        <div
                                          key={compra.id}
                                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600"
                                        >
                                          <div className="flex-1">
                                            <p className="text-white font-medium">{compra.descricao}</p>
                                            <p className="text-xs text-gray-400">
                                              {formatDate(compra.data)} • {compra.categoria}
                                            </p>
                                          </div>
                                          <div className="flex items-center space-x-2 ml-4">
                                            <p className="text-white font-semibold">
                                              R$ {formatarMoeda(compra.valor)}
                                            </p>
                                            <button
                                              onClick={() => handleEditCompra(compra)}
                                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Editar compra"
                                            >
                                              <FiEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteCompra(compra.id)}
                                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Excluir compra"
                                            >
                                              <FiTrash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Lista de parcelas da fatura */}
                                  {fatura.parcelas.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-xs text-gray-400 font-medium mb-2">Parcelas:</p>
                                      {fatura.parcelas.map((parcela) => (
                                        <div
                                          key={parcela.id}
                                          className={`flex items-center justify-between p-3 rounded-lg border ${
                                            parcela.paga
                                              ? 'bg-green-900/20 border-green-700/50'
                                              : 'bg-gray-800 border-gray-600'
                                          }`}
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                              <p className="text-white font-medium">{parcela.descricao}</p>
                                              {parcela.paga && (
                                                <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40">
                                                  Paga
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                              Vence: {formatDate(parcela.data_vencimento)} • {parcela.categoria}
                                              {parcela.numero_parcela && ` • ${parcela.numero_parcela}/${parcela.total_parcelas}`}
                                            </p>
                                          </div>
                                          <div className="flex items-center space-x-2 ml-4">
                                            <p className={`font-semibold ${parcela.paga ? 'text-green-400' : 'text-white'}`}>
                                              R$ {formatarMoeda(parcela.valor)}
                                            </p>
                                            {!parcela.paga && (
                                              <button
                                                onClick={() => handleMarcarParcelaPaga(parcela.id)}
                                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                                title="Marcar como paga"
                                              >
                                                <FiCheck className="w-4 h-4" />
                                              </button>
                                            )}
                                            {parcela.paga && (
                                              <button
                                                onClick={() => handleDesmarcarParcelaPaga(parcela.id)}
                                                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                                title="Desmarcar como paga"
                                              >
                                                <FiX className="w-4 h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleEditParcela(parcela)}
                                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Editar parcela"
                                            >
                                              <FiEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteParcela(parcela.id)}
                                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                              title="Excluir parcela"
                                            >
                                              <FiTrash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {faturas.length === 0 && (
                    <div className="border-t border-gray-700 p-6">
                      <p className="text-gray-400 text-center">
                        Nenhuma compra registrada neste cartão
                      </p>
                    </div>
                  )}

                  {/* Seção de Parcelas do Cartão */}
                  {(() => {
                    const parcelasDoCartao = parcelasPorCartao[cartao.id] || []
                    const parcelasAtivas = parcelasDoCartao.filter(p => !p.paga)
                    const totalPendente = parcelasAtivas.reduce((sum, p) => sum + p.valor, 0)
                    const totalGeral = parcelasDoCartao.reduce((sum, p) => sum + p.valor, 0)
                    const parcelasExpanded = parcelasCartaoExpanded === cartao.id

                    if (parcelasDoCartao.length === 0) return null

                    return (
                      <div className="border-t border-gray-700">
                        <button
                          onClick={() => toggleParcelasCartao(cartao.id)}
                          className="w-full flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="flex items-center space-x-3">
                            {parcelasExpanded ? (
                              <FiChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <FiChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-white font-medium">
                              Parcelas ({parcelasDoCartao.length})
                            </span>
                            {parcelasAtivas.length > 0 && (
                              <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs font-medium border border-red-600/40">
                                {parcelasAtivas.length} pendente{parcelasAtivas.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${parcelasAtivas.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              R$ {formatarMoeda(totalPendente)} pendente
                            </span>
                          </div>
                        </button>

                        {parcelasExpanded && (
                          <div className="p-6 space-y-2">
                            {parcelasDoCartao
                              .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
                              .map((parcela) => (
                                <div
                                  key={parcela.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    parcela.paga
                                      ? 'bg-gray-900/50 border-gray-700/50 opacity-60'
                                      : 'bg-gray-800 border-gray-600'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      {parcela.paga && (
                                        <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40">
                                          Paga
                                        </span>
                                      )}
                                      <p className={`font-medium ${parcela.paga ? 'text-gray-400' : 'text-white'}`}>
                                        {parcela.descricao}
                                      </p>
                                      {parcela.numero_parcela && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          parcela.paga
                                            ? 'bg-gray-700 text-gray-400'
                                            : 'bg-gray-600 text-gray-300'
                                        }`}>
                                          {parcela.numero_parcela}/{parcela.total_parcelas}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-xs mt-1 ${parcela.paga ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Vence: {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')} • {parcela.categoria}
                                      {parcela.paga && parcela.data_pagamento && (
                                        <span className="ml-2">• Paga em: {formatDate(parcela.data_pagamento)}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <p className={`font-semibold ${parcela.paga ? 'text-gray-400' : 'text-white'}`}>
                                      R$ {parcela.valor.toFixed(2)}
                                    </p>
                                    {!parcela.paga ? (
                                      <button
                                        onClick={() => handleMarcarParcelaPaga(parcela.id)}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                        title="Marcar como paga"
                                      >
                                        <FiCheck className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleDesmarcarParcelaPaga(parcela.id)}
                                        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                        title="Desmarcar como paga"
                                      >
                                        <FiX className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleEditParcela(parcela)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        parcela.paga
                                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                      }`}
                                      title="Editar parcela"
                                    >
                                      <FiEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteParcela(parcela.id)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        parcela.paga
                                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                          : 'bg-red-600 hover:bg-red-700 text-white'
                                      }`}
                                      title="Excluir parcela"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
            </div>
          </div>
        )}

        {/* Modal de Cartão */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingCartao ? 'Editar Cartão' : 'Novo Cartão'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingCartao(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome do Cartão
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Nubank, Itaú..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bandeira
                  </label>
                  <select
                    value={formData.bandeira}
                    onChange={(e) =>
                      setFormData({ ...formData, bandeira: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Elo">Elo</option>
                    <option value="American Express">American Express</option>
                    <option value="Hipercard">Hipercard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Limite (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.limite}
                    onChange={(e) =>
                      setFormData({ ...formData, limite: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fechamento (dia)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.fechamento}
                      onChange={(e) =>
                        setFormData({ ...formData, fechamento: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 10"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dia que a fatura fecha
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Vencimento (dia)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.vencimento}
                      onChange={(e) =>
                        setFormData({ ...formData, vencimento: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 15"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dia que a fatura vence
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cor do Cartão
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={formData.cor}
                      onChange={(e) =>
                        setFormData({ ...formData, cor: e.target.value })
                      }
                      className="w-16 h-10 rounded cursor-pointer"
                      title="Escolha uma cor para o cartão"
                    />
                    <input
                      type="text"
                      value={formData.cor}
                      onChange={(e) =>
                        setFormData({ ...formData, cor: e.target.value })
                      }
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#1e3a5f"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Personalize a cor do cartão para melhor identificação visual
                  </p>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCartao(null)
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

        {/* Modal de Parcela Individual */}
        {showParcelaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingParcela ? 'Editar Parcela' : 'Nova Parcela em Andamento'}
                </h2>
                <button
                  onClick={() => {
                    setShowParcelaModal(false)
                    setEditingParcela(null)
                    setParcelaFormData({
                      cartao_id: '',
                      descricao: '',
                      valor: '',
                      total_parcelas: '1',
                      numero_parcela: '1',
                      data_vencimento: '',
                      categoria: '',
                    })
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitParcela} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cartão
                  </label>
                  <select
                    value={parcelaFormData.cartao_id}
                    onChange={(e) =>
                      setParcelaFormData({ ...parcelaFormData, cartao_id: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione um cartão...</option>
                    {cartoes.map((cartao) => (
                      <option key={cartao.id} value={cartao.id}>
                        {cartao.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={parcelaFormData.descricao}
                    onChange={(e) =>
                      setParcelaFormData({ ...parcelaFormData, descricao: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Parcela de notebook..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor da Parcela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={parcelaFormData.valor}
                    onChange={(e) =>
                      setParcelaFormData({ ...parcelaFormData, valor: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Número da Parcela
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={parcelaFormData.numero_parcela}
                      onChange={(e) =>
                        setParcelaFormData({ ...parcelaFormData, numero_parcela: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 1, 2, 3..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total de Parcelas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={parcelaFormData.total_parcelas}
                      onChange={(e) =>
                        setParcelaFormData({ ...parcelaFormData, total_parcelas: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 3, 6, 12..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data da Compra
                  </label>
                  <input
                    type="date"
                    value={parcelaFormData.data_vencimento}
                    onChange={(e) =>
                      setParcelaFormData({ ...parcelaFormData, data_vencimento: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoria
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={parcelaFormData.categoria}
                      onChange={(e) =>
                        setParcelaFormData({ ...parcelaFormData, categoria: e.target.value })
                      }
                      required
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione uma categoria...</option>
                      {tiposGastos.map((tipo) => (
                        <option key={tipo.id} value={tipo.nome}>
                          {tipo.nome}
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
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowParcelaModal(false)
                      setEditingParcela(null)
                      setParcelaFormData({
                        cartao_id: '',
                        descricao: '',
                        valor: '',
                        total_parcelas: '1',
                        numero_parcela: '1',
                        data_vencimento: '',
                        categoria: '',
                      })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingParcela ? 'Atualizar Parcela' : 'Salvar Parcela'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Compra */}
        {showCompraModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingCompra ? 'Editar Compra' : 'Nova Compra'}
                </h2>
                <button
                  onClick={() => {
                    setShowCompraModal(false)
                    setEditingCompra(null)
                    setCompraFormData({
                      cartao_id: '',
                      descricao: '',
                      valor: '',
                      data: new Date().toISOString().split('T')[0],
                      categoria: '',
                      metodo_pagamento: 'cartao',
                    })
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitCompra} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cartão
                  </label>
                  <select
                    value={compraFormData.cartao_id}
                    onChange={(e) =>
                      setCompraFormData({ ...compraFormData, cartao_id: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione um cartão...</option>
                    {cartoes.map((cartao) => (
                      <option key={cartao.id} value={cartao.id}>
                        {cartao.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={compraFormData.descricao}
                    onChange={(e) =>
                      setCompraFormData({ ...compraFormData, descricao: e.target.value })
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
                    value={compraFormData.valor}
                    onChange={(e) =>
                      setCompraFormData({ ...compraFormData, valor: e.target.value })
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
                    value={compraFormData.data}
                    onChange={(e) =>
                      setCompraFormData({ ...compraFormData, data: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoria
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={compraFormData.categoria}
                      onChange={(e) =>
                        setCompraFormData({ ...compraFormData, categoria: e.target.value })
                      }
                      required
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione uma categoria...</option>
                      {tiposGastos.map((tipo) => (
                        <option key={tipo.id} value={tipo.nome}>
                          {tipo.nome}
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
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompraModal(false)
                      setEditingCompra(null)
                      setCompraFormData({
                        cartao_id: '',
                        descricao: '',
                        valor: '',
                        data: new Date().toISOString().split('T')[0],
                        categoria: '',
                        metodo_pagamento: 'cartao',
                      })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    {editingCompra ? 'Atualizar Compra' : 'Salvar Compra'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Upload de PDF */}
        {showPdfModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FiFileText className="w-6 h-6 text-green-400" />
                    <h2 className="text-2xl font-bold text-white">
                      Upload de Fatura em PDF
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowPdfModal(false)
                      setTransacoesExtraidas([])
                      setPdfCartaoId(null)
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Upload de arquivo */}
                {transacoesExtraidas.length === 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Selecione o arquivo PDF da fatura
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleProcessarPdf(file)
                          }
                        }}
                        disabled={processandoPdf}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                      />
                    </div>

                    {processandoPdf && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-400">Processando PDF...</p>
                      </div>
                    )}

                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-300">
                        <strong>Dica:</strong> O sistema tentará extrair automaticamente as transações do PDF. 
                        Você poderá revisar e editar as informações antes de confirmar.
                      </p>
                    </div>
                  </div>
                )}

                {/* Revisão de transações extraídas */}
                {transacoesExtraidas.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Transações Extraídas ({transacoesExtraidas.length})
                        </h3>
                        <p className="text-sm text-gray-400">
                          Revise e edite as informações antes de confirmar
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Mês</label>
                          <select
                            value={mesReferencia}
                            onChange={(e) => {
                              const novoMes = parseInt(e.target.value)
                              setMesReferencia(novoMes)
                              // Atualizar datas das transações quando o mês mudar
                              const hoje = new Date()
                              const diaAtual = hoje.getDate()
                              const ultimoDiaDoMes = new Date(anoReferencia, novoMes, 0).getDate()
                              const diaAjustado = Math.min(diaAtual, ultimoDiaDoMes)
                              const novaData = new Date(anoReferencia, novoMes - 1, diaAjustado)
                              const dataFormatada = novaData.toISOString().split('T')[0]
                              
                              const transacoesAtualizadas = transacoesExtraidas.map(t => ({
                                ...t,
                                data: dataFormatada
                              }))
                              setTransacoesExtraidas(transacoesAtualizadas)
                            }}
                            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            {mesesNomes.map((mes, index) => (
                              <option key={index} value={index + 1}>
                                {mes}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Ano</label>
                          <input
                            type="number"
                            value={anoReferencia}
                            onChange={(e) => {
                              const novoAno = parseInt(e.target.value)
                              setAnoReferencia(novoAno)
                              // Atualizar datas das transações quando o ano mudar
                              const hoje = new Date()
                              const diaAtual = hoje.getDate()
                              const ultimoDiaDoMes = new Date(novoAno, mesReferencia, 0).getDate()
                              const diaAjustado = Math.min(diaAtual, ultimoDiaDoMes)
                              const novaData = new Date(novoAno, mesReferencia - 1, diaAjustado)
                              const dataFormatada = novaData.toISOString().split('T')[0]
                              
                              const transacoesAtualizadas = transacoesExtraidas.map(t => ({
                                ...t,
                                data: dataFormatada
                              }))
                              setTransacoesExtraidas(transacoesAtualizadas)
                            }}
                            min="2020"
                            max="2100"
                            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm w-20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {transacoesExtraidas.map((transacao, index) => (
                        <div
                          key={index}
                          className="bg-gray-700 rounded-lg p-5 border border-gray-600"
                        >
                          <div className="grid grid-cols-12 gap-4 items-start">
                            <div className="col-span-4">
                              <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                              <input
                                type="text"
                                value={transacao.descricao}
                                onChange={(e) =>
                                  handleEditarTransacao(index, 'descricao', e.target.value)
                                }
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Valor (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={transacao.valor}
                                onChange={(e) =>
                                  handleEditarTransacao(index, 'valor', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Data</label>
                              <input
                                type="text"
                                value={formatarDataParaInput(transacao.data)}
                                onChange={(e) => {
                                  const valorComMascara = aplicarMascaraData(e.target.value)
                                  handleEditarTransacao(index, 'data', valorComMascara)
                                }}
                                placeholder="DD/MM/YYYY"
                                maxLength={10}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                              />
                            </div>
                            <div className="col-span-3">
                              <label className="block text-xs text-gray-400 mb-1">Categoria</label>
                              <div className="flex items-center space-x-2">
                                <select
                                  value={transacao.categoria || ''}
                                  onChange={(e) =>
                                    handleEditarTransacao(index, 'categoria', e.target.value)
                                  }
                                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                                >
                                  <option value="">Selecione...</option>
                                  {tiposGastos.map((tipo) => (
                                    <option key={tipo.id} value={tipo.nome}>
                                      {tipo.nome}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setShowModalCategoria(true)}
                                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex-shrink-0"
                                  title="Adicionar nova categoria"
                                >
                                  <FiPlus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center justify-end">
                              <button
                                onClick={() => handleRemoverTransacao(index)}
                                className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                                title="Remover"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div className="text-white">
                        <span className="text-gray-400">Total: </span>
                        <span className="text-xl font-bold">
                          R$ {formatarMoeda(transacoesExtraidas.reduce((sum, t) => sum + t.valor, 0))}
                        </span>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPdfModal(false)
                            setTransacoesExtraidas([])
                            setPdfCartaoId(null)
                          }}
                          className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmarTransacoes}
                          disabled={uploadingPdf || transacoesExtraidas.length === 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {uploadingPdf ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Salvando...</span>
                            </>
                          ) : (
                            <>
                              <FiCheck className="w-5 h-5" />
                              <span>Confirmar e Criar Despesas</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criar Categoria */}
        {showModalCategoria && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Nova Categoria de Gasto</h2>
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
                      placeholder="Ex: Alimentação, Transporte, Lazer"
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
    </MainLayout>
  )
}
