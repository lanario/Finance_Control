import { View, Text, StyleSheet } from 'react-native'

/**
 * Despesas empresariais – placeholder (Fase 4). Listagem e cadastro em evolução.
 */
export default function DespesasEmpresarialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Despesas</Text>
      <Text style={styles.subtitle}>Listagem e cadastro de despesas em breve.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
})
