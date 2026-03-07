'use client'

import { useEffect, useState } from 'react'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import { FiSave, FiImage, FiX, FiFileText } from 'react-icons/fi'
import Image from 'next/image'

export default function PerfilPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Dados do perfil
  const [nome, setNome] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [empresaCnpj, setEmpresaCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [celular, setCelular] = useState('')
  const [endereco, setEndereco] = useState('')
  const [email, setEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      loadPerfil()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when session changes
  }, [session])

  const loadPerfil = async () => {
    try {
      const userId = session?.user?.id
      if (!userId) return

      setLoading(true)

      // Carregar perfil
      const { data: perfil, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error)
      }

      if (perfil) {
        setNome(perfil.nome || '')
        setEmpresaNome(perfil.empresa_nome || '')
        setEmpresaCnpj(perfil.empresa_cnpj || '')
        setTelefone(perfil.telefone || '')
        setCelular(perfil.celular || '')
        setEndereco(perfil.endereco || '')
        setLogoUrl(perfil.logo_empresa_url || null)
      }

      // Carregar email da sessão
      setEmail(session.user.email || '')
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.user?.id) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.')
      return
    }

    // Criar preview temporário
    const tempUrl = URL.createObjectURL(file)
    setPreviewUrl(tempUrl)

    setUploadingLogo(true)
    try {
      console.log('Iniciando upload do logo...')
      console.log('User ID:', session.user.id)
      
      // Tentar fazer upload diretamente (sem verificar bucket primeiro)
      const fileName = `logo-empresa-${session.user.id}-${Date.now()}.${file.name.split('.').pop()}`
      const filePath = `perfis/${session.user.id}/${fileName}`

      console.log('Caminho do arquivo:', filePath)
      console.log('Tamanho do arquivo:', file.size, 'bytes')

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Logo')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        })

      if (uploadError) {
        console.error('Erro detalhado do upload:', uploadError)
        console.error('Mensagem do erro:', uploadError.message)
        
        // Mensagens de erro mais específicas
        if (uploadError.message?.includes('Bucket') || uploadError.message?.includes('bucket') || uploadError.message?.includes('not found') || uploadError.message?.includes('404')) {
          throw new Error('Bucket "Logo" não encontrado ou não acessível. Verifique:\n1. Se o bucket existe no Storage\n2. Se está usando o projeto correto do Supabase\n3. Se as variáveis de ambiente estão corretas')
        } else if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission') || uploadError.message?.includes('row-level security') || uploadError.message?.includes('403')) {
          throw new Error('Erro de permissão. Execute o SQL de políticas do Storage (016_configurar_storage.sql) no SQL Editor do Supabase.')
        } else if (uploadError.message?.includes('401') || uploadError.message?.includes('authentication') || uploadError.message?.includes('Unauthorized')) {
          throw new Error('Erro de autenticação. Faça login novamente.')
        } else {
          throw new Error(`Erro: ${uploadError.message || 'Erro desconhecido'}`)
        }
      }

      console.log('Upload bem-sucedido:', uploadData)

      const { data: { publicUrl } } = supabase.storage
        .from('Logo')
        .getPublicUrl(filePath)

      console.log('URL pública gerada:', publicUrl)
      
      // Salvar a URL no banco de dados imediatamente
      const { data: existingProfile } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      let dbError = null
      if (existingProfile) {
        const { error } = await supabase
          .from('perfis')
          .update({
            logo_empresa_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
        dbError = error
      } else {
        const { error } = await supabase
          .from('perfis')
          .insert({
            user_id: session.user.id,
            logo_empresa_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
        dbError = error
      }

      if (dbError) {
        console.error('Erro ao salvar logo no banco:', dbError)
        throw new Error(`Erro ao salvar logo no banco de dados: ${dbError.message}`)
      }

      // Limpar preview temporário
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      
      // Atualizar o estado local
      setLogoUrl(publicUrl)
      
      // Recarregar o perfil para garantir sincronização
      await loadPerfil()
      
      alert('Logo enviado e salvo com sucesso!')
    } catch (error: any) {
      console.error('Erro completo ao fazer upload do logo:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Erro desconhecido ao fazer upload'
      alert(`Erro ao fazer upload do logo:\n\n${errorMessage}\n\nVerifique o console do navegador (F12) para mais detalhes.`)
      // Limpar preview em caso de erro
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user?.id) return

    setSaving(true)
    try {
      const userId = session.user.id

      // Verificar se já existe perfil
      const { data: existingProfile } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', userId)
        .single()

      const perfilData = {
        user_id: userId,
        nome: nome || null,
        empresa_nome: empresaNome || null,
        empresa_cnpj: empresaCnpj || null,
        telefone: telefone || null,
        celular: celular || null,
        endereco: endereco || null,
        logo_empresa_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      }

      let error = null
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('perfis')
          .update(perfilData)
          .eq('user_id', userId)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('perfis')
          .insert([perfilData])
        error = insertError
      }

      if (error) throw error

      alert('Perfil salvo com sucesso!')
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse emp-text-primary text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold emp-text-primary mb-2">Perfil</h1>
            <p className="emp-text-secondary">Gerencie seus dados pessoais e da empresa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do usuário (snapshot) */}
          <div className="emp-bg-card rounded-lg border emp-border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FiFileText className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--emp-accent)' }} />
              <h2 className="text-xl font-semibold emp-text-primary">Dados do usuário (snapshot)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="emp-text-muted">Nome: </span>
                <span className="emp-text-primary">{nome || '-'}</span>
              </div>
              <div>
                <span className="emp-text-muted">CPF/CNPJ: </span>
                <span className="emp-text-primary">{empresaCnpj || '-'}</span>
              </div>
              <div>
                <span className="emp-text-muted">Fixo: </span>
                <span className="emp-text-primary">{telefone || '-'}</span>
              </div>
              <div>
                <span className="emp-text-muted">Endereço: </span>
                <span className="emp-text-primary">{endereco || '-'}</span>
              </div>
              <div>
                <span className="emp-text-muted">Email: </span>
                <span className="emp-text-primary">{email || '-'}</span>
              </div>
              <div>
                <span className="emp-text-muted">Celular: </span>
                <span className="emp-text-primary">{celular || '-'}</span>
              </div>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="emp-bg-card rounded-lg border emp-border p-6">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">Dados Pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-muted cursor-not-allowed opacity-80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Telefone Fixo
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Celular
                </label>
                <input
                  type="text"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Rua, número, bairro, cidade - Estado"
                />
              </div>
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="emp-bg-card rounded-lg border emp-border p-6">
            <h2 className="text-xl font-semibold emp-text-primary mb-4">Dados da Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Nome da sua empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  CPF/CNPJ
                </label>
                <input
                  type="text"
                  value={empresaCnpj}
                  onChange={(e) => setEmpresaCnpj(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Logo da Empresa
                </label>
                <div className="flex items-center space-x-4">
                  {(logoUrl || previewUrl) && (
                    <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                      <Image
                        key={logoUrl || previewUrl}
                        src={previewUrl || logoUrl || ''}
                        alt="Logo da empresa"
                        width={120}
                        height={120}
                        className="object-contain rounded-lg border emp-border p-2 emp-bg-card"
                        unoptimized
                        onLoad={() => {
                          // Logo carregada com sucesso
                        }}
                        onError={(e) => {
                          console.error('Erro ao carregar logo')
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          if (!previewUrl) {
                            alert('Erro ao carregar a logo. Verifique se a URL está correta e se o bucket está público.')
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          // Se for preview temporário, apenas limpar
                          if (previewUrl) {
                            URL.revokeObjectURL(previewUrl)
                            setPreviewUrl(null)
                            return
                          }
                          
                          // Se for logo salva, remover do banco
                          if (confirm('Tem certeza que deseja remover a logo?')) {
                            setLogoUrl(null)
                            // Atualizar no banco também
                            if (session?.user?.id) {
                              const { error } = await supabase
                                .from('perfis')
                                .update({
                                  logo_empresa_url: null,
                                  updated_at: new Date().toISOString(),
                                })
                                .eq('user_id', session.user.id)
                              if (error) {
                                console.error('Erro ao remover logo:', error)
                                alert('Erro ao remover logo. Tente novamente.')
                              } else {
                                await loadPerfil()
                              }
                            }
                          }
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        title={previewUrl ? "Cancelar upload" : "Remover logo"}
                        disabled={uploadingLogo}
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                    <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors emp-text-primary hover:opacity-90" style={{ backgroundColor: 'var(--emp-accent)' }}>
                      <FiImage className="w-5 h-5" />
                      <span>{uploadingLogo ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}</span>
                    </span>
                  </label>
                </div>
                <p className="text-xs emp-text-muted mt-2">
                  A logo será usada nos orçamentos e documentos da empresa
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed emp-text-primary hover:opacity-90"
              style={{ backgroundColor: 'var(--emp-accent)' }}
            >
              <FiSave className="w-5 h-5" />
              <span>{saving ? 'Salvando...' : 'Salvar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </MainLayoutEmpresarial>
  )
}
