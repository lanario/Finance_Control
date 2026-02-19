import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CONTEXT_STORAGE_KEY, type AppContext } from '../../../lib/context'
import { Ionicons } from '@expo/vector-icons'

export default function MaisScreen() {
  const router = useRouter()
  const [context, setContext] = useState<AppContext>('pessoal')

  useEffect(() => {
    AsyncStorage.getItem(CONTEXT_STORAGE_KEY).then((ctx) =>
      setContext((ctx as AppContext) ?? 'pessoal')
    )
  }, [])

  if (context === 'empresarial') {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Módulo empresarial em breve.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/(tabs)/mais/categorias')}
      >
        <Ionicons name="pricetags" size={28} color="#8b5cf6" />
        <Text style={styles.optionTitle}>Categorias</Text>
        <Text style={styles.optionSubtitle}>Tipos de gastos (nome, cor)</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/(tabs)/mais/investimentos')}
      >
        <Ionicons name="trending-up" size={28} color="#10b981" />
        <Text style={styles.optionTitle}>Investimentos</Text>
        <Text style={styles.optionSubtitle}>Listagem, cadastro e edição</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.option}
        onPress={() => router.push('/(tabs)/mais/sonhos')}
      >
        <Ionicons name="star" size={28} color="#f59e0b" />
        <Text style={styles.optionTitle}>Sonhos Infinity</Text>
        <Text style={styles.optionSubtitle}>Metas e progresso</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f', padding: 16 },
  placeholder: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', padding: 24 },
  option: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  optionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 8 },
  optionSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
})
