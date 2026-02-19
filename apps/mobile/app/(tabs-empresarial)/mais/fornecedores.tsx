import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabaseEmpresarial } from '../../../lib/supabase-empresarial'

interface Fornecedor {
  id: string
  nome: string
  razao_social: string | null
  email: string | null
  ativo: boolean
}

/**
 * Listagem de fornecedores (Fase 4).
 */
export default function FornecedoresScreen() {
  const router = useRouter()
  const [lista, setLista] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data, error } = await supabaseEmpresarial
        .from('fornecedores')
        .select('id, nome, razao_social, email, ativo')
        .eq('user_id', userId)
        .order('nome', { ascending: true })
      if (error) throw error
      setLista((data as Fornecedor[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar fornecedores:', e)
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
        ListEmptyComponent={<Text style={styles.empty}>Nenhum fornecedor cadastrado.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardNome}>{item.nome}</Text>
            {item.razao_social ? <Text style={styles.cardSub}>{item.razao_social}</Text> : null}
            {!item.ativo && <Text style={styles.badge}>Inativo</Text>}
          </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardNome: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  badge: { fontSize: 11, color: '#ef4444', marginTop: 4 },
})
