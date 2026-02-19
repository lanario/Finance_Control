import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

/**
 * Contas a pagar e a receber – entrada para as listagens (Fase 4).
 */
export default function ContasEmpresarialScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contas</Text>
      <Text style={styles.subtitle}>Contas a pagar e a receber</Text>
      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs-empresarial)/contas/pagar')}>
        <Text style={styles.cardTitle}>Contas a pagar</Text>
        <Text style={styles.cardHint}>Ver e registrar pagamentos</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs-empresarial)/contas/receber')}>
        <Text style={styles.cardTitle}>Contas a receber</Text>
        <Text style={styles.cardHint}>Ver e registrar recebimentos</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  cardHint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
})
