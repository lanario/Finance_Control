'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { supabasePessoal as supabase } from '@/lib/supabase/pessoal'
import { useAuth } from '@/app/pessoal/providers'
import { formatDate, formatarMoeda } from '@/lib/utils'
import { FiPlus, FiEdit, FiTrash2, FiShoppingCart, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { DateInput } from '@/components/ui/DateInput'

interface Compra {
  id: string
  descricao: string
  valor: number
  data: string
  cartao_id: string | null
  categoria: string
  metodo_pagamento: string
  user_id: string
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
  user_id: string
}

interface ItemLista {
  id: string
  descricao: string
  valor: number
  data: string
  cartao_id: string | null
  categoria: string
  metodo_pagamento: string
  tipo: 'compra' | 'parcela'
  parcelada?: boolean
  total_parcelas?: number
  numero_parcela?: number
}

interface Cartao {
  id: string
  nome: string
  bandeira?: string
  limite?: number
  fechamento?: number
  vencimento?: number
  cor?: string
  user_id?: string
}

interface TipoGasto {
  id: string
  nome: string
  descricao: string | null
  cor: string
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

export default function ComprasPage() {
  const { session } = useAuth()
  const [compras, setCompras] = useState<Compra[]>([])
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [itens, setItens] = useState<ItemLista[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [tiposGastos, setTiposGastos] = useState<TipoGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMes, setFiltroMes] = useState<string>('')
  const [filtroAno, setFiltroAno] = useState<string>('')
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'data', direcao: 'desc' })
  const [showModal, setShowModal] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)
  const [showNotificacaoCompraRecorrente, setShowNotificacaoCompraRecorrente] = useState(false)
  const [compraRecorrenteParaCriar, setCompraRecorrenteParaCriar] = useState<CompraRecorrente | null>(null)
  const [valorCompraRecorrente, setValorCompraRecorrente] = useState('')
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
    compra_recorrente: false,
    dia_compra: new Date().getDate().toString(),
  })

  // Sugestões de descrições para compras/despesas
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
      loadCartoes()
      loadCompras()
      loadTiposGastos()
      verificarComprasRecorrentes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when session changes
  }, [session])

  const loadCartoes = async () => {
    try {
      const { data, error } = await supabase
        .from('cartoes')
        .select('id, nome, vencimento, cor')
        .eq('user_id', session?.user?.id)
        .order('nome')

      if (error) throw error
      setCartoes((data || []) as Cartao[])
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
    }
  }

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
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadCompras = async () => {
    try {
      setLoading(true)
      const userId = session?.user?.id

      // Buscar compras
      const { data: comprasData, error: comprasError } = await supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .order('data', { ascending: false })

      if (comprasError) throw comprasError

      // Buscar parcelas em andamento (sem compra_id)
      const { data: parcelasData, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .is('compra_id', null)
        .order('data_vencimento', { ascending: false })

      if (parcelasError) throw parcelasError

      setCompras(comprasData || [])
      setParcelas(parcelasData || [])

      // Combinar compras e parcelas em uma lista unificada
      const itensLista: ItemLista[] = []

      // Adicionar compras
      comprasData?.forEach((compra) => {
        itensLista.push({
          id: compra.id,
          descricao: compra.descricao,
          valor: compra.valor,
          data: compra.data,
          cartao_id: compra.cartao_id,
          categoria: compra.categoria,
          metodo_pagamento: compra.metodo_pagamento,
          tipo: 'compra',
          parcelada: compra.parcelada,
          total_parcelas: compra.total_parcelas,
        })
      })

      // Adicionar parcelas em andamento
      parcelasData?.forEach((parcela) => {
        itensLista.push({
          id: parcela.id,
          descricao: parcela.descricao,
          valor: parcela.valor,
          data: parcela.data_vencimento, // Usar data de vencimento como data de referência
          cartao_id: parcela.cartao_id,
          categoria: parcela.categoria,
          metodo_pagamento: 'cartao',
          tipo: 'parcela',
          numero_parcela: parcela.numero_parcela,
          total_parcelas: parcela.total_parcelas,
        })
      })

      // Ordenar por data (mais recente primeiro)
      itensLista.sort((a, b) => {
        const dataA = new Date(a.data).getTime()
        const dataB = new Date(b.data).getTime()
        return dataB - dataA
      })

      setItens(itensLista)
    } catch (error) {
      console.error('Erro ao carregar compras:', error)
    } finally {
      setLoading(false)
    }
  }

  const verificarComprasRecorrentes = async () => {
    if (!session?.user?.id) return

    try {
      const userId = session.user.id
      const now = new Date()
      const mesAtual = now.getMonth() + 1
      const anoAtual = now.getFullYear()

      // Buscar todas as compras recorrentes ativas
      const { data: comprasRecorrentes, error: comprasError } = await supabase
        .from('compras_recorrentes')
        .select('*')
        .eq('user_id', userId)
        .eq('ativa', true)

      if (comprasError) throw comprasError

      if (!comprasRecorrentes || comprasRecorrentes.length === 0) return

      // Verificar quais compras recorrentes já foram criadas este mês
      const { data: comprasMensais, error: mensaisError } = await supabase
        .from('compras_recorrentes_mensais')
        .select('compra_recorrente_id')
        .eq('user_id', userId)
        .eq('mes', mesAtual)
        .eq('ano', anoAtual)

      if (mensaisError) throw mensaisError

      const idsCriadas = new Set((comprasMensais || []).map(c => c.compra_recorrente_id))

      // Encontrar compras recorrentes que ainda não foram criadas este mês
      const comprasPendentes = comprasRecorrentes.filter(cr => !idsCriadas.has(cr.id))

      if (comprasPendentes.length > 0) {
        // Mostrar notificação para a primeira compra pendente
        setCompraRecorrenteParaCriar(comprasPendentes[0] as CompraRecorrente)
        setValorCompraRecorrente(comprasPendentes[0].valor.toString())
        setShowNotificacaoCompraRecorrente(true)
      }
    } catch (error) {
      console.error('Erro ao verificar compras recorrentes:', error)
    }
  }

  const criarCompraRecorrenteMensal = async (compraRecorrente: CompraRecorrente, valor: number) => {
    try {
      const now = new Date()
      const mesAtual = now.getMonth() + 1
      const anoAtual = now.getFullYear()
      
      // Calcular data baseada no dia de compra
      const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate()
      const diaCompra = Math.min(compraRecorrente.dia_compra, ultimoDia)
      const dataCompra = new Date(anoAtual, mesAtual - 1, diaCompra).toISOString().split('T')[0]

      // Criar a compra
      const compraData: any = {
        descricao: compraRecorrente.descricao,
        valor: valor,
        data: dataCompra,
        metodo_pagamento: compraRecorrente.metodo_pagamento,
        categoria: compraRecorrente.categoria,
        user_id: session?.user?.id,
        parcelada: false,
        total_parcelas: null,
      }

      if (compraRecorrente.metodo_pagamento === 'cartao' && compraRecorrente.cartao_id) {
        compraData.cartao_id = compraRecorrente.cartao_id
      }

      const { data: novaCompra, error: compraError } = await supabase
        .from('compras')
        .insert([compraData])
        .select()
        .single()

      if (compraError) throw compraError

      // Registrar que esta compra recorrente foi criada para este mês
      const { error: mensalError } = await supabase
        .from('compras_recorrentes_mensais')
        .insert([{
          compra_recorrente_id: compraRecorrente.id,
          user_id: session?.user?.id,
          compra_id: novaCompra.id,
          mes: mesAtual,
          ano: anoAtual,
          valor: valor,
        }])

      if (mensalError) throw mensalError

      setShowNotificacaoCompraRecorrente(false)
      setCompraRecorrenteParaCriar(null)
      setValorCompraRecorrente('')
      loadCompras()
      verificarComprasRecorrentes() // Verificar se há mais compras recorrentes pendentes
    } catch (error) {
      console.error('Erro ao criar compra recorrente mensal:', error)
      alert('Erro ao criar compra recorrente mensal')
    }
  }

  const calcularDataVencimentoParcela = (dataCompra: Date, numeroParcela: number, cartaoId: string | null) => {
    if (!cartaoId) {
      // Se não há cartão, usar mês seguinte baseado na data da compra
      const data = new Date(dataCompra)
      data.setMonth(data.getMonth() + numeroParcela - 1)
      return data
    }

    // Buscar informações do cartão
    const cartao = cartoes.find(c => c.id === cartaoId) as Cartao | undefined
    if (!cartao) {
      const data = new Date(dataCompra)
      data.setMonth(data.getMonth() + numeroParcela - 1)
      return data
    }

    // Calcular vencimento baseado no dia de fechamento do cartão
    const dataBase = new Date(dataCompra)
    let mesVencimento = dataBase.getMonth() + numeroParcela - 1
    let anoVencimento = dataBase.getFullYear()

    // Ajustar mês e ano se necessário
    while (mesVencimento > 11) {
      mesVencimento -= 12
      anoVencimento += 1
    }

    // Usar o dia de fechamento como dia de vencimento da parcela
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
      // Compra é parcelada se: checkbox marcado + método é cartão + mais de 1 parcela
      const isParcelada = formData.parcelada === true && formData.metodo_pagamento === 'cartao' && totalParcelas > 1

      // Determinar a descrição final (da seleção ou personalizada)
      const descricaoFinal = formData.descricaoSelecionada === 'PERSONALIZADO' || !formData.descricaoSelecionada
        ? formData.descricao
        : formData.descricaoSelecionada

      const compraData: any = {
        descricao: descricaoFinal,
        valor: valorTotal, // Mantém o valor total para histórico, mas não será usado nos cálculos se parcelada
        data: formData.data,
        metodo_pagamento: formData.metodo_pagamento,
        categoria: formData.categoria,
        user_id: session?.user?.id,
        parcelada: !!isParcelada, // Garantir que seja boolean (true ou false, nunca null)
        total_parcelas: isParcelada ? totalParcelas : null,
      }

      // Só adiciona cartao_id se o método for cartão
      if (formData.metodo_pagamento === 'cartao') {
        compraData.cartao_id = formData.cartao_id || null
      } else {
        compraData.cartao_id = null
      }

      if (editingCompra) {
        // Atualizar compra existente
        const { error } = await supabase
          .from('compras')
          .update(compraData)
          .eq('id', editingCompra.id)

        if (error) throw error

        // Se estava parcelada e não está mais, remover parcelas
        if (!isParcelada) {
          await supabase
            .from('parcelas')
            .delete()
            .eq('compra_id', editingCompra.id)
        } else if (isParcelada && formData.cartao_id) {
          // Se agora está parcelada, remover parcelas antigas e criar novas
          await supabase
            .from('parcelas')
            .delete()
            .eq('compra_id', editingCompra.id)

          // Criar novas parcelas
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
        // Criar nova compra
        const { data: novaCompra, error: compraError } = await supabase
          .from('compras')
          .insert([compraData])
          .select()
          .single()

        if (compraError) throw compraError

        // Se for parcelada, criar as parcelas
        if (isParcelada && novaCompra && formData.cartao_id && totalParcelas > 1) {
          // Calcular valor de cada parcela (dividir o total)
          const valorParcelaBase = valorTotal / totalParcelas
          // Arredondar para 2 casas decimais
          const valorParcelaArredondado = Math.round(valorParcelaBase * 100) / 100
          // Calcular o valor da última parcela para compensar qualquer diferença de arredondamento
          const somaParcelasArredondadas = valorParcelaArredondado * (totalParcelas - 1)
          const valorUltimaParcela = Math.round((valorTotal - somaParcelasArredondadas) * 100) / 100
          
          const dataCompra = new Date(formData.data)
          const parcelas = []

          for (let i = 1; i <= totalParcelas; i++) {
            const dataVencimento = calcularDataVencimentoParcela(dataCompra, i, formData.cartao_id)
            // Última parcela recebe o ajuste para garantir que a soma seja exata
            const valorParcela = i === totalParcelas ? valorUltimaParcela : valorParcelaArredondado
            
            parcelas.push({
              user_id: session?.user?.id,
              compra_id: novaCompra.id,
              cartao_id: formData.cartao_id,
              descricao: `${descricaoFinal} - Parcela ${i}/${totalParcelas}`,
              valor: Number(valorParcela.toFixed(2)), // Garantir 2 casas decimais
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

          if (parcelasError) {
            console.error('Erro ao criar parcelas:', parcelasError)
            throw parcelasError
          }
        } else if (isParcelada && (!novaCompra || !formData.cartao_id || totalParcelas <= 1)) {
          // Se deveria ser parcelada mas não pode ser criada, avisar o usuário
          console.warn('Compra marcada como parcelada mas não foi possível criar parcelas:', {
            isParcelada,
            novaCompra,
            cartao_id: formData.cartao_id,
            totalParcelas
          })
        }

        // Se for compra recorrente, criar registro na tabela compras_recorrentes
        if (formData.compra_recorrente && novaCompra) {
          const diaCompra = parseInt(formData.dia_compra) || new Date().getDate()
          const compraRecorrenteData: any = {
            user_id: session?.user?.id,
            descricao: descricaoFinal,
            valor: valorTotal,
            categoria: formData.categoria,
            metodo_pagamento: formData.metodo_pagamento,
            dia_compra: Math.min(31, Math.max(1, diaCompra)),
            ativa: true,
          }

          if (formData.metodo_pagamento === 'cartao' && formData.cartao_id) {
            compraRecorrenteData.cartao_id = formData.cartao_id
          }

          const { data: novaCompraRecorrente, error: compraRecorrenteError } = await supabase
            .from('compras_recorrentes')
            .insert([compraRecorrenteData])
            .select()
            .single()

          if (compraRecorrenteError) throw compraRecorrenteError

          // Registrar que esta compra recorrente já foi criada para este mês
          const now = new Date()
          const mesAtual = now.getMonth() + 1
          const anoAtual = now.getFullYear()

          await supabase
            .from('compras_recorrentes_mensais')
            .insert([{
              compra_recorrente_id: novaCompraRecorrente.id,
              user_id: session?.user?.id,
              compra_id: novaCompra.id,
              mes: mesAtual,
              ano: anoAtual,
              valor: valorTotal,
            }])
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
        compra_recorrente: false,
        dia_compra: new Date().getDate().toString(),
      })
      loadCompras()
    } catch (error) {
      console.error('Erro ao salvar compra:', error)
      alert('Erro ao salvar compra')
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
      compra_recorrente: false,
      dia_compra: new Date().getDate().toString(),
    })
    setShowModal(true)
  }


  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return

    try {
      // Verificar se é uma compra ou parcela
      const item = itens.find(i => i.id === id)
      
      if (item?.tipo === 'parcela') {
        // Excluir parcela
        const { error } = await supabase.from('parcelas').delete().eq('id', id)
        if (error) throw error
      } else {
        // Excluir compra
        const { error } = await supabase.from('compras').delete().eq('id', id)
        if (error) throw error
      }
      
      loadCompras()
    } catch (error) {
      console.error('Erro ao excluir item:', error)
      alert('Erro ao excluir item')
    }
  }


  const getCartaoNome = (cartaoId: string | null) => {
    if (!cartaoId) return 'N/A'
    return cartoes.find((c) => c.id === cartaoId)?.nome || 'N/A'
  }

  const getTipoGasto = (categoriaNome: string) => {
    return tiposGastos.find((t) => t.nome === categoriaNome)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-[#f0f0f0]">Carregando...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#f0f0f0] mb-2">Compras</h1>
            <p className="text-gray-400">
              Gerencie suas compras
            </p>
          </div>
        </div>

        <div className="space-y-6">
            <div className="flex justify-between items-center">
              {/* Filtro de mês/ano */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-[#dddddd] text-sm">Mês:</label>
                  <select
                    value={filtroMes}
                    onChange={(e) => {
                      setFiltroMes(e.target.value)
                    }}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] text-sm focus:outline-none focus:ring-2 focus:border-white/30"
                  >
                    <option value="">Todos</option>
                    <option value="01">Janeiro</option>
                    <option value="02">Fevereiro</option>
                    <option value="03">Março</option>
                    <option value="04">Abril</option>
                    <option value="05">Maio</option>
                    <option value="06">Junho</option>
                    <option value="07">Julho</option>
                    <option value="08">Agosto</option>
                    <option value="09">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-[#dddddd] text-sm">Ano:</label>
                  <input
                    type="number"
                    value={filtroAno}
                    onChange={(e) => setFiltroAno(e.target.value)}
                    placeholder="Ano"
                    min="2000"
                    max="2100"
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] text-sm w-24 focus:outline-none focus:ring-2 focus:border-white/30"
                  />
                </div>
              </div>
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
                compra_recorrente: false,
                dia_compra: new Date().getDate().toString(),
              })
                  setShowModal(true)
                }}
                className="bg-primary text-[#f0f0f0] px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
              >
                <FiPlus className="w-5 h-5" />
                <span>Adicionar Compra</span>
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
                <FiShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">
                  Nenhuma compra cadastrada
                </p>
                <p className="text-gray-500 text-sm">
                  Clique em &quot;Adicionar Compra&quot; para começar
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-primary text-[#f0f0f0]">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
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
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
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
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
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
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
                          onClick={() => {
                            setOrdenacao(prev => ({
                              campo: 'metodo_pagamento',
                              direcao: prev.campo === 'metodo_pagamento' && prev.direcao === 'asc' ? 'desc' : 'asc'
                            }))
                          }}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Método de Pagamento</span>
                            {ordenacao.campo === 'metodo_pagamento' && (
                              ordenacao.direcao === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-primary-dark transition-colors"
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
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {itens
                        .filter((item) => {
                          if (!filtroMes && !filtroAno) return true
                          
                          const itemDate = new Date(item.data)
                          const itemMes = String(itemDate.getMonth() + 1).padStart(2, '0')
                          const itemAno = String(itemDate.getFullYear())
                          
                          const matchMes = !filtroMes || itemMes === filtroMes
                          const matchAno = !filtroAno || itemAno === filtroAno
                          
                          return matchMes && matchAno
                        })
                        .sort((a, b) => {
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
                              comparacao = a.metodo_pagamento.localeCompare(b.metodo_pagamento, 'pt-BR')
                              break
                            case 'categoria':
                              comparacao = a.categoria.localeCompare(b.categoria, 'pt-BR')
                              break
                            default:
                              comparacao = 0
                          }
                          
                          return ordenacao.direcao === 'asc' ? comparacao : -comparacao
                        })
                        .map((item) => {
                          const tipo = getTipoGasto(item.categoria)
                          const isParcela = item.tipo === 'parcela'
                          
                          return (
                            <tr key={item.id} className="hover:bg-white/5/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-[#f0f0f0] font-medium">
                                {item.descricao}
                                {isParcela && item.numero_parcela && (
                                  <span className="text-xs text-gray-400 ml-2">
                                    ({item.numero_parcela}/{item.total_parcelas})
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-[#f0f0f0] font-semibold">
                                  R$ {formatarMoeda(item.valor)}
                                </div>
                                {!isParcela && item.parcelada && item.total_parcelas && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {item.total_parcelas}x parcelas
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                {formatDate(item.data)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.metodo_pagamento === 'pix' ? (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/40">
                                    💳 PIX
                                  </span>
                                ) : item.metodo_pagamento === 'dinheiro' ? (
                                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/40">
                                    💵 Dinheiro
                                  </span>
                                ) : (
                                  (() => {
                                    const cartao = cartoes.find(c => c.id === item.cartao_id)
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
                                    {item.categoria}
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-white/5 text-[#dddddd] rounded-full text-xs">
                                    {item.categoria}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  {!isParcela && (
                                    <button
                                      onClick={() => {
                                        const compra = compras.find(c => c.id === item.id)
                                        if (compra) handleEdit(compra)
                                      }}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                      title="Editar"
                                    >
                                      <FiEdit className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                    title={isParcela ? "Excluir parcela" : "Excluir compra"}
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

        {/* Modal de Compra */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#f0f0f0]">
                  {editingCompra ? 'Editar Compra' : 'Nova Compra'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingCompra(null)
                  }}
                  className="text-gray-400 hover:text-[#f0f0f0] transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
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
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30 mb-2"
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
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                      placeholder="Digite a descrição personalizada..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
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
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                    placeholder="0.00"
                  />
                </div>
                <DateInput
                  label="Data"
                  value={formData.data}
                  onChange={(e) =>
                    setFormData({ ...formData, data: e.target.value })
                  }
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
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
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30 mb-3"
                  >
                    <option value="cartao">💳 Cartão de Crédito</option>
                    <option value="pix">💳 PIX</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="debito">💳 Cartão de Débito</option>
                  </select>
                  
                  {formData.metodo_pagamento === 'cartao' && (
                    <>
                      <div className="mb-3">
                        <div className="w-full bg-white/5 border border-white/10 rounded-lg overflow-hidden">
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
                                <span className="text-[#f0f0f0]">{cartao.nome}</span>
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
                              className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:border-white/30"
                            />
                            <span className="text-sm text-[#dddddd]">Compra parcelada</span>
                          </label>
                          {formData.parcelada && (
                            <div>
                              <label className="block text-sm font-medium text-[#dddddd] mb-2">
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
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
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
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
                    Tipo de Gasto
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                  >
                    <option value="">Selecione um tipo de gasto...</option>
                    {tiposGastos.map((tipo) => (
                      <option key={tipo.id} value={tipo.nome}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                  {tiposGastos.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nenhuma categoria cadastrada. Crie uma na página de Categorias
                    </p>
                  )}
                </div>
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.compra_recorrente}
                      onChange={(e) =>
                        setFormData({ ...formData, compra_recorrente: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:border-white/30"
                    />
                    <span className="text-sm text-[#dddddd]">Compra recorrente (mensal)</span>
                  </label>
                  {formData.compra_recorrente && (
                    <div>
                      <label className="block text-sm font-medium text-[#dddddd] mb-2">
                        Dia da compra (dia do mês)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dia_compra}
                        onChange={(e) =>
                          setFormData({ ...formData, dia_compra: e.target.value })
                        }
                        required={formData.compra_recorrente}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                        placeholder="Ex: 10, 15, 20..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Esta compra será criada automaticamente todo mês no dia especificado
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
                    className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-[#dddddd] hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-[#f0f0f0] rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Notificação - Compra Recorrente */}
        {showNotificacaoCompraRecorrente && compraRecorrenteParaCriar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#f0f0f0]">
                  Compra Recorrente Disponível
                </h2>
                <button
                  onClick={() => {
                    setShowNotificacaoCompraRecorrente(false)
                    setCompraRecorrenteParaCriar(null)
                    setValorCompraRecorrente('')
                  }}
                  className="text-gray-400 hover:text-[#f0f0f0] transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm font-medium mb-2">
                    Uma compra recorrente está disponível para ser adicionada este mês:
                  </p>
                  <p className="text-[#f0f0f0] font-semibold text-lg">
                    {compraRecorrenteParaCriar.descricao}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Valor padrão: R$ {formatarMoeda(compraRecorrenteParaCriar.valor)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#dddddd] mb-2">
                    Valor para este mês (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorCompraRecorrente}
                    onChange={(e) => setValorCompraRecorrente(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] focus:outline-none focus:ring-2 focus:border-white/30"
                    placeholder={compraRecorrenteParaCriar.valor.toString()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para usar o valor padrão (R$ {formatarMoeda(compraRecorrenteParaCriar.valor)})
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificacaoCompraRecorrente(false)
                      setCompraRecorrenteParaCriar(null)
                      setValorCompraRecorrente('')
                      verificarComprasRecorrentes() // Verificar próxima compra recorrente
                    }}
                    className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-[#dddddd] hover:bg-white/5 transition-colors"
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const valor = valorCompraRecorrente ? parseFloat(valorCompraRecorrente) : compraRecorrenteParaCriar.valor
                      if (isNaN(valor) || valor <= 0) {
                        alert('Por favor, insira um valor válido')
                        return
                      }
                      criarCompraRecorrenteMensal(compraRecorrenteParaCriar, valor)
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-[#f0f0f0] rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  )
}
