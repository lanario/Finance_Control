import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'
import { Ionicons } from '@expo/vector-icons'

interface Categoria {
  id: string
  nome: string
  descricao: string | null
  cor: string
}

export default function CategoriasScreen() {
  const router = useRouter()
  const [lista, setLista] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('tipos_gastos')
        .select('id, nome, descricao, cor')
        .eq('user_id', userId)
        .order('nome')
      setLista((data as Categoria[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar categorias:', e)
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

  function handleExcluir(item: Categoria) {
    Alert.alert(
      'Excluir categoria',
      `Excluir "${item.nome}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await supabasePessoal.from('tipos_gastos').delete().eq('id', item.id)
            load()
          },
        },
      ]
    )
  }

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
        onPress={() => router.push('/(tabs)/mais/categoria-nova')}
      >
        <Ionicons name="add-circle" size={22} color="#10b981" />
        <Text style={styles.addBtnText}>Nova categoria</Text>
      </TouchableOpacity>
      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#10b981" />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma categoria. Crie uma para organizar gastos.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.corBadge, { backgroundColor: item.cor || '#6b7280' }]} />
            <View style={styles.rowBody}>
              <Text style={styles.nome}>{item.nome}</Text>
              {item.descricao ? <Text style={styles.desc} numberOfLines={1}>{item.descricao}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/(tabs)/mais/categoria-editar', params: { id: item.id } })}
            >
              <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.delBtn} onPress={() => handleExcluir(item)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
  },
  addBtnText: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 48 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    marginBottom: 8,
  },
  corBadge: { width: 20, height: 20, borderRadius: 10, marginRight: 12 },
  rowBody: { flex: 1 },
  nome: { fontSize: 16, fontWeight: '600', color: '#fff' },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  editBtn: { padding: 8 },
  delBtn: { padding: 8 },
  empty: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 24 },
})
