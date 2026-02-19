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
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabasePessoal } from '../../../lib/supabase-pessoal'

export default function NovoSonhoScreen() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorObjetivo, setValorObjetivo] = useState('')
  const [dataObjetivo, setDataObjetivo] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabasePessoal.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [])

  async function handleSalvar() {
    if (!userId) return
    const vo = parseFloat(valorObjetivo.replace(',', '.'))
    if (!nome.trim() || isNaN(vo) || vo <= 0) {
      Alert.alert('Erro', 'Preencha o nome e um valor objetivo maior que zero.')
      return
    }
    setLoading(true)
    try {
      await supabasePessoal.from('sonhos').insert({
        user_id: userId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        valor_objetivo: vo,
        valor_atual: 0,
        data_objetivo: dataObjetivo || null,
        valor_mensal: valorMensal ? parseFloat(valorMensal.replace(',', '.')) : null,
        ativo: true,
      })
      router.back()
    } catch (e) {
      console.error('Erro ao salvar sonho:', e)
      Alert.alert('Erro', 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome do sonho *</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Viagem para Europa"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.inputArea]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Opcional"
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          numberOfLines={3}
          editable={!loading}
        />
        <Text style={styles.label}>Valor objetivo (R$) *</Text>
        <TextInput
          style={styles.input}
          value={valorObjetivo}
          onChangeText={setValorObjetivo}
          placeholder="0,00"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <Text style={styles.label}>Data objetivo</Text>
        <TextInput
          style={styles.input}
          value={dataObjetivo}
          onChangeText={setDataObjetivo}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="rgba(255,255,255,0.4)"
          editable={!loading}
        />
        <Text style={styles.label}>Valor mensal sugerido (R$)</Text>
        <TextInput
          style={styles.input}
          value={valorMensal}
          onChangeText={setValorMensal}
          placeholder="Opcional"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="decimal-pad"
          editable={!loading}
        />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSalvar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar sonho</Text>}
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
  inputArea: { minHeight: 80, textAlignVertical: 'top' },
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
