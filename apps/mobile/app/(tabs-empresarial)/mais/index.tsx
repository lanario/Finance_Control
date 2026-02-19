import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const MENU_ITEMS = [
  { route: '/(tabs-empresarial)/mais/fornecedores', label: 'Fornecedores', icon: 'briefcase' as const },
  { route: '/(tabs-empresarial)/mais/despesas', label: 'Despesas', icon: 'trending-down' as const },
  { route: '/(tabs-empresarial)/mais/compras', label: 'Compras', icon: 'cart' as const },
  { route: '/(tabs-empresarial)/mais/orcamentos', label: 'Orçamentos', icon: 'document-text' as const },
  { route: '/(tabs-empresarial)/mais/fluxo-caixa', label: 'Fluxo de caixa', icon: 'wallet' as const },
  { route: '/(tabs-empresarial)/mais/receitas', label: 'Receitas', icon: 'cash' as const },
]

/**
 * Menu Mais do módulo Empresarial: acesso a Fornecedores, Despesas, Compras, Orçamentos, Fluxo de caixa e Receitas (Fase 4).
 */
export default function MaisEmpresarialScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mais</Text>
      <Text style={styles.subtitle}>Outras funções do módulo empresarial</Text>
      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.item}
          onPress={() => router.push(item.route as never)}
          activeOpacity={0.7}
        >
          <Ionicons name={item.icon} size={24} color="#10b981" />
          <Text style={styles.itemLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 14,
  },
  itemLabel: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '500' },
})
