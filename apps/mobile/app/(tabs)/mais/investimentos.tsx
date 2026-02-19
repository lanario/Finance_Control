import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'
import { formatarMoeda } from '../../../lib/utils'
import { theme } from '../../../lib/theme'
import { Ionicons } from '@expo/vector-icons'

interface Investimento {
  id: string
  nome: string
  tipo: string
  valor_investido: number
  valor_atual: number
  data_aquisicao: string
}

const CARD_BG = '#2d3748'
const VERDE = '#10b981'
const VERMELHO = '#ef4444'
const TIPO_TAG_CDB = '#3A415F'
const TIPO_TAG_ACAO = '#007bff'

export default function InvestimentosScreen() {
  const router = useRouter()
  const [lista, setLista] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await supabasePessoal
        .from('investimentos')
        .select('id, nome, tipo, valor_investido, valor_atual, data_aquisicao')
        .eq('user_id', userId)
        .order('data_aquisicao', { ascending: false })
      setLista((data as Investimento[]) ?? [])
    } catch (e) {
      console.error('Erro ao carregar investimentos:', e)
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

  function rentabilidadePorItem(inv: Investimento): number {
    if (inv.valor_investido === 0) return 0
    return ((inv.valor_atual - inv.valor_investido) / inv.valor_investido) * 100
  }

  /** Média ponderada por valor investido (simplificada; web usa anualizada). */
  function rentabilidadeMediaPonderada(): number {
    if (lista.length === 0) return 0
    let soma = 0
    let pesoTotal = 0
    lista.forEach((inv) => {
      const r = rentabilidadePorItem(inv)
      soma += r * inv.valor_investido
      pesoTotal += inv.valor_investido
    })
    if (pesoTotal === 0) return 0
    return soma / pesoTotal
  }

  function formatData(dataStr: string) {
    const d = new Date(dataStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  async function handleExcluir(id: string) {
    Alert.alert(
      'Excluir investimento',
      'Tem certeza que deseja excluir este investimento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabasePessoal.from('investimentos').delete().eq('id', id)
              if (error) throw error
              load()
            } catch (e) {
              console.error('Erro ao excluir:', e)
              Alert.alert('Erro', 'Não foi possível excluir.')
            }
          },
        },
      ]
    )
  }

  if (loading && lista.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  const totalInvestido = lista.reduce((s, i) => s + i.valor_investido, 0)
  const totalAtual = lista.reduce((s, i) => s + i.valor_atual, 0)
  const rentMedia = rentabilidadeMediaPonderada()
  const diferenca = totalAtual - totalInvestido

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={theme.primary} />
      }
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Investimentos</Text>
          <Text style={styles.subtitle}>Gerencie seus investimentos e acompanhe sua carteira</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/mais/novo-investimento')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar Investimento</Text>
        </TouchableOpacity>
      </View>

      {/* Cartões: Total Investido, Valor Atual, Rentabilidade Média Anual */}
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Investido</Text>
          <Text style={styles.cardValueWhite}>{formatarMoeda(totalInvestido)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Valor Atual</Text>
          <Text style={[styles.cardValue, totalAtual >= totalInvestido ? styles.verde : styles.vermelho]}>
            {formatarMoeda(totalAtual)}
          </Text>
        </View>
      </View>
      <View style={[styles.card, styles.cardFull]}>
        <Text style={styles.cardLabel}>Rentabilidade Média Anual</Text>
        <Text style={[styles.cardValue, rentMedia >= 0 ? styles.verde : styles.vermelho]}>
          {rentMedia >= 0 ? '+' : ''}{rentMedia.toFixed(2)}% a.a.
        </Text>
        <Text style={[styles.cardSecondary, diferenca >= 0 ? styles.verde : styles.vermelho]}>
          {diferenca >= 0 ? '+' : ''}R$ {formatarMoeda(diferenca)}
        </Text>
        <Text style={styles.cardHint}>Média ponderada por valor investido</Text>
      </View>

      {/* Lista de investimentos (estilo tabela web em cards) */}
      {lista.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trending-up" size={64} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum investimento cadastrado</Text>
          <Text style={styles.emptyHint}>Clique em "Adicionar Investimento" para começar</Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {lista.map((item) => {
            const rent = rentabilidadePorItem(item)
            const isAcao = item.tipo === 'Ações' || item.tipo === 'FIIs' || item.tipo === 'ETFs' || item.tipo === 'Criptomoedas'
            const tagBg = isAcao ? TIPO_TAG_ACAO : TIPO_TAG_CDB
            return (
              <View key={item.id} style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowNome} numberOfLines={1}>{item.nome}</Text>
                  <View style={styles.rowAcoes}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(tabs)/mais/editar-investimento', params: { id: item.id } })}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="pencil" size={20} color={theme.info} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleExcluir(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.rowTagWrap}>
                  <View style={[styles.tag, { backgroundColor: tagBg }]}>
                    <Text style={styles.tagText}>{item.tipo}</Text>
                  </View>
                  <Text style={styles.rowData}>{formatData(item.data_aquisicao)}</Text>
                </View>
                <View style={styles.rowValores}>
                  <View style={styles.rowValorBlock}>
                    <Text style={styles.rowValorLabel}>Valor investido</Text>
                    <Text style={styles.rowValorTexto}>{formatarMoeda(item.valor_investido)}</Text>
                  </View>
                  <View style={styles.rowValorBlock}>
                    <Text style={styles.rowValorLabel}>Valor atual</Text>
                    <Text style={[styles.rowValorTexto, item.valor_atual >= item.valor_investido ? styles.verde : styles.vermelho]}>
                      {formatarMoeda(item.valor_atual)}
                    </Text>
                  </View>
                  <View style={styles.rowValorBlock}>
                    <Text style={styles.rowValorLabel}>Rentabilidade</Text>
                    <Text style={[styles.rowValorTexto, rent >= 0 ? styles.verde : styles.vermelho]}>
                      {rent >= 0 ? '+' : ''}{rent.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: theme.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: theme.textMuted },
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
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardFull: { marginBottom: 16 },
  cardLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '700' },
  cardValueWhite: { fontSize: 18, fontWeight: '700', color: theme.text },
  cardSecondary: { fontSize: 14, marginTop: 2 },
  cardHint: { fontSize: 11, color: theme.textPlaceholder, marginTop: 4 },
  verde: { color: VERDE },
  vermelho: { color: VERMELHO },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 16, color: theme.textMuted, marginTop: 16, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: theme.textPlaceholder, marginTop: 6, textAlign: 'center' },
  listWrap: { gap: 12 },
  rowCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowNome: { fontSize: 15, fontWeight: '600', color: theme.text, flex: 1, marginRight: 8 },
  rowAcoes: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTagWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  rowData: { fontSize: 12, color: theme.textMuted },
  rowValores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowValorBlock: {},
  rowValorLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 2 },
  rowValorTexto: { fontSize: 14, fontWeight: '600', color: theme.text },
})
