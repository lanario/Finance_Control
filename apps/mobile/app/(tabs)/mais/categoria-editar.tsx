import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'

const CORES = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

export default function CategoriaEditarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cor, setCor] = useState(CORES[0])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!id) return
    supabasePessoal
      .from('tipos_gastos')
      .select('nome, descricao, cor')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNome(data.nome ?? '')
          setDescricao(data.descricao ?? '')
          setCor(data.cor ?? CORES[0])
        }
      })
      .finally(() => setLoadingData(false))
  }, [id])

  async function handleSalvar() {
    if (!id) return
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome da categoria.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabasePessoal
        .from('tipos_gastos')
        .update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor,
        })
        .eq('id', id)
      if (error) throw error
      router.back()
    } catch (e) {
      console.error('Erro ao atualizar categoria:', e)
      Alert.alert('Erro', 'Não foi possível atualizar.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Alimentação"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Opcional"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Cor</Text>
        <View style={styles.cores}>
          {CORES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.corBtn, { backgroundColor: c }, cor === c && styles.corBtnSel]}
              onPress={() => setCor(c)}
              disabled={loading}
            />
          ))}
        </View>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSalvar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  scroll: { padding: 16, paddingBottom: 48 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  corBtn: { width: 40, height: 40, borderRadius: 20 },
  corBtnSel: { borderWidth: 3, borderColor: '#fff' },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
})
