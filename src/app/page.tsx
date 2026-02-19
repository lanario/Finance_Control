'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FiTrendingUp, FiBriefcase } from 'react-icons/fi'
import { useMemo, useCallback } from 'react'
import InstallAppBanner from '@/components/InstallAppBanner'

export default function HomePage() {
  const router = useRouter()

  const aplicacoes = useMemo(() => [
    {
      id: 'pessoal',
      nome: 'Financeiro Pessoal',
      descricao: 'Gerencie suas finanças pessoais, controle de gastos, receitas e investimentos',
      icone: FiTrendingUp,
      cor: 'from-blue-600 to-blue-800',
      hoverCor: 'hover:from-blue-700 hover:to-blue-900',
      rota: '/pessoal/auth/login',
    },
    {
      id: 'empresarial',
      nome: 'Financeiro Empresarial',
      descricao: 'Sistema completo de gestão financeira empresarial com controle de fluxo de caixa',
      icone: FiBriefcase,
      cor: 'from-purple-600 to-purple-800',
      hoverCor: 'hover:from-purple-700 hover:to-purple-900',
      rota: '/empresarial/auth/login',
    },
  ], [])

  // Prefetch de rotas no hover
  const handleAppHover = useCallback((rota: string) => {
    router.prefetch(rota)
  }, [router])

  const handleAppClick = useCallback((rota: string) => {
    router.push(rota)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Image
              src="/images/infinity_sem_fundo.png"
              alt="Infinity Lines"
              width={80}
              height={80}
              className="object-contain"
            />
            <h1 className="text-5xl font-bold text-white">Infinity Lines</h1>
          </div>
          <p className="text-xl text-gray-300">
            Escolha a aplicação que deseja acessar
          </p>
        </div>

        {/* Cards de Aplicações */}
        <div className="grid md:grid-cols-2 gap-8">
          {aplicacoes.map((app) => {
            const IconComponent = app.icone
            return (
              <button
                key={app.id}
                onClick={() => handleAppClick(app.rota)}
                onMouseEnter={() => handleAppHover(app.rota)}
                className={`
                  bg-white rounded-2xl shadow-2xl p-8 md:p-10
                  border border-gray-200
                  text-left
                  transform transition-all duration-200 ease-out
                  hover:scale-105 hover:shadow-3xl
                  group
                  relative overflow-hidden
                  will-change-transform
                `}
              >
                {/* Gradiente de fundo sutil */}
                <div
                  className={`
                    absolute top-0 left-0 w-full h-2
                    bg-gradient-to-r ${app.cor} ${app.hoverCor}
                    transition-all duration-300
                  `}
                />

                <div className="relative z-10">
                  {/* Ícone */}
                  <div
                    className={`
                      w-16 h-16 rounded-xl
                      bg-gradient-to-br ${app.cor}
                      flex items-center justify-center
                      mb-6
                      transition-transform duration-200 ease-out
                      group-hover:scale-110
                      will-change-transform
                    `}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  {/* Título */}
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {app.nome}
                  </h2>

                  {/* Descrição */}
                  <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    {app.descricao}
                  </p>

                  {/* Botão de ação */}
                  <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                    <span>Acessar aplicação</span>
                    <svg
                      className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-200 ease-out will-change-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 space-y-4">
          <InstallAppBanner compact className="justify-center text-gray-400" />
          <p className="text-gray-400 text-sm">
            Plataforma Infinity Lines - Soluções Financeiras Completas
          </p>
        </div>
      </div>
    </div>
  )
}
