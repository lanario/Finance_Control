import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../../lib/context'
import { supabasePessoal } from '../../../lib/supabase-pessoal'
import { formatarMoeda } from '../../../lib/utils'
import { theme } from '../../../lib/theme'
import { Ionicons } from '@expo/vector-icons'

interface Receita {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: string
  mes_referencia: number
  ano_referencia: number
}

/** Cores alinhadas ao web: Total verde, Fixas azul, Extras amarelo */
const CARD_TOTAL = '#10b981'
const CARD_FIXAS = '#60a5fa'
const CARD_EXTRAS = '#fbbf24'

export default function ReceitasListScreen() {
  const router = useRouter()
  const [context, setContext] = useState<AppContext>('pessoal')
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'fixa' | 'extra'>('fixa')

  const loadReceitas = useCallback(async () => {
    if (context !== 'pessoal' || !userId) return
    try {
      const { data } = await supabasePessoal
        .from('receitas')
        .select('id, descricao, valor, data, tipo, mes_referencia, ano_referencia')
        .eq('user_id', userId)
        .order('data', { ascending: false })
      setReceitas((data as Receita[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar receitas:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [context, userId])

  useEffect(() => {
    AsyncStorage.getItem(CONTEXT_STORAGE_KEY).then((ctx) => setContext((ctx as AppContext) ?? 'pessoal'))
  }, [])
  useEffect(() => {
    if (context !== 'pessoal') {
      setLoading(false)
      return
    }
    supabasePessoal.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [context])
  useEffect(() => {
    if (userId && context === 'pessoal') loadReceitas()
  }, [userId, context, loadReceitas])

  if (context === 'empresarial') {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Módulo empresarial em breve.</Text>
      </View>
    )
  }

  if (loading && receitas.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  const receitasFixas = receitas.filter((r) => r.tipo === 'fixa')
  const receitasExtras = receitas.filter((r) => r.tipo === 'extra')
  const receitasAtivas = activeTab === 'fixa' ? receitasFixas : receitasExtras
  const totalFixa = receitasFixas.reduce((s, r) => s + r.valor, 0)
  const totalExtra = receitasExtras.reduce((s, r) => s + r.valor, 0)
  const totalGeral = totalFixa + totalExtra

  function formatData(dataStr: string) {
    const d = new Date(dataStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadReceitas()
          }}
          tintColor={theme.primary}
        />
      }
    >
      {/* Cabeçalho: título, subtítulo e botão Adicionar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Receitas</Text>
          <Text style={styles.subtitle}>Gerencie suas receitas fixas e extras</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/receitas/nova')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar Receita</Text>
        </TouchableOpacity>
      </View>

      {/* Cartões de resumo: Total Geral, Receitas Fixas, Receitas Extras */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardTotal]}>
          <Text style={styles.cardLabel}>Total Geral</Text>
          <Text style={[styles.cardValue, { color: CARD_TOTAL }]}>{formatarMoeda(totalGeral)}</Text>
        </View>
        <View style={[styles.card, styles.cardFixa]}>
          <Text style={styles.cardLabel}>Receitas Fixas</Text>
          <Text style={[styles.cardValue, { color: CARD_FIXAS }]}>{formatarMoeda(totalFixa)}</Text>
        </View>
        <View style={[styles.card, styles.cardExtra]}>
          <Text style={styles.cardLabel}>Receitas Extras</Text>
          <Text style={[styles.cardValue, { color: CARD_EXTRAS }]}>{formatarMoeda(totalExtra)}</Text>
        </View>
      </View>

      {/* Abas: Receitas Fixas | Receitas Extras */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'fixa' && styles.tabActive]}
            onPress={() => setActiveTab('fixa')}
          >
            <Text style={[styles.tabText, activeTab === 'fixa' && styles.tabTextActive]}>
              Receitas Fixas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'extra' && styles.tabActive]}
            onPress={() => setActiveTab('extra')}
          >
            <Text style={[styles.tabText, activeTab === 'extra' && styles.tabTextActive]}>
              Receitas Extras
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo da aba */}
        <View style={styles.tabContent}>
          {receitasAtivas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={64} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>
                Nenhuma receita {activeTab === 'fixa' ? 'fixa' : 'extra'} cadastrada
              </Text>
              <Text style={styles.emptyHint}>
                Clique em "Adicionar Receita" para começar
              </Text>
            </View>
          ) : (
            <View style={styles.listContent}>
              {receitasAtivas.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowDesc}>{item.descricao}</Text>
                    <Text style={styles.rowMeta}>
                      {formatData(item.data)} · {item.mes_referencia}/{item.ano_referencia}
                    </Text>
                  </View>
                  <Text style={styles.rowValor}>{formatarMoeda(item.valor)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: theme.textMuted,
    fontStyle: 'italic',
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textMuted,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#2d3748',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTotal: {},
  cardFixa: {},
  cardExtra: {},
  cardLabel: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabsWrapper: {
    backgroundColor: '#2d3748',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: theme.primary,
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textMuted,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
    minHeight: 200,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    color: theme.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: theme.textPlaceholder,
    marginTop: 6,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 8,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowDesc: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
  },
  rowValor: {
    fontSize: 15,
    fontWeight: '600',
    color: CARD_TOTAL,
  },
})
