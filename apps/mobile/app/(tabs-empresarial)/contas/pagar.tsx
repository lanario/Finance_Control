import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { supabaseEmpresarial } from '../../../lib/supabase-empresarial'
import { formatarMoeda } from '../../../lib/utils'

interface ContaPagar {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  paga: boolean
  parcelada: boolean
}

/**
 * Listagem de contas a pagar (Fase 4).
 */
export default function ContasPagarScreen() {
  const [lista, setLista] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data, error } = await supabaseEmpresarial
        .from('contas_a_pagar')
        .select('id, descricao, valor, data_vencimento, paga, parcelada')
        .eq('user_id', userId)
        .order('data_vencimento', { ascending: false })
        .limit(100)
      if (error) throw error
      setLista((data as ContaPagar[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar contas a pagar:', e)
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

  if (loading && lista.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#10b981" />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma conta a pagar.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.paga && styles.cardPaga]}>
            <Text style={styles.cardDesc}>{item.descricao}</Text>
            <Text style={styles.cardValor}>{formatarMoeda(item.valor)}</Text>
            <Text style={styles.cardData}>Venc.: {new Date(item.data_vencimento).toLocaleDateString('pt-BR')} {item.paga ? '• Paga' : ''}</Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  empty: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  cardPaga: { opacity: 0.7, borderLeftColor: '#10b981' },
  cardDesc: { fontSize: 16, color: '#fff', fontWeight: '600' },
  cardValor: { fontSize: 16, color: '#ef4444', marginTop: 4 },
  cardData: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
})
