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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabaseEmpresarial } from '../../../lib/supabase-empresarial'

/**
 * Edição de cliente (Fase 4).
 */
export default function EditarClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    if (!id) return
    supabaseEmpresarial
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          setLoading(false)
          return
        }
        const c = data as Record<string, unknown>
        setNome(String(c.nome ?? ''))
        setRazaoSocial(String(c.razao_social ?? ''))
        setCnpj(String(c.cnpj ?? ''))
        setCpf(String(c.cpf ?? ''))
        setEmail(String(c.email ?? ''))
        setTelefone(String(c.telefone ?? ''))
        setEndereco(String(c.endereco ?? ''))
        setObservacoes(String(c.observacoes ?? ''))
        setAtivo(Boolean(c.ativo))
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleSalvar() {
    const trimmed = nome.trim()
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe o nome.')
      return
    }
    if (!id) return
    setSaving(true)
    try {
      const { error } = await supabaseEmpresarial
        .from('clientes')
        .update({
          nome: trimmed,
          razao_social: razaoSocial.trim() || null,
          cnpj: cnpj.trim() || null,
          cpf: cpf.trim() || null,
          email: email.trim() || null,
          telefone: telefone.trim() || null,
          endereco: endereco.trim() || null,
          observacoes: observacoes.trim() || null,
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
      router.back()
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
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
        <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="rgba(255,255,255,0.5)" value={nome} onChangeText={setNome} />
        <Text style={styles.label}>Razão social</Text>
        <TextInput style={styles.input} placeholder="Razão social" placeholderTextColor="rgba(255,255,255,0.5)" value={razaoSocial} onChangeText={setRazaoSocial} />
        <Text style={styles.label}>CNPJ</Text>
        <TextInput style={styles.input} placeholder="CNPJ" placeholderTextColor="rgba(255,255,255,0.5)" value={cnpj} onChangeText={setCnpj} keyboardType="numeric" />
        <Text style={styles.label}>CPF</Text>
        <TextInput style={styles.input} placeholder="CPF" placeholderTextColor="rgba(255,255,255,0.5)" value={cpf} onChangeText={setCpf} keyboardType="numeric" />
        <Text style={styles.label}>E-mail</Text>
        <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor="rgba(255,255,255,0.5)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Telefone</Text>
        <TextInput style={styles.input} placeholder="Telefone" placeholderTextColor="rgba(255,255,255,0.5)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        <Text style={styles.label}>Endereço</Text>
        <TextInput style={styles.input} placeholder="Endereço" placeholderTextColor="rgba(255,255,255,0.5)" value={endereco} onChangeText={setEndereco} />
        <Text style={styles.label}>Observações</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Observações" placeholderTextColor="rgba(255,255,255,0.5)" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} />
        <TouchableOpacity style={styles.toggle} onPress={() => setAtivo((a) => !a)}>
          <Text style={styles.toggleText}>Cliente ativo: {ativo ? 'Sim' : 'Não'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSalvar} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Salvar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  toggle: { marginBottom: 16 },
  toggleText: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  btn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
