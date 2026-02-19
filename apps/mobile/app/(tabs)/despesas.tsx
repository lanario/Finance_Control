import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../lib/context'
import { supabasePessoal } from '../../lib/supabase-pessoal'
import { formatarMoeda } from '../../lib/utils'
import { AnimatedListItem, LottieLoader } from '../../components'
import { Ionicons } from '@expo/vector-icons'

interface ItemDespesa {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string
  parcelaInfo?: string
}

interface DespesasPorMes {
  ano: number
  mes: number
  mesNome: string
  total: number
  itens: ItemDespesa[]
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/**
 * Tela Despesas: alinhada ao web – Total Geral, Períodos, lista por mês
 * com Marcar Pago e lista expansível de itens.
 */
export default function DespesasScreen() {
  const router = useRouter()
  const [context, setContext] = useState<AppContext>('pessoal')
  const [despesasPorMes, setDespesasPorMes] = useState<DespesasPorMes[]>([])
  const [mesesPagos, setMesesPagos] = useState<Set<string>>(new Set())
  const [mesesAbertos, setMesesAbertos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const loadMesesPagos = useCallback(async (uid: string) => {
    try {
      const { data } = await supabasePessoal
        .from('meses_pagos')
        .select('mes, ano')
        .eq('user_id', uid)
        .eq('paga', true)
      const pagos = new Set((data ?? []).map((m) => `${m.ano}-${m.mes}`))
      setMesesPagos(pagos)
    } catch (e) {
      console.error('Erro ao carregar meses pagos:', e)
    }
  }, [])

  const loadDespesas = useCallback(async () => {
    if (context !== 'pessoal' || !userId) return
    try {
      await loadMesesPagos(userId)

      const { data: compras } = await supabasePessoal
        .from('compras')
        .select('id, descricao, valor, data, categoria, parcelada, total_parcelas')
        .eq('user_id', userId)
      const comprasNaoParceladas = (compras ?? []).filter(
        (c) => !(c.parcelada === true || (c.total_parcelas ?? 0) > 1)
      )

      const { data: parcelas } = await supabasePessoal
        .from('parcelas')
        .select('id, descricao, valor, data_vencimento, categoria, numero_parcela, total_parcelas')
        .eq('user_id', userId)

      const itens: ItemDespesa[] = [
        ...comprasNaoParceladas.map((c) => ({
          id: c.id,
          descricao: c.descricao,
          valor: c.valor,
          data: c.data,
          categoria: c.categoria || 'Outros',
        })),
        ...(parcelas ?? []).map((p) => ({
          id: p.id,
          descricao: p.descricao,
          valor: p.valor,
          data: p.data_vencimento,
          categoria: p.categoria || 'Outros',
          parcelaInfo: `${p.numero_parcela}/${p.total_parcelas}`,
        })),
      ]

      const porMes: Record<string, DespesasPorMes> = {}
      itens.forEach((item) => {
        const d = new Date(item.data)
        const ano = d.getFullYear()
        const mes = d.getMonth() + 1
        const key = `${ano}-${mes}`
        if (!porMes[key]) {
          porMes[key] = {
            ano,
            mes,
            mesNome: MESES_NOMES[mes - 1],
            total: 0,
            itens: [],
          }
        }
        porMes[key].itens.push(item)
        porMes[key].total += item.valor
      })

      const lista = Object.values(porMes).sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano
        return a.mes - b.mes
      })
      setDespesasPorMes(lista)

      const now = new Date()
      const keyAtual = `${now.getFullYear()}-${now.getMonth() + 1}`
      setMesesAbertos((prev) => new Set([...prev, keyAtual]))
    } catch (e) {
      console.error('Erro ao carregar despesas:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [context, userId, loadMesesPagos])

  useEffect(() => {
    AsyncStorage.getItem(CONTEXT_STORAGE_KEY).then((ctx) =>
      setContext((ctx as AppContext) ?? 'pessoal')
    )
  }, [])
  useEffect(() => {
    if (context !== 'pessoal') {
      setLoading(false)
      return
    }
    supabasePessoal.auth.getUser().then(({ data: { user } }) =>
      setUserId(user?.id ?? null)
    )
  }, [context])
  useEffect(() => {
    if (userId && context === 'pessoal') loadDespesas()
  }, [userId, context, loadDespesas])

  async function handleToggleMesPago(ano: number, mes: number) {
    if (!userId) return
    const key = `${ano}-${mes}`
    const estaPago = mesesPagos.has(key)
    try {
      if (estaPago) {
        await supabasePessoal
          .from('meses_pagos')
          .delete()
          .eq('user_id', userId)
          .eq('ano', ano)
          .eq('mes', mes)
        setMesesPagos((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } else {
        await supabasePessoal.from('meses_pagos').upsert(
          {
            user_id: userId,
            mes,
            ano,
            paga: true,
            data_pagamento: new Date().toISOString().split('T')[0],
          },
          { onConflict: 'user_id,mes,ano' }
        )
        setMesesPagos((prev) => new Set([...prev, key]))
      }
    } catch (e) {
      console.error('Erro ao alterar status do mês:', e)
    }
  }

  function toggleMes(ano: number, mes: number) {
    const key = `${ano}-${mes}`
    setMesesAbertos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (context === 'empresarial') {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Módulo empresarial em breve.</Text>
      </View>
    )
  }

  if (loading && despesasPorMes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LottieLoader />
      </View>
    )
  }

  const totalGeral = despesasPorMes.reduce((s, m) => s + m.total, 0)

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadDespesas()
          }}
          tintColor="#10b981"
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.subtitle}>Todas as suas despesas organizadas por mês</Text>
        <Pressable
          style={({ pressed }) => [styles.btnAdicionar, pressed && { opacity: 0.85 }]}
          onPress={() => Alert.alert('Em breve', 'A tela de adicionar despesa estará disponível em breve.')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.btnAdicionarText}>Adicionar Despesa</Text>
        </Pressable>
      </View>

      <View style={styles.cardResumo}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Total Geral</Text>
          <Text style={styles.resumoValor}>{formatarMoeda(totalGeral)}</Text>
        </View>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Períodos</Text>
          <Text style={styles.resumoValor}>{despesasPorMes.length}</Text>
        </View>
      </View>

      {despesasPorMes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyText}>Nenhuma despesa registrada</Text>
          <Text style={styles.emptyHint}>As compras aparecerão aqui quando forem cadastradas</Text>
        </View>
      ) : (
        despesasPorMes.map((mesBlock, index) => {
          const key = `${mesBlock.ano}-${mesBlock.mes}`
          const aberto = mesesAbertos.has(key)
          const estaPago = mesesPagos.has(key)
          return (
            <View
              key={key}
              style={[styles.cardMes, estaPago && styles.cardMesPago]}
            >
              <Pressable
                style={styles.cardMesHeader}
                onPress={() => toggleMes(mesBlock.ano, mesBlock.mes)}
              >
                <Ionicons
                  name={aberto ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color="rgba(255,255,255,0.7)"
                />
                <View style={styles.cardMesInfo}>
                  <Text style={styles.cardMesTitulo}>
                    {mesBlock.mesNome} {mesBlock.ano}
                  </Text>
                  <Text style={styles.cardMesMeta}>
                    {mesBlock.itens.length} compra{mesBlock.itens.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={[styles.cardMesTotal, estaPago && styles.cardMesTotalPago]}>
                  R$ {formatarMoeda(mesBlock.total)}
                </Text>
              </Pressable>
              <View style={styles.cardMesAcoes}>
                <Pressable
                  style={({ pressed }) => [
                    styles.btnPago,
                    estaPago && styles.btnPagoAtivo,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => handleToggleMesPago(mesBlock.ano, mesBlock.mes)}
                >
                  <Ionicons
                    name={estaPago ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={estaPago ? '#10b981' : 'rgba(255,255,255,0.8)'}
                  />
                  <Text style={[styles.btnPagoText, estaPago && styles.btnPagoTextAtivo]}>
                    {estaPago ? '✓ Pago' : '• Marcar Pago'}
                  </Text>
                </Pressable>
              </View>
              {aberto && (
                <View style={styles.listaItens}>
                  {mesBlock.itens
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((item, i) => (
                      <AnimatedListItem key={item.id} index={i}>
                        <View style={styles.rowItem}>
                          <View style={styles.rowItemLeft}>
                            <Text style={styles.rowItemDesc}>{item.descricao}</Text>
                            <Text style={styles.rowItemMeta}>
                              {item.data} · {item.categoria}
                              {item.parcelaInfo ? ` · ${item.parcelaInfo}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.rowItemValor}>R$ {formatarMoeda(item.valor)}</Text>
                        </View>
                      </AnimatedListItem>
                    ))}
                </View>
              )}
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: '#1e3a5f' },
  scrollContent: { padding: 16, paddingBottom: 48 },
  placeholder: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', padding: 24 },
  headerRow: { marginBottom: 16 },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  btnAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnAdicionarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cardResumo: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resumoItem: { flex: 1 },
  resumoLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  resumoValor: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cardMes: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  cardMesPago: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  cardMesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardMesInfo: { flex: 1, marginLeft: 10 },
  cardMesTitulo: { fontSize: 17, fontWeight: '600', color: '#fff' },
  cardMesMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardMesTotal: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  cardMesTotalPago: { color: '#10b981' },
  cardMesAcoes: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  btnPago: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnPagoAtivo: { backgroundColor: 'rgba(16,185,129,0.25)' },
  btnPagoText: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  btnPagoTextAtivo: { color: '#10b981', fontWeight: '600' },
  listaItens: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', padding: 10 },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 6,
  },
  rowItemLeft: { flex: 1, marginRight: 12 },
  rowItemDesc: { color: '#fff', fontSize: 14, fontWeight: '500' },
  rowItemMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  rowItemValor: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 12 },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
})
