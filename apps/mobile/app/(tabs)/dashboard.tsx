import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Pressable,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../lib/context'
import { supabasePessoal } from '../../lib/supabase-pessoal'
import { formatarMoeda } from '../../lib/utils'
import { theme } from '../../lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { LineChart, PieChart } from 'react-native-gifted-charts'
import { AnimatedCard, AnimatedFadeIn, LottieLoader } from '../../components'

const MESES_NOMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const MESES_NOMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** Paleta de cores para pizza e lista de categorias (igual à web) */
const CATEGORIA_CORES = [
  '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#3b82f6', '#10b981',
]

interface DashboardStats {
  gastosMes: number
  receitasMes: number
  totalCartoes: number
}

interface GastosMensaisItem {
  mes: string
  gastos: number
}

interface DespesasPorCategoriaItem {
  categoria: string
  valor: number
  porcentagem: number
}

interface InvestimentosPorTipoItem {
  tipo: string
  valor_investido: number
  valor_atual: number
  porcentagem: number
}

/**
 * Dashboard Pessoal (Fase 3): cards de totais e gráficos.
 * Contexto Empresarial mostra placeholder.
 */
export default function DashboardScreen() {
  const [context, setContext] = useState<AppContext>('pessoal')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    gastosMes: 0,
    receitasMes: 0,
    totalCartoes: 0,
  })
  const [gastosMensais, setGastosMensais] = useState<GastosMensaisItem[]>([])
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<DespesasPorCategoriaItem[]>([])
  const [investimentosPorTipo, setInvestimentosPorTipo] = useState<InvestimentosPorTipoItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const now = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear())

  const loadDashboard = useCallback(async () => {
    if (context !== 'pessoal' || !userId) return
    try {
      const startOfMonth = new Date(anoSelecionado, mesSelecionado - 1, 1)
      const endOfMonth = new Date(anoSelecionado, mesSelecionado, 0)
      const sixMonthsAgo = new Date(anoSelecionado, mesSelecionado - 6, 1)

      const { data: cartoes } = await supabasePessoal
        .from('cartoes')
        .select('id')
        .eq('user_id', userId)

      const { data: todasComprasMes } = await supabasePessoal
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .gte('data', startOfMonth.toISOString().split('T')[0])
        .lte('data', endOfMonth.toISOString().split('T')[0])

      const comprasMes =
        todasComprasMes?.filter(
          (c) => !(c.parcelada === true || (c as { total_parcelas?: number }).total_parcelas > 1)
        ) ?? []

      const { data: parcelasMes } = await supabasePessoal
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', startOfMonth.toISOString().split('T')[0])
        .lte('data_vencimento', endOfMonth.toISOString().split('T')[0])

      const { data: receitasMes } = await supabasePessoal
        .from('receitas')
        .select('valor')
        .eq('user_id', userId)
        .eq('mes_referencia', mesSelecionado)
        .eq('ano_referencia', anoSelecionado)

      const totalGastosCompras = comprasMes.reduce((s, c) => s + c.valor, 0)
      const totalGastosParcelas = parcelasMes?.reduce((s, p) => s + p.valor, 0) ?? 0
      const totalGastos = totalGastosCompras + totalGastosParcelas
      const totalReceitas = receitasMes?.reduce((s, r) => s + r.valor, 0) ?? 0

      const despesasPorCategoriaMap: Record<string, number> = {}
      comprasMes.forEach((c) => {
        const cat = c.categoria || 'Outros'
        despesasPorCategoriaMap[cat] = (despesasPorCategoriaMap[cat] ?? 0) + c.valor
      })
      parcelasMes?.forEach((p) => {
        const cat = p.categoria || 'Outros'
        despesasPorCategoriaMap[cat] = (despesasPorCategoriaMap[cat] ?? 0) + p.valor
      })
      const despesasCategoriaData = Object.entries(despesasPorCategoriaMap)
        .map(([categoria, valor]) => ({
          categoria,
          valor: Number(valor.toFixed(2)),
          porcentagem: totalGastos > 0 ? Number(((valor / totalGastos) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.valor - a.valor)
      setDespesasPorCategoria(despesasCategoriaData)

      const { data: compras6Meses } = await supabasePessoal
        .from('compras')
        .select('*')
        .eq('user_id', userId)
        .gte('data', sixMonthsAgo.toISOString())
      const compras6 = compras6Meses?.filter(
        (c) => !(c.parcelada === true || (c as { total_parcelas?: number }).total_parcelas > 1)
      ) ?? []
      const { data: parcelas6Meses } = await supabasePessoal
        .from('parcelas')
        .select('*')
        .eq('user_id', userId)
        .gte('data_vencimento', sixMonthsAgo.toISOString().split('T')[0])

      const gastosPorMes: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anoSelecionado, mesSelecionado - 1 - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        gastosPorMes[key] = 0
      }
      compras6.forEach((c) => {
        const d = new Date(c.data)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (gastosPorMes[key] !== undefined) gastosPorMes[key] += c.valor
      })
      parcelas6Meses?.forEach((p) => {
        const d = new Date(p.data_vencimento)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (gastosPorMes[key] !== undefined) gastosPorMes[key] += p.valor
      })
      const gastosMensaisData = Object.keys(gastosPorMes)
        .sort()
        .map((key) => {
          const [anoStr, mes] = key.split('-')
          const mesNum = parseInt(mes, 10)
          return {
            mes: `${MESES_NOMES[mesNum - 1]}/${anoStr.slice(2)}`,
            gastos: gastosPorMes[key],
          }
        })
      setGastosMensais(gastosMensaisData)

      const { data: investimentosData } = await supabasePessoal
        .from('investimentos')
        .select('*')
        .eq('user_id', userId)
        .order('data_aquisicao', { ascending: false })

      const investimentosPorTipoMap: Record<string, { valor_investido: number; valor_atual: number }> = {}
      const totalInvestidoGeral = investimentosData?.reduce((s, inv) => s + inv.valor_investido, 0) ?? 0
      investimentosData?.forEach((inv) => {
        const tipo = inv.tipo ?? 'Outros'
        if (!investimentosPorTipoMap[tipo]) {
          investimentosPorTipoMap[tipo] = { valor_investido: 0, valor_atual: 0 }
        }
        investimentosPorTipoMap[tipo].valor_investido += inv.valor_investido
        investimentosPorTipoMap[tipo].valor_atual += inv.valor_atual
      })
      const investimentosPorTipoData: InvestimentosPorTipoItem[] = Object.entries(investimentosPorTipoMap)
        .map(([tipo, valores]) => ({
          tipo,
          valor_investido: Number(valores.valor_investido.toFixed(2)),
          valor_atual: Number(valores.valor_atual.toFixed(2)),
          porcentagem: totalInvestidoGeral > 0
            ? Number(((valores.valor_investido / totalInvestidoGeral) * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.valor_investido - a.valor_investido)
      setInvestimentosPorTipo(investimentosPorTipoData)
      setStats({
        gastosMes: totalGastos,
        receitasMes: totalReceitas,
        totalCartoes: cartoes?.length ?? 0,
      })
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [context, userId, mesSelecionado, anoSelecionado])

  useEffect(() => {
    AsyncStorage.getItem(CONTEXT_STORAGE_KEY).then((ctx) => {
      setContext((ctx as AppContext) ?? 'pessoal')
    })
  }, [])

  useEffect(() => {
    if (context !== 'pessoal') {
      setLoading(false)
      return
    }
    supabasePessoal.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [context])

  useEffect(() => {
    if (userId && context === 'pessoal') loadDashboard()
  }, [userId, context, loadDashboard])

  function onRefresh() {
    setRefreshing(true)
    loadDashboard()
  }

  function goToPreviousMonth() {
    if (mesSelecionado === 1) {
      setMesSelecionado(12)
      setAnoSelecionado((a) => a - 1)
    } else {
      setMesSelecionado((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (mesSelecionado === 12) {
      setMesSelecionado(1)
      setAnoSelecionado((a) => a + 1)
    } else {
      setMesSelecionado((m) => m + 1)
    }
  }

  if (context === 'empresarial') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Financeiro Empresarial</Text>
        <Text style={styles.placeholder}>Módulo empresarial em breve.</Text>
      </View>
    )
  }

  if (loading && !stats.totalCartoes && gastosMensais.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LottieLoader />
      </View>
    )
  }

  const router = useRouter()
  const saldo = stats.receitasMes - stats.gastosMes
  const chartWidth = Dimensions.get('window').width - 48
  const lineData = gastosMensais.map((item) => ({
    value: item.gastos,
    label: item.mes,
    dataPointText: item.gastos >= 1000 ? `R$ ${(item.gastos / 1000).toFixed(1)}k` : `R$ ${item.gastos.toFixed(0)}`,
    textColor: '#ffffff',
    textFontSize: 10,
  }))
  const pieData = despesasPorCategoria.slice(0, 10).map((item, i) => ({
    value: item.porcentagem,
    color: CATEGORIA_CORES[i % CATEGORIA_CORES.length],
    text: item.categoria,
  }))
  const mesNome = MESES_NOMES_FULL[mesSelecionado - 1]
  const maxInvestimento = Math.max(
    ...investimentosPorTipo.flatMap((t) => [t.valor_investido, t.valor_atual]),
    1
  )

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <AnimatedFadeIn delay={0}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Visão geral das suas finanças pessoais</Text>
          <View style={styles.monthSelectorBar}>
            <Pressable
              onPress={goToPreviousMonth}
              style={styles.monthSelectorButton}
              hitSlop={12}
              accessibilityLabel="Mês anterior"
            >
              <Ionicons name="chevron-back" size={24} color={theme.textMuted} />
            </Pressable>
            <Text style={styles.monthSelectorText}>
              {MESES_NOMES_FULL[mesSelecionado - 1]} {anoSelecionado}
            </Text>
            <Pressable
              onPress={goToNextMonth}
              style={styles.monthSelectorButton}
              hitSlop={12}
              accessibilityLabel="Próximo mês"
            >
              <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
            </Pressable>
          </View>
        </View>
      </AnimatedFadeIn>

      <View style={styles.cardsRow}>
        <AnimatedCard index={0} style={[styles.card, styles.cardRed]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Despesas do Mês</Text>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
              <Ionicons name="trending-down" size={20} color={theme.danger} />
            </View>
          </View>
          <Text style={styles.cardValueRed}>R$ {formatarMoeda(stats.gastosMes)}</Text>
        </AnimatedCard>
        <AnimatedCard index={1} style={[styles.card, styles.cardGreen]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Receitas do Mês</Text>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
              <Ionicons name="trending-up" size={20} color={theme.primary} />
            </View>
          </View>
          <Text style={styles.cardValueGreen}>R$ {formatarMoeda(stats.receitasMes)}</Text>
        </AnimatedCard>
      </View>
      <View style={styles.cardsRow}>
        <AnimatedCard index={2} style={[styles.card, styles.cardBlue]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Total de Cartões</Text>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Ionicons name="card" size={20} color={theme.info} />
            </View>
          </View>
          <Text style={styles.cardValue}>{stats.totalCartoes}</Text>
        </AnimatedCard>
        <AnimatedCard index={3} style={[styles.card, styles.cardPrimary]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Saldo Total</Text>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="cash-outline" size={20} color={theme.text} />
            </View>
          </View>
          <Text style={[styles.cardValue, saldo >= 0 ? styles.cardValueGreen : styles.cardValueRed]}>
            R$ {formatarMoeda(saldo)}
          </Text>
        </AnimatedCard>
      </View>

      {lineData.length > 0 && (
        <AnimatedFadeIn delay={400}>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Despesas Mensais</Text>
            <Text style={styles.chartSubtitle}>Últimos 6 meses. Clique para detalhes</Text>
            <View style={styles.chartWrap}>
              <LineChart
                data={lineData}
                width={chartWidth}
                height={160}
                color="#ef4444"
                thickness={2}
                isAnimated
                animationDuration={1200}
                animateOnDataChange
                onDataChangeAnimationDuration={600}
                hideDataPoints={lineData.length > 6}
                yAxisLabelPrefix="R$ "
                yAxisLabelWidth={52}
                noOfSections={4}
                formatYLabel={(v) => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(v))}
                xAxisLabelTextStyle={styles.chartXAxisLabel}
                yAxisTextStyle={styles.chartYAxisLabel}
                showVerticalLines
                verticalLinesColor="rgba(255,255,255,0.25)"
                verticalLinesThickness={1}
                rulesColor="rgba(255,255,255,0.2)"
                dataPointsColor="#ef4444"
                dataPointsRadius={4}
              />
            </View>
          </View>
        </AnimatedFadeIn>
      )}

      {investimentosPorTipo.length > 0 && (
        <AnimatedFadeIn delay={440}>
          <View style={styles.chartSection}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Investimentos por Tipo</Text>
              <Pressable onPress={() => router.push('/(tabs)/mais/investimentos')} hitSlop={8}>
                <Text style={styles.linkText}>Ver todos →</Text>
              </Pressable>
            </View>
            <View style={styles.chartWrap}>
              {investimentosPorTipo.map((item) => {
                const rent = item.valor_investido > 0
                  ? ((item.valor_atual - item.valor_investido) / item.valor_investido) * 100
                  : 0
                const corAtual = rent >= 0 ? theme.primary : theme.danger
                return (
                  <View key={item.tipo} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>{item.tipo}</Text>
                    <View style={styles.barTracks}>
                      <View style={[styles.barTrack, { flex: 1 }]}>
                        <View
                          style={[
                            styles.barSegment,
                            { width: `${(item.valor_investido / maxInvestimento) * 100}%`, backgroundColor: theme.info },
                          ]}
                        />
                      </View>
                      <View style={[styles.barTrack, { flex: 1 }]}>
                        <View
                          style={[
                            styles.barSegment,
                            { width: `${(item.valor_atual / maxInvestimento) * 100}%`, backgroundColor: corAtual },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                )
              })}
              <View style={styles.legendaRow}>
                <View style={styles.legendaItem}>
                  <View style={[styles.legendaQuad, { backgroundColor: theme.info }]} />
                  <Text style={styles.legendaText}>Investido</Text>
                </View>
                <View style={styles.legendaItem}>
                  <View style={[styles.legendaQuad, { backgroundColor: theme.primary }]} />
                  <Text style={styles.legendaText}>Valor Atual</Text>
                </View>
              </View>
            </View>
          </View>
        </AnimatedFadeIn>
      )}

      {pieData.length > 0 && (
        <AnimatedFadeIn delay={480}>
          <View style={styles.chartSection}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Despesas de {mesNome} {anoSelecionado} por Categoria</Text>
              <Pressable onPress={() => router.push('/(tabs)/despesas')} hitSlop={8}>
                <Text style={styles.linkText}>Ver detalhes →</Text>
              </Pressable>
            </View>
            <View style={styles.categoriaLayout}>
              <View style={styles.chartWrap}>
                <PieChart
                  data={pieData}
                  donut
                  radius={80}
                  innerRadius={50}
                  centerLabelComponent={() => (
                    <Text style={styles.pieCenterLabel}>R$ {formatarMoeda(stats.gastosMes)}</Text>
                  )}
                />
              </View>
              <View style={styles.categoriaList}>
                {despesasPorCategoria.slice(0, 10).map((item, i) => (
                  <View key={item.categoria} style={styles.categoriaListItem}>
                    <View style={[styles.categoriaDot, { backgroundColor: CATEGORIA_CORES[i % CATEGORIA_CORES.length] }]} />
                    <Text style={styles.categoriaNome}>{item.categoria}</Text>
                    <View style={styles.categoriaValores}>
                      <Text style={styles.categoriaValor}>R$ {formatarMoeda(item.valor)}</Text>
                      <Text style={styles.categoriaPct}>{item.porcentagem.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </AnimatedFadeIn>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 24,
    paddingTop: 24,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  headerBlock: {
    marginBottom: 24,
  },
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  monthSelectorButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textMuted,
  },
  placeholder: {
    fontSize: 16,
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden' as const,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRed: { borderLeftWidth: 4, borderLeftColor: theme.danger },
  cardGreen: { borderLeftWidth: 4, borderLeftColor: theme.primary },
  cardBlue: { borderLeftWidth: 4, borderLeftColor: theme.info },
  cardPrimary: { borderLeftWidth: 4, borderLeftColor: theme.background },
  cardLabel: {
    fontSize: 12,
    color: theme.textMuted,
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  cardValueRed: { fontSize: 18, fontWeight: '700', color: theme.danger },
  cardValueGreen: { fontSize: 18, fontWeight: '700', color: theme.primary },
  chartSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
  },
  chartSubtitle: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 12,
  },
  chartWrap: {
    backgroundColor: theme.chartWrap,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden' as const,
  },
  chartXAxisLabel: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '500',
  },
  chartYAxisLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '500',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    color: theme.text,
    width: 56,
  },
  barTracks: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
    minWidth: 4,
    borderRadius: 2,
  },
  legendaRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaQuad: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendaText: {
    fontSize: 12,
    color: theme.textMuted,
  },
  categoriaLayout: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  categoriaList: {
    width: '100%',
  },
  categoriaListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  categoriaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoriaNome: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
  },
  categoriaValores: {
    alignItems: 'flex-end',
  },
  categoriaValor: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  categoriaPct: {
    fontSize: 12,
    color: theme.textMuted,
  },
  pieCenterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
})
