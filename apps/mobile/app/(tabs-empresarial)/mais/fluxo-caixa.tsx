import { View, Text, StyleSheet } from 'react-native'

/**
 * Fluxo de caixa consolidado – placeholder (Fase 4). Resumo e gráficos em evolução.
 */
export default function FluxoCaixaEmpresarialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fluxo de caixa</Text>
      <Text style={styles.subtitle}>Visão consolidada em breve.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
})
