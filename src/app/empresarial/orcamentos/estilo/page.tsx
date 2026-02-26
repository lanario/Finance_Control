'use client'

import { useEffect, useState } from 'react'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { useAuth } from '@/app/empresarial/providers'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { FiLayers, FiChevronDown, FiChevronUp, FiSave, FiImage, FiX } from 'react-icons/fi'
import Image from 'next/image'

export default function OrcamentoEstiloPage() {
  const { session } = useAuth()

  // Estilo - Cores
  const [corPrimaria, setCorPrimaria] = useState('#111827')
  const [corSecundaria, setCorSecundaria] = useState('#111827')
  const [corTexto, setCorTexto] = useState('#111827')
  const [corFundo, setCorFundo] = useState('#FFFFFF')
  const [corBordas, setCorBordas] = useState('#111827')
  const [corHeader, setCorHeader] = useState('#FFFFFF')
  const [corTextoHeader, setCorTextoHeader] = useState('#111827')

  // Estilo - Fontes
  const [fonteTituloHeader, setFonteTituloHeader] = useState(18)
  const [fonteTituloSecao, setFonteTituloSecao] = useState(12)
  const [fonteFamilia, setFonteFamilia] = useState('Arial')

  // Estilo - Marca d'água (valores fixos, sempre usa logo do perfil)
  const marcaDaguaOpacidade = 25 // 25% de opacidade fixa
  const marcaDaguaRotacao = 0 // 0 graus (reta e alinhada)
  const marcaDaguaPosicaoPersonalizada = false // Sempre centralizada
  const marcaDaguaTamanho = 200 // 200px fixo
  const marcaDaguaFormato = 'quadrado' // Formato fixo
  const [marcaDaguaUrl, setMarcaDaguaUrl] = useState<string | null>(null) // Sempre carregada do perfil

  // Estilo - Layout (valores fixos para consistência)
  const paddingPagina = 20 // px - padding fixo da página
  const paddingHeader = 16 // px - padding do header
  const espacamentoSecoes = 16 // px - espaçamento entre seções

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Dados da empresa
  const [empresaNome, setEmpresaNome] = useState<string>('')

  // Seções colapsadas
  const [coresExpandida, setCoresExpandida] = useState(true)
  const [fontesExpandida, setFontesExpandida] = useState(false)
  const [logoExpandido, setLogoExpandido] = useState(false)

  const [saving, setSaving] = useState(false)

  // Função para carregar logo e nome da empresa do perfil
  const loadLogoFromProfile = async () => {
    if (!session?.user?.id) return null

    try {
      const { data: perfil, error } = await supabase
        .from('perfis')
        .select('logo_empresa_url, empresa_nome')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar logo do perfil:', error)
        return null
      }

      // Atualizar nome da empresa se disponível
      if (perfil?.empresa_nome) {
        setEmpresaNome(perfil.empresa_nome)
      }

      return perfil?.logo_empresa_url || null
    } catch (error) {
      console.error('Erro ao carregar logo do perfil:', error)
      return null
    }
  }

  // Carregar configurações salvas
  useEffect(() => {
    async function loadConfig() {
      if (!session?.user?.id) return

      const estiloSalvo = localStorage.getItem(`orcamento_template_${session.user.id}`)
      let logoFromTemplate = null

      if (estiloSalvo) {
        try {
          const estilo = JSON.parse(estiloSalvo)
          setCorPrimaria(estilo.corPrimaria || '#111827')
          setCorSecundaria(estilo.corSecundaria || '#111827')
          setCorTexto(estilo.corTexto || '#111827')
          setCorFundo(estilo.corFundo || '#FFFFFF')
          setCorBordas(estilo.corBordas || '#111827')
          setCorHeader(estilo.corHeader || '#FFFFFF')
          setCorTextoHeader(estilo.corTextoHeader || '#111827')
          setFonteTituloHeader(estilo.fonteTituloHeader || 18)
          setFonteTituloSecao(estilo.fonteTituloSecao || 12)
          setFonteFamilia(estilo.fonteFamilia || 'Arial')
          // Marca d'água usa valores fixos, não carregar do template
          // Layout usa valores fixos, não carregar do template
          logoFromTemplate = estilo.logoUrl || null
          if (estilo.empresaNome) {
            setEmpresaNome(estilo.empresaNome)
          }
        } catch (e) {
          console.error('Erro ao carregar template:', e)
        }
      }

      // Se não houver logo no template, carregar do perfil
      if (!logoFromTemplate) {
        console.log('🔍 Não há logo no template, carregando do perfil...')
        const logoFromProfile = await loadLogoFromProfile()
        if (logoFromProfile) {
          console.log('✅ Logo do perfil carregada:', logoFromProfile)
          setLogoUrl(logoFromProfile)
        } else {
          console.log('⚠️ Nenhuma logo encontrada no perfil')
        }
      } else {
        console.log('✅ Logo do template carregada:', logoFromTemplate)
        setLogoUrl(logoFromTemplate)
      }

      // Carregar nome da empresa e logo do perfil (para marca d'água)
      const { data: perfil } = await supabase
        .from('perfis')
        .select('empresa_nome, logo_empresa_url')
        .eq('user_id', session.user.id)
        .single()
      
      if (perfil?.empresa_nome && !empresaNome) {
        setEmpresaNome(perfil.empresa_nome)
      }
      
      // A marca d'água sempre será a logo do perfil (se existir)
      if (perfil?.logo_empresa_url) {
        setMarcaDaguaUrl(perfil.logo_empresa_url)
      }
    }

    loadConfig()
  }, [session])

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

    setUploadingLogo(true)
    try {
      console.log('Iniciando upload do logo...')
      console.log('User ID:', session.user.id)
      
      const fileName = `logo-template-${session.user.id}-${Date.now()}.${file.name.split('.').pop()}`
      const filePath = `orcamentos/${session.user.id}/${fileName}`

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
        if (uploadError.message?.includes('Bucket') || uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          throw new Error('Bucket "Logo" não encontrado ou não acessível. Verifique:\n1. Se o bucket existe no Storage\n2. Se está usando o projeto correto do Supabase\n3. Se as variáveis de ambiente estão corretas')
        } else if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission') || uploadError.message?.includes('row-level security')) {
          throw new Error('Erro de permissão. Execute o SQL de políticas do Storage (016_configurar_storage.sql) no SQL Editor do Supabase.')
        } else {
          throw new Error(`Erro: ${uploadError.message || 'Erro desconhecido'}`)
        }
      }

      console.log('Upload bem-sucedido:', uploadData)

      const { data: { publicUrl } } = supabase.storage
        .from('Logo')
        .getPublicUrl(filePath)

      console.log('URL pública gerada:', publicUrl)
      setLogoUrl(publicUrl)
      alert('Logo enviado com sucesso!')
    } catch (error: any) {
      console.error('Erro completo ao fazer upload do logo:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Erro desconhecido ao fazer upload'
      alert(`Erro ao fazer upload do logo:\n\n${errorMessage}\n\nVerifique o console do navegador (F12) para mais detalhes.`)
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleSalvar = () => {
    if (!session?.user?.id) return

    setSaving(true)
    try {
      const templateConfig = {
        corPrimaria,
        corSecundaria,
        corTexto,
        corFundo,
        corBordas,
        corHeader,
        corTextoHeader,
        fonteTituloHeader,
        fonteTituloSecao,
        fonteFamilia,
        marcaDaguaOpacidade: 25,
        marcaDaguaRotacao: 0,
        marcaDaguaPosicaoPersonalizada: false,
        marcaDaguaTamanho: 200,
        marcaDaguaFormato: 'quadrado',
        marcaDaguaUrl: marcaDaguaUrl, // Sempre carregada do perfil
        paddingPagina: 20,
        paddingHeader: 16,
        espacamentoSecoes: 16,
        logoUrl,
        empresaNome,
      }

      localStorage.setItem(`orcamento_template_${session.user.id}`, JSON.stringify(templateConfig))
      
      setTimeout(() => {
        setSaving(false)
        alert('Template padrão salvo com sucesso!')
      }, 500)
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      alert('Erro ao salvar template')
      setSaving(false)
    }
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  // Dados de exemplo para o preview
  const dataEmissao = new Date().toISOString().split('T')[0]
  const dataValidade = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const itensExemplo = [
    { quantidade: 2, descricao: 'Produto Exemplo 1', valor_unitario: 100, valor_total: 200 },
    { quantidade: 1, descricao: 'Serviço Exemplo 2', valor_unitario: 500, valor_total: 500 },
  ]
  const valorTotal = 700
  const descontoGeral = 50
  const valorFinal = valorTotal - descontoGeral

  return (
    <MainLayoutEmpresarial>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-150px)]">
        {/* Painel Esquerdo - Configurações de Estilo */}
        <div className="emp-bg-card rounded-lg border emp-border p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold emp-text-primary">Orçamento (estilo)</h2>
            <button
              onClick={handleSalvar}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 hover:opacity-90 emp-text-primary rounded-lg transition-colors disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Template'}</span>
            </button>
          </div>

          {/* Cores */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setCoresExpandida(!coresExpandida)}
              className="w-full flex items-center justify-between emp-text-primary font-medium mb-4"
            >
              <span>Cores</span>
              {coresExpandida ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {coresExpandida && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor Primária</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Usada no header e bordas</p>
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor Secundária</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Usada em títulos</p>
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor do Texto</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corTexto}
                      onChange={(e) => setCorTexto(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corTexto}
                      onChange={(e) => setCorTexto(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor de Fundo</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corFundo}
                      onChange={(e) => setCorFundo(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corFundo}
                      onChange={(e) => setCorFundo(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor das Bordas</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corBordas}
                      onChange={(e) => setCorBordas(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corBordas}
                      onChange={(e) => setCorBordas(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor do Header</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corHeader}
                      onChange={(e) => setCorHeader(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corHeader}
                      onChange={(e) => setCorHeader(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Cor do Texto do Header</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corTextoHeader}
                      onChange={(e) => setCorTextoHeader(e.target.value)}
                      className="w-12 h-10 emp-input-bg border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corTextoHeader}
                      onChange={(e) => setCorTextoHeader(e.target.value)}
                      className="flex-1 px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fontes */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setFontesExpandida(!fontesExpandida)}
              className="w-full flex items-center justify-between emp-text-primary font-medium mb-4"
            >
              <span>Fontes</span>
              {fontesExpandida ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {fontesExpandida && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm emp-text-muted mb-2">
                    Tamanho do Título do Header: {fonteTituloHeader}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="48"
                    value={fonteTituloHeader}
                    onChange={(e) => setFonteTituloHeader(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">
                    Tamanho dos Títulos de Seção: {fonteTituloSecao}px
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={fonteTituloSecao}
                    onChange={(e) => setFonteTituloSecao(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm emp-text-muted mb-2">Família da Fonte</label>
                  <select
                    value={fonteFamilia}
                    onChange={(e) => setFonteFamilia(e.target.value)}
                    className="w-full px-3 py-2 emp-input-bg border border-gray-600 rounded-lg emp-text-primary text-sm"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>
              </div>
            )}
          </div>


          {/* Logo */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setLogoExpandido(!logoExpandido)}
              className="w-full flex items-center justify-between emp-text-primary font-medium mb-4"
            >
              <span>Logo</span>
              {logoExpandido ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {logoExpandido && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm emp-text-muted mb-2">
                    Logo do Orçamento
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Use a logo do seu perfil ou faça upload de uma nova logo específica para orçamentos.
                  </p>
                  <div className="flex items-center space-x-4 mb-3">
                    {logoUrl && (
                      <div className="relative">
                        <Image
                          src={logoUrl}
                          alt="Logo"
                          width={100}
                          height={100}
                          className="object-contain rounded-lg border border-gray-600"
                          unoptimized
                          onError={(e) => {
                            console.error('Erro ao carregar logo:', logoUrl)
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl(null)}
                          className="absolute -top-2 -right-2 p-1 bg-red-600 emp-text-primary rounded-full hover:bg-red-700"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col space-y-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                        <span className="inline-flex items-center space-x-2 px-4 py-2 emp-input-bg hover:bg-gray-600 emp-text-primary rounded-lg transition-colors">
                          <FiImage className="w-5 h-5" />
                          <span>{uploadingLogo ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}</span>
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          const logoFromProfile = await loadLogoFromProfile()
                          if (logoFromProfile) {
                            setLogoUrl(logoFromProfile)
                            alert('Logo do perfil carregada com sucesso!')
                          } else {
                            alert('Nenhuma logo encontrada no seu perfil. Adicione uma logo na página de Perfil primeiro.')
                          }
                        }}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 emp-text-primary rounded-lg transition-colors text-sm"
                      >
                        <FiImage className="w-4 h-4" />
                        <span>Usar Logo do Perfil</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Painel Direito - Preview */}
        <div className="emp-bg-card rounded-lg border emp-border p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold emp-text-primary mb-4">Preview do Orçamento</h2>
          {logoUrl && (
            <div className="mb-2 text-xs emp-text-muted">
              Logo carregada: {logoUrl.substring(0, 50)}...
            </div>
          )}
          {!logoUrl && (
            <div className="mb-2 text-xs text-yellow-400">
              ⚠️ Nenhuma logo carregada. Adicione uma logo na seção "Logo" acima.
            </div>
          )}
          
          <div className="rounded-lg shadow-lg p-8 relative" style={{ fontFamily: fonteFamilia, backgroundColor: corFundo }}>
            {/* Header */}
            <div
              style={{
                backgroundColor: corHeader,
                color: corTextoHeader,
                padding: `${paddingHeader}px`,
                borderBottom: `2px solid ${corPrimaria}`,
                marginBottom: `${espacamentoSecoes}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: logoUrl ? '140px' : 'auto',
              }}
            >
              {/* Logo à esquerda */}
              {logoUrl && (
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={120}
                    height={120}
                    className="object-contain"
                    unoptimized
                    onError={(e) => {
                      console.error('Erro ao carregar logo no preview:', logoUrl)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                    onLoad={() => {
                      console.log('Logo carregada com sucesso no preview:', logoUrl)
                    }}
                  />
                </div>
              )}
              
              {/* Nome da empresa e datas à direita */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                flex: 1,
                marginLeft: logoUrl ? '24px' : '0',
                minWidth: 0, // Permite que o texto quebre se necessário
              }}>
                <h1
                  style={{
                    fontSize: `${fonteTituloHeader}px`,
                    fontWeight: 'bold',
                    color: corTextoHeader,
                    marginBottom: '8px',
                    textAlign: 'right',
                  }}
                >
                  {empresaNome || 'Nome da Empresa'}
                </h1>
                <div style={{ 
                  fontSize: '12px', 
                  color: corTextoHeader,
                  textAlign: 'right',
                }}>
                  EMISSÃO: {formatarData(dataEmissao)} • VALIDADE: {formatarData(dataValidade)}
                </div>
              </div>
            </div>

            {/* Prestador e Cliente */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: `${espacamentoSecoes}px`,
                marginBottom: `${espacamentoSecoes}px`,
                padding: `${paddingPagina}px`,
                border: `1px solid ${corBordas}`,
                borderRadius: '4px',
              }}
            >
              <div>
                <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                  PRESTADOR
                </h3>
                <p style={{ color: corTexto, fontSize: '12px' }}>EMPRESA: Exemplo Empresa LTDA</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>CNPJ: 12.345.678/0001-90</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>EMAIL: exemplo@empresa.com</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>TELEFONE: (11) 3456-7890</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>CELULAR: (11) 98765-4321</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>ENDEREÇO: Rua Exemplo, 123 - Centro</p>
              </div>
              <div>
                <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                  CLIENTE
                </h3>
                <p style={{ color: corTexto, fontSize: '12px' }}>NOME: Cliente Exemplo</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>EMAIL: cliente@exemplo.com</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>CPF: 123.456.789-00</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>TELEFONE: (11) 2345-6789</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>CELULAR: (11) 91234-5678</p>
                <p style={{ color: corTexto, fontSize: '12px' }}>ENDEREÇO: Av. Cliente, 456 - Bairro</p>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div style={{ marginBottom: `${espacamentoSecoes}px` }}>
              <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                PRODUTOS/SERVIÇOS
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${corBordas}` }}>
                <thead>
                  <tr style={{ backgroundColor: corPrimaria + '20' }}>
                    <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                      QTD.
                    </th>
                    <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                      DESCRIÇÃO
                    </th>
                    <th style={{ padding: '8px', textAlign: 'right', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                      VALOR
                    </th>
                    <th style={{ padding: '8px', textAlign: 'right', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                      SUBTOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itensExemplo.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                        {item.quantidade}
                      </td>
                      <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px' }}>
                        {item.descricao}
                      </td>
                      <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'right' }}>
                        {formatarMoeda(item.valor_unitario)}
                      </td>
                      <td style={{ padding: '8px', border: `1px solid ${corBordas}`, color: corTexto, fontSize: '12px', textAlign: 'right' }}>
                        {formatarMoeda(item.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais */}
            <div
              style={{
                marginBottom: `${espacamentoSecoes}px`,
                padding: `${paddingPagina}px`,
                border: `1px solid ${corBordas}`,
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: corTexto, fontSize: '12px' }}>Quantidade Total: {itensExemplo.reduce((sum, item) => sum + item.quantidade, 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: corTexto, fontSize: '12px' }}>Subtotal:</span>
                <span style={{ color: corTexto, fontSize: '12px' }}>{formatarMoeda(valorTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: corTexto, fontSize: '12px' }}>Desconto:</span>
                <span style={{ color: corTexto, fontSize: '12px' }}>{formatarMoeda(descontoGeral)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${corBordas}` }}>
                <span style={{ color: corTexto, fontSize: '14px', fontWeight: 'bold' }}>TOTAL:</span>
                <span style={{ color: corTexto, fontSize: '14px', fontWeight: 'bold' }}>{formatarMoeda(valorFinal)}</span>
              </div>
            </div>

            {/* Observações */}
            <div style={{ marginBottom: `${espacamentoSecoes}px` }}>
              <h3 style={{ fontSize: `${fonteTituloSecao}px`, fontWeight: 'bold', color: corSecundaria, marginBottom: '8px' }}>
                OBSERVAÇÕES
              </h3>
              <p style={{ color: corTexto, fontSize: '12px' }}>Este é um exemplo de orçamento gerado automaticamente.</p>
            </div>

            {/* Marca d'água (sempre visível se houver logo no perfil) */}
            {marcaDaguaUrl && (
              <div
                style={{
                  position: 'absolute',
                  opacity: marcaDaguaOpacidade / 100,
                  transform: `rotate(${marcaDaguaRotacao}deg)`,
                  left: '50%',
                  top: '50%',
                  transformOrigin: 'center',
                  width: `${marcaDaguaTamanho}px`,
                  height: `${marcaDaguaTamanho}px`,
                  marginLeft: `-${marcaDaguaTamanho / 2}px`,
                  marginTop: `-${marcaDaguaTamanho / 2}px`,
                  borderRadius: '0',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <Image
                  src={marcaDaguaUrl}
                  alt="Marca d'água"
                  width={marcaDaguaTamanho}
                  height={marcaDaguaTamanho}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '0',
                  }}
                  unoptimized
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
