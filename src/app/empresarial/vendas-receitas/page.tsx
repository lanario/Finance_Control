'use client'

import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { VendasContent } from '../vendas/VendasContent'

/** Página Vendas/Receitas: exibe apenas o módulo de Vendas (nome mantido para o menu). */
export default function VendasReceitasPage() {
  return (
    <MainLayoutEmpresarial>
      <VendasContent />
    </MainLayoutEmpresarial>
  )
}
