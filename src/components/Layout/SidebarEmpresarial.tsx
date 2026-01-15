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
  FiActivity,
  FiFileText,
  FiLayers,
} from 'react-icons/fi'

const menuItems = [
  { href: '/empresarial/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/empresarial/perfil', label: 'Perfil', icon: FiUser },
  { href: '/empresarial/contas-a-pagar', label: 'Contas a Pagar', icon: FiTrendingDown },
  { href: '/empresarial/contas-a-receber', label: 'Contas a Receber', icon: FiTrendingUp },
  { href: '/empresarial/vendas', label: 'Vendas', icon: FiShoppingBag },
  { href: '/empresarial/orcamentos', label: 'Orçamentos', icon: FiFileText },
  { href: '/empresarial/orcamentos/estilo', label: 'Orçamento (estilo)', icon: FiLayers },
  { href: '/empresarial/fornecedores', label: 'Fornecedores', icon: FiBriefcase },
  { href: '/empresarial/clientes', label: 'Clientes', icon: FiUsers },
  { href: '/empresarial/fluxo-caixa', label: 'Fluxo de Caixa', icon: FiActivity },
]

export default function SidebarEmpresarial() {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAuth()
  const [isHovered, setIsHovered] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    if (session?.user) {
      loadProfile()
    }
  }, [session])

  const loadProfile = async () => {
    if (!session?.user?.id) return

    try {
      const { data: profile } = await supabase
        .from('perfis')
        .select('foto_url, nome')
        .eq('user_id', session.user.id)
        .single()

      if (profile) {
        setProfilePhoto(profile.foto_url)
        setProfileName(profile.nome || session.user.email?.split('@')[0] || 'Usuário')
      } else {
        setProfileName(session.user.email?.split('@')[0] || 'Usuário')
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      setProfileName(session.user.email?.split('@')[0] || 'Usuário')
    }
  }

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
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-purple-900 via-purple-950 to-purple-900 transition-all duration-300 ease-in-out z-50 flex flex-col ${
        isHovered ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-6 transition-all duration-300 ${isHovered ? 'pl-2 pr-6 mb-8' : 'px-0 mb-4'}`}>
        <div className={`flex items-center ${isHovered ? 'space-x-3' : 'justify-center'}`}>
          <div className="flex-shrink-0">
            <Image
              src="/images/infinity_sem_fundo.png"
              alt="Infinity Lines Logo"
              width={60}
              height={40}
              className="object-contain"
            />
          </div>
          {isHovered && (
            <div className="overflow-hidden">
              <h1 className="text-2xl font-bold text-white whitespace-nowrap animate-slide-in">
                Infinity Lines
              </h1>
              <p className="text-white/80 text-sm whitespace-nowrap animate-slide-in-delay">
                Empresarial
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 space-y-2 ${isHovered ? 'px-3' : 'px-0'}`}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center ${isHovered ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'bg-purple-800/80 text-white shadow-lg'
                  : 'text-white hover:bg-purple-800/40 hover:text-white hover:shadow-md'
              }`}
            >
              {isActive && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              {isHovered && (
                <span className={`whitespace-nowrap animate-slide-in ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className={`${isHovered ? 'px-3' : 'px-0'} pb-6 mt-auto space-y-2`}>
        {/* Perfil do Usuário */}
        <button
          onClick={() => setShowProfileModal(true)}
          className={`group w-full flex items-center ${isHovered ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg text-white hover:bg-purple-800/40 transition-all duration-200`}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
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
          {isHovered && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium whitespace-nowrap animate-slide-in truncate">
                {profileName}
              </p>
              <p className="text-xs text-white/60 whitespace-nowrap animate-slide-in-delay truncate">
                Ver perfil
              </p>
            </div>
          )}
        </button>

        {/* Botão Sair */}
        <button
          onClick={handleLogout}
          className={`group w-full flex items-center ${isHovered ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg text-white hover:bg-red-500/20 hover:text-red-200 transition-all duration-200`}
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:rotate-12" />
          {isHovered && (
            <span className="whitespace-nowrap animate-slide-in">Sair</span>
          )}
        </button>
      </div>

      {/* Modal de Crop de Imagem */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Enquadrar Imagem</h2>
              <button
                onClick={handleCancelCrop}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={uploading}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="relative w-full" style={{ height: '400px', background: '#1f2937' }}>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Zoom: {Math.round(zoom * 100)}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  disabled={uploading}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelCrop}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCropComplete}
                  className="px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-900 transition-colors flex items-center space-x-2"
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
          <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Meu Perfil</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Foto do Perfil */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {profilePhoto ? (
                    <Image
                      src={profilePhoto}
                      alt="Foto do perfil"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <FiUser className="w-16 h-16 text-gray-400" />
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
                  <span className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg transition-colors inline-block">
                    {uploading ? 'Enviando...' : 'Alterar Foto'}
                  </span>
                </label>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-700"
                  placeholder="Seu nome"
                />
              </div>

              {/* Email (somente leitura) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Botões */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-900 transition-colors"
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
