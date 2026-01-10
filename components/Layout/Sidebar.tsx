'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  FiHome,
  FiCreditCard,
  FiShoppingCart,
  FiTrendingUp,
  FiDollarSign,
  FiLogOut,
  FiPieChart,
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
  const [isHovered, setIsHovered] = useState(false)

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
      <div className={`p-6 transition-all duration-300 ${isHovered ? 'mb-8' : 'mb-4'}`}>
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg flex-shrink-0">
            <span className="text-white text-xl font-bold">∞</span>
          </div>
          {isHovered && (
            <div className="overflow-hidden">
              <h1 className="text-2xl font-bold text-white whitespace-nowrap animate-slide-in">
                Infinity
              </h1>
              <p className="text-white/80 text-sm whitespace-nowrap animate-slide-in-delay">
                Controle Total
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
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

      <div className="px-3 pb-6 mt-auto">
        <button
          onClick={handleLogout}
          className="group w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:rotate-12" />
          {isHovered && (
            <span className="whitespace-nowrap animate-slide-in">Sair</span>
          )}
        </button>
      </div>
    </div>
  )
}

