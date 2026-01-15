-- =====================================================
-- SCHEMA COMPLETO - FINANCEIRO EMPRESARIAL
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase Empresarial
-- Ordem de execução: todos os schemas estão na sequência correta
-- =====================================================

-- =====================================================
-- 001 - SCHEMA INICIAL
-- =====================================================

-- Tabela de categorias de despesas empresariais
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1', -- Cor padrão (roxo)
  tipo TEXT NOT NULL CHECK (tipo IN ('despesa', 'receita')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, nome, tipo)
);

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_user_id ON fornecedores(user_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo);

-- RLS (Row Level Security) Policies
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
DROP POLICY IF EXISTS "Users can view their own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can insert their own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can update their own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can delete their own categorias" ON categorias;

CREATE POLICY "Users can view their own categorias"
  ON categorias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categorias"
  ON categorias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categorias"
  ON categorias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categorias"
  ON categorias FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para fornecedores
DROP POLICY IF EXISTS "Users can view their own fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Users can insert their own fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Users can update their own fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Users can delete their own fornecedores" ON fornecedores;

CREATE POLICY "Users can view their own fornecedores"
  ON fornecedores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fornecedores"
  ON fornecedores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fornecedores"
  ON fornecedores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fornecedores"
  ON fornecedores FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para clientes
DROP POLICY IF EXISTS "Users can view their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can insert their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can update their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can delete their own clientes" ON clientes;

CREATE POLICY "Users can view their own clientes"
  ON clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clientes"
  ON clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes"
  ON clientes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes"
  ON clientes FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_categorias_updated_at ON categorias;
DROP TRIGGER IF EXISTS update_fornecedores_updated_at ON fornecedores;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 002 - CONTAS A PAGAR
-- =====================================================

-- Tabela de contas a pagar
CREATE TABLE IF NOT EXISTS contas_a_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  paga BOOLEAN DEFAULT false,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  observacoes TEXT,
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de parcelas de contas a pagar
CREATE TABLE IF NOT EXISTS parcelas_contas_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_pagar_id UUID NOT NULL REFERENCES contas_a_pagar(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  paga BOOLEAN DEFAULT false,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_user_id ON contas_a_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_fornecedor_id ON contas_a_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_categoria_id ON contas_a_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_data_vencimento ON contas_a_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_paga ON contas_a_pagar(paga);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_user_id ON parcelas_contas_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_conta_pagar_id ON parcelas_contas_pagar(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_data_vencimento ON parcelas_contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_paga ON parcelas_contas_pagar(paga);

-- RLS (Row Level Security) Policies
ALTER TABLE contas_a_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas para contas_a_pagar
DROP POLICY IF EXISTS "Users can view their own contas_a_pagar" ON contas_a_pagar;
DROP POLICY IF EXISTS "Users can insert their own contas_a_pagar" ON contas_a_pagar;
DROP POLICY IF EXISTS "Users can update their own contas_a_pagar" ON contas_a_pagar;
DROP POLICY IF EXISTS "Users can delete their own contas_a_pagar" ON contas_a_pagar;

CREATE POLICY "Users can view their own contas_a_pagar"
  ON contas_a_pagar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contas_a_pagar"
  ON contas_a_pagar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas_a_pagar"
  ON contas_a_pagar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas_a_pagar"
  ON contas_a_pagar FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para parcelas_contas_pagar
DROP POLICY IF EXISTS "Users can view their own parcelas_contas_pagar" ON parcelas_contas_pagar;
DROP POLICY IF EXISTS "Users can insert their own parcelas_contas_pagar" ON parcelas_contas_pagar;
DROP POLICY IF EXISTS "Users can update their own parcelas_contas_pagar" ON parcelas_contas_pagar;
DROP POLICY IF EXISTS "Users can delete their own parcelas_contas_pagar" ON parcelas_contas_pagar;

CREATE POLICY "Users can view their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_contas_pagar"
  ON parcelas_contas_pagar FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_contas_a_pagar_updated_at ON contas_a_pagar;
DROP TRIGGER IF EXISTS update_parcelas_contas_pagar_updated_at ON parcelas_contas_pagar;

CREATE TRIGGER update_contas_a_pagar_updated_at BEFORE UPDATE ON contas_a_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_contas_pagar_updated_at BEFORE UPDATE ON parcelas_contas_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 003 - CONTAS A RECEBER
-- =====================================================

-- Tabela de contas a receber
CREATE TABLE IF NOT EXISTS contas_a_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  recebida BOOLEAN DEFAULT false,
  forma_recebimento TEXT CHECK (forma_recebimento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  observacoes TEXT,
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de parcelas de contas a receber
CREATE TABLE IF NOT EXISTS parcelas_contas_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_receber_id UUID NOT NULL REFERENCES contas_a_receber(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  recebida BOOLEAN DEFAULT false,
  forma_recebimento TEXT CHECK (forma_recebimento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_user_id ON contas_a_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_cliente_id ON contas_a_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_categoria_id ON contas_a_receber(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_data_vencimento ON contas_a_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_recebida ON contas_a_receber(recebida);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_user_id ON parcelas_contas_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_conta_receber_id ON parcelas_contas_receber(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_data_vencimento ON parcelas_contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_recebida ON parcelas_contas_receber(recebida);

-- RLS (Row Level Security) Policies
ALTER TABLE contas_a_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_contas_receber ENABLE ROW LEVEL SECURITY;

-- Políticas para contas_a_receber
DROP POLICY IF EXISTS "Users can view their own contas_a_receber" ON contas_a_receber;
DROP POLICY IF EXISTS "Users can insert their own contas_a_receber" ON contas_a_receber;
DROP POLICY IF EXISTS "Users can update their own contas_a_receber" ON contas_a_receber;
DROP POLICY IF EXISTS "Users can delete their own contas_a_receber" ON contas_a_receber;

CREATE POLICY "Users can view their own contas_a_receber"
  ON contas_a_receber FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contas_a_receber"
  ON contas_a_receber FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contas_a_receber"
  ON contas_a_receber FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contas_a_receber"
  ON contas_a_receber FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para parcelas_contas_receber
DROP POLICY IF EXISTS "Users can view their own parcelas_contas_receber" ON parcelas_contas_receber;
DROP POLICY IF EXISTS "Users can insert their own parcelas_contas_receber" ON parcelas_contas_receber;
DROP POLICY IF EXISTS "Users can update their own parcelas_contas_receber" ON parcelas_contas_receber;
DROP POLICY IF EXISTS "Users can delete their own parcelas_contas_receber" ON parcelas_contas_receber;

CREATE POLICY "Users can view their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_contas_receber"
  ON parcelas_contas_receber FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_contas_a_receber_updated_at ON contas_a_receber;
DROP TRIGGER IF EXISTS update_parcelas_contas_receber_updated_at ON parcelas_contas_receber;

CREATE TRIGGER update_contas_a_receber_updated_at BEFORE UPDATE ON contas_a_receber
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_contas_receber_updated_at BEFORE UPDATE ON parcelas_contas_receber
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 004 - VENDAS
-- =====================================================

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  valor_desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) NOT NULL,
  data_venda DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito', 'parcelado')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'cancelada')),
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de parcelas de vendas
CREATE TABLE IF NOT EXISTS parcelas_vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  recebida BOOLEAN DEFAULT false,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_user_id ON vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_categoria_id ON vendas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_user_id ON parcelas_vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_venda_id ON parcelas_vendas(venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_data_vencimento ON parcelas_vendas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_recebida ON parcelas_vendas(recebida);

-- RLS (Row Level Security) Policies
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_vendas ENABLE ROW LEVEL SECURITY;

-- Políticas para vendas
DROP POLICY IF EXISTS "Users can view their own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can insert their own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can update their own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can delete their own vendas" ON vendas;

CREATE POLICY "Users can view their own vendas"
  ON vendas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendas"
  ON vendas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendas"
  ON vendas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendas"
  ON vendas FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para parcelas_vendas
DROP POLICY IF EXISTS "Users can view their own parcelas_vendas" ON parcelas_vendas;
DROP POLICY IF EXISTS "Users can insert their own parcelas_vendas" ON parcelas_vendas;
DROP POLICY IF EXISTS "Users can update their own parcelas_vendas" ON parcelas_vendas;
DROP POLICY IF EXISTS "Users can delete their own parcelas_vendas" ON parcelas_vendas;

CREATE POLICY "Users can view their own parcelas_vendas"
  ON parcelas_vendas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas_vendas"
  ON parcelas_vendas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_vendas"
  ON parcelas_vendas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_vendas"
  ON parcelas_vendas FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
DROP TRIGGER IF EXISTS update_parcelas_vendas_updated_at ON parcelas_vendas;

CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_vendas_updated_at BEFORE UPDATE ON parcelas_vendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 005 - FLUXO DE CAIXA
-- =====================================================

-- Tabela de fluxo de caixa (registro consolidado de entradas e saídas)
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  origem TEXT NOT NULL CHECK (origem IN ('conta_pagar', 'conta_receber', 'venda', 'outro')),
  origem_id UUID, -- ID da origem (conta_pagar_id, conta_receber_id, venda_id, etc)
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_movimentacao DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_user_id ON fluxo_caixa(user_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_origem ON fluxo_caixa(origem);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data_movimentacao ON fluxo_caixa(data_movimentacao);

-- RLS (Row Level Security) Policies
ALTER TABLE fluxo_caixa ENABLE ROW LEVEL SECURITY;

-- Políticas para fluxo_caixa
DROP POLICY IF EXISTS "Users can view their own fluxo_caixa" ON fluxo_caixa;
DROP POLICY IF EXISTS "Users can insert their own fluxo_caixa" ON fluxo_caixa;
DROP POLICY IF EXISTS "Users can update their own fluxo_caixa" ON fluxo_caixa;
DROP POLICY IF EXISTS "Users can delete their own fluxo_caixa" ON fluxo_caixa;

CREATE POLICY "Users can view their own fluxo_caixa"
  ON fluxo_caixa FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fluxo_caixa"
  ON fluxo_caixa FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fluxo_caixa"
  ON fluxo_caixa FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fluxo_caixa"
  ON fluxo_caixa FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_fluxo_caixa_updated_at ON fluxo_caixa;

CREATE TRIGGER update_fluxo_caixa_updated_at BEFORE UPDATE ON fluxo_caixa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 006 - PERFIS
-- =====================================================

-- Tabela de perfis de usuários (para empresa)
CREATE TABLE IF NOT EXISTS perfis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome TEXT,
  foto_url TEXT,
  empresa_nome TEXT,
  empresa_cnpj TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfis_user_id ON perfis(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis
DROP POLICY IF EXISTS "Users can view their own perfil" ON perfis;
DROP POLICY IF EXISTS "Users can insert their own perfil" ON perfis;
DROP POLICY IF EXISTS "Users can update their own perfil" ON perfis;
DROP POLICY IF EXISTS "Users can delete their own perfil" ON perfis;

CREATE POLICY "Users can view their own perfil"
  ON perfis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own perfil"
  ON perfis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own perfil"
  ON perfis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own perfil"
  ON perfis FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_perfis_updated_at ON perfis;

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campos faltantes na tabela perfis
ALTER TABLE perfis
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS logo_empresa_url TEXT;

-- =====================================================
-- 007 - ORÇAMENTOS
-- =====================================================

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'convertido')),
  valor_total DECIMAL(10, 2) DEFAULT 0,
  desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) DEFAULT 0,
  observacoes TEXT,
  condicoes_pagamento TEXT,
  prazo_entrega TEXT,
  -- Personalização do PDF
  cor_primaria TEXT DEFAULT '#6366f1',
  cor_secundaria TEXT DEFAULT '#8b5cf6',
  logo_url TEXT,
  cabecalho_personalizado TEXT,
  rodape_personalizado TEXT,
  -- Dados do cliente (snapshot no momento da criação)
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  cliente_endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de itens do orçamento
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_numero INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10, 3) DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  valor_unitario DECIMAL(10, 2) NOT NULL,
  desconto DECIMAL(10, 2) DEFAULT 0,
  valor_total DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(orcamento_id, item_numero)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_emissao ON orcamentos(data_emissao);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_user_id ON orcamento_itens(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para orcamentos
DROP POLICY IF EXISTS "Users can view their own orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Users can insert their own orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Users can update their own orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Users can delete their own orcamentos" ON orcamentos;

CREATE POLICY "Users can view their own orcamentos"
  ON orcamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orcamentos"
  ON orcamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orcamentos"
  ON orcamentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orcamentos"
  ON orcamentos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para orcamento_itens
DROP POLICY IF EXISTS "Users can view their own orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Users can insert their own orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Users can update their own orcamento_itens" ON orcamento_itens;
DROP POLICY IF EXISTS "Users can delete their own orcamento_itens" ON orcamento_itens;

CREATE POLICY "Users can view their own orcamento_itens"
  ON orcamento_itens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orcamento_itens"
  ON orcamento_itens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orcamento_itens"
  ON orcamento_itens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orcamento_itens"
  ON orcamento_itens FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_orcamentos_updated_at ON orcamentos;
DROP TRIGGER IF EXISTS update_orcamento_itens_updated_at ON orcamento_itens;

CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orcamento_itens_updated_at BEFORE UPDATE ON orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 008 - CONFIGURAÇÃO DO STORAGE - BUCKETS E POLÍTICAS
-- =====================================================
-- IMPORTANTE: Antes de executar este SQL, você precisa criar os buckets manualmente:
-- 1. Vá em Storage no dashboard do Supabase
-- 2. Clique em "New bucket"
-- 3. Crie os seguintes buckets:
--    - "Logo" (público: true) - Nome exato com L maiúsculo
--    - "avatars" (público: true)
-- 4. Depois execute este SQL para configurar as políticas
-- =====================================================

-- =====================================================
-- BUCKET: Logo
-- =====================================================
-- Usado para armazenar logos de empresas e templates de orçamento

-- Política para permitir leitura pública de logos (qualquer pessoa pode ler)
DROP POLICY IF EXISTS "Public Access for Logo" ON storage.objects;
CREATE POLICY "Public Access for Logo"
ON storage.objects FOR SELECT
USING (bucket_id = 'Logo');

-- Política para permitir upload de logos apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload Logo" ON storage.objects;
CREATE POLICY "Authenticated users can upload Logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir atualização de logos apenas para usuários autenticados
DROP POLICY IF EXISTS "Users can update their own Logo" ON storage.objects;
CREATE POLICY "Users can update their own Logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir exclusão de logos apenas para usuários autenticados
DROP POLICY IF EXISTS "Users can delete their own Logo" ON storage.objects;
CREATE POLICY "Users can delete their own Logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- BUCKET: avatars
-- =====================================================
-- Usado para armazenar fotos de perfil dos usuários

-- Política para permitir leitura pública de avatares (qualquer pessoa pode ler)
DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;
CREATE POLICY "Public Access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Política para permitir upload de avatares apenas para usuários autenticados
-- O path deve começar com o user_id do usuário autenticado
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Política para permitir atualização de avatares apenas pelo próprio usuário
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Política para permitir exclusão de avatares apenas pelo próprio usuário
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- =====================================================
-- FIM DO SCHEMA COMPLETO
-- =====================================================
-- 
-- RESUMO DAS TABELAS CRIADAS:
-- 1. categorias - Categorias de despesas e receitas
-- 2. fornecedores - Fornecedores da empresa
-- 3. clientes - Clientes da empresa
-- 4. contas_a_pagar - Contas a pagar
-- 5. parcelas_contas_pagar - Parcelas de contas a pagar
-- 6. contas_a_receber - Contas a receber
-- 7. parcelas_contas_receber - Parcelas de contas a receber
-- 8. vendas - Vendas realizadas
-- 9. parcelas_vendas - Parcelas de vendas
-- 10. fluxo_caixa - Fluxo de caixa consolidado
-- 11. perfis - Perfis de usuários (com campos: celular, endereco, logo_empresa_url)
-- 12. orcamentos - Orçamentos
-- 13. orcamento_itens - Itens dos orçamentos
--
-- STORAGE BUCKETS NECESSÁRIOS (criar manualmente):
-- - Logo (público: true) - Para logos de empresas e templates (nome exato com L maiúsculo)
-- - avatars (público: true) - Para fotos de perfil
--
-- =====================================================