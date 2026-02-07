'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { FiChevronDown, FiChevronUp, FiShoppingCart, FiEdit, FiTrash2, FiDownload, FiPlus, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { formatDate, formatarMoeda } from '@/lib/utils'

interface Compra {
  id: string
  descricao: string
  valor: number
  data: string
  cartao_id: string | null
  categoria: string
  metodo_pagamento: string
  user_id: string
}

interface Cartao {
  id: string
  nome: string
  vencimento?: number
  cor?: string
}

interface TipoGasto {
  id: string
  nome: string
  descricao: string | null
  cor: string
  user_id: string
}

interface DespesaFixa {
  id: string
  descricao: string
  valor: number
  categoria: string
  metodo_pagamento: string
  cartao_id: string | null
  dia_vencimento: number
  ativa: boolean
  user_id: string
}

interface CompraRecorrente {
  id: string
  descricao: string
  valor: number
  categoria: string
  metodo_pagamento: string
  cartao_id: string | null
  dia_compra: number
  ativa: boolean
  user_id: string
}

interface GastosPorMes {
  ano: number
  mes: number
  mesNome: string
  total: number
  compras: Compra[]
  paga?: boolean
}

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function GastosPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'despesas' | 'recorrentes'>('despesas')
  const [gastosPorMes, setGastosPorMes] = useState<GastosPorMes[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  const [comprasRecorrentes, setComprasRecorrentes] = useState<CompraRecorrente[]>([])
  const [loading, setLoading] = useState(true)
  const [mesesAbertos, setMesesAbertos] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [showNotificacaoDespesaFixa, setShowNotificacaoDespesaFixa] = useState(false)
  const [despesaFixaParaCriar, setDespesaFixaParaCriar] = useState<DespesaFixa | null>(null)
  const [valorDespesaFixa, setValorDespesaFixa] = useState('')
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [showModalRecorrente, setShowModalRecorrente] = useState(false)
  const [editingRecorrente, setEditingRecorrente] = useState<CompraRecorrente | null>(null)
  const [formDataCategoria, setFormDataCategoria] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
  })
  const [formDataRecorrente, setFormDataRecorrente] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    metodo_pagamento: 'cartao',
    cartao_id: '',
    dia_compra: new Date().getDate().toString(),
    ativa: true,
  })
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'metodo_pagamento', direcao: 'asc' })
  const [mesesPagos, setMesesPagos] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    descricao: '',
    descricaoSelecionada: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    metodo_pagamento: 'cartao',
    cartao_id: '',
    categoria: '',
    parcelada: false,
    total_parcelas: '1',
    despesa_fixa: false,
    dia_vencimento: new Date().getDate().toString(),
  })

  const sugestoesDescricoes = [
    'Supermercado',
    'Farmácia',
    'Restaurante',
    'Transporte',
    'Combustível',
    'Conta de Luz',
    'Conta de Água',
    'Internet',
    'Telefone',
    'Academia',
    'Cinema',
    'Shopping',
    'Roupas',
    'Presente',
    'Medicamentos',
    'Médico',
    'Dentista',
    'Pet Shop',
    'Manutenção',
    'Educação',
    'PERSONALIZADO'
  ]

  useEffect(() => {
    if (session) {
      resetarComprasRecorrentesAnoAnterior()
      verificarComprasRecorrentes()
      loadMesesPagos()
      loadDados()
      verificarDespesasFixas()
      if (activeTab === 'recorrentes') {
        loadComprasRecorrentes()
      }
    }
  }, [session, activeTab])

  const loadMesesPagos = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const { data, error } = await supabase
        .from('meses_pagos')
        .select('mes, ano')
        .eq('user_id', userId)
        .eq('paga', true)

      if (error) throw error

      const pagos = new Set((data || []).map(m => `${m.ano}-${m.mes}`))
      setMesesPagos(pagos)
    } catch (error) {
      console.error('Erro ao carregar meses pagos:', error)
    }
  }

  const handleToggleMesPago = async (ano: number, mes: number) => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const key = `${ano}-${mes}`
      const estaPago = mesesPagos.has(key)

      if (estaPago) {
        // Desmarcar como pago
        const { error } = await supabase
          .from('meses_pagos')
          .delete()
          .eq('user_id', userId)
          .eq('ano', ano)
          .eq('mes', mes)

        if (error) throw error

        setMesesPagos(prev => {
          const novo = new Set(prev)
          novo.delete(key)
          return novo
        })
      } else {
        // Marcar como pago
        const { error } = await supabase
          .from('meses_pagos')
          .upsert({
            user_id: userId,
            mes: mes,
            ano: ano,
            paga: true,
            data_pagamento: new Date().toISOString().split('T')[0],
          }, {
            onConflict: 'user_id,mes,ano'
          })

        if (error) throw error

        setMesesPagos(prev => {
          const novo = new Set(prev)
          novo.add(key)
          return novo
        })
      }
      
      // Recarregar dados para atualizar a ordenação
      loadDados()
    } catch (error) {
      console.error('Erro ao alterar status de pagamento do mês:', error)
      alert('Erro ao alterar status de pagamento')
    }
  }

  /**
   * Reseta as compras recorrentes do ano anterior
   * Remove todos os registros de compras_recorrentes_mensais do ano anterior
   */
  const resetarComprasRecorrentesAnoAnterior = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const anoAtual = new Date().getFullYear()
      const anoAnterior = anoAtual - 1

      // Deletar registros de compras_recorrentes_mensais do ano anterior
      const { error } = await supabase
        .from('compras_recorrentes_mensais')
        .delete()
        .eq('user_id', userId)
        .eq('ano', anoAnterior)

      if (error) {
        console.error('Erro ao resetar compras recorrentes do ano anterior:', error)
      } else {
        console.log(`Compras recorrentes do ano ${anoAnterior} resetadas com sucesso`)
      }
    } catch (error) {
      console.error('Erro ao resetar compras recorrentes:', error)
    }
  }

  /**
   * Verifica e cria automaticamente compras recorrentes para todos os meses do ano atual
   * que ainda não foram criadas
   */
  const verificarComprasRecorrentes = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const now = new Date()
      const anoAtual = now.getFullYear()
      const mesAtual = now.getMonth() + 1

      // Buscar todas as compras recorrentes ativas
      const { data: comprasRecorrentes, error: recorrentesError } = await supabase
        .from('compras_recorrentes')
        .select('*')
        .eq('user_id', userId)
        .eq('ativa', true)

      if (recorrentesError) throw recorrentesError

      if (!comprasRecorrentes || comprasRecorrentes.length === 0) return

      // Buscar quais meses/anos já foram criados para cada compra recorrente
      const { data: comprasMensais, error: mensaisError } = await supabase
        .from('compras_recorrentes_mensais')
        .select('compra_recorrente_id, mes, ano')
        .eq('user_id', userId)
        .eq('ano', anoAtual)

      if (mensaisError) throw mensaisError

      // Criar um Set para verificar rapidamente quais combinações já existem
      const criadas = new Set(
        (comprasMensais || []).map(c => `${c.compra_recorrente_id}-${c.mes}-${c.ano}`)
      )

      // Para cada compra recorrente, criar compras para todos os 12 meses do ano atual
      // que ainda não foram criadas
      for (const compraRecorrente of comprasRecorrentes) {
        for (let mes = 1; mes <= 12; mes++) {
          const key = `${compraRecorrente.id}-${mes}-${anoAtual}`
          
          // Se já foi criada, pular
          if (criadas.has(key)) continue

          // Calcular a data da compra (dia_compra do mês atual)
          const diaCompra = Math.min(compraRecorrente.dia_compra, new Date(anoAtual, mes, 0).getDate())
          const dataCompra = new Date(anoAtual, mes - 1, diaCompra)

          // Criar a compra
          const compraData: any = {
            user_id: userId,
            descricao: compraRecorrente.descricao,
            valor: compraRecorrente.valor,
            data: dataCompra.toISOString().split('T')[0],
            categoria: compraRecorrente.categoria,
            metodo_pagamento: compraRecorrente.metodo_pagamento,
            cartao_id: compraRecorrente.cartao_id,
          }

          const { data: novaCompra, error: compraError } = await supabase
            .from('compras')
            .insert([compraData])
            .select()
            .single()

          if (compraError) {
            console.error(`Erro ao criar compra recorrente para ${mes}/${anoAtual}:`, compraError)
            continue
          }

          // Registrar na tabela de compras_recorrentes_mensais
          const { error: mensalError } = await supabase
            .from('compras_recorrentes_mensais')
            .insert([{
              compra_recorrente_id: compraRecorrente.id,
              user_id: userId,
              compra_id: novaCompra.id,
              mes: mes,
              ano: anoAtual,
              valor: compraRecorrente.valor,
            }])

          if (mensalError) {
            console.error(`Erro ao registrar compra recorrente mensal para ${mes}/${anoAtual}:`, mensalError)
            // Se falhar ao registrar, deletar a compra criada
            await supabase.from('compras').delete().eq('id', novaCompra.id)
          } else {
            console.log(`Compra recorrente criada automaticamente: ${compraRecorrente.descricao} - ${mes}/${anoAtual}`)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar compras recorrentes:', error)
    }
  }

  const verificarDespesasFixas = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      const now = new Date()
      const mesAtual = now.getMonth() + 1
      const anoAtual = now.getFullYear()

      const { data: despesasFixas, error: despesasError } = await supabase
        .from('despesas_fixas')
        .select('*')
        .eq('user_id', userId)
        .eq('ativa', true)

      if (despesasError) throw despesasError

      if (!despesasFixas || despesasFixas.length === 0) return

      const { data: despesasMensais, error: mensaisError } = await supabase
        .from('despesas_fixas_mensais')
        .select('despesa_fixa_id')
        .eq('user_id', userId)
        .eq('mes', mesAtual)
        .eq('ano', anoAtual)

      if (mensaisError) throw mensaisError

      const idsCriadas = new Set((despesasMensais || []).map(d => d.despesa_fixa_id))
      const despesasPendentes = despesasFixas.filter(df => !idsCriadas.has(df.id))

      if (despesasPendentes.length > 0) {
        setDespesaFixaParaCriar(despesasPendentes[0] as DespesaFixa)
        setValorDespesaFixa(despesasPendentes[0].valor.toString())
        setShowNotificacaoDespesaFixa(true)
      }
    } catch (error) {
      console.error('Erro ao verificar despesas fixas:', error)
    }
  }

  const loadDados = async () => {
    try {
      setLoading(true)
      const userId = session?.user?.id

      const { data: cartoesData } = await supabase
        .from('cartoes')
        .select('id, nome, vencimento, cor')
        .eq('user_id', userId)

      setCartoes((cartoesData || []) as Cartao[])

      const { data: tiposData } = await supabase
        .from('tipos_gastos')
        .select('*')
        .eq('user_id', userId)

      setTiposGastos(tiposData || [])

      const { data: todasCompras, error } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .order('data', { ascending: false })

      if (error) throw error

      const compras = todasCompras?.filter(compra => {
        const isParcelada = compra.parcelada === true || (compra as any).total_parcelas > 1
        return !isParcelada
      }) || []

      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: false })

      if (parcelasError) throw parcelasError

      const gastosAgrupados: { [key: string]: GastosPorMes } = {}

      compras?.forEach((compra) => {
        const data = new Date(compra.data)
        const ano = data.getFullYear()
        const mes = data.getMonth() + 1
        const key = `${ano}-${mes}`

        if (!gastosAgrupados[key]) {
          gastosAgrupados[key] = {
            ano,
            mes,
            mesNome: mesesNomes[mes - 1],
            total: 0,
            compras: [],
            paga: mesesPagos.has(key),
          }
        }

        gastosAgrupados[key].compras.push(compra)
        gastosAgrupados[key].total += compra.valor
      })

      parcelas?.forEach((parcela) => {
        const dataVencimento = new Date(parcela.data_vencimento)
        const ano = dataVencimento.getFullYear()
        const mes = dataVencimento.getMonth() + 1
        const key = `${ano}-${mes}`

        if (!gastosAgrupados[key]) {
          gastosAgrupados[key] = {
            ano,
            mes,
            mesNome: mesesNomes[mes - 1],
            total: 0,
            compras: [],
          }
        }

        gastosAgrupados[key].compras.push({
          ...parcela,
          id: parcela.id,
          descricao: parcela.descricao,
          valor: parcela.valor,
          data: parcela.data_vencimento,
          cartao_id: parcela.cartao_id,
          categoria: parcela.categoria,
          metodo_pagamento: 'cartao',
          user_id: parcela.user_id,
        })
        gastosAgrupados[key].total += parcela.valor
      })

      const agora = new Date()
      const anoAtual = agora.getFullYear()
      const mesAtual = agora.getMonth() + 1
      
      // Atualizar status de pago baseado no estado mesesPagos
      const gastosComStatus = Object.values(gastosAgrupados).map(gasto => ({
        ...gasto,
        paga: mesesPagos.has(`${gasto.ano}-${gasto.mes}`)
      }))

      // Ordenar: não pagos primeiro em ordem cronológica (Janeiro a Dezembro), 
      // depois pagos no final também em ordem cronológica (Janeiro a Dezembro)
      const gastosArray = gastosComStatus.sort((a, b) => {
        // Primeiro, separar pagos e não pagos
        const aPago = a.paga ? 1 : 0
        const bPago = b.paga ? 1 : 0
        
        if (aPago !== bPago) {
          return aPago - bPago // Não pagos (0) vêm antes de pagos (1)
        }
        
        // Se ambos têm o mesmo status (ambos pagos ou ambos não pagos), 
        // ordenar por ano e depois por mês em ordem cronológica (Janeiro = 1, Dezembro = 12)
        if (a.ano !== b.ano) {
          return a.ano - b.ano // Ano menor primeiro
        }
        return a.mes - b.mes // Mês menor primeiro (Janeiro antes de Dezembro)
      })

      setGastosPorMes(gastosArray)

      const mesAtualKey = `${anoAtual}-${mesAtual}`
      setMesesAbertos(new Set([mesAtualKey]))
    } catch (error) {
      console.error('Erro ao carregar gastos:', error)
    } finally {
      setLoading(false)
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

      const { data: tiposData } = await supabase
        .from('tipos_gastos')
        .select('*')
        .eq('user_id', userId)

      setTiposGastos(tiposData || [])
      setFormData({ ...formData, categoria: novaCategoria.nome })
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

  const toggleMes = (ano: number, mes: number) => {
    const key = `${ano}-${mes}`
    const novosAbertos = new Set(mesesAbertos)
    if (novosAbertos.has(key)) {
      novosAbertos.delete(key)
    } else {
      novosAbertos.add(key)
    }
    setMesesAbertos(novosAbertos)
  }

  const isMesAberto = (ano: number, mes: number) => {
    return mesesAbertos.has(`${ano}-${mes}`)
  }

  const getCartaoNome = (cartaoId: string | null) => {
    if (!cartaoId) return 'N/A'
    return cartoes.find((c) => c.id === cartaoId)?.nome || 'N/A'
  }

  const getTipoGasto = (categoriaNome: string) => {
    return tiposGastos.find((t) => t.nome === categoriaNome)
  }

  const calcularDataVencimentoParcela = (dataCompra: Date, numeroParcela: number, cartaoId: string | null) => {
    if (!cartaoId) {
      const data = new Date(dataCompra)
      data.setMonth(data.getMonth() + numeroParcela - 1)
      return data
    }

    const cartao = cartoes.find(c => c.id === cartaoId)
    if (!cartao) {
      const data = new Date(dataCompra)
      data.setMonth(data.getMonth() + numeroParcela - 1)
      return data
    }

    const dataBase = new Date(dataCompra)
    let mesVencimento = dataBase.getMonth() + numeroParcela - 1
    let anoVencimento = dataBase.getFullYear()

    while (mesVencimento > 11) {
      mesVencimento -= 12
      anoVencimento += 1
    }

    const ultimoDia = new Date(anoVencimento, mesVencimento + 1, 0).getDate()
    const diaVencimentoCartao = cartao.vencimento ?? 15
    const diaVencimento = Math.min(diaVencimentoCartao, ultimoDia)

    return new Date(anoVencimento, mesVencimento, diaVencimento)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const valorTotal = parseFloat(formData.valor)
      const totalParcelas = parseInt(formData.total_parcelas) || 1
      const isParcelada = formData.parcelada === true && formData.metodo_pagamento === 'cartao' && totalParcelas > 1

      const descricaoFinal = formData.descricaoSelecionada === 'PERSONALIZADO' || !formData.descricaoSelecionada
        ? formData.descricao
        : formData.descricaoSelecionada

      const compraData: any = {
        descricao: descricaoFinal,
        valor: valorTotal,
        data: formData.data,
        metodo_pagamento: formData.metodo_pagamento,
        categoria: formData.categoria,
        user_id: session?.user?.id,
        parcelada: !!isParcelada,
        total_parcelas: isParcelada ? totalParcelas : null,
      }

      if (formData.metodo_pagamento === 'cartao') {
        compraData.cartao_id = formData.cartao_id || null
      } else {
        compraData.cartao_id = null
      }

      if (editingCompra) {
        const { error } = await supabase
          .from('compras')
          .update(compraData)
          .eq('id', editingCompra.id)

        if (error) throw error

        if (!isParcelada) {
          await supabase
            .from('parcelas')
            .delete()
            .eq('compra_id', editingCompra.id)
        } else if (isParcelada && formData.cartao_id) {
          await supabase
            .from('parcelas')
            .delete()
            .eq('compra_id', editingCompra.id)

          const valorParcelaBase = valorTotal / totalParcelas
          const valorParcelaArredondado = Math.round(valorParcelaBase * 100) / 100
          const somaParcelasArredondadas = valorParcelaArredondado * (totalParcelas - 1)
          const valorUltimaParcela = valorTotal - somaParcelasArredondadas
          
          const dataCompra = new Date(formData.data)
          const parcelas = []

          for (let i = 1; i <= totalParcelas; i++) {
            const dataVencimento = calcularDataVencimentoParcela(dataCompra, i, formData.cartao_id)
            const valorParcela = i === totalParcelas ? Math.round(valorUltimaParcela * 100) / 100 : valorParcelaArredondado
            
            parcelas.push({
              user_id: session?.user?.id,
              compra_id: editingCompra.id,
              cartao_id: formData.cartao_id,
              descricao: `${descricaoFinal} - Parcela ${i}/${totalParcelas}`,
              valor: valorParcela,
              numero_parcela: i,
              total_parcelas: totalParcelas,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              categoria: formData.categoria,
              paga: false,
            })
          }

          const { error: parcelasError } = await supabase
            .from('parcelas')
            .insert(parcelas)

          if (parcelasError) throw parcelasError
        }
      } else {
        const { data: novaCompra, error: compraError } = await supabase
          .from('compras')
          .insert([compraData])
          .select()
          .single()

        if (compraError) throw compraError

        if (formData.despesa_fixa && novaCompra) {
          const diaVencimento = parseInt(formData.dia_vencimento) || new Date().getDate()
          const despesaFixaData: any = {
            user_id: session?.user?.id,
            descricao: formData.descricao,
            valor: valorTotal,
            categoria: formData.categoria,
            metodo_pagamento: formData.metodo_pagamento,
            dia_vencimento: Math.min(31, Math.max(1, diaVencimento)),
            ativa: true,
          }

          if (formData.metodo_pagamento === 'cartao' && formData.cartao_id) {
            despesaFixaData.cartao_id = formData.cartao_id
          }

          const { data: novaDespesaFixa, error: despesaFixaError } = await supabase
            .from('despesas_fixas')
            .insert([despesaFixaData])
            .select()
            .single()

          if (despesaFixaError) throw despesaFixaError

          const now = new Date()
          const mesAtual = now.getMonth() + 1
          const anoAtual = now.getFullYear()

          await supabase
            .from('despesas_fixas_mensais')
            .insert([{
              despesa_fixa_id: novaDespesaFixa.id,
              user_id: session?.user?.id,
              compra_id: novaCompra.id,
              mes: mesAtual,
              ano: anoAtual,
              valor: valorTotal,
            }])
        }

        if (isParcelada && novaCompra && formData.cartao_id && totalParcelas > 1) {
          const valorParcelaBase = valorTotal / totalParcelas
          const valorParcelaArredondado = Math.round(valorParcelaBase * 100) / 100
          const somaParcelasArredondadas = valorParcelaArredondado * (totalParcelas - 1)
          const valorUltimaParcela = Math.round((valorTotal - somaParcelasArredondadas) * 100) / 100
          
          const dataCompra = new Date(formData.data)
          const parcelas = []

          for (let i = 1; i <= totalParcelas; i++) {
            const dataVencimento = calcularDataVencimentoParcela(dataCompra, i, formData.cartao_id)
            const valorParcela = i === totalParcelas ? valorUltimaParcela : valorParcelaArredondado
            
            parcelas.push({
              user_id: session?.user?.id,
              compra_id: novaCompra.id,
              cartao_id: formData.cartao_id,
              descricao: `${descricaoFinal} - Parcela ${i}/${totalParcelas}`,
              valor: Number(valorParcela.toFixed(2)),
              numero_parcela: i,
              total_parcelas: totalParcelas,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              categoria: formData.categoria,
              paga: false,
            })
          }

          const { error: parcelasError } = await supabase
            .from('parcelas')
            .insert(parcelas)

          if (parcelasError) throw parcelasError
        }
      }

      setShowModal(false)
      setEditingCompra(null)
      setFormData({
        descricao: '',
        descricaoSelecionada: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        metodo_pagamento: 'cartao',
        cartao_id: '',
        categoria: '',
        parcelada: false,
        total_parcelas: '1',
        despesa_fixa: false,
        dia_vencimento: new Date().getDate().toString(),
      })
      loadDados()
    } catch (error) {
      console.error('Erro ao salvar despesa:', error)
      alert('Erro ao salvar despesa')
    }
  }

  const criarDespesaFixaMensal = async (despesaFixa: DespesaFixa, valor: number) => {
    try {
      const now = new Date()
      const mesAtual = now.getMonth() + 1
      const anoAtual = now.getFullYear()
      
      const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate()
      const diaVencimento = Math.min(despesaFixa.dia_vencimento, ultimoDia)
      const dataDespesa = new Date(anoAtual, mesAtual - 1, diaVencimento).toISOString().split('T')[0]

      const compraData: any = {
        descricao: despesaFixa.descricao,
        valor: valor,
        data: dataDespesa,
        metodo_pagamento: despesaFixa.metodo_pagamento,
        categoria: despesaFixa.categoria,
        user_id: session?.user?.id,
        parcelada: false,
        total_parcelas: null,
      }

      if (despesaFixa.metodo_pagamento === 'cartao' && despesaFixa.cartao_id) {
        compraData.cartao_id = despesaFixa.cartao_id
      }

      const { data: novaCompra, error: compraError } = await supabase
        .from('compras')
        .insert([compraData])
        .select()
        .single()

      if (compraError) throw compraError

      const { error: mensalError } = await supabase
        .from('despesas_fixas_mensais')
        .insert([{
          despesa_fixa_id: despesaFixa.id,
          user_id: session?.user?.id,
          compra_id: novaCompra.id,
          mes: mesAtual,
          ano: anoAtual,
          valor: valor,
        }])

      if (mensalError) throw mensalError

      setShowNotificacaoDespesaFixa(false)
      setDespesaFixaParaCriar(null)
      setValorDespesaFixa('')
      loadDados()
      verificarDespesasFixas()
    } catch (error) {
      console.error('Erro ao criar despesa fixa mensal:', error)
      alert('Erro ao criar despesa fixa mensal')
    }
  }

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra)
    const descricaoNaLista = sugestoesDescricoes.find(s => s === compra.descricao)
    setFormData({
      descricao: compra.descricao,
      descricaoSelecionada: descricaoNaLista ? compra.descricao : (compra.descricao ? 'PERSONALIZADO' : ''),
      valor: compra.valor.toString(),
      data: compra.data.split('T')[0],
      metodo_pagamento: compra.metodo_pagamento || 'cartao',
      cartao_id: compra.cartao_id || '',
      categoria: compra.categoria,
      parcelada: (compra as any).parcelada || false,
      total_parcelas: ((compra as any).total_parcelas || 1).toString(),
      despesa_fixa: false,
      dia_vencimento: new Date().getDate().toString(),
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return

    try {
      const { error } = await supabase.from('compras').delete().eq('id', id)
      if (error) throw error
      loadDados()
    } catch (error) {
      console.error('Erro ao excluir despesa:', error)
      alert('Erro ao excluir despesa')
    }
  }

  const loadComprasRecorrentes = async () => {
    try {
      const { data, error } = await supabase
        .from('compras_recorrentes')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('descricao')

      if (error) throw error
      setComprasRecorrentes(data || [])
    } catch (error) {
      console.error('Erro ao carregar compras recorrentes:', error)
    }
  }

  const handleSubmitRecorrente = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const recorrenteData = {
        descricao: formDataRecorrente.descricao,
        valor: parseFloat(formDataRecorrente.valor),
        categoria: formDataRecorrente.categoria,
        metodo_pagamento: formDataRecorrente.metodo_pagamento,
        cartao_id: formDataRecorrente.metodo_pagamento === 'cartao' && formDataRecorrente.cartao_id ? formDataRecorrente.cartao_id : null,
        dia_compra: parseInt(formDataRecorrente.dia_compra),
        ativa: formDataRecorrente.ativa,
        user_id: session?.user?.id,
      }

      if (editingRecorrente) {
        const { error } = await supabase
          .from('compras_recorrentes')
          .update(recorrenteData)
          .eq('id', editingRecorrente.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('compras_recorrentes')
          .insert([recorrenteData])

        if (error) throw error
      }

      setShowModalRecorrente(false)
      setEditingRecorrente(null)
      setFormDataRecorrente({
        descricao: '',
        valor: '',
        categoria: '',
        metodo_pagamento: 'cartao',
        cartao_id: '',
        dia_compra: new Date().getDate().toString(),
        ativa: true,
      })
      loadComprasRecorrentes()
    } catch (error) {
      console.error('Erro ao salvar compra recorrente:', error)
      alert('Erro ao salvar compra recorrente')
    }
  }

  const handleEditRecorrente = (recorrente: CompraRecorrente) => {
    setEditingRecorrente(recorrente)
    setFormDataRecorrente({
      descricao: recorrente.descricao,
      valor: recorrente.valor.toString(),
      categoria: recorrente.categoria,
      metodo_pagamento: recorrente.metodo_pagamento,
      cartao_id: recorrente.cartao_id || '',
      dia_compra: recorrente.dia_compra.toString(),
      ativa: recorrente.ativa,
    })
    setShowModalRecorrente(true)
  }

  const handleDeleteRecorrente = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta compra recorrente?')) return

    try {
      const { error } = await supabase
        .from('compras_recorrentes')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadComprasRecorrentes()
    } catch (error) {
      console.error('Erro ao remover compra recorrente:', error)
      alert('Erro ao remover compra recorrente')
    }
  }

  const handleToggleRecorrente = async (id: string, ativa: boolean) => {
    try {
      const { error } = await supabase
        .from('compras_recorrentes')
        .update({ ativa: !ativa })
        .eq('id', id)

      if (error) throw error
      loadComprasRecorrentes()
    } catch (error) {
      console.error('Erro ao alterar status da compra recorrente:', error)
      alert('Erro ao alterar status da compra recorrente')
    }
  }

  const exportarPDF = async (gastoMes: GastosPorMes) => {
    // Importar jsPDF dinamicamente apenas no cliente
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    const primaryColor: [number, number, number] = [30, 58, 95]
    const grayColor: [number, number, number] = [107, 114, 128]

    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Infinity Lines', margin, 20)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Despesas', margin, 30)

    yPos = 50

    doc.setTextColor(...primaryColor)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${gastoMes.mesNome} ${gastoMes.ano}`, margin, yPos)
    yPos += 10

    doc.setTextColor(...grayColor)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total: R$ ${formatarMoeda(gastoMes.total)}`, margin, yPos)
    yPos += 6
    doc.text(`Total de compras: ${gastoMes.compras.length}`, margin, yPos)
    yPos += 15

    const tableTop = yPos
    const colHeaders = ['Descrição', 'Valor', 'Data', 'Método', 'Categoria']
    const colX = [margin, margin + 60, margin + 90, margin + 115, margin + 145]

    doc.setFillColor(...primaryColor)
    doc.rect(margin, tableTop - 8, pageWidth - (margin * 2), 8, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    colHeaders.forEach((header, i) => {
      doc.text(header, colX[i], tableTop - 2)
    })

    yPos = tableTop + 5

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    gastoMes.compras.forEach((compra, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage()
        yPos = margin
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 6, 'F')
      }

      const descricao = compra.descricao.length > 25 
        ? compra.descricao.substring(0, 22) + '...' 
        : compra.descricao
      const valor = `R$ ${formatarMoeda(compra.valor)}`
      const data = formatDate(compra.data)
      const metodo = compra.metodo_pagamento === 'pix' 
        ? 'PIX' 
        : compra.metodo_pagamento === 'dinheiro' 
        ? 'Dinheiro' 
        : getCartaoNome(compra.cartao_id || '')
      const categoria = compra.categoria.length > 12 
        ? compra.categoria.substring(0, 9) + '...' 
        : compra.categoria

      doc.text(descricao, colX[0], yPos)
      doc.text(valor, colX[1], yPos)
      doc.text(data, colX[2], yPos)
      doc.text(metodo, colX[3], yPos)
      doc.text(categoria, colX[4], yPos)

      yPos += 7
    })

    yPos += 5
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = margin
    }

    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    doc.setTextColor(...primaryColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total do Mês: R$ ${formatarMoeda(gastoMes.total)}`, pageWidth - margin - 50, yPos, { align: 'right' })

    yPos = pageHeight - 15
    doc.setTextColor(...grayColor)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const dataGeracao = new Date().toLocaleDateString('pt-BR')
    const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.text(
      `Gerado em ${dataGeracao} às ${horaGeracao}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )

    const fileName = `Despesas_${gastoMes.mesNome}_${gastoMes.ano}.pdf`
    doc.save(fileName)
  }

  const totalGeral = gastosPorMes.reduce((sum, mes) => sum + mes.total, 0)

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
            <h1 className="text-3xl font-bold text-white mb-2">Despesas</h1>
            <p className="text-gray-400">
              {activeTab === 'despesas' 
                ? 'Todas as suas despesas organizadas por mês'
                : 'Gerencie suas compras recorrentes mensais'}
            </p>
          </div>
          {activeTab === 'despesas' && (
            <button
              onClick={() => {
                setEditingCompra(null)
                setFormData({
                  descricao: '',
                  descricaoSelecionada: '',
                  valor: '',
                  data: new Date().toISOString().split('T')[0],
                  metodo_pagamento: 'cartao',
                  cartao_id: '',
                  categoria: '',
                  parcelada: false,
                  total_parcelas: '1',
                  despesa_fixa: false,
                  dia_vencimento: new Date().getDate().toString(),
                })
                setShowModal(true)
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Adicionar Despesa</span>
            </button>
          )}
          {activeTab === 'recorrentes' && (
            <button
              onClick={() => {
                setEditingRecorrente(null)
                setFormDataRecorrente({
                  descricao: '',
                  valor: '',
                  categoria: '',
                  metodo_pagamento: 'cartao',
                  cartao_id: '',
                  dia_compra: new Date().getDate().toString(),
                  ativa: true,
                })
                setShowModalRecorrente(true)
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Adicionar Compra Recorrente</span>
            </button>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-1 border border-gray-700 inline-flex">
          <button
            onClick={() => setActiveTab('despesas')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              activeTab === 'despesas'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('recorrentes')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              activeTab === 'recorrentes'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Compras Recorrentes
          </button>
        </div>

        {activeTab === 'despesas' && (
          <>
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Geral</p>
                  <p className="text-3xl font-bold text-white">
                    R$ {formatarMoeda(totalGeral)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm mb-1">Períodos</p>
                  <p className="text-2xl font-bold text-white">
                    {gastosPorMes.length}
                  </p>
                </div>
              </div>
            </div>

            {gastosPorMes.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
                <FiShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">
                  Nenhuma despesa registrada
                </p>
                <p className="text-gray-500 text-sm">
                  As compras aparecerão aqui quando forem cadastradas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {gastosPorMes.map((gastoMes) => {
                  const key = `${gastoMes.ano}-${gastoMes.mes}`
                  const aberto = isMesAberto(gastoMes.ano, gastoMes.mes)

                  const estaPago = mesesPagos.has(key)

                  return (
                    <div
                      key={key}
                      className={`rounded-lg shadow-md border overflow-hidden transition-all ${
                        estaPago
                          ? 'bg-green-900/30 border-green-500/50'
                          : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between p-6 gap-4">
                        <button
                          onClick={() => toggleMes(gastoMes.ano, gastoMes.mes)}
                          className="flex items-center space-x-4 hover:bg-gray-700/50 transition-colors text-left flex-1 min-w-0"
                        >
                          {aberto ? (
                            <FiChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <FiChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h2 className="text-xl font-semibold text-white">
                              {gastoMes.mesNome} {gastoMes.ano}
                            </h2>
                            <p className="text-sm text-gray-400">
                              {gastoMes.compras.length} compra{gastoMes.compras.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right min-w-[140px]">
                            <p className={`text-2xl font-bold whitespace-nowrap ${estaPago ? 'text-green-400' : 'text-red-400'}`}>
                              R$ {formatarMoeda(gastoMes.total)}
                            </p>
                            {estaPago && (
                              <p className="text-xs text-green-400 mt-1">✓ Pago</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleMesPago(gastoMes.ano, gastoMes.mes)
                              }}
                              className={`p-3 rounded-lg transition-colors flex items-center space-x-2 whitespace-nowrap ${
                                estaPago
                                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                              }`}
                              title={estaPago ? 'Desmarcar como pago' : 'Marcar como pago'}
                            >
                              {estaPago ? (
                                <>
                                  <span className="text-lg">✓</span>
                                  <span className="hidden sm:inline">Pago</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-lg">○</span>
                                  <span className="hidden sm:inline">Marcar Pago</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await exportarPDF(gastoMes)
                                } catch (error) {
                                  console.error('Erro ao exportar PDF:', error)
                                  alert('Erro ao exportar PDF. Tente novamente.')
                                }
                              }}
                              className="p-3 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors flex items-center space-x-2 whitespace-nowrap"
                              title="Exportar PDF"
                            >
                              <FiDownload className="w-5 h-5" />
                              <span className="hidden sm:inline">Exportar PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {aberto && (
                        <div className="border-t border-gray-700">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-700/50">
                                <tr>
                                  <th 
                                    className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-600 transition-colors text-gray-300"
                                    onClick={() => {
                                      setOrdenacao(prev => ({
                                        campo: 'descricao',
                                        direcao: prev.campo === 'descricao' && prev.direcao === 'asc' ? 'desc' : 'asc'
                                      }))
                                    }}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>Descrição</span>
                                      {ordenacao.campo === 'descricao' && (
                                        ordenacao.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-600 transition-colors text-gray-300"
                                    onClick={() => {
                                      setOrdenacao(prev => ({
                                        campo: 'valor',
                                        direcao: prev.campo === 'valor' && prev.direcao === 'asc' ? 'desc' : 'asc'
                                      }))
                                    }}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>Valor</span>
                                      {ordenacao.campo === 'valor' && (
                                        ordenacao.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-600 transition-colors text-gray-300"
                                    onClick={() => {
                                      setOrdenacao(prev => ({
                                        campo: 'data',
                                        direcao: prev.campo === 'data' && prev.direcao === 'asc' ? 'desc' : 'asc'
                                      }))
                                    }}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>Data</span>
                                      {ordenacao.campo === 'data' && (
                                        ordenacao.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-600 transition-colors text-gray-300"
                                    onClick={() => {
                                      setOrdenacao(prev => ({
                                        campo: 'metodo_pagamento',
                                        direcao: prev.campo === 'metodo_pagamento' && prev.direcao === 'asc' ? 'desc' : 'asc'
                                      }))
                                    }}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>Método</span>
                                      {ordenacao.campo === 'metodo_pagamento' && (
                                        ordenacao.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </th>
                                  <th 
                                    className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-600 transition-colors text-gray-300"
                                    onClick={() => {
                                      setOrdenacao(prev => ({
                                        campo: 'categoria',
                                        direcao: prev.campo === 'categoria' && prev.direcao === 'asc' ? 'desc' : 'asc'
                                      }))
                                    }}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>Categoria</span>
                                      {ordenacao.campo === 'categoria' && (
                                        ordenacao.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-300">
                                    Ações
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700">
                                {[...gastoMes.compras].sort((a, b) => {
                                  let comparacao = 0
                                  
                                  switch (ordenacao.campo) {
                                    case 'descricao':
                                      comparacao = a.descricao.localeCompare(b.descricao, 'pt-BR')
                                      break
                                    case 'valor':
                                      comparacao = a.valor - b.valor
                                      break
                                    case 'data':
                                      comparacao = new Date(a.data).getTime() - new Date(b.data).getTime()
                                      break
                                    case 'metodo_pagamento':
                                      let metodoA = ''
                                      let metodoB = ''
                                      
                                      if (a.metodo_pagamento === 'cartao') {
                                        metodoA = getCartaoNome(a.cartao_id || '') || 'Z'
                                      } else if (a.metodo_pagamento === 'pix') {
                                        metodoA = 'A_PIX'
                                      } else if (a.metodo_pagamento === 'dinheiro') {
                                        metodoA = 'B_DINHEIRO'
                                      } else if (a.metodo_pagamento === 'debito') {
                                        metodoA = 'C_DEBITO'
                                      } else {
                                        metodoA = a.metodo_pagamento
                                      }
                                      
                                      if (b.metodo_pagamento === 'cartao') {
                                        metodoB = getCartaoNome(b.cartao_id || '') || 'Z'
                                      } else if (b.metodo_pagamento === 'pix') {
                                        metodoB = 'A_PIX'
                                      } else if (b.metodo_pagamento === 'dinheiro') {
                                        metodoB = 'B_DINHEIRO'
                                      } else if (b.metodo_pagamento === 'debito') {
                                        metodoB = 'C_DEBITO'
                                      } else {
                                        metodoB = b.metodo_pagamento
                                      }
                                      
                                      comparacao = metodoA.localeCompare(metodoB, 'pt-BR')
                                      break
                                    case 'categoria':
                                      comparacao = a.categoria.localeCompare(b.categoria, 'pt-BR')
                                      break
                                    default:
                                      comparacao = 0
                                  }
                                  
                                  return ordenacao.direcao === 'asc' ? comparacao : -comparacao
                                }).map((compra) => {
                                  const tipo = getTipoGasto(compra.categoria)
                                  return (
                                    <tr
                                      key={compra.id}
                                      className="hover:bg-gray-700/30 transition-colors"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                                        {compra.descricao}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                                        R$ {formatarMoeda(compra.valor)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                        {formatDate(compra.data)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {compra.metodo_pagamento === 'pix' ? (
                                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/40">
                                            💳 PIX
                                          </span>
                                        ) : compra.metodo_pagamento === 'dinheiro' ? (
                                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/40">
                                            💵 Dinheiro
                                          </span>
                                        ) : (
                                          (() => {
                                            const cartao = cartoes.find(c => c.id === compra.cartao_id)
                                            const corCartao = cartao?.cor || '#3b82f6'
                                            return (
                                              <span
                                                className="px-3 py-1 rounded-full text-xs font-medium border"
                                                style={{
                                                  backgroundColor: `${corCartao}20`,
                                                  color: corCartao,
                                                  borderColor: `${corCartao}40`,
                                                }}
                                              >
                                                💳 {cartao?.nome || 'N/A'}
                                              </span>
                                            )
                                          })()
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {tipo ? (
                                          <span
                                            className="px-3 py-1 rounded-full text-xs font-medium"
                                            style={{
                                              backgroundColor: `${tipo.cor}20`,
                                              color: tipo.cor,
                                              border: `1px solid ${tipo.cor}40`,
                                            }}
                                          >
                                            {compra.categoria}
                                          </span>
                                        ) : (
                                          <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                                            {compra.categoria}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleEdit(compra)}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Editar"
                                          >
                                            <FiEdit className="w-5 h-5" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(compra.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                            title="Excluir"
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
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'recorrentes' && (
          <div className="space-y-6">
            {comprasRecorrentes.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
                <FiShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">
                  Nenhuma compra recorrente cadastrada
                </p>
                <p className="text-gray-500 text-sm">
                  Crie compras recorrentes para serem adicionadas automaticamente todo mês
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-primary text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Categoria</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Método</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Dia do Mês</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {comprasRecorrentes.map((recorrente) => {
                        const tipo = tiposGastos.find((t) => t.nome === recorrente.categoria)
                        const cartao = cartoes.find((c) => c.id === recorrente.cartao_id)
                        return (
                          <tr key={recorrente.id} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                              {recorrente.descricao}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                              R$ {formatarMoeda(recorrente.valor)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {tipo ? (
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: `${tipo.cor}20`,
                                    color: tipo.cor,
                                    border: `1px solid ${tipo.cor}40`,
                                  }}
                                >
                                  {recorrente.categoria}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                                  {recorrente.categoria}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {recorrente.metodo_pagamento === 'pix' ? (
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/40">
                                  💳 PIX
                                </span>
                              ) : recorrente.metodo_pagamento === 'dinheiro' ? (
                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/40">
                                  💵 Dinheiro
                                </span>
                              ) : cartao ? (
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-medium border"
                                  style={{
                                    backgroundColor: `${cartao.cor || '#3b82f6'}20`,
                                    color: cartao.cor || '#3b82f6',
                                    borderColor: `${cartao.cor || '#3b82f6'}40`,
                                  }}
                                >
                                  💳 {cartao.nome}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                                  💳 Cartão
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                              Dia {recorrente.dia_compra}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleRecorrente(recorrente.id, recorrente.ativa)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  recorrente.ativa
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                                    : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
                                }`}
                              >
                                {recorrente.ativa ? 'Ativa' : 'Inativa'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditRecorrente(recorrente)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Editar"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecorrente(recorrente.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Remover"
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
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingCompra ? 'Editar Despesa' : 'Nova Despesa'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingCompra(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <select
                    value={formData.descricaoSelecionada}
                    onChange={(e) => {
                      const valor = e.target.value
                      setFormData({ 
                        ...formData, 
                        descricaoSelecionada: valor,
                        descricao: valor === 'PERSONALIZADO' ? formData.descricao : (valor || '')
                      })
                    }}
                    required={!formData.descricao}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  >
                    <option value="">Selecione uma opção...</option>
                    {sugestoesDescricoes.map((sugestao) => (
                      <option key={sugestao} value={sugestao}>
                        {sugestao === 'PERSONALIZADO' ? '✏️ Personalizado' : sugestao}
                      </option>
                    ))}
                  </select>
                  {(formData.descricaoSelecionada === 'PERSONALIZADO' || (!formData.descricaoSelecionada && formData.descricao)) && (
                    <input
                      type="text"
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      required={formData.descricaoSelecionada === 'PERSONALIZADO'}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Digite a descrição personalizada..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
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
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Método de Pagamento
                  </label>
                  <select
                    value={formData.metodo_pagamento}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        metodo_pagamento: e.target.value,
                        cartao_id: e.target.value !== 'cartao' ? '' : formData.cartao_id
                      })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  >
                    <option value="cartao">💳 Cartão de Crédito</option>
                    <option value="pix">💳 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="debito">💳 Cartão de Débito</option>
                  </select>
                  
                  {formData.metodo_pagamento === 'cartao' && (
                    <>
                      <div className="mb-3">
                        <div className="w-full bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                          {cartoes.map((cartao) => {
                            const corCartao = cartao.cor || '#3b82f6'
                            const isSelected = formData.cartao_id === cartao.id
                            return (
                              <button
                                key={cartao.id}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, cartao_id: cartao.id })
                                }
                                className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-600 transition-colors ${
                                  isSelected ? 'bg-gray-600' : ''
                                }`}
                                style={{
                                  borderLeft: isSelected ? `4px solid ${corCartao}` : '4px solid transparent',
                                }}
                              >
                                <span style={{ color: corCartao }}>💳</span>
                                <span className="text-white">{cartao.nome}</span>
                              </button>
                            )
                          })}
                        </div>
                        {!formData.cartao_id && (
                          <p className="text-xs text-red-400 mt-1">Selecione um cartão</p>
                        )}
                      </div>
                      {formData.cartao_id && (
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.parcelada}
                              onChange={(e) =>
                                setFormData({ 
                                  ...formData, 
                                  parcelada: e.target.checked,
                                  total_parcelas: e.target.checked ? formData.total_parcelas : '1'
                                })
                              }
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-300">Compra parcelada</span>
                          </label>
                          {formData.parcelada && (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Número de Parcelas
                              </label>
                              <input
                                type="number"
                                min="2"
                                max="24"
                                value={formData.total_parcelas}
                                onChange={(e) =>
                                  setFormData({ ...formData, total_parcelas: e.target.value })
                                }
                                required={formData.parcelada}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Ex: 3, 6, 12..."
                              />
                              {formData.valor && formData.total_parcelas && parseInt(formData.total_parcelas) > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Valor por parcela: R$ {formatarMoeda(parseFloat(formData.valor) / parseInt(formData.total_parcelas))}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {formData.metodo_pagamento === 'pix' && (
                    <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm">
                        💳 Pagamento via PIX registrado
                      </p>
                    </div>
                  )}
                  
                  {formData.metodo_pagamento === 'dinheiro' && (
                    <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        💵 Pagamento em dinheiro registrado
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de Gasto
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={formData.categoria}
                      onChange={(e) =>
                        setFormData({ ...formData, categoria: e.target.value })
                      }
                      required
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione um tipo de gasto...</option>
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
                  {tiposGastos.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nenhum tipo de gasto cadastrado. Clique no botão + para criar um.
                    </p>
                  )}
                </div>
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.despesa_fixa}
                      onChange={(e) =>
                        setFormData({ ...formData, despesa_fixa: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-300">Despesa fixa (recorrente mensal)</span>
                  </label>
                  {formData.despesa_fixa && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dia de vencimento (dia do mês)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dia_vencimento}
                        onChange={(e) =>
                          setFormData({ ...formData, dia_vencimento: e.target.value })
                        }
                        required={formData.despesa_fixa}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: 10, 15, 20..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Esta despesa será criada automaticamente todo mês no dia especificado
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCompra(null)
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

        {showNotificacaoDespesaFixa && despesaFixaParaCriar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Despesa Fixa Disponível
                </h2>
                <button
                  onClick={() => {
                    setShowNotificacaoDespesaFixa(false)
                    setDespesaFixaParaCriar(null)
                    setValorDespesaFixa('')
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm font-medium mb-2">
                    Uma despesa fixa está disponível para ser adicionada este mês:
                  </p>
                  <p className="text-white font-semibold text-lg">
                    {despesaFixaParaCriar.descricao}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Valor padrão: R$ {formatarMoeda(despesaFixaParaCriar.valor)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor para este mês (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorDespesaFixa}
                    onChange={(e) => setValorDespesaFixa(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={despesaFixaParaCriar.valor.toString()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para usar o valor padrão (R$ {formatarMoeda(despesaFixaParaCriar.valor)})
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificacaoDespesaFixa(false)
                      setDespesaFixaParaCriar(null)
                      setValorDespesaFixa('')
                      verificarDespesasFixas()
                    }}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const valor = valorDespesaFixa ? parseFloat(valorDespesaFixa) : despesaFixaParaCriar.valor
                      if (isNaN(valor) || valor <= 0) {
                        alert('Por favor, insira um valor válido')
                        return
                      }
                      criarDespesaFixaMensal(despesaFixaParaCriar, valor)
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModalRecorrente && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingRecorrente ? 'Editar Compra Recorrente' : 'Nova Compra Recorrente'}
                </h2>
                <button
                  onClick={() => {
                    setShowModalRecorrente(false)
                    setEditingRecorrente(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitRecorrente} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={formDataRecorrente.descricao}
                    onChange={(e) =>
                      setFormDataRecorrente({ ...formDataRecorrente, descricao: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Assinatura Netflix"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formDataRecorrente.valor}
                    onChange={(e) =>
                      setFormDataRecorrente({ ...formDataRecorrente, valor: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formDataRecorrente.categoria}
                    onChange={(e) =>
                      setFormDataRecorrente({ ...formDataRecorrente, categoria: e.target.value })
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Método de Pagamento
                  </label>
                  <select
                    value={formDataRecorrente.metodo_pagamento}
                    onChange={(e) =>
                      setFormDataRecorrente({ 
                        ...formDataRecorrente, 
                        metodo_pagamento: e.target.value,
                        cartao_id: e.target.value !== 'cartao' ? '' : formDataRecorrente.cartao_id
                      })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  >
                    <option value="cartao">💳 Cartão de Crédito</option>
                    <option value="pix">💳 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="debito">💳 Cartão de Débito</option>
                  </select>
                  
                  {formDataRecorrente.metodo_pagamento === 'cartao' && (
                    <div className="w-full bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                      {cartoes.map((cartao) => {
                        const corCartao = cartao.cor || '#3b82f6'
                        const isSelected = formDataRecorrente.cartao_id === cartao.id
                        return (
                          <button
                            key={cartao.id}
                            type="button"
                            onClick={() =>
                              setFormDataRecorrente({ ...formDataRecorrente, cartao_id: cartao.id })
                            }
                            className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-600 transition-colors ${
                              isSelected ? 'bg-gray-600' : ''
                            }`}
                            style={{
                              borderLeft: isSelected ? `4px solid ${corCartao}` : '4px solid transparent',
                            }}
                          >
                            <span style={{ color: corCartao }}>💳</span>
                            <span className="text-white">{cartao.nome}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dia do Mês (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDataRecorrente.dia_compra}
                    onChange={(e) =>
                      setFormDataRecorrente({ ...formDataRecorrente, dia_compra: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: 10, 15, 20..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Esta compra será criada automaticamente todo mês no dia especificado
                  </p>
                </div>
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formDataRecorrente.ativa}
                      onChange={(e) =>
                        setFormDataRecorrente({ ...formDataRecorrente, ativa: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-300">Ativa (será criada automaticamente)</span>
                  </label>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalRecorrente(false)
                      setEditingRecorrente(null)
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
