'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { loadNotifications, Notification } from './NotificationsSystem'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import {
  FiHome,
  FiCreditCard,
  FiShoppingCart,
  FiTrendingUp,
  FiDollarSign,
  FiLogOut,
  FiPieChart,
  FiUser,
  FiSettings,
  FiX,
  FiBell,
  FiAlertCircle,
  FiCheck,
  FiTrash2,
} from 'react-icons/fi'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/cartoes', label: 'Cartões', icon: FiCreditCard },
  { href: '/compras', label: 'Compras', icon: FiShoppingCart },
  { href: '/receitas', label: 'Receitas', icon: FiDollarSign },
  { href: '/gastos', label: 'Despesas', icon: FiTrendingUp },
  { href: '/investimentos', label: 'Investimentos', icon: FiPieChart },
]

export default function Sidebar() {
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
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsCount, setNotificationsCount] = useState(0)
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (session?.user) {
      loadProfile()
      // Carregar notificações descartadas do localStorage primeiro
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`dismissedNotifications_${session.user.id}`)
        if (saved) {
          try {
            const ids = JSON.parse(saved)
            setDismissedNotifications(new Set(ids))
          } catch (e) {
            console.error('Erro ao carregar notificações descartadas:', e)
          }
        }
      }
      // Carregar notificações depois
      loadNotificationsData()
    }
  }, [session])

  useEffect(() => {
    // Recarregar notificações a cada minuto
    if (session?.user) {
      const interval = setInterval(() => {
        loadNotificationsData()
      }, 60000) // 1 minuto
      return () => clearInterval(interval)
    }
  }, [session])

  const loadProfile = async () => {
    if (!session?.user?.id) return

    try {
      // Buscar perfil do usuário
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

  // Função auxiliar para criar imagem
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new window.Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  // Função para obter a imagem cortada
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

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens.')
      return
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.')
      return
    }

    // Criar URL da imagem para o cropper
    const imageUrl = URL.createObjectURL(file)
    setImageToCrop(imageUrl)
    setShowCropModal(true)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    
    // Limpar o input
    e.target.value = ''
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropComplete = async () => {
    if (!imageToCrop || !croppedAreaPixels || !session?.user?.id) return

    setUploading(true)
    try {
      // Obter a imagem cortada como blob
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels)
      
      // Criar um arquivo a partir do blob
      const file = new File([croppedImage], `avatar-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      })

      // Upload para Supabase Storage
      const fileName = `${session.user.id}-${Date.now()}.jpg`
      const filePath = `${session.user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        throw new Error(uploadError.message || 'Erro ao fazer upload da imagem')
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Salvar no banco de dados
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
      // Verificar se o perfil já existe
      const { data: existingProfile } = await supabase
        .from('perfis')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      let error = null
      if (existingProfile) {
        // Atualizar perfil existente
        const { error: updateError } = await supabase
          .from('perfis')
          .update({
            nome: profileName || session.user.email?.split('@')[0] || 'Usuário',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
        error = updateError
      } else {
        // Inserir novo perfil
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

      // Recarregar o perfil
      await loadProfile()
      setShowProfileModal(false)
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro ao salvar perfil. Tente novamente.')
    }
  }

  const loadNotificationsData = async () => {
    if (!session?.user?.id) return

    try {
      const notifs = await loadNotifications(session.user.id)
      setNotifications(notifs)
      
      // Carregar notificações descartadas do localStorage para filtrar
      let dismissedIds = dismissedNotifications
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`dismissedNotifications_${session.user.id}`)
        if (saved) {
          try {
            const ids = JSON.parse(saved)
            dismissedIds = new Set(ids)
          } catch (e) {
            // Ignorar erro, usar o estado atual
          }
        }
      }
      
      // Filtrar notificações descartadas antes de contar
      const visibleNotifs = notifs.filter(n => !dismissedIds.has(n.id))
      setNotificationsCount(visibleNotifs.length)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    }
  }

  const handleDismissNotification = (notificationId: string) => {
    if (!session?.user?.id) return
    
    setDismissedNotifications(prev => {
      const newSet = new Set([...prev, notificationId])
      // Salvar no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dismissedNotifications_${session.user.id}`, JSON.stringify([...newSet]))
      }
      return newSet
    })
    setNotificationsCount(prev => Math.max(0, prev - 1))
  }

  const handleClearAllNotifications = () => {
    if (!session?.user?.id) return
    
    const allIds = notifications.map(n => n.id)
    setDismissedNotifications(prev => {
      const newSet = new Set([...prev, ...allIds])
      // Salvar no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dismissedNotifications_${session.user.id}`, JSON.stringify([...newSet]))
      }
      return newSet
    })
    setNotificationsCount(0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-primary transition-all duration-300 ease-in-out z-50 flex flex-col ${
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
                Controle Total
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
                  ? 'bg-primary-light text-white shadow-lg'
                  : 'text-white hover:bg-primary-light/50 hover:text-white hover:shadow-md'
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
        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              if (!showNotifications) {
                // Quando abrir o modal, zerar o contador (notificações visualizadas)
                setNotificationsCount(0)
              }
            }}
            className={`group w-full flex items-center ${isHovered ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg text-white hover:bg-primary-light/50 transition-all duration-200 relative`}
          >
            <div className="relative flex-shrink-0">
              <FiBell className="w-5 h-5" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationsCount > 9 ? '9+' : notificationsCount}
                </span>
              )}
            </div>
            {isHovered && (
              <span className="whitespace-nowrap animate-slide-in">
                Notificações
              </span>
            )}
          </button>

          {/* Modal de Notificações - Balão ao lado */}
          {showNotifications && (
            <>
              {/* Overlay para fechar */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div 
                className="fixed z-50 w-96 flex flex-col"
                style={{ 
                  left: isHovered ? '16rem' : '5rem',
                  top: '1rem',
                  maxHeight: 'calc(100vh - 2rem)',
                  marginLeft: '0.75rem',
                  animation: 'scaleInVertical 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-700/50">
                  {/* Header */}
                  <div className="flex justify-between items-center p-6 border-b border-gray-700/50 bg-gray-800/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <FiBell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Notificações</h2>
                        {notifications.filter(n => !dismissedNotifications.has(n.id)).length > 0 && (
                          <p className="text-xs text-gray-400">
                            {notifications.filter(n => !dismissedNotifications.has(n.id)).length} {notifications.filter(n => !dismissedNotifications.has(n.id)).length === 1 ? 'notificação' : 'notificações'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {notifications.filter(n => !dismissedNotifications.has(n.id)).length > 0 && (
                        <button
                          onClick={handleClearAllNotifications}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                          title="Limpar todas"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          <span>Limpar todas</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {notifications.filter(n => !dismissedNotifications.has(n.id)).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-gray-700/30 flex items-center justify-center mx-auto mb-4">
                          <FiBell className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-400 font-medium">Nenhuma notificação no momento</p>
                        <p className="text-gray-500 text-sm mt-1">Você está em dia!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.filter(n => !dismissedNotifications.has(n.id)).map((notif, index) => (
                          <div
                            key={notif.id}
                            className={`group relative overflow-hidden rounded-xl p-4 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                              notif.type === 'error'
                                ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/40'
                                : notif.type === 'warning'
                                ? 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 hover:border-yellow-500/40'
                                : 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40'
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {/* Decorative gradient overlay */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${
                              notif.type === 'error' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}></div>
                            
                            <div className="flex items-start space-x-4 pl-2">
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                notif.type === 'error' 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : notif.type === 'warning' 
                                  ? 'bg-yellow-500/20 text-yellow-400' 
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                <FiAlertCircle className="w-5 h-5" />
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0 relative group/notif">
                                {/* Botão de fechar */}
                                <button
                                  onClick={() => handleDismissNotification(notif.id)}
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-700/80 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 opacity-0 group-hover/notif:opacity-100 z-10"
                                  title="Remover notificação"
                                >
                                  <FiX className="w-3.5 h-3.5" />
                                </button>
                                <h3 className={`font-semibold text-sm mb-1.5 ${
                                  notif.type === 'error' ? 'text-red-200' : notif.type === 'warning' ? 'text-yellow-200' : 'text-blue-200'
                                }`}>
                                  {notif.title}
                                </h3>
                                <p className="text-sm text-gray-300 leading-relaxed mb-3">{notif.message}</p>
                                {notif.link && (
                                  <button
                                    onClick={() => {
                                      router.push(notif.link!)
                                      setShowNotifications(false)
                                    }}
                                    className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                                      notif.type === 'error'
                                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200'
                                        : notif.type === 'warning'
                                        ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 hover:text-yellow-200'
                                        : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200'
                                    }`}
                                  >
                                    Ver detalhes
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Perfil do Usuário */}
        <button
          onClick={() => setShowProfileModal(true)}
          className={`group w-full flex items-center ${isHovered ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg text-white hover:bg-primary-light/50 transition-all duration-200`}
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
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
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
                  <span className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors inline-block">
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
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

