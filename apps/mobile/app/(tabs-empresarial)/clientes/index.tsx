import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabaseEmpresarial } from '../../../lib/supabase-empresarial'
import { Ionicons } from '@expo/vector-icons'

interface Cliente {
  id: string
  nome: string
  razao_social: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
}

/**
 * Listagem de clientes do módulo Empresarial (Fase 4).
 */
export default function ClientesEmpresarialScreen() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const loadClientes = useCallback(async () => {
    if (!userId) return
    try {
      let query = supabaseEmpresarial
        .from('clientes')
        .select('id, nome, razao_social, email, telefone, ativo')
        .eq('user_id', userId)
        .order('nome', { ascending: true })
      const { data, error } = await query
      if (error) throw error
      setClientes((data as Cliente[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar clientes:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    supabaseEmpresarial.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (userId) loadClientes()
  }, [userId, loadClientes])

  const filtrados = busca.trim()
    ? clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(busca.toLowerCase()) ||
          (c.razao_social?.toLowerCase().includes(busca.toLowerCase()) ?? false) ||
          (c.email?.toLowerCase().includes(busca.toLowerCase()) ?? false)
      )
    : clientes

  function onRefresh() {
    setRefreshing(true)
    loadClientes()
  }

  function handleNovo() {
    router.push('/(tabs-empresarial)/clientes/novo')
  }

  function handleCliente(id: string) {
    router.push({ pathname: '/(tabs-empresarial)/clientes/[id]', params: { id } })
  }

  if (loading && clientes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, e-mail..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={busca}
          onChangeText={setBusca}
        />
        <TouchableOpacity style={styles.fab} onPress={handleNovo}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {busca.trim() ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado. Toque em + para adicionar.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleCliente(item.id)} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardNome}>{item.nome}</Text>
              {!item.ativo && <Text style={styles.badgeInativo}>Inativo</Text>}
            </View>
            {item.razao_social ? <Text style={styles.cardSub}>{item.razao_social}</Text> : null}
            {item.email ? <Text style={styles.cardSub}>{item.email}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingBottom: 24 },
  emptyText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardNome: { fontSize: 16, fontWeight: '600', color: '#fff' },
  badgeInativo: { fontSize: 11, color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
})
