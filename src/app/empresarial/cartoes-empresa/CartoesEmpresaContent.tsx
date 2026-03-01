'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { formatDate, formatarMoeda } from '@/lib/utils'
import { CartoesEmpresaUI } from './CartoesEmpresaUI'
import type { Cartao, Compra, Parcela, Fatura, TransacaoExtraida } from './cartoes-empresa-types'

interface FaturaPaga {
  id: string
  cartao_id: string
  mes_referencia: number
  ano_referencia: number
  data_pagamento: string
  total_pago: number
}

/** Categorias de despesa (empresarial) para uso em cartão empresa */

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function CartoesEmpresaContent() {
  const { session } = useAuth()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [comprasPorCartao, setComprasPorCartao] = useState<{ [key: string]: Compra[] }>({})
  const [parcelasPorCartao, setParcelasPorCartao] = useState<{ [key: string]: Parcela[] }>({})
  const [faturasPorCartao, setFaturasPorCartao] = useState<{ [key: string]: Fatura[] }>({})
  const [faturasPagas, setFaturasPagas] = useState<{ [key: string]: FaturaPaga[] }>({})
  const [categoriasDespesa, setCategoriasDespesa] = useState<{ id: string; nome: string }[]>([])
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
  // Estado para controlar quais faturas estÃ£o expandidas: { cartaoId-faturaKey: true }
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
      loadCategoriasDespesa()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when session changes
  }, [session])

  const loadCategoriasDespesa = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('user_id', session?.user?.id)
        .eq('tipo', 'despesa')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setCategoriasDespesa(data || [])
    } catch (error) {
      console.error('Erro ao carregar categorias de despesa:', error)
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
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista de categorias
      await loadCategoriasDespesa()

      // Selecionar a categoria recÃ©m-criada nos formulÃ¡rios
      setParcelaFormData({ ...parcelaFormData, categoria: novaCategoria.nome })
      setCompraFormData({ ...compraFormData, categoria: novaCategoria.nome })
      
      // Se estiver no modal de PDF, atualizar a categoria nas transaÃ§Ãµes que nÃ£o tÃªm categoria
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
        alert('JÃ¡ existe uma categoria com este nome.')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when cartoes or session change
  }, [cartoes, session])

  useEffect(() => {
    if (cartoes.length > 0 && (Object.keys(parcelasPorCartao).length > 0 || Object.keys(comprasPorCartao).length > 0)) {
      calcularFaturas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when data for faturas change
  }, [parcelasPorCartao, comprasPorCartao, faturasPagas, cartoes, comprasRecorrentesMap])

  const loadCartoes = async () => {
    try {
      const { data, error } = await supabase
        .from('cartoes_empresa')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('nome')

      if (error) throw error
      setCartoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar cartÃµes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFaturasPagas = async () => {
    try {
      const userId = session?.user?.id
      const { data: faturasPagasData, error } = await supabase
        .from('faturas_pagas_cartao_empresa')
        .select('*')
        .eq('user_id', userId)
        .order('data_pagamento', { ascending: false })

      if (error) throw error

      // Agrupar faturas pagas por cartÃ£o
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

    // Retornar a data de pagamento como Ãºltimo fechamento
    return new Date(maisRecente.data_pagamento)
  }

  const calcularPeriodoFatura = (dataCompra: Date, cartao: Cartao) => {
    const dia = dataCompra.getDate()
    const mes = dataCompra.getMonth()
    const ano = dataCompra.getFullYear()

    // Verificar se existe um fechamento antecipado (fatura paga)
    const ultimoFechamento = getUltimoFechamento(cartao.id)
    
    if (ultimoFechamento) {
      // Se a compra foi feita APÃ“S o Ãºltimo fechamento antecipado, 
      // ela pertence Ã  prÃ³xima fatura apÃ³s esse fechamento
      if (dataCompra > ultimoFechamento) {
        const mesUltimoFechamento = ultimoFechamento.getMonth()
        const anoUltimoFechamento = ultimoFechamento.getFullYear()
        
        // PrÃ³xima fatura apÃ³s o Ãºltimo fechamento (mÃªs seguinte ao pagamento)
        let mesFatura = mesUltimoFechamento + 1
        let anoFatura = anoUltimoFechamento
        if (mesFatura > 11) {
          mesFatura = 0
          anoFatura = anoUltimoFechamento + 1
        }
        
        // Se jÃ¡ passou o prÃ³ximo fechamento programado apÃ³s o pagamento,
        // usar a lÃ³gica normal a partir da data da compra
        const proximoFechamentoProgramado = new Date(anoFatura, mesFatura, cartao.fechamento)
        
        if (dataCompra < proximoFechamentoProgramado) {
          // Compra estÃ¡ na fatura apÃ³s o Ãºltimo fechamento antecipado
          return { mes: mesFatura, ano: anoFatura }
        }
        // Se passou, continua com a lÃ³gica normal abaixo
      } else {
        // Compra foi antes do Ãºltimo fechamento, usar lÃ³gica normal
        // (deve estar em uma fatura anterior)
      }
    }

    // LÃ³gica de fatura baseada no dia de fechamento do cartÃ£o
    // Se a compra for feita ANTES do dia de fechamento: fatura do mÃªs atual
    // Se a compra for feita NO DIA ou DEPOIS do dia de fechamento: fatura do prÃ³ximo mÃªs
    let mesFatura = mes
    let anoFatura = ano

    if (dia >= cartao.fechamento) {
      // Compra no dia de fechamento ou depois â†’ fatura do prÃ³ximo mÃªs
      mesFatura = mes + 1
      if (mesFatura > 11) {
        mesFatura = 0
        anoFatura = ano + 1
      }
    }
    // Se dia < cartao.fechamento, a compra fica na fatura do mÃªs atual (mesFatura = mes)

    return { mes: mesFatura, ano: anoFatura }
  }

  const calcularDataFechamento = (mes: number, ano: number, diaFechamento: number) => {
    // Ãšltimo dia do mÃªs para garantir que nÃ£o ultrapasse
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    const dia = Math.min(diaFechamento, ultimoDia)
    return new Date(ano, mes, dia)
  }

  const calcularDataVencimento = (mesFechamento: number, anoFechamento: number, diaVencimento: number) => {
    // Vencimento Ã© sempre no mÃªs seguinte ao fechamento
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

      // Buscar todas as parcelas (pagas e nÃ£o pagas)
      const { data: parcelas, error } = await supabase
        .from('parcelas_cartao_empresa')
        .select('*')
        .eq('user_id', userId)
        .not('cartao_id', 'is', null)
        .order('data_vencimento', { ascending: true })

      if (error) throw error

      // Agrupar parcelas por cartÃ£o
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
      console.error('Erro ao carregar parcelas por cartÃ£o:', error)
    }
  }

  const loadComprasRecorrentes = async () => {
    // Empresarial: sem tabela de compras recorrentes por enquanto; manter mapa vazio
    setComprasRecorrentesMap({})
  }

  const loadComprasPorCartao = async () => {
    try {
      const userId = session?.user?.id
      const comprasPorCartaoMap: { [key: string]: Compra[] } = {}

      // Buscar todas as compras que sÃ£o de cartÃ£o de crÃ©dito e NÃƒO sÃ£o parceladas
      // (compras parceladas sÃ£o exibidas como parcelas)
      const { data: compras, error } = await supabase
        .from('compras_cartao_empresa')
        .select('*')
        .eq('user_id', userId)
        .eq('metodo_pagamento', 'cartao')
        .not('cartao_id', 'is', null)
        .order('data', { ascending: false })

      if (error) throw error

      // Filtrar apenas compras nÃ£o parceladas (compras parceladas sÃ£o representadas pelas parcelas)
      // Excluir compras onde parcelada = true OU total_parcelas > 1
      const comprasNaoParceladas = compras?.filter((compra) => {
        const isParcelada = compra.parcelada === true || compra.total_parcelas > 1
        return !isParcelada
      }) || []

      // Agrupar compras por cartÃ£o
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
      console.error('Erro ao carregar compras por cartÃ£o:', error)
    }
  }

  /**
   * Calcula o limite disponÃ­vel do cartÃ£o, considerando:
   * - Todas as parcelas nÃ£o pagas (consomem limite)
   * - Todas as compras nÃ£o recorrentes (consomem limite)
   * - Apenas compras recorrentes do mÃªs atual ou meses jÃ¡ passados (consomem limite)
   * - Compras recorrentes de meses futuros NÃƒO consomem limite
   */
  const calcularLimiteDisponivel = (cartaoId: string, limite: number): number => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1 // 1-12
    const anoAtual = hoje.getFullYear()

    // Buscar todas as parcelas nÃ£o pagas do cartÃ£o
    const parcelasDoCartao = (parcelasPorCartao[cartaoId] || []).filter(p => !p.paga)
    const totalParcelas = parcelasDoCartao.reduce((sum, p) => sum + p.valor, 0)

    // Buscar todas as compras do cartÃ£o
    const comprasDoCartao = comprasPorCartao[cartaoId] || []
    
    // Calcular total de compras que consomem limite
    let totalCompras = 0
    comprasDoCartao.forEach((compra) => {
      // Verificar se Ã© uma compra recorrente
      const compraRecorrente = comprasRecorrentesMap[compra.id]
      
      if (compraRecorrente) {
        // Ã‰ uma compra recorrente: sÃ³ consome limite se for do mÃªs atual ou meses passados
        const mesRecorrente = compraRecorrente.mes
        const anoRecorrente = compraRecorrente.ano
        
        // Comparar ano e mÃªs
        if (anoRecorrente < anoAtual || (anoRecorrente === anoAtual && mesRecorrente <= mesAtual)) {
          // MÃªs atual ou passado: consome limite
          totalCompras += compra.valor
        }
        // MÃªs futuro: nÃ£o consome limite (nÃ£o adiciona ao total)
      } else {
        // NÃ£o Ã© compra recorrente: sempre consome limite
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
        // Para cÃ¡lculo de faturas, usar apenas parcelas nÃ£o pagas
        const parcelasDoCartao = (parcelasPorCartao[cartao.id] || []).filter(p => !p.paga)
        const faturasMapTemp: { [key: string]: Fatura } = {}

        // Verificar quais faturas foram pagas
        const faturasPagasDoCartao = faturasPagas[cartao.id] || []
        const faturasPagasMap: { [key: string]: FaturaPaga } = {}
        faturasPagasDoCartao.forEach((faturaPaga) => {
          const key = `${faturaPaga.ano_referencia}-${String(faturaPaga.mes_referencia).padStart(2, '0')}`
          faturasPagasMap[key] = faturaPaga
        })

        // Adicionar compras Ã s faturas
        comprasDoCartao.forEach((compra) => {
          const dataCompra = new Date(compra.data)
          const { mes, ano } = calcularPeriodoFatura(dataCompra, cartao)

          const key = `${ano}-${String(mes + 1).padStart(2, '0')}`
          if (!faturasMapTemp[key]) {
            // Data de fechamento Ã© no mÃªs da fatura
            const dataFechamento = calcularDataFechamento(mes, ano, cartao.fechamento)
            // Data de vencimento Ã© no mÃªs seguinte ao fechamento
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

        // Adicionar parcelas Ã s faturas baseado na data de vencimento
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
        // 1. NÃ£o pagas primeiro, ordenadas por data de vencimento (mais prÃ³ximo primeiro)
        // 2. Pagas no final, tambÃ©m ordenadas por data de vencimento
        const faturasArray = Object.values(faturasMapTemp).sort((a, b) => {
          // Primeiro, separar pagas e nÃ£o pagas
          const aPaga = a.paga ? 1 : 0
          const bPaga = b.paga ? 1 : 0
          
          if (aPaga !== bPaga) {
            return aPaga - bPaga // NÃ£o pagas (0) vÃªm antes de pagas (1)
          }
          
          // Se ambas tÃªm o mesmo status, ordenar por data de vencimento
          const dataVencA = new Date(a.dataVencimento).getTime()
          const dataVencB = new Date(b.dataVencimento).getTime()
          return dataVencA - dataVencB // Mais prÃ³ximo primeiro
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
          .from('cartoes_empresa')
          .update(cartaoData)
          .eq('id', editingCartao.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('cartoes_empresa').insert([cartaoData])
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
      console.error('Erro ao salvar cartÃ£o:', error)
      alert('Erro ao salvar cartÃ£o')
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
        .from('faturas_pagas_cartao_empresa')
        .upsert({
          cartao_id: cartaoId,
          user_id: session?.user?.id,
          mes_referencia: mes + 1, // mes Ã© 0-indexed, banco espera 1-12
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
    if (!confirm('Deseja desmarcar esta fatura como paga? As compras serÃ£o redistribuÃ­das.')) return

    try {
      const { error } = await supabase
        .from('faturas_pagas_cartao_empresa')
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
        .from('parcelas_cartao_empresa')
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
        .from('parcelas_cartao_empresa')
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

    // Ajustar mÃªs e ano se necessÃ¡rio
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
          .from('parcelas_cartao_empresa')
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
          alert('Data de vencimento invÃ¡lida')
          return
        }

        const parcelasParaCriar = []

        // Criar parcelas do numero_parcela atual atÃ© o total_parcelas
        for (let i = numeroParcela; i <= totalParcelas; i++) {
          // Calcular quantos meses adicionar Ã  data inicial (0 para a primeira, 1 para a segunda, etc)
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
          .from('parcelas_cartao_empresa')
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
        .from('parcelas_cartao_empresa')
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
        .from('compras_cartao_empresa')
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
        metodo_pagamento: 'cartao', // Sempre cartÃ£o na pÃ¡gina de cartÃµes
        parcelada: false,
        total_parcelas: null,
      }

      if (editingCompra) {
        // Atualizar compra existente
        const { error } = await supabase
          .from('compras_cartao_empresa')
          .update(compraData)
          .eq('id', editingCompra.id)

        if (error) throw error
      } else {
        // Criar nova compra
        compraData.user_id = session?.user?.id

        const { error } = await supabase
          .from('compras_cartao_empresa')
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
    if (!confirm('Tem certeza que deseja excluir este cartÃ£o?')) return

    try {
      const { error } = await supabase.from('cartoes_empresa').delete().eq('id', id)
      if (error) throw error
      loadCartoes()
    } catch (error) {
      console.error('Erro ao excluir cartÃ£o:', error)
      alert('Erro ao excluir cartÃ£o')
    }
  }

  const toggleCartao = (cartaoId: string) => {
    setCartaoExpanded((prev) => {
      // Se o cartÃ£o clicado jÃ¡ estÃ¡ expandido, fecha
      if (prev === cartaoId) {
        return null
      }
      // Caso contrÃ¡rio, expande apenas o cartÃ£o clicado
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
      // Importar dinamicamente apenas quando necessÃ¡rio (evita problemas no build)
      const pdfExtractor = await import('@/lib/pdf-extractor')
      
      // Extrair texto do PDF
      const texto = await pdfExtractor.extrairTextoDoPDF(file)
      
      // Extrair mÃªs e ano de referÃªncia
      const referencia = pdfExtractor.extrairMesAnoReferencia(texto)
      if (referencia) {
        setMesReferencia(referencia.mes)
        setAnoReferencia(referencia.ano)
      }

      // Extrair transaÃ§Ãµes
      const transacoes = pdfExtractor.extrairTransacoesDoTexto(texto)
      
      // Ajustar todas as datas para usar o dia atual com o mÃªs e ano selecionados
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
        alert('Nenhuma transaÃ§Ã£o encontrada no PDF. Verifique se o arquivo Ã© uma fatura vÃ¡lida.')
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
      // Criar compras a partir das transaÃ§Ãµes
      // Usar sempre o dia atual com o mÃªs e ano selecionados
      const hoje = new Date()
      const diaAtual = hoje.getDate()
      
      // Verificar se o dia atual existe no mÃªs selecionado
      const ultimoDiaDoMes = new Date(anoReferencia, mesReferencia, 0).getDate()
      const diaAjustado = Math.min(diaAtual, ultimoDiaDoMes)
      
      const dataBase = new Date(anoReferencia, mesReferencia - 1, diaAjustado)
      const dataFormatada = dataBase.toISOString().split('T')[0]
      
      const comprasParaInserir = transacoesExtraidas.map(transacao => ({
        user_id: session.user.id,
        cartao_id: pdfCartaoId,
        descricao: transacao.descricao,
        valor: transacao.valor,
        data: dataFormatada, // Todas as compras terÃ£o a mesma data (dia atual do mÃªs/ano selecionado)
        categoria: transacao.categoria || categoriasDespesa[0]?.nome || 'Outros',
        metodo_pagamento: 'cartao',
        parcelada: false,
        total_parcelas: null,
      }))

      const { error: comprasError } = await supabase
        .from('compras_cartao_empresa')
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
      // Validar se a data Ã© vÃ¡lida
      const dia = parseInt(day)
      const mes = parseInt(month)
      const ano = parseInt(year)
      
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
        // Verificar se o dia existe no mÃªs
        const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
        const diaAjustado = Math.min(dia, ultimoDiaDoMes)
        
        return `${ano}-${String(mes).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`
      }
    }
    // Se jÃ¡ estiver no formato correto, retornar como estÃ¡
    if (dataFormatada.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dataFormatada
    }
    // Se nÃ£o conseguir parsear, retornar data atual
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  }

  const aplicarMascaraData = (valor: string): string => {
    // Remove tudo que nÃ£o Ã© nÃºmero
    const numeros = valor.replace(/\D/g, '')
    
    // Aplica a mÃ¡scara DD/MM/YYYY
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
      // Se o valor jÃ¡ estÃ¡ no formato DD/MM/YYYY, converter para YYYY-MM-DD
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

  return (
    <CartoesEmpresaUI
      loading={loading}
      cartoes={cartoes}
      faturasPorCartao={faturasPorCartao}
      parcelasPorCartao={parcelasPorCartao}
      cartaoExpanded={cartaoExpanded}
      parcelasCartaoExpanded={parcelasCartaoExpanded}
      faturasExpandidas={faturasExpandidas}
      formData={formData}
      parcelaFormData={parcelaFormData}
      compraFormData={compraFormData}
      formDataCategoria={formDataCategoria}
      showModal={showModal}
      showParcelaModal={showParcelaModal}
      showCompraModal={showCompraModal}
      showModalCategoria={showModalCategoria}
      showPdfModal={showPdfModal}
      editingCartao={editingCartao}
      editingParcela={editingParcela}
      editingCompra={editingCompra}
      pdfCartaoId={pdfCartaoId}
      transacoesExtraidas={transacoesExtraidas}
      processandoPdf={processandoPdf}
      uploadingPdf={uploadingPdf}
      mesReferencia={mesReferencia}
      anoReferencia={anoReferencia}
      categoriasDespesa={categoriasDespesa}
      formatarMoeda={formatarMoeda}
      formatDate={formatDate}
      formatarDataParaInput={formatarDataParaInput}
      aplicarMascaraData={aplicarMascaraData}
      calcularLimiteDisponivel={calcularLimiteDisponivel}
      setFormData={setFormData}
      setParcelaFormData={setParcelaFormData}
      setCompraFormData={setCompraFormData}
      setFormDataCategoria={setFormDataCategoria}
      setShowModal={setShowModal}
      setShowParcelaModal={setShowParcelaModal}
      setShowCompraModal={setShowCompraModal}
      setShowModalCategoria={setShowModalCategoria}
      setShowPdfModal={setShowPdfModal}
      setEditingCartao={setEditingCartao}
      setEditingParcela={setEditingParcela}
      setEditingCompra={setEditingCompra}
      setTransacoesExtraidas={setTransacoesExtraidas}
      setMesReferencia={setMesReferencia}
      setAnoReferencia={setAnoReferencia}
      toggleCartao={toggleCartao}
      toggleParcelasCartao={toggleParcelasCartao}
      toggleFatura={toggleFatura}
      handleSubmit={handleSubmit}
      handleEdit={handleEdit}
      handleDelete={handleDelete}
      handleSubmitParcela={handleSubmitParcela}
      handleEditParcela={handleEditParcela}
      handleDeleteParcela={handleDeleteParcela}
      handleMarcarParcelaPaga={handleMarcarParcelaPaga}
      handleDesmarcarParcelaPaga={handleDesmarcarParcelaPaga}
      handleSubmitCompra={handleSubmitCompra}
      handleEditCompra={handleEditCompra}
      handleDeleteCompra={handleDeleteCompra}
      handleMarcarFaturaPaga={handleMarcarFaturaPaga}
      handleDesmarcarFaturaPaga={handleDesmarcarFaturaPaga}
      handleUploadPdf={handleUploadPdf}
      handleProcessarPdf={handleProcessarPdf}
      handleConfirmarTransacoes={handleConfirmarTransacoes}
      handleEditarTransacao={handleEditarTransacao}
      handleRemoverTransacao={handleRemoverTransacao}
      handleCriarCategoria={handleCriarCategoria}
    />
  )
}

