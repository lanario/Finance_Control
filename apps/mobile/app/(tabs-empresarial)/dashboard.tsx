import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { supabaseEmpresarial } from '../../lib/supabase-empresarial'
import { formatarMoeda } from '../../lib/utils'
import { Ionicons } from '@expo/vector-icons'
import { LineChart, PieChart } from 'react-native-gifted-charts'

interface DashboardStats {
  contasPagarMes: number
  contasReceberMes: number
  vendasMes: number
  totalFornecedores: number
  totalClientes: number
  saldoTotal: number
}

interface FluxoCaixaItem {
  mes: string
  saldo: number
}

interface CategoriaItem {
  categoria: string
  valor: number
  porcentagem: number
}

function getMonthsRange(): Array<{
  monthStart: Date
  monthEnd: Date
  monthName: string
}> {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    return {
      monthStart,
      monthEnd,
      monthName: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    }
  })
}

/**
 * Dashboard Empresarial (Fase 4): cards e gráficos (fluxo de caixa, despesas e vendas por categoria).
 */
export default function DashboardEmpresarialScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    contasPagarMes: 0,
    contasReceberMes: 0,
    vendasMes: 0,
    totalFornecedores: 0,
    totalClientes: 0,
    saldoTotal: 0,
  })
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixaItem[]>([])
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<CategoriaItem[]>([])
  const [vendasPorCategoria, setVendasPorCategoria] = useState<CategoriaItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!userId) return
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const startStr = startOfMonth.toISOString().split('T')[0]
      const endStr = endOfMonth.toISOString().split('T')[0]

      const [
        fornecedoresRes,
        clientesRes,
        contasPagarRes,
        parcelasPagarRes,
        contasReceberRes,
        parcelasReceberRes,
        vendasRes,
        parcelasVendasRes,
      ] = await Promise.all([
        supabaseEmpresarial.from('fornecedores').select('id', { count: 'exact' }).eq('user_id', userId).eq('ativo', true),
        supabaseEmpresarial.from('clientes').select('id', { count: 'exact' }).eq('user_id', userId).eq('ativo', true),
        supabaseEmpresarial.from('contas_a_pagar').select('valor').eq('user_id', userId).gte('data_vencimento', startStr).lte('data_vencimento', endStr).eq('parcelada', false),
        supabaseEmpresarial.from('parcelas_contas_pagar').select('valor').eq('user_id', userId).gte('data_vencimento', startStr).lte('data_vencimento', endStr),
        supabaseEmpresarial.from('contas_a_receber').select('valor').eq('user_id', userId).gte('data_vencimento', startStr).lte('data_vencimento', endStr).eq('parcelada', false),
        supabaseEmpresarial.from('parcelas_contas_receber').select('valor').eq('user_id', userId).gte('data_vencimento', startStr).lte('data_vencimento', endStr),
        supabaseEmpresarial.from('vendas').select('valor_final').eq('user_id', userId).gte('data_venda', startStr).lte('data_venda', endStr).eq('parcelada', false).eq('status', 'aprovado'),
        supabaseEmpresarial.from('parcelas_vendas').select('valor').eq('user_id', userId).gte('data_vencimento', startStr).lte('data_vencimento', endStr).eq('status', 'aprovado'),
      ])

      const totalPagar =
        (contasPagarRes.data?.reduce((s, c) => s + Number(c.valor ?? 0), 0) ?? 0) +
        (parcelasPagarRes.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
      const totalReceber =
        (contasReceberRes.data?.reduce((s, c) => s + Number(c.valor ?? 0), 0) ?? 0) +
        (parcelasReceberRes.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
      const totalVendas =
        (vendasRes.data?.reduce((s, v) => s + Number((v as { valor_final?: number }).valor_final ?? 0), 0) ?? 0) +
        (parcelasVendasRes.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
      const saldoTotal = totalReceber + totalVendas - totalPagar

      setStats({
        contasPagarMes: totalPagar,
        contasReceberMes: totalReceber,
        vendasMes: totalVendas,
        totalFornecedores: fornecedoresRes.count ?? 0,
        totalClientes: clientesRes.count ?? 0,
        saldoTotal,
      })

      const monthsRange = getMonthsRange()
      const fluxoData: FluxoCaixaItem[] = []
      for (let i = 0; i < monthsRange.length; i++) {
        const { monthStart, monthEnd, monthName } = monthsRange[i]
        const ms = monthStart.toISOString().split('T')[0]
        const me = monthEnd.toISOString().split('T')[0]
        const [rec, vend, parcVend, pag, parcPag] = await Promise.all([
          supabaseEmpresarial.from('contas_a_receber').select('valor').eq('user_id', userId).gte('data_vencimento', ms).lte('data_vencimento', me).eq('parcelada', false).eq('recebida', true),
          supabaseEmpresarial.from('vendas').select('valor_final').eq('user_id', userId).gte('data_venda', ms).lte('data_venda', me).eq('parcelada', false).eq('status', 'aprovado'),
          supabaseEmpresarial.from('parcelas_vendas').select('valor').eq('user_id', userId).gte('data_vencimento', ms).lte('data_vencimento', me).eq('status', 'aprovado'),
          supabaseEmpresarial.from('contas_a_pagar').select('valor').eq('user_id', userId).gte('data_vencimento', ms).lte('data_vencimento', me).eq('parcelada', false).eq('paga', true),
          supabaseEmpresarial.from('parcelas_contas_pagar').select('valor').eq('user_id', userId).gte('data_vencimento', ms).lte('data_vencimento', me).eq('paga', true),
        ])
        const entradas =
          (rec.data?.reduce((s, r) => s + Number(r.valor ?? 0), 0) ?? 0) +
          (vend.data?.reduce((s, v) => s + Number((v as { valor_final?: number }).valor_final ?? 0), 0) ?? 0) +
          (parcVend.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
        const saidas =
          (pag.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0) +
          (parcPag.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
        fluxoData.push({ mes: monthName, saldo: entradas - saidas })
      }
      setFluxoCaixa(fluxoData)

      const [catDespesa, catReceita] = await Promise.all([
        supabaseEmpresarial.from('categorias').select('id, nome').eq('user_id', userId).eq('tipo', 'despesa').eq('ativo', true),
        supabaseEmpresarial.from('categorias').select('id, nome').eq('user_id', userId).eq('tipo', 'receita').eq('ativo', true),
      ])

      const despesasMap: Record<string, number> = {}
      if (catDespesa.data?.length) {
        for (const cat of catDespesa.data) {
          const [cap, parc] = await Promise.all([
            supabaseEmpresarial.from('contas_a_pagar').select('valor').eq('user_id', userId).eq('categoria_id', cat.id).gte('data_vencimento', startStr).lte('data_vencimento', endStr).eq('parcelada', false),
            supabaseEmpresarial.from('parcelas_contas_pagar').select('valor').eq('user_id', userId).eq('categoria_id', cat.id).gte('data_vencimento', startStr).lte('data_vencimento', endStr),
          ])
          const v = (cap.data?.reduce((s, c) => s + Number(c.valor ?? 0), 0) ?? 0) + (parc.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
          if (v > 0) despesasMap[cat.nome] = v
        }
        setDespesasPorCategoria(
          Object.entries(despesasMap)
            .map(([categoria, valor]) => ({
              categoria,
              valor: Number(valor.toFixed(2)),
              porcentagem: totalPagar > 0 ? Number(((valor / totalPagar) * 100).toFixed(1)) : 0,
            }))
            .sort((a, b) => b.valor - a.valor)
        )
      } else {
        setDespesasPorCategoria([])
      }

      const vendasMap: Record<string, number> = {}
      if (catReceita.data?.length) {
        for (const cat of catReceita.data) {
          const [vnd, parc] = await Promise.all([
            supabaseEmpresarial.from('vendas').select('valor_final').eq('user_id', userId).eq('categoria_id', cat.id).gte('data_venda', startStr).lte('data_venda', endStr).eq('parcelada', false).eq('status', 'aprovado'),
            supabaseEmpresarial.from('parcelas_vendas').select('valor').eq('user_id', userId).eq('categoria_id', cat.id).gte('data_vencimento', startStr).lte('data_vencimento', endStr).eq('status', 'aprovado'),
          ])
          const v = (vnd.data?.reduce((s, x) => s + Number((x as { valor_final?: number }).valor_final ?? 0), 0) ?? 0) + (parc.data?.reduce((s, p) => s + Number(p.valor ?? 0), 0) ?? 0)
          if (v > 0) vendasMap[cat.nome] = v
        }
        setVendasPorCategoria(
          Object.entries(vendasMap)
            .map(([categoria, valor]) => ({
              categoria,
              valor: Number(valor.toFixed(2)),
              porcentagem: totalVendas > 0 ? Number(((valor / totalVendas) * 100).toFixed(1)) : 0,
            }))
            .sort((a, b) => b.valor - a.valor)
        )
      } else {
        setVendasPorCategoria([])
      }
    } catch (e) {
      console.error('Erro ao carregar dashboard empresarial:', e)
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
    if (userId) loadDashboard()
  }, [userId, loadDashboard])

  function onRefresh() {
    setRefreshing(true)
    loadDashboard()
  }

  if (loading && !stats.totalClientes && fluxoCaixa.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  const chartWidth = Dimensions.get('window').width - 48
  const lineData = fluxoCaixa.map((item) => ({ value: item.saldo, label: item.mes }))
  const COLORS_PURPLE = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ec4899']
  const COLORS_GREEN = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']
  const pieDespesas = despesasPorCategoria.slice(0, 6).map((item, i) => ({
    value: item.porcentagem,
    color: COLORS_PURPLE[i % COLORS_PURPLE.length],
    text: item.categoria,
  }))
  const pieVendas = vendasPorCategoria.slice(0, 6).map((item, i) => ({
    value: item.porcentagem,
    color: COLORS_GREEN[i % COLORS_GREEN.length],
    text: item.categoria,
  }))

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <Text style={styles.title}>Dashboard Empresarial</Text>
      <Text style={styles.subtitle}>Visão geral das finanças</Text>

      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardRed]}>
          <Ionicons name="trending-down" size={22} color="#ef4444" />
          <Text style={styles.cardLabel}>A pagar</Text>
          <Text style={styles.cardValueRed}>{formatarMoeda(stats.contasPagarMes)}</Text>
        </View>
        <View style={[styles.card, styles.cardGreen]}>
          <Ionicons name="trending-up" size={22} color="#10b981" />
          <Text style={styles.cardLabel}>A receber</Text>
          <Text style={styles.cardValueGreen}>{formatarMoeda(stats.contasReceberMes)}</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardBlue]}>
          <Ionicons name="cart" size={22} color="#3b82f6" />
          <Text style={styles.cardLabel}>Vendas (mês)</Text>
          <Text style={styles.cardValue}>{formatarMoeda(stats.vendasMes)}</Text>
        </View>
        <View style={[styles.card, stats.saldoTotal >= 0 ? styles.cardGreen : styles.cardRed]}>
          <Ionicons name="wallet" size={22} color={stats.saldoTotal >= 0 ? '#10b981' : '#ef4444'} />
          <Text style={styles.cardLabel}>Saldo</Text>
          <Text style={stats.saldoTotal >= 0 ? styles.cardValueGreen : styles.cardValueRed}>
            {formatarMoeda(stats.saldoTotal)}
          </Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardPrimary]}>
          <Ionicons name="briefcase" size={22} color="#fff" />
          <Text style={styles.cardLabel}>Fornecedores</Text>
          <Text style={styles.cardValue}>{stats.totalFornecedores}</Text>
        </View>
        <View style={[styles.card, styles.cardPrimary]}>
          <Ionicons name="people" size={22} color="#fff" />
          <Text style={styles.cardLabel}>Clientes</Text>
          <Text style={styles.cardValue}>{stats.totalClientes}</Text>
        </View>
      </View>

      {lineData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Fluxo de caixa (saldo – 6 meses)</Text>
          <View style={styles.chartWrap}>
            <LineChart
              data={lineData}
              width={chartWidth}
              height={160}
              color="#6366f1"
              thickness={2}
              hideDataPoints={lineData.length > 6}
              yAxisLabelPrefix="R$ "
              formatYLabel={(v) => (Number(v) >= 1000 ? `${Number(v) / 1000}k` : String(v))}
            />
          </View>
        </View>
      )}

      {pieDespesas.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Despesas por categoria</Text>
          <View style={styles.chartWrap}>
            <PieChart
              data={pieDespesas}
              donut
              radius={80}
              innerRadius={50}
              centerLabelComponent={() => (
                <Text style={styles.pieCenterLabel}>{formatarMoeda(stats.contasPagarMes)}</Text>
              )}
            />
          </View>
          <View style={styles.legend}>
            {despesasPorCategoria.slice(0, 6).map((item) => (
              <Text key={item.categoria} style={styles.legendItem}>
                {item.categoria}: {formatarMoeda(item.valor)} ({item.porcentagem}%)
              </Text>
            ))}
          </View>
        </View>
      )}

      {pieVendas.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Vendas por categoria</Text>
          <View style={styles.chartWrap}>
            <PieChart
              data={pieVendas}
              donut
              radius={80}
              innerRadius={50}
              centerLabelComponent={() => (
                <Text style={styles.pieCenterLabel}>{formatarMoeda(stats.vendasMes)}</Text>
              )}
            />
          </View>
          <View style={styles.legend}>
            {vendasPorCategoria.slice(0, 6).map((item) => (
              <Text key={item.categoria} style={styles.legendItem}>
                {item.categoria}: {formatarMoeda(item.valor)} ({item.porcentagem}%)
              </Text>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardRed: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  cardGreen: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  cardBlue: { borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  cardPrimary: { borderLeftWidth: 4, borderLeftColor: '#1e3a5f' },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  cardValue: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cardValueRed: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  cardValueGreen: { fontSize: 16, fontWeight: '700', color: '#10b981' },
  chartSection: { marginTop: 24, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  chartWrap: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  pieCenterLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  legend: { marginTop: 12 },
  legendItem: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
})
