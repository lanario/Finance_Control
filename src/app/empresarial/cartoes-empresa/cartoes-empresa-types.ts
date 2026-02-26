/**
 * Tipos compartilhados entre CartoesEmpresaContent e CartoesEmpresaUI.
 */
import type { Dispatch, SetStateAction, FormEvent } from 'react'

export interface Cartao {
  id: string
  nome: string
  bandeira: string
  limite: number
  fechamento: number
  vencimento: number
  cor: string
  user_id: string
}

export interface Compra {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string
  metodo_pagamento: string
  cartao_id: string | null
  parcelada?: boolean
  total_parcelas?: number
}

export interface Parcela {
  id: string
  compra_id: string | null
  cartao_id: string | null
  descricao: string
  valor: number
  numero_parcela: number
  total_parcelas: number
  data_vencimento: string
  categoria: string
  paga: boolean
  data_pagamento: string | null
  user_id: string
}

export interface Fatura {
  mes: number
  ano: number
  mesNome: string
  dataFechamento: string
  dataVencimento: string
  compras: Compra[]
  parcelas: Parcela[]
  total: number
  paga: boolean
  dataPagamento: string | null
}

export interface TransacaoExtraida {
  descricao: string
  valor: number
  data: string
  categoria?: string
}

/** Props do componente CartoesEmpresaUI (estado + handlers do Content) */
export interface CartoesEmpresaUIProps {
  loading: boolean
  cartoes: Cartao[]
  faturasPorCartao: { [key: string]: Fatura[] }
  parcelasPorCartao: { [key: string]: Parcela[] }
  cartaoExpanded: string | null
  parcelasCartaoExpanded: string | null
  faturasExpandidas: { [key: string]: boolean }
  formData: {
    nome: string
    bandeira: string
    limite: string
    fechamento: string
    vencimento: string
    cor: string
  }
  parcelaFormData: {
    cartao_id: string
    descricao: string
    valor: string
    total_parcelas: string
    numero_parcela: string
    data_vencimento: string
    categoria: string
  }
  compraFormData: {
    cartao_id: string
    descricao: string
    valor: string
    data: string
    categoria: string
    metodo_pagamento: string
  }
  formDataCategoria: { nome: string; descricao: string; cor: string }
  showModal: boolean
  showParcelaModal: boolean
  showCompraModal: boolean
  showModalCategoria: boolean
  showPdfModal: boolean
  editingCartao: Cartao | null
  editingParcela: Parcela | null
  editingCompra: Compra | null
  pdfCartaoId: string | null
  transacoesExtraidas: TransacaoExtraida[]
  processandoPdf: boolean
  uploadingPdf: boolean
  mesReferencia: number
  anoReferencia: number
  categoriasDespesa: { id: string; nome: string }[]
  formatarMoeda: (value: number) => string
  formatDate: (date: string) => string
  formatarDataParaInput: (dataISO: string) => string
  aplicarMascaraData: (valor: string) => string
  calcularLimiteDisponivel: (cartaoId: string, limite: number) => number
  setFormData: Dispatch<SetStateAction<CartoesEmpresaUIProps['formData']>>
  setParcelaFormData: Dispatch<SetStateAction<CartoesEmpresaUIProps['parcelaFormData']>>
  setCompraFormData: Dispatch<SetStateAction<CartoesEmpresaUIProps['compraFormData']>>
  setFormDataCategoria: Dispatch<SetStateAction<CartoesEmpresaUIProps['formDataCategoria']>>
  setShowModal: (v: boolean) => void
  setShowParcelaModal: (v: boolean) => void
  setShowCompraModal: (v: boolean) => void
  setShowModalCategoria: (v: boolean) => void
  setShowPdfModal: (v: boolean) => void
  setEditingCartao: (c: Cartao | null) => void
  setEditingParcela: (p: Parcela | null) => void
  setEditingCompra: (c: Compra | null) => void
  setTransacoesExtraidas: (t: TransacaoExtraida[]) => void
  setMesReferencia: (n: number) => void
  setAnoReferencia: (n: number) => void
  toggleCartao: (cartaoId: string) => void
  toggleParcelasCartao: (cartaoId: string) => void
  toggleFatura: (cartaoId: string, faturaKey: string) => void
  handleSubmit: (e: FormEvent) => Promise<void>
  handleEdit: (cartao: Cartao) => void
  handleDelete: (id: string) => Promise<void>
  handleSubmitParcela: (e: FormEvent) => Promise<void>
  handleEditParcela: (parcela: Parcela) => void
  handleDeleteParcela: (parcelaId: string) => Promise<void>
  handleMarcarParcelaPaga: (parcelaId: string) => Promise<void>
  handleDesmarcarParcelaPaga: (parcelaId: string) => Promise<void>
  handleSubmitCompra: (e: FormEvent) => Promise<void>
  handleEditCompra: (compra: Compra) => void
  handleDeleteCompra: (compraId: string) => Promise<void>
  handleMarcarFaturaPaga: (cartaoId: string, mes: number, ano: number, total: number) => Promise<void>
  handleDesmarcarFaturaPaga: (cartaoId: string, mes: number, ano: number) => Promise<void>
  handleUploadPdf: (cartaoId: string) => void
  handleProcessarPdf: (file: File) => Promise<void>
  handleConfirmarTransacoes: () => Promise<void>
  handleEditarTransacao: (index: number, campo: keyof TransacaoExtraida, valor: string | number) => void
  handleRemoverTransacao: (index: number) => void
  handleCriarCategoria: (e: FormEvent) => Promise<void>
}
