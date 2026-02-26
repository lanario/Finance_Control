'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/empresarial/providers'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import {
  FiHome,
  FiTrendingDown,
  FiTrendingUp,
  FiDollarSign,
  FiLogOut,
  FiUser,
  FiX,
  FiCheck,
  FiBriefcase,
  FiUsers,
  FiShoppingBag,
  FiFileText,
  FiLayers,
  FiTag,
  FiPackage,
  FiCreditCard,
} from 'react-icons/fi'
import InstallAppBanner from '@/components/InstallAppBanner'

type MenuItemTipo = 'receita' | 'despesa' | undefined

const menuSections = [
  {
    title: 'Pessoal',
    items: [
      { href: '/empresarial/dashboard', label: 'Dashboard', icon: FiHome, tipo: undefined as MenuItemTipo },
      { href: '/empresarial/perfil', label: 'Perfil', icon: FiUser, tipo: undefined },
      { href: '/empresarial/fornecedores', label: 'Fornecedores', icon: FiBriefcase, tipo: undefined },
      { href: '/empresarial/clientes', label: 'Clientes', icon: FiUsers, tipo: undefined },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { href: '/empresarial/categorias', label: 'Categorias', icon: FiTag, tipo: undefined },
      { href: '/empresarial/produtos-servicos', label: 'Produtos/Serviços', icon: FiPackage, tipo: undefined },
    ],
  },
  {
    title: 'Finanças',
    items: [
      { href: '/empresarial/compras-despesas', label: 'Compras/Despesas', icon: FiTrendingDown, tipo: 'despesa' as MenuItemTipo },
      { href: '/empresarial/vendas-receitas', label: 'Vendas/Receitas', icon: FiShoppingBag, tipo: 'receita' as MenuItemTipo },
      { href: '/empresarial/cartoes-empresa', label: 'Cartão Empresa', icon: FiCreditCard, tipo: undefined },
      { href: '/empresarial/orcamentos', label: 'Orçamentos', icon: FiFileText, tipo: undefined },
      { href: '/empresarial/orcamentos/estilo', label: 'Orçamento (estilo)', icon: FiLayers, tipo: undefined },
    ],
  },
  {
    title: 'Assinatura',
    items: [
      { href: '/empresarial/planos', label: 'Planos', icon: FiPackage, tipo: undefined },
    ],
  },
]

export default function SidebarEmpresarial() {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const userId = session?.user?.id

  const loadProfile = useCallback(async () => {
    if (!userId) return

    try {
      const { data: profile } = await supabase
        .from('perfis')
        .select('foto_url, nome')
        .eq('user_id', userId)
        .maybeSingle()

      if (profile) {
        setProfilePhoto(profile.foto_url)
        setProfileName(profile.nome || session?.user?.email?.split('@')[0] || 'Usuário')
      } else {
        setProfileName(session?.user?.email?.split('@')[0] || 'Usuário')
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      setProfileName(session?.user?.email?.split('@')[0] || 'Usuário')
    }
  }, [userId, session?.user?.email])

  useEffect(() => {
    if (userId && !profilePhoto && !profileName) {
      loadProfile()
    }
  }, [userId, profilePhoto, profileName, loadProfile])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new window.Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Não foi possível obter o contexto do canvas')
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas está vazio'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const imageUrl = URL.createObjectURL(file)
    setImageToCrop(imageUrl)
    setShowCropModal(true)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    
    e.target.value = ''
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropComplete = async () => {
    if (!imageToCrop || !croppedAreaPixels || !session?.user?.id) return

    setUploading(true)
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels)
      
      const file = new File([croppedImage], `avatar-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      })

      const fileName = `${session.user.id}-${Date.now()}.jpg`
      const filePath = `${session.user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        throw new Error(uploadError.message || 'Erro ao fazer upload da imagem')
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

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
            foto_url: publicUrl,
            nome: profileName || session.user.email?.split('@')[0] || 'Usuário',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
        dbError = error
      } else {
        const { error } = await supabase
          .from('perfis')
          .insert({
            user_id: session.user.id,
            foto_url: publicUrl,
            nome: profileName || session.user.email?.split('@')[0] || 'Usuário',
            updated_at: new Date().toISOString(),
          })
        dbError = error
      }

      if (dbError) {
        console.error('Erro ao salvar perfil:', dbError)
        throw new Error(dbError.message || 'Erro ao salvar perfil')
      }

      setProfilePhoto(publicUrl)
      setShowCropModal(false)
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop)
        setImageToCrop(null)
      }
    } catch (error: any) {
      console.error('Erro completo ao fazer upload:', error)
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error) || 'Erro desconhecido'
      
      if (errorMessage.includes('Bucket') || errorMessage.includes('bucket') || errorMessage.includes('not found')) {
        alert(`Erro: O bucket "avatars" não foi encontrado no Storage.\n\nPor favor:\n1. Vá em Storage no dashboard do Supabase\n2. Crie um bucket chamado "avatars"\n3. Marque como Público: true\n4. Tente novamente`)
      } else if (errorMessage.includes('policy') || errorMessage.includes('permission') || errorMessage.includes('row-level security')) {
        alert(`Erro de permissão no bucket "avatars".\n\nPor favor verifique as políticas de acesso no Storage.\n\nErro detalhado: ${errorMessage}`)
      } else {
        alert(`Erro ao fazer upload da foto:\n\n${errorMessage}\n\nVerifique o console do navegador para mais detalhes.`)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleCancelCrop = () => {
    setShowCropModal(false)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return

    try {
      const { data: existingProfile } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      let error = null
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('perfis')
          .update({
            nome: profileName || session.user.email?.split('@')[0] || 'Usuário',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('perfis')
          .insert({
            user_id: session.user.id,
            nome: profileName || session.user.email?.split('@')[0] || 'Usuário',
            updated_at: new Date().toISOString(),
          })
        error = insertError
      }

      if (error) throw error

      await loadProfile()
      setShowProfileModal(false)
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro ao salvar perfil. Tente novamente.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/empresarial/auth/login')
  }

  return (
    <div
      className="fixed left-0 top-0 h-screen w-64 emp-bg-sidebar z-50 flex flex-col border-r emp-border"
    >
      <div className="py-6 pl-2 pr-6 mb-2">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Image
              src="/images/infinity_sem_fundo.png"
              alt="Infinity Lines Logo"
              width={60}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-2xl font-bold emp-text-primary whitespace-nowrap">
              Infinity Lines
            </h1>
            <p className="emp-text-secondary text-sm whitespace-nowrap">
              Empresarial
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {/* Título da Seção */}
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold emp-text-muted uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
              
              {/* Itens do Menu */}
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const isReceita = item.tipo === 'receita'
                const isDespesa = item.tipo === 'despesa'
                const corReceita = isReceita && (isActive ? 'bg-neon/20 text-neon' : 'text-green-400 hover:bg-neon/20 hover:text-neon')
                const corDespesa = isDespesa && (isActive ? 'bg-red-500/25 text-red-300' : 'text-red-400 hover:bg-red-500/15')
                const corNeutra = !isReceita && !isDespesa && (isActive ? 'emp-text-primary shadow-lg text-white' : 'emp-text-primary emp-sidebar-item-neutro')
                const styleNeutra = !isReceita && !isDespesa && isActive ? { backgroundColor: 'var(--emp-bg-sidebar-active)' } : undefined
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative ${
                      isReceita ? corReceita : isDespesa ? corDespesa : corNeutra
                    }`}
                    style={styleNeutra}
                  >
                    {isActive && !isReceita && !isDespesa && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-neon rounded-r-full shadow-[0_0_8px_rgba(0,255,136,0.6)]"></div>
                    )}
                    {isActive && isReceita && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-neon rounded-r-full"></div>
                    )}
                    {isActive && isDespesa && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-400 rounded-r-full"></div>
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-150 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className={`whitespace-nowrap ${isActive ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="px-3 pb-6 mt-auto space-y-2">
        {/* Perfil do Usuário */}
        <button
          onClick={() => setShowProfileModal(true)}
          className="group w-full flex items-center space-x-3 px-4 py-3 rounded-lg emp-text-primary transition-colors"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--emp-bg-sidebar-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden emp-border" style={{ backgroundColor: 'var(--emp-bg-sidebar-hover)' }}>
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt="Foto do perfil"
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            ) : (
              <FiUser className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="text-sm font-medium whitespace-nowrap truncate">
              {profileName}
            </p>
            <p className="text-xs emp-text-muted whitespace-nowrap truncate">
              Ver perfil
            </p>
          </div>
        </button>

        <div className="px-2 py-2">
          <InstallAppBanner compact className="emp-text-secondary !gap-1 [&_a]:!emp-text-primary [&_button]:!emp-text-primary" />
        </div>

        {/* Botão Sair */}
        <button
          onClick={handleLogout}
          className="group w-full flex items-center space-x-3 px-4 py-3 rounded-lg emp-text-primary hover:bg-red-500/20 hover:text-red-200 transition-colors"
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-150 group-hover:rotate-12" />
          <span className="whitespace-nowrap">Sair</span>
        </button>
      </div>

      {/* Modal de Crop de Imagem */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="emp-modal-bg rounded-lg p-6 w-full max-w-2xl border emp-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold emp-text-primary">Enquadrar Imagem</h2>
              <button
                onClick={handleCancelCrop}
                className="emp-text-muted hover:emp-text-primary transition-colors"
                disabled={uploading}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="relative w-full emp-input-bg" style={{ height: '400px' }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Zoom: {Math.round(zoom * 100)}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 emp-input-bg rounded-lg appearance-none cursor-pointer"
                  disabled={uploading}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelCrop}
                  className="px-4 py-2 emp-input-bg emp-text-primary rounded-lg hover:opacity-90 transition-colors border emp-border"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCropComplete}
                  className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 emp-text-primary"
                  style={{ backgroundColor: 'var(--emp-accent)' }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      <span>Confirmar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="emp-modal-bg rounded-lg p-8 w-full max-w-md border emp-border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold emp-text-primary">Meu Perfil</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="emp-text-muted hover:emp-text-primary transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Foto do Perfil */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-32 h-32 rounded-full emp-input-bg flex items-center justify-center overflow-hidden border emp-border">
                  {profilePhoto ? (
                    <Image
                      src={profilePhoto}
                      alt="Foto do perfil"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <FiUser className="w-16 h-16 emp-text-muted" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <span className="px-4 py-2 rounded-lg transition-colors inline-block emp-text-primary hover:opacity-90" style={{ backgroundColor: 'var(--emp-accent)' }}>
                    {uploading ? 'Enviando...' : 'Alterar Foto'}
                  </span>
                </label>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Seu nome"
                />
              </div>

              {/* Email (somente leitura) */}
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-muted cursor-not-allowed opacity-80"
                />
              </div>

              {/* Botões */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:opacity-90 transition-colors emp-input-bg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors emp-text-primary hover:opacity-90"
                  style={{ backgroundColor: 'var(--emp-accent)' }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
