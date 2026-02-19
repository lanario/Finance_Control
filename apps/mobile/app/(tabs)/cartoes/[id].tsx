import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'
import { formatarMoeda } from '../../../lib/utils'
import { Ionicons } from '@expo/vector-icons'

interface Cartao {
  id: string
  nome: string
  bandeira: string
  limite: number
  fechamento: number
  vencimento: number
}

interface Parcela {
  id: string
  descricao: string
  valor: number
  numero_parcela: number
  total_parcelas: number
  data_vencimento: string
  paga: boolean
  categoria: string
}

/**
 * Detalhe do cartão: dados e listagem de parcelas (Fase 3).
 */
export default function CartaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [cartao, setCartao] = useState<Cartao | null>(null)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { data: cartaoData } = await supabasePessoal
        .from('cartoes')
        .select('id, nome, bandeira, limite, fechamento, vencimento')
        .eq('id', id)
        .single()
      setCartao(cartaoData as Cartao)

      const { data: parcelasData } = await supabasePessoal
        .from('parcelas')
        .select('id, descricao, valor, numero_parcela, total_parcelas, data_vencimento, paga, categoria')
        .eq('cartao_id', id)
        .order('data_vencimento', { ascending: false })
      setParcelas((parcelasData as Parcela[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar cartão:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !cartao) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  if (!cartao) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Cartão não encontrado.</Text>
      </View>
    )
  }

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0)
  const parcelasPendentes = parcelas.filter((p) => !p.paga)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#10b981" />}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardNome}>{cartao.nome}</Text>
        <Text style={styles.cardBandeira}>{cartao.bandeira}</Text>
        <Text style={styles.cardLimite}>Limite: R$ {formatarMoeda(cartao.limite)}</Text>
        <Text style={styles.cardInfo}>
          Fech. dia {cartao.fechamento} · Venc. dia {cartao.vencimento}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push({ pathname: '/(tabs)/cartoes/nova-compra', params: { id: cartao.id } })}
      >
        <Ionicons name="add-circle" size={22} color="#10b981" />
        <Text style={styles.addButtonText}>Nova compra</Text>
      </TouchableOpacity>

      {parcelas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Parcelas ({parcelasPendentes.length} pendentes) · Total R$ {formatarMoeda(totalParcelas)}
          </Text>
          {parcelas.slice(0, 30).map((p) => (
            <View key={p.id} style={[styles.parcelaRow, p.paga && styles.parcelaPaga]}>
              <View style={styles.parcelaLeft}>
                <Text style={styles.parcelaDesc} numberOfLines={1}>{p.descricao}</Text>
                <Text style={styles.parcelaMeta}>
                  {p.numero_parcela}/{p.total_parcelas} · Venc. {p.data_vencimento} · {p.categoria}
                </Text>
              </View>
              <Text style={[styles.parcelaValor, p.paga && styles.parcelaValorPaga]}>
                R$ {formatarMoeda(p.valor)}
              </Text>
            </View>
          ))}
          {parcelas.length > 30 && (
            <Text style={styles.more}>+ {parcelas.length - 30} parcelas</Text>
          )}
        </View>
      )}

      {parcelas.length === 0 && (
        <Text style={styles.empty}>Nenhuma parcela ou compra neste cartão.</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  error: { color: '#ef4444', padding: 24, fontSize: 16 },
  cardHeader: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardNome: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardBandeira: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  cardLimite: { fontSize: 14, color: '#10b981', marginBottom: 2 },
  cardInfo: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
  },
  addButtonText: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  parcelaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    marginBottom: 6,
  },
  parcelaPaga: { opacity: 0.6 },
  parcelaLeft: { flex: 1, marginRight: 12 },
  parcelaDesc: { color: '#fff', fontSize: 14, fontWeight: '500' },
  parcelaMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  parcelaValor: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  parcelaValorPaga: { color: 'rgba(255,255,255,0.6)' },
  more: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
  empty: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', padding: 24 },
})
