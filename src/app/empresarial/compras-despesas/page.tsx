'use client'

import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { ComprasContent } from '../compras/ComprasContent'

/** Página Compras/Despesas: exibe apenas o módulo de Compras (nome mantido para o menu). */
export default function ComprasDespesasPage() {
  return (
    <MainLayoutEmpresarial>
      <ComprasContent />
    </MainLayoutEmpresarial>
  )
}
