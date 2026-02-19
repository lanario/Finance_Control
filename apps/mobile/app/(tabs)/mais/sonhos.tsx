import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'
import { formatarMoeda } from '../../../lib/utils'

interface Sonho {
  id: string
  nome: string
  descricao: string | null
  valor_objetivo: number
  valor_atual: number
  data_objetivo: string | null
}

export default function SonhosScreen() {
  const router = useRouter()
  const [lista, setLista] = useState<Sonho[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('sonhos')
        .select('id, nome, descricao, valor_objetivo, valor_atual, data_objetivo')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
      setLista((data as Sonho[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar sonhos:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    supabasePessoal.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
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
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push('/(tabs)/mais/novo-sonho')}
      >
        <Text style={styles.addBtnText}>Novo sonho</Text>
      </TouchableOpacity>
      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#10b981" />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum sonho cadastrado.</Text>}
        renderItem={({ item }) => {
          const pct = item.valor_objetivo > 0
            ? Math.min(100, (item.valor_atual / item.valor_objetivo) * 100)
            : 0
          return (
            <View style={styles.card}>
              <Text style={styles.nome}>{item.nome}</Text>
              {item.descricao ? <Text style={styles.desc} numberOfLines={2}>{item.descricao}</Text> : null}
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.meta}>
                R$ {formatarMoeda(item.valor_atual)} / R$ {formatarMoeda(item.valor_objetivo)} ({pct.toFixed(0)}%)
              </Text>
              <TouchableOpacity
                style={styles.depositoBtn}
                onPress={() => router.push({
                  pathname: '/(tabs)/mais/deposito-sonho',
                  params: { sonhoId: item.id, sonhoNome: item.nome },
                })}
              >
                <Text style={styles.depositoBtnText}>Depositar</Text>
              </TouchableOpacity>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  addBtn: {
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#f59e0b', fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 48 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  nome: { fontSize: 18, fontWeight: '700', color: '#fff' },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  barBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  meta: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  depositoBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  depositoBtnText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  empty: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 24 },
})
