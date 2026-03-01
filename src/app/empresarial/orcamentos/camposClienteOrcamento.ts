/** Chaves dos campos do cliente exibidos no orçamento (preview, visualização e PDF) */
export type CampoClienteOrcamento =
  | 'nome'
  | 'razao_social'
  | 'cpf'
  | 'cnpj'
  | 'email'
  | 'telefone'
  | 'endereco'

export const CAMPOS_CLIENTE_PADRAO: Record<CampoClienteOrcamento, boolean> = {
  nome: true,
  razao_social: true,
  cpf: true,
  cnpj: true,
  email: true,
  telefone: true,
  endereco: true,
}
