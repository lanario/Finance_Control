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
import { useState } from 'react'
import { supabaseEmpresarial } from '../../../lib/supabase-empresarial'

/**
 * Formulário de novo cliente (Fase 4).
 */
export default function NovoClienteScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')

  async function handleSalvar() {
    const trimmed = nome.trim()
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe o nome.')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabaseEmpresarial.auth.getUser()
      if (!user) {
        router.back()
        return
      }
      const { error } = await supabaseEmpresarial.from('clientes').insert({
        user_id: user.id,
        nome: trimmed,
        razao_social: razaoSocial.trim() || null,
        cnpj: cnpj.trim() || null,
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        endereco: endereco.trim() || null,
        observacoes: observacoes.trim() || null,
        ativo: true,
      })
      if (error) throw error
      router.back()
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome *</Text>
        <TextInput style={styles.input} placeholder="Nome ou razão social" placeholderTextColor="rgba(255,255,255,0.5)" value={nome} onChangeText={setNome} />
        <Text style={styles.label}>Razão social</Text>
        <TextInput style={styles.input} placeholder="Razão social" placeholderTextColor="rgba(255,255,255,0.5)" value={razaoSocial} onChangeText={setRazaoSocial} />
        <Text style={styles.label}>CNPJ</Text>
        <TextInput style={styles.input} placeholder="00.000.000/0000-00" placeholderTextColor="rgba(255,255,255,0.5)" value={cnpj} onChangeText={setCnpj} keyboardType="numeric" />
        <Text style={styles.label}>CPF</Text>
        <TextInput style={styles.input} placeholder="000.000.000-00" placeholderTextColor="rgba(255,255,255,0.5)" value={cpf} onChangeText={setCpf} keyboardType="numeric" />
        <Text style={styles.label}>E-mail</Text>
        <TextInput style={styles.input} placeholder="email@exemplo.com" placeholderTextColor="rgba(255,255,255,0.5)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Telefone</Text>
        <TextInput style={styles.input} placeholder="(00) 00000-0000" placeholderTextColor="rgba(255,255,255,0.5)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        <Text style={styles.label}>Endereço</Text>
        <TextInput style={styles.input} placeholder="Endereço completo" placeholderTextColor="rgba(255,255,255,0.5)" value={endereco} onChangeText={setEndereco} />
        <Text style={styles.label}>Observações</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Observações" placeholderTextColor="rgba(255,255,255,0.5)" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} />
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSalvar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Salvar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  scroll: { padding: 24, paddingBottom: 48 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
