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

  // Estilo - Marca d'água
  const [marcaDaguaOpacidade, setMarcaDaguaOpacidade] = useState(100)
  const [marcaDaguaRotacao, setMarcaDaguaRotacao] = useState(0)
  const [marcaDaguaPosicaoPersonalizada, setMarcaDaguaPosicaoPersonalizada] = useState(true)
  const [marcaDaguaPosicaoX, setMarcaDaguaPosicaoX] = useState(10)
  const [marcaDaguaPosicaoY, setMarcaDaguaPosicaoY] = useState(10)
  const [marcaDaguaTamanho, setMarcaDaguaTamanho] = useState(120)
  const [marcaDaguaFormato, setMarcaDaguaFormato] = useState('quadrado')
  const [marcaDaguaUrl, setMarcaDaguaUrl] = useState<string | null>(null)

  // Estilo - Layout
  const [paddingPagina, setPaddingPagina] = useState(28)
  const [paddingHeader, setPaddingHeader] = useState(14)
  const [espacamentoSecoes, setEspacamentoSecoes] = useState(14)

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Seções colapsadas
  const [coresExpandida, setCoresExpandida] = useState(true)
  const [fontesExpandida, setFontesExpandida] = useState(false)
  const [marcaDaguaExpandida, setMarcaDaguaExpandida] = useState(true)
  const [layoutExpandido, setLayoutExpandido] = useState(true)
  const [logoExpandido, setLogoExpandido] = useState(false)

  const [saving, setSaving] = useState(false)

  // Carregar configurações salvas
  useEffect(() => {
    if (session?.user?.id) {
      const estiloSalvo = localStorage.getItem(`orcamento_template_${session.user.id}`)
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
          setMarcaDaguaOpacidade(estilo.marcaDaguaOpacidade || 100)
          setMarcaDaguaRotacao(estilo.marcaDaguaRotacao || 0)
          setMarcaDaguaPosicaoPersonalizada(estilo.marcaDaguaPosicaoPersonalizada !== undefined ? estilo.marcaDaguaPosicaoPersonalizada : true)
          setMarcaDaguaPosicaoX(estilo.marcaDaguaPosicaoX || 10)
          setMarcaDaguaPosicaoY(estilo.marcaDaguaPosicaoY || 10)
          setMarcaDaguaTamanho(estilo.marcaDaguaTamanho || 120)
          setMarcaDaguaFormato(estilo.marcaDaguaFormato || 'quadrado')
          setMarcaDaguaUrl(estilo.marcaDaguaUrl || null)
          setPaddingPagina(estilo.paddingPagina || 28)
          setPaddingHeader(estilo.paddingHeader || 14)
          setEspacamentoSecoes(estilo.espacamentoSecoes || 14)
          setLogoUrl(estilo.logoUrl || null)
        } catch (e) {
          console.error('Erro ao carregar template:', e)
        }
      }
    }
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
        console.error('Código do erro:', uploadError.statusCode)
        console.error('Mensagem do erro:', uploadError.message)
        
        // Mensagens de erro mais específicas
        if (uploadError.message?.includes('Bucket') || uploadError.message?.includes('bucket') || uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
          throw new Error('Bucket "Logo" não encontrado ou não acessível. Verifique:\n1. Se o bucket existe no Storage\n2. Se está usando o projeto correto do Supabase\n3. Se as variáveis de ambiente estão corretas')
        } else if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission') || uploadError.message?.includes('row-level security') || uploadError.statusCode === '403') {
          throw new Error('Erro de permissão. Execute o SQL de políticas do Storage (016_configurar_storage.sql) no SQL Editor do Supabase.')
        } else if (uploadError.statusCode === '401') {
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
        marcaDaguaOpacidade,
        marcaDaguaRotacao,
        marcaDaguaPosicaoPersonalizada,
        marcaDaguaPosicaoX,
        marcaDaguaPosicaoY,
        marcaDaguaTamanho,
        marcaDaguaFormato,
        marcaDaguaUrl,
        paddingPagina,
        paddingHeader,
        espacamentoSecoes,
        logoUrl,
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
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Orçamento (estilo)</h2>
            <button
              onClick={handleSalvar}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
              className="w-full flex items-center justify-between text-white font-medium mb-4"
            >
              <span>Cores</span>
              {coresExpandida ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {coresExpandida && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor Primária</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Usada no header e bordas</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor Secundária</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Usada em títulos</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor do Texto</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corTexto}
                      onChange={(e) => setCorTexto(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corTexto}
                      onChange={(e) => setCorTexto(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor de Fundo</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corFundo}
                      onChange={(e) => setCorFundo(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corFundo}
                      onChange={(e) => setCorFundo(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor das Bordas</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corBordas}
                      onChange={(e) => setCorBordas(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corBordas}
                      onChange={(e) => setCorBordas(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor do Header</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corHeader}
                      onChange={(e) => setCorHeader(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corHeader}
                      onChange={(e) => setCorHeader(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Cor do Texto do Header</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={corTextoHeader}
                      onChange={(e) => setCorTextoHeader(e.target.value)}
                      className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={corTextoHeader}
                      onChange={(e) => setCorTextoHeader(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
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
              className="w-full flex items-center justify-between text-white font-medium mb-4"
            >
              <span>Fontes</span>
              {fontesExpandida ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {fontesExpandida && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
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
                  <label className="block text-sm text-gray-400 mb-2">
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
                  <label className="block text-sm text-gray-400 mb-2">Família da Fonte</label>
                  <select
                    value={fonteFamilia}
                    onChange={(e) => setFonteFamilia(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
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

          {/* Marca d'água */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setMarcaDaguaExpandida(!marcaDaguaExpandida)}
              className="w-full flex items-center justify-between text-white font-medium mb-4"
            >
              <span>Marca d'água</span>
              {marcaDaguaExpandida ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {marcaDaguaExpandida && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Opacidade: {marcaDaguaOpacidade}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={marcaDaguaOpacidade}
                    onChange={(e) => setMarcaDaguaOpacidade(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Controla a transparência da marca d'água</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Rotação: {marcaDaguaRotacao}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={marcaDaguaRotacao}
                    onChange={(e) => setMarcaDaguaRotacao(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Rotação da marca d'água em graus (0-360)</p>
                </div>
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marcaDaguaPosicaoPersonalizada}
                      onChange={(e) => setMarcaDaguaPosicaoPersonalizada(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-white text-sm">Usar posição personalizada</span>
                  </label>
                </div>
                {marcaDaguaPosicaoPersonalizada && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Posição X (px)</label>
                      <input
                        type="number"
                        value={marcaDaguaPosicaoX}
                        onChange={(e) => setMarcaDaguaPosicaoX(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Posição Y (px)</label>
                      <input
                        type="number"
                        value={marcaDaguaPosicaoY}
                        onChange={(e) => setMarcaDaguaPosicaoY(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Tamanho: {marcaDaguaTamanho}px
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={marcaDaguaTamanho}
                    onChange={(e) => setMarcaDaguaTamanho(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tamanho da marca d'água em pixels</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Formato</label>
                  <select
                    value={marcaDaguaFormato}
                    onChange={(e) => setMarcaDaguaFormato(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  >
                    <option value="quadrado">Quadrado</option>
                    <option value="circular">Circular</option>
                    <option value="retangular">Retangular</option>
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
              className="w-full flex items-center justify-between text-white font-medium mb-4"
            >
              <span>Logo</span>
              {logoExpandido ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {logoExpandido && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Logo do Orçamento
                  </label>
                  <div className="flex items-center space-x-4">
                    {logoUrl && (
                      <div className="relative">
                        <Image
                          src={logoUrl}
                          alt="Logo"
                          width={100}
                          height={100}
                          className="object-contain rounded-lg border border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl(null)}
                          className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
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
                      <span className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                        <FiImage className="w-5 h-5" />
                        <span>{uploadingLogo ? 'Enviando...' : logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Layout */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setLayoutExpandido(!layoutExpandido)}
              className="w-full flex items-center justify-between text-white font-medium mb-4"
            >
              <span>Layout</span>
              {layoutExpandido ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {layoutExpandido && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Padding da Página: {paddingPagina}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={paddingPagina}
                    onChange={(e) => setPaddingPagina(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Padding do Header: {paddingHeader}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={paddingHeader}
                    onChange={(e) => setPaddingHeader(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Espaçamento entre Seções: {espacamentoSecoes}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={espacamentoSecoes}
                    onChange={(e) => setEspacamentoSecoes(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito - Preview */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold text-white mb-4">Preview do Orçamento</h2>
          {logoUrl && (
            <div className="mb-2 text-xs text-gray-400">
              Logo carregada: {logoUrl.substring(0, 50)}...
            </div>
          )}
          {!logoUrl && (
            <div className="mb-2 text-xs text-yellow-400">
              ⚠️ Nenhuma logo carregada. Adicione uma logo na seção "Logo" acima.
            </div>
          )}
          
          <div className="rounded-lg shadow-lg p-8" style={{ fontFamily: fonteFamilia, backgroundColor: corFundo }}>
            {/* Header */}
            <div
              style={{
                backgroundColor: corHeader,
                color: corTextoHeader,
                padding: `${paddingHeader}px`,
                borderBottom: `2px solid ${corPrimaria}`,
                marginBottom: `${espacamentoSecoes}px`,
                position: 'relative',
                minHeight: logoUrl ? '140px' : 'auto',
              }}
            >
              {/* Logo no canto superior esquerdo */}
              {logoUrl && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${paddingHeader}px`,
                    left: `${paddingHeader}px`,
                    zIndex: 10,
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}
              
              {/* Conteúdo do header com espaçamento para logo */}
              <div style={{ 
                marginLeft: logoUrl ? '140px' : '0',
                paddingTop: logoUrl ? '0' : '0',
              }}>
                <h1
                  style={{
                    fontSize: `${fonteTituloHeader}px`,
                    fontWeight: 'bold',
                    color: corTextoHeader,
                    marginBottom: '8px',
                  }}
                >
                  Orçamento
                </h1>
                <div style={{ fontSize: '12px', color: corTextoHeader }}>
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
          </div>
        </div>
      </div>
    </MainLayoutEmpresarial>
  )
}
