'use client'

import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { CartoesEmpresaContent } from './CartoesEmpresaContent'

/** Página Cartão Empresa: cartões de crédito da empresa (mesma lógica do finance pessoal). */
export default function CartoesEmpresaPage() {
  return (
    <MainLayoutEmpresarial>
      <CartoesEmpresaContent />
    </MainLayoutEmpresarial>
  )
}
