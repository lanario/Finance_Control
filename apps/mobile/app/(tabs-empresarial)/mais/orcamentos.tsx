import { View, Text, StyleSheet } from 'react-native'

/**
 * Orçamentos – placeholder (Fase 4).
 */
export default function OrcamentosEmpresarialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orçamentos</Text>
      <Text style={styles.subtitle}>Listagem, criação e envio de orçamentos em breve.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
})
