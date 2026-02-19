import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../../lib/context'
import { supabasePessoal } from '../../../lib/supabase-pessoal'
import { formatarMoeda, formatDate } from '../../../lib/utils'
import { Ionicons } from '@expo/vector-icons'
import { LottieLoader } from '../../../components'

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface Cartao {
  id: string
  nome: string
  bandeira: string
  limite: number
  fechamento: number
  vencimento: number
  cor: string | null
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

/**
 * Tela de Cartões alinhada ao web: header, botões Adicionar Cartão/Parcela,
 * painéis por cartão com Limite, Fechamento, Gasto Total, Vencimento, Disponível,
 * ícones de ação e seção de Faturas expansível com "Marcar como Paga".
 */
export default function CartoesListScreen() {
  const [context, setContext] = useState<AppContext>('pessoal')
  const [userId, setUserId] = useState<string | null>(null)
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [parcelasPorCartao, setParcelasPorCartao] = useState<Record<string, Parcela[]>>({})
  const [comprasPorCartao, setComprasPorCartao] = useState<Record<string, Compra[]>>({})
  const [faturasPagas, setFaturasPagas] = useState<Record<string, FaturaPaga[]>>({})
  const [comprasRecorrentesMap, setComprasRecorrentesMap] = useState<Record<string, { mes: number; ano: number }>>({})
  const [faturasPorCartao, setFaturasPorCartao] = useState<Record<string, Fatura[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cartaoExpanded, setCartaoExpanded] = useState<string | null>(null)

  const loadCartoes = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('cartoes')
        .select('id, nome, bandeira, limite, fechamento, vencimento, cor, user_id')
        .eq('user_id', userId)
        .order('nome')
      setCartoes((data as Cartao[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar cartões:', e)
    }
  }, [userId])

  const loadFaturasPagas = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('faturas_pagas')
        .select('*')
        .eq('user_id', userId)
        .order('data_pagamento', { ascending: false })
      const map: Record<string, FaturaPaga[]> = {}
      ;(data ?? []).forEach((f: FaturaPaga) => {
        if (!map[f.cartao_id]) map[f.cartao_id] = []
        map[f.cartao_id].push(f)
      })
      setFaturasPagas(map)
    } catch (e) {
      console.error('Erro ao carregar faturas pagas:', e)
    }
  }, [userId])

  const loadParcelasPorCartao = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .not('cartao_id', 'is', null)
        .order('data_vencimento', { ascending: true })
      const map: Record<string, Parcela[]> = {}
      ;(data ?? []).forEach((p: Parcela) => {
        if (p.cartao_id) {
          if (!map[p.cartao_id]) map[p.cartao_id] = []
          map[p.cartao_id].push(p)
        }
      })
      setParcelasPorCartao(map)
    } catch (e) {
      console.error('Erro ao carregar parcelas:', e)
    }
  }, [userId])

  const loadComprasPorCartao = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .eq('metodo_pagamento', 'cartao')
        .not('cartao_id', 'is', null)
        .order('data', { ascending: false })
      const naoParceladas = (data ?? []).filter((c: Compra) => {
        const parcelada = c.parcelada === true || (c.total_parcelas ?? 0) > 1
        return !parcelada
      }) as Compra[]
      const map: Record<string, Compra[]> = {}
      naoParceladas.forEach((c) => {
        if (c.cartao_id) {
          if (!map[c.cartao_id]) map[c.cartao_id] = []
          map[c.cartao_id].push(c)
        }
      })
      setComprasPorCartao(map)
    } catch (e) {
      console.error('Erro ao carregar compras:', e)
    }
  }, [userId])

  const loadComprasRecorrentes = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('compras_recorrentes_mensais')
        .select('compra_id, mes, ano')
        .eq('user_id', userId)
      const map: Record<string, { mes: number; ano: number }> = {}
      ;(data ?? []).forEach((item: { compra_id: string; mes: number; ano: number }) => {
        map[item.compra_id] = { mes: item.mes, ano: item.ano }
      })
      setComprasRecorrentesMap(map)
    } catch (e) {
      console.error('Erro ao carregar compras recorrentes:', e)
    }
  }, [userId])

  function getUltimoFechamento(cartaoId: string): Date | null {
    const list = faturasPagas[cartaoId] ?? []
    if (list.length === 0) return null
    const sorted = [...list].sort((a, b) =>
      new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()
    )
    return new Date(sorted[0].data_pagamento)
  }

  function calcularPeriodoFatura(dataCompra: Date, cartao: Cartao): { mes: number; ano: number } {
    const dia = dataCompra.getDate()
    const mes = dataCompra.getMonth()
    const ano = dataCompra.getFullYear()
    const ultimoFechamento = getUltimoFechamento(cartao.id)

    if (ultimoFechamento && dataCompra > ultimoFechamento) {
      let mesFatura = ultimoFechamento.getMonth() + 1
      let anoFatura = ultimoFechamento.getFullYear()
      if (mesFatura > 11) {
        mesFatura = 0
        anoFatura += 1
      }
      const proximoFech = new Date(anoFatura, mesFatura, cartao.fechamento)
      if (dataCompra < proximoFech) return { mes: mesFatura, ano: anoFatura }
    }

    let mesFatura = mes
    let anoFatura = ano
    if (dia >= cartao.fechamento) {
      mesFatura = mes + 1
      if (mesFatura > 11) {
        mesFatura = 0
        anoFatura = ano + 1
      }
    }
    return { mes: mesFatura, ano: anoFatura }
  }

  function calcularDataFechamento(mes: number, ano: number, diaFech: number): Date {
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    const dia = Math.min(diaFech, ultimoDia)
    return new Date(ano, mes, dia)
  }

  function calcularDataVencimento(mesFech: number, anoFech: number, diaVenc: number): Date {
    let mesVenc = mesFech + 1
    let anoVenc = anoFech
    if (mesVenc > 11) {
      mesVenc = 0
      anoVenc += 1
    }
    const ultimoDia = new Date(anoVenc, mesVenc + 1, 0).getDate()
    const dia = Math.min(diaVenc, ultimoDia)
    return new Date(anoVenc, mesVenc, dia)
  }

  const calcularLimiteDisponivel = useCallback((cartaoId: string, limite: number): number => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()

    const parcelasDoCartao = (parcelasPorCartao[cartaoId] ?? []).filter((p) => !p.paga)
    const totalParcelas = parcelasDoCartao.reduce((s, p) => s + p.valor, 0)

    const comprasDoCartao = comprasPorCartao[cartaoId] ?? []
    let totalCompras = 0
    comprasDoCartao.forEach((compra) => {
      const rec = comprasRecorrentesMap[compra.id]
      if (rec) {
        if (rec.ano < anoAtual || (rec.ano === anoAtual && rec.mes <= mesAtual)) {
          totalCompras += compra.valor
        }
      } else {
        totalCompras += compra.valor
      }
    })
    return limite - (totalParcelas + totalCompras)
  }, [parcelasPorCartao, comprasPorCartao, comprasRecorrentesMap])

  const calcularFaturas = useCallback(() => {
    const faturasMap: Record<string, Fatura[]> = {}
    const faturasPagasMapByKey: Record<string, Record<string, FaturaPaga>> = {}

    cartoes.forEach((cartao) => {
      const faturasPagasDoCartao = faturasPagas[cartao.id] ?? []
      const fpMap: Record<string, FaturaPaga> = {}
      faturasPagasDoCartao.forEach((f) => {
        const key = `${f.ano_referencia}-${String(f.mes_referencia).padStart(2, '0')}`
        fpMap[key] = f
      })
      faturasPagasMapByKey[cartao.id] = fpMap

      const comprasDoCartao = comprasPorCartao[cartao.id] ?? []
      const parcelasDoCartao = (parcelasPorCartao[cartao.id] ?? []).filter((p) => !p.paga)
      const temp: Record<string, Fatura> = {}

      comprasDoCartao.forEach((compra) => {
        const { mes, ano } = calcularPeriodoFatura(new Date(compra.data), cartao)
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`
        if (!temp[key]) {
          const dataFech = calcularDataFechamento(mes, ano, cartao.fechamento)
          const dataVenc = calcularDataVencimento(mes, ano, cartao.vencimento)
          const faturaPaga = fpMap[key]
          temp[key] = {
            mes,
            ano,
            mesNome: MESES_NOMES[mes],
            dataFechamento: dataFech.toISOString().split('T')[0],
            dataVencimento: dataVenc.toISOString().split('T')[0],
            compras: [],
            parcelas: [],
            total: 0,
            paga: !!faturaPaga,
            dataPagamento: faturaPaga ? faturaPaga.data_pagamento : null,
          }
        }
        temp[key].compras.push(compra)
        temp[key].total += compra.valor
      })

      parcelasDoCartao.forEach((parcela) => {
        const d = new Date(parcela.data_vencimento)
        const mes = d.getMonth()
        const ano = d.getFullYear()
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`
        if (!temp[key]) {
          const dataFech = calcularDataFechamento(mes, ano, cartao.fechamento)
          const dataVenc = calcularDataVencimento(mes, ano, cartao.vencimento)
          const faturaPaga = fpMap[key]
          temp[key] = {
            mes,
            ano,
            mesNome: MESES_NOMES[mes],
            dataFechamento: dataFech.toISOString().split('T')[0],
            dataVencimento: dataVenc.toISOString().split('T')[0],
            compras: [],
            parcelas: [],
            total: 0,
            paga: !!faturaPaga,
            dataPagamento: faturaPaga ? faturaPaga.data_pagamento : null,
          }
        }
        temp[key].parcelas.push(parcela)
        temp[key].total += parcela.valor
      })

      Object.values(temp).forEach((f) => {
        f.compras.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        f.parcelas.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
      })

      const arr = Object.values(temp).sort((a, b) => {
        const aPaga = a.paga ? 1 : 0
        const bPaga = b.paga ? 1 : 0
        if (aPaga !== bPaga) return aPaga - bPaga
        return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
      })
      faturasMap[cartao.id] = arr
    })

    setFaturasPorCartao(faturasMap)
  }, [cartoes, parcelasPorCartao, comprasPorCartao, faturasPagas])

  const loadAll = useCallback(async () => {
    if (context !== 'pessoal' || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    await Promise.all([
      loadCartoes(),
      loadFaturasPagas(),
      loadParcelasPorCartao(),
      loadComprasPorCartao(),
      loadComprasRecorrentes(),
    ])
    setLoading(false)
    setRefreshing(false)
  }, [context, userId, loadCartoes, loadFaturasPagas, loadParcelasPorCartao, loadComprasPorCartao, loadComprasRecorrentes])

  useEffect(() => {
    AsyncStorage.getItem(CONTEXT_STORAGE_KEY).then((ctx) => {
      setContext((ctx as AppContext) ?? 'pessoal')
    })
  }, [])

  useEffect(() => {
    if (context !== 'pessoal') {
      setLoading(false)
      return
    }
    supabasePessoal.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [context])

  useEffect(() => {
    if (userId && context === 'pessoal') loadAll()
  }, [userId, context])

  useEffect(() => {
    if (
      cartoes.length > 0 &&
      (Object.keys(parcelasPorCartao).length > 0 || Object.keys(comprasPorCartao).length > 0)
    ) {
      calcularFaturas()
    }
  }, [cartoes, parcelasPorCartao, comprasPorCartao, faturasPagas, calcularFaturas])

  async function handleMarcarFaturaPaga(cartaoId: string, mes: number, ano: number, total: number) {
    try {
      const dataPagamento = new Date().toISOString().split('T')[0]
      const { error } = await supabasePessoal
        .from('faturas_pagas')
        .upsert(
          {
            cartao_id: cartaoId,
            user_id: userId,
            mes_referencia: mes + 1,
            ano_referencia: ano,
            data_pagamento: dataPagamento,
            total_pago: total,
          },
          { onConflict: 'cartao_id,mes_referencia,ano_referencia' }
        )
      if (error) throw error
      await loadFaturasPagas()
      await loadComprasPorCartao()
    } catch (e) {
      console.error('Erro ao marcar fatura como paga:', e)
      Alert.alert('Erro', 'Não foi possível marcar a fatura como paga.')
    }
  }

  if (context === 'empresarial') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.placeholder}>Módulo empresarial em breve.</Text>
      </View>
    )
  }

  if (loading && cartoes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LottieLoader />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadAll()
          }}
          tintColor="#10b981"
        />
      }
    >
      {/* Header igual ao web */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cartões</Text>
          <Text style={styles.subtitle}>Gerencie seus cartões de crédito e suas faturas</Text>
        </View>
        <View style={styles.buttonsRow}>
          <Pressable
            style={({ pressed }) => [styles.btnAdicionarCartao, pressed && { opacity: 0.85 }]}
            onPress={() => Alert.alert('Em breve', 'Adicionar cartão estará disponível em breve.')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.btnText}>Adicionar Cartão</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnAdicionarParcela, pressed && { opacity: 0.85 }]}
            onPress={() => Alert.alert('Em breve', 'Adicionar parcela estará disponível em breve.')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.btnText}>Adicionar Parcela</Text>
          </Pressable>
        </View>
      </View>

      {cartoes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="card-outline" size={56} color="rgba(255,255,255,0.4)" />
          <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
          <Text style={styles.emptySub}>Clique em "Adicionar Cartão" para começar</Text>
        </View>
      ) : (
        <View style={styles.cardsContainer}>
          {cartoes.map((cartao) => {
            const faturas = faturasPorCartao[cartao.id] ?? []
            const isExpanded = cartaoExpanded === cartao.id
            const limiteDisp = calcularLimiteDisponivel(cartao.id, cartao.limite)
            const totalGasto = cartao.limite - limiteDisp
            const cor = cartao.cor ?? '#1e3a5f'

            return (
              <View
                key={cartao.id}
                style={[styles.cardPanel, { borderLeftColor: cor }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardNome, { color: cor }]}>{cartao.nome}</Text>
                    <View style={[styles.bandeiraBadge, { backgroundColor: `${cor}20`, borderColor: `${cor}40` }]}>
                      <Text style={[styles.bandeiraText, { color: cor }]}>{cartao.bandeira}</Text>
                    </View>
                  </View>
                  <View style={styles.cardGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Limite:</Text>
                      <Text style={styles.gridValue}>R$ {formatarMoeda(cartao.limite)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Fechamento:</Text>
                      <Text style={styles.gridValue}>Dia {cartao.fechamento}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Gasto Total:</Text>
                      <Text style={styles.gastoTotal}>R$ {formatarMoeda(totalGasto)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Vencimento:</Text>
                      <Text style={styles.gridValue}>Dia {cartao.vencimento}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Disponível:</Text>
                      <Text style={styles.disponivel}>R$ {formatarMoeda(limiteDisp)}</Text>
                    </View>
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => Alert.alert('Em breve', 'Upload de PDF em breve.')}
                    >
                      <Ionicons name="cloud-upload-outline" size={20} color="#10b981" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => Alert.alert('Em breve', 'Edição em breve.')}
                    >
                      <Ionicons name="pencil-outline" size={20} color="#3b82f6" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => Alert.alert('Em breve', 'Exclusão em breve.')}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>

                {faturas.length > 0 && (
                  <>
                    <Pressable
                      style={styles.faturasToggle}
                      onPress={() => setCartaoExpanded(isExpanded ? null : cartao.id)}
                    >
                      <View style={styles.faturasToggleLeft}>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color="rgba(255,255,255,0.6)"
                        />
                        <Text style={styles.faturasToggleText}>Faturas ({faturas.length})</Text>
                      </View>
                      <Text style={styles.faturasTotal}>Total: R$ {formatarMoeda(totalGasto)}</Text>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.faturasList}>
                        {faturas.map((fatura) => {
                          const comprasCount = fatura.compras.length
                          const parcelasCount = fatura.parcelas.length
                          const countLabel =
                            comprasCount > 0
                              ? `${comprasCount} compra${comprasCount !== 1 ? 's' : ''}`
                              : parcelasCount > 0
                                ? `${parcelasCount} parcela${parcelasCount !== 1 ? 's' : ''}`
                                : ''

                          return (
                            <View
                              key={`${fatura.ano}-${fatura.mes}`}
                              style={[styles.faturaRow, fatura.paga && styles.faturaRowPaga]}
                            >
                              <View style={styles.faturaLeft}>
                                <Text style={styles.faturaTitulo}>
                                  Fatura {fatura.mesNome}/{fatura.ano}
                                </Text>
                                <Text style={styles.faturaDatas}>
                                  Fecha: {formatDate(fatura.dataFechamento)} • Vence: {formatDate(fatura.dataVencimento)}
                                </Text>
                                {countLabel ? (
                                  <Text style={styles.faturaCount}>{countLabel}</Text>
                                ) : null}
                              </View>
                              <View style={styles.faturaRight}>
                                <Text
                                  style={[
                                    styles.faturaValor,
                                    fatura.paga ? styles.faturaValorPaga : styles.faturaValorAberta,
                                  ]}
                                >
                                  R$ {formatarMoeda(fatura.total)}
                                </Text>
                                {!fatura.paga && (
                                  <Pressable
                                    style={({ pressed }) => [styles.btnMarcarPaga, pressed && { opacity: 0.85 }]}
                                    onPress={() =>
                                      handleMarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano, fatura.total)
                                    }
                                  >
                                    <Text style={styles.btnMarcarPagaText}>Marcar como Paga</Text>
                                  </Pressable>
                                )}
                                {fatura.paga && (
                                  <View style={styles.pagaBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                    <Text style={styles.pagaBadgeText}>Paga</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    )}
                  </>
                )}
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', padding: 24 },

  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  buttonsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btnAdicionarCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnAdicionarParcela: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e40af',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 18, marginTop: 12 },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 },

  cardsContainer: { gap: 16 },
  cardPanel: {
    backgroundColor: 'rgba(30,41,59,0.9)',
    borderRadius: 12,
    borderLeftWidth: 4,
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: { padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardNome: { fontSize: 20, fontWeight: '700' },
  bandeiraBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  bandeiraText: { fontSize: 12, fontWeight: '600' },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {},
  gridLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  gridValue: { fontSize: 13, color: '#fff', fontWeight: '600' },
  gastoTotal: { fontSize: 13, color: '#f97316', fontWeight: '600' },
  disponivel: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  faturasToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  faturasToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faturasToggleText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  faturasTotal: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  faturasList: { padding: 12, paddingTop: 0, gap: 10 },
  faturaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  faturaRowPaga: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  faturaLeft: { flex: 1, marginRight: 12 },
  faturaTitulo: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  faturaDatas: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  faturaCount: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  faturaRight: { alignItems: 'flex-end' },
  faturaValor: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  faturaValorAberta: { color: '#f97316' },
  faturaValorPaga: { color: '#22c55e' },
  btnMarcarPaga: {
    backgroundColor: '#16a34a',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnMarcarPagaText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  pagaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pagaBadgeText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
})
