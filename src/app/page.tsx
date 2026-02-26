'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  FiTrendingUp,
  FiBriefcase,
  FiBarChart2,
  FiShield,
  FiSmartphone,
  FiCheck,
  FiZap,
} from 'react-icons/fi'
import InstallAppBanner from '@/components/InstallAppBanner'
import LandingAuraBackground from '@/components/Layout/LandingAuraBackground'

/**
 * Landing page no estilo Flux (Aura): apresentação do SaaS Infinity Lines,
 * dois sistemas (Financeiro Pessoal e Empresarial), características,
 * sobre o produto e três planos de pagamento integrados ao Stripe.
 */
export default function HomePage() {
  const scrollToPlanos = useCallback(() => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <LandingAuraBackground />

      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/infinity_sem_fundo.png"
              alt=""
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="font-semibold tracking-tight text-white">Infinity Lines</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#caracteristicas" className="text-gray-400 hover:text-neon-white transition-colors">
              Características
            </a>
            <a href="#sobre" className="text-gray-400 hover:text-neon-white transition-colors">
              Sobre
            </a>
            <a href="#planos" className="text-gray-400 hover:text-neon-white transition-colors">
              Planos
            </a>
            <button
              type="button"
              onClick={scrollToPlanos}
              className="rounded-lg bg-neon-white/10 border border-neon-white/20 px-4 py-2 text-neon-white font-medium hover:bg-neon-white/15 transition-colors"
            >
              Ver planos
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <p className="text-neon-white/90 text-sm font-medium tracking-widest uppercase mb-4">
            Soluções financeiras completas
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
            Do pessoal ao empresarial, uma única plataforma
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Dois sistemas integrados: gerencie suas finanças pessoais e o fluxo de caixa da sua empresa com clareza e controle total.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Pessoal: seta esquerda; press = preenchimento branco neon (nunca preto) */}
            <Link
              href="/pessoal/auth/login"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-neon-white bg-[#0a0a0a] px-6 py-3.5 font-bold text-neon-white shadow-brutalist-white transition-all duration-200 hover:scale-[1.02] hover:shadow-brutalist-white-hover hover:animate-brutalist-glow-white active:scale-[0.98] active:!bg-[#f0f9ff] active:!text-[#0a0a0a] active:border-neon-white"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Acessar Financeiro Pessoal
            </Link>
            {/* Empresarial: seta direita; press = preenchimento verde neon (nunca preto) */}
            <Link
              href="/empresarial/auth/login"
              className="group inline-flex items-center gap-2 rounded-lg border-2 border-neon bg-[#0a0a0a] px-6 py-3.5 font-bold text-white shadow-brutalist-green transition-all duration-200 hover:scale-[1.02] hover:shadow-brutalist-green-hover hover:animate-brutalist-glow-green active:scale-[0.98] active:!bg-[#00ff88] active:!text-[#0a0a0a] active:border-neon"
            >
              Acessar Financeiro Empresarial
              <svg className="w-5 h-5 shrink-0 text-neon transition-colors duration-200 group-active:!text-[#0a0a0a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          <button
            type="button"
            onClick={scrollToPlanos}
            className="mt-8 block mx-auto text-gray-500 hover:text-neon-white transition-colors text-sm font-medium"
          >
            Ou escolha um plano abaixo ↓
          </button>
        </section>

        {/* Características */}
        <section id="caracteristicas" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-neon-white/90 text-sm font-medium tracking-widest uppercase mb-2">O que oferecemos</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">
            Características dos sistemas
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mb-14">
            Ferramentas pensadas para quem quer controle financeiro real, seja na vida pessoal ou na empresa.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: FiTrendingUp,
                title: 'Financeiro Pessoal',
                desc: 'Controle de gastos, receitas, investimentos e sonhos financeiros em um só lugar.',
              },
              {
                icon: FiBriefcase,
                title: 'Financeiro Empresarial',
                desc: 'Clientes, vendas, orçamentos, contas a pagar e receber, fluxo de caixa e relatórios.',
              },
              {
                icon: FiBarChart2,
                title: 'Relatórios e dashboards',
                desc: 'Visão clara do que entra e sai, com gráficos e indicadores para decisões melhores.',
              },
              {
                icon: FiShield,
                title: 'Segurança e privacidade',
                desc: 'Dados protegidos com autenticação segura e infraestrutura confiável.',
              },
              {
                icon: FiSmartphone,
                title: 'Disponível no celular',
                desc: 'Acesse pelo navegador no celular ou instale o app para usar onde estiver.',
              },
              {
                icon: FiZap,
                title: 'Simples e rápido',
                desc: 'Interface limpa e objetiva para você começar a organizar suas finanças hoje.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 hover:border-neon-white/20 hover:bg-white/[0.05] transition-all duration-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-neon-white/10 text-neon-white mb-4">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Sobre o SaaS */}
        <section id="sobre" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12 lg:p-16">
            <p className="text-neon-white/90 text-sm font-medium tracking-widest uppercase mb-2">Sobre o produto</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-6">
              Infinity Lines — duas frentes, uma plataforma
            </h2>
            <div className="prose prose-invert max-w-none text-gray-400 space-y-4 text-lg leading-relaxed">
              <p>
                O <strong className="text-white">Financeiro Pessoal</strong> foi feito para você organizar receitas, gastos por categoria, investimentos e metas (sonhos). Dashboard, relatórios e acompanhamento mensal ajudam a tomar decisões com base em números reais.
              </p>
              <p>
                O <strong className="text-white">Financeiro Empresarial</strong> cobre a gestão da empresa: cadastro de clientes e fornecedores, vendas e receitas, orçamentos, contas a pagar e a receber, fluxo de caixa e visão consolidada para o negócio.
              </p>
              <p>
                Ambos fazem parte do mesmo ecossistema Infinity Lines. Você pode usar só o pessoal, só o empresarial, ou os dois com o <strong className="text-neon-white">Plano Infinity</strong>, que desbloqueia acesso completo às duas aplicações com um único pagamento.
              </p>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-neon-white/90 text-sm font-medium tracking-widest uppercase mb-2">Preços</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">
            Planos que cabem no seu uso
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mb-14">
            Pagamento seguro via Stripe. Cancele quando quiser. Escolha o plano e faça login para assinar.
          </p>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Plano Pessoal */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 md:p-8 flex flex-col overflow-hidden">
              <div className="h-px w-full bg-neon-white/50 rounded-t-2xl shrink-0" />
              <div className="pt-6 flex flex-col flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-1">Pessoal</h3>
                <p className="text-gray-300 text-sm mb-6">Para sua vida financeira</p>
                <div className="mb-6">
                  <span className="text-3xl md:text-4xl font-bold text-white">R$ 30</span>
                  <span className="text-gray-400">/mês</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Acesso completo ao Financeiro Pessoal',
                    'Dashboard, gastos, receitas e categorias',
                    'Investimentos e sonhos financeiros',
                    'Cancele quando quiser',
                  ].map((label) => (
                    <li key={label} className="flex items-center gap-2 text-gray-300">
                      <FiCheck className="h-5 w-5 shrink-0 text-neon-white" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pessoal/auth/login?redirect=/pessoal/assinatura"
                  className="mt-auto block w-full rounded-xl border-2 border-neon-white bg-white/5 py-3.5 text-center font-semibold text-neon-white transition-all duration-200 hover:scale-[1.02] hover:bg-neon-white/20 hover:shadow-[0_0_20px_rgba(240,249,255,0.25)] active:scale-[0.98] active:!bg-[#f0f9ff] active:!text-[#0a0a0a]"
                >
                  Assinar — Pessoal
                </Link>
              </div>
            </div>

            {/* Plano Empresarial */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 md:p-8 flex flex-col overflow-hidden">
              <div className="h-px w-full bg-neon-white/50 rounded-t-2xl shrink-0" />
              <div className="pt-6 flex flex-col flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-1">Empresarial</h3>
                <p className="text-gray-300 text-sm mb-6">Para sua empresa</p>
                <div className="mb-6">
                  <span className="text-3xl md:text-4xl font-bold text-white">R$ 30</span>
                  <span className="text-gray-400">/mês</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Acesso completo ao Financeiro Empresarial',
                    'Clientes, vendas e orçamentos',
                    'Contas a pagar e receber, fluxo de caixa',
                    'Cancele quando quiser',
                  ].map((label) => (
                    <li key={label} className="flex items-center gap-2 text-gray-300">
                      <FiCheck className="h-5 w-5 shrink-0 text-neon-white" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/empresarial/auth/login?redirect=/empresarial/assinatura"
                  className="mt-auto block w-full rounded-xl border-2 border-neon bg-white/5 py-3.5 text-center font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-neon/20 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] active:scale-[0.98] active:!bg-[#00ff88] active:!text-[#0a0a0a]"
                >
                  Assinar — Empresarial
                </Link>
              </div>
            </div>

            {/* Plano Infinity — badge "Recomendado" dentro da borda */}
            <div className="rounded-2xl border-2 border-neon-white/50 bg-white/[0.08] p-6 md:p-8 flex flex-col overflow-hidden relative">
              <div className="h-px w-full bg-neon-white rounded-t-2xl shrink-0" />
              <div className="pt-4 flex flex-col flex-1 min-w-0">
                <span className="inline-flex w-fit rounded-full bg-neon-white/25 border border-neon-white/40 px-3 py-1 text-xs font-semibold text-neon-white mb-4">
                  Recomendado
                </span>
                <h3 className="text-xl font-semibold text-white mb-1">Infinity</h3>
                <p className="text-gray-300 text-sm mb-6">Pessoal + Empresarial juntos</p>
                <div className="mb-6">
                  <span className="text-3xl md:text-4xl font-bold text-white">R$ 49</span>
                  <span className="text-gray-400">/mês</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Tudo do Plano Pessoal',
                    'Tudo do Plano Empresarial',
                    'Um único pagamento para as duas aplicações',
                    'Cancele quando quiser',
                  ].map((label) => (
                    <li key={label} className="flex items-center gap-2 text-gray-300">
                      <FiCheck className="h-5 w-5 shrink-0 text-neon-white" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pessoal/auth/login?redirect=/pessoal/assinatura?plan=infinity"
                  className="mt-auto block w-full rounded-xl border-2 border-neon-white bg-neon-white py-3.5 text-center font-semibold text-[#0a0a0a] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(240,249,255,0.4)] active:scale-[0.98]"
                >
                  Assinar — Infinity
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Pagamento processado com segurança pelo Stripe. Após clicar em Assinar, você fará login e será redirecionado ao checkout.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <InstallAppBanner
              compact
              className="justify-center text-gray-500 [&_a]:text-neon-white [&_a:hover]:text-neon-white-dim [&_button]:text-neon-white [&_button:hover]:text-neon-white-dim"
            />
            <p className="text-gray-500 text-sm">
              Plataforma Infinity Lines — Soluções Financeiras Completas
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
