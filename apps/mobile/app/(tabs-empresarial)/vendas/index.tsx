import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabaseEmpresarial } from '../../../lib/supabase-empresarial'
import { formatarMoeda } from '../../../lib/utils'

interface Venda {
  id: string
  data_venda: string
  valor_final: number
  status: string
  parcelada: boolean
}

/**
 * Listagem de vendas (Fase 4).
 */
export default function VendasEmpresarialScreen() {
  const router = useRouter()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data, error } = await supabaseEmpresarial
        .from('vendas')
        .select('id, data_venda, valor_final, status, parcelada')
        .eq('user_id', userId)
        .order('data_venda', { ascending: false })
        .limit(100)
      if (error) throw error
      setVendas((data as Venda[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar vendas:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    supabaseEmpresarial.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])
  useEffect(() => {
    if (userId) load()
  }, [userId, load])

  if (loading && vendas.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vendas</Text>
      <Text style={styles.subtitle}>Listagem de vendas do mês e histórico</Text>
      <FlatList
        data={vendas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#10b981" />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma venda registrada.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardDate}>{new Date(item.data_venda).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.cardValor}>{formatarMoeda(item.valor_final)}</Text>
            <Text style={styles.cardStatus}>{item.status} {item.parcelada ? '• Parcelada' : ''}</Text>
          </View>
        )}
      />
      <Text style={styles.hint}>Registro de nova venda em breve (tela de formulário).</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  listContent: { paddingBottom: 24 },
  empty: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  cardValor: { fontSize: 18, fontWeight: '700', color: '#10b981', marginTop: 4 },
  cardStatus: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 16 },
})
