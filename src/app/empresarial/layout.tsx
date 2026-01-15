import type { Metadata } from 'next'
import { Inter, Bungee } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const bungee = Bungee({ weight: '400', subsets: ['latin'], variable: '--font-bungee' })

export const metadata: Metadata = {
  title: 'Financeiro Empresarial',
  description: 'Sistema de gestão financeira empresarial',
  icons: {
    icon: '/images/Infinity_logo.png',
    apple: '/images/Infinity_logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} ${bungee.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
