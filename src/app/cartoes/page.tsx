'use client'

import { useEffect, useState, useCallback } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { formatDate } from '@/lib/utils'
import { FiPlus, FiEdit, FiTrash2, FiCreditCard, FiChevronDown, FiChevronUp, FiX, FiCheck } from 'react-icons/fi'

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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showParcelaModal, setShowParcelaModal] = useState(false)
  const [showCompraModal, setShowCompraModal] = useState(false)
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null)
  const [editingParcela, setEditingParcela] = useState<Parcela | null>(null)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [cartaoExpanded, setCartaoExpanded] = useState<string | null>(null)
  const [parcelasCartaoExpanded, setParcelasCartaoExpanded] = useState<string | null>(null)
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

  useEffect(() => {
    if (cartoes.length > 0 && session) {
      loadFaturasPagas()
      loadParcelasPorCartao()
      loadComprasPorCartao()
    }
  }, [cartoes, session])

  useEffect(() => {
    if (cartoes.length > 0 && (Object.keys(parcelasPorCartao).length > 0 || Object.keys(comprasPorCartao).length > 0)) {
      calcularFaturas()
    }
  }, [parcelasPorCartao, comprasPorCartao, faturasPagas, cartoes])

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

        // Converter para array e ordenar faturas por data de vencimento (mais próximo primeiro)
        // Ordenar do mês mais próximo do atual para o mais distante
        const faturasArray = Object.values(faturasMapTemp).sort((a, b) => {
          const dataVencA = new Date(a.dataVencimento).getTime()
          const dataVencB = new Date(b.dataVencimento).getTime()
          return dataVencA - dataVencB // Mais próximo primeiro (data menor = mais próxima vem primeiro)
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
          <div className="columns-1 md:columns-2 gap-4">
            {cartoes.map((cartao, index) => {
              const faturas = faturasPorCartao[cartao.id] || []
              const isExpanded = cartaoExpanded === cartao.id
              const totalGasto = faturas.reduce((sum, fatura) => sum + fatura.total, 0)

              return (
                <div
                  key={`cartao-${cartao.id}-${index}`}
                  className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200 flex flex-col break-inside-avoid mb-4"
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
                              R$ {cartao.limite.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Gasto Total:</span>
                            <p className="text-red-400 font-semibold">
                              R$ {totalGasto.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Disponível:</span>
                            <p className="text-green-400 font-semibold">
                              R$ {(cartao.limite - totalGasto).toFixed(2)}
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
                          Total: R$ {totalGasto.toFixed(2)}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Lista de Faturas */}
                  {isExpanded && faturas.length > 0 && (
                    <div className="border-t border-gray-700">
                      <div className="p-6 space-y-4">
                        {faturas.map((fatura, index) => (
                          <div
                            key={`${fatura.ano}-${fatura.mes}`}
                            className={`rounded-lg p-4 border ${
                              fatura.paga 
                                ? 'bg-green-900/20 border-green-700/50' 
                                : 'bg-gray-700/50 border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
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
                              <div className="text-right ml-4">
                                <p className={`text-xl font-bold ${fatura.paga ? 'text-green-400' : 'text-red-400'}`}>
                                  R$ {fatura.total.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {fatura.compras.length} compra{fatura.compras.length !== 1 ? 's' : ''}
                                  {fatura.parcelas.length > 0 && ` • ${fatura.parcelas.length} parcela${fatura.parcelas.length !== 1 ? 's' : ''}`}
                                </p>
                                {!fatura.paga && (
                                  <button
                                    onClick={() => handleMarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano, fatura.total)}
                                    className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                  >
                                    Marcar como Paga
                                  </button>
                                )}
                                {fatura.paga && (
                                  <button
                                    onClick={() => handleDesmarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano)}
                                    className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                                  >
                                    Desmarcar
                                  </button>
                                )}
                              </div>
                            </div>

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
                                        R$ {compra.valor.toFixed(2)}
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
                                        R$ {parcela.valor.toFixed(2)}
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
                        ))}
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
                              R$ {totalPendente.toFixed(2)} pendente
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
                  <select
                    value={parcelaFormData.categoria}
                    onChange={(e) =>
                      setParcelaFormData({ ...parcelaFormData, categoria: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {tiposGastos.map((tipo) => (
                      <option key={tipo.id} value={tipo.nome}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
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
                  <select
                    value={compraFormData.categoria}
                    onChange={(e) =>
                      setCompraFormData({ ...compraFormData, categoria: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {tiposGastos.map((tipo) => (
                      <option key={tipo.id} value={tipo.nome}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
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
      </div>
    </MainLayout>
  )
}
