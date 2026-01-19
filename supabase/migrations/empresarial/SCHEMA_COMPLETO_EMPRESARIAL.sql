-- =====================================================
-- SCHEMA COMPLETO - FINANCEIRO EMPRESARIAL
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase Empresarial
-- 
-- IMPORTANTE: Este schema está otimizado e atualizado com:
-- - Funções com search_path seguro (corrige vulnerabilidades)
-- - Status de orçamentos atualizados (concluido, em_processo, cancelado)
-- - Todas as tabelas, índices, RLS e triggers configurados
-- - Storage buckets e políticas configuradas
-- - Tabela de produtos com controle de estoque
--
-- ORDEM DE EXECUÇÃO: Execute este arquivo completo de uma vez
-- =====================================================

-- =====================================================
-- 001 - SCHEMA INICIAL (Categorias, Fornecedores, Clientes)
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
CREATE INDEX IF NOT EXISTS idx_categorias_ativo ON categorias(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_fornecedores_user_id ON fornecedores(user_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo) WHERE ativo = true;

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

-- Função para atualizar updated_at automaticamente (com search_path seguro)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

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
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
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
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_user_id ON contas_a_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_fornecedor_id ON contas_a_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_categoria_id ON contas_a_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_data_vencimento ON contas_a_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_paga ON contas_a_pagar(paga) WHERE paga = false;
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_status ON contas_a_pagar(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_user_id ON parcelas_contas_pagar(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_conta_pagar_id ON parcelas_contas_pagar(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_data_vencimento ON parcelas_contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_paga ON parcelas_contas_pagar(paga) WHERE paga = false;
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_status ON parcelas_contas_pagar(status);

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

-- Funções para atualizar paga quando status for aprovado
CREATE OR REPLACE FUNCTION atualizar_paga_quando_aprovado()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    NEW.paga = true;
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento = CURRENT_DATE;
    END IF;
  ELSIF NEW.status = 'cancelado' THEN
    NEW.paga = false;
    NEW.data_pagamento = NULL;
  ELSIF NEW.status = 'pendente' THEN
    -- Manter o estado atual de paga, mas não forçar
    -- Se já estava paga e mudou para pendente, manter paga = false
    IF OLD.paga = true AND NEW.status = 'pendente' AND OLD.status = 'aprovado' THEN
      NEW.paga = false;
      NEW.data_pagamento = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION atualizar_paga_ao_inserir_aprovado()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    NEW.paga = true;
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento = CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers para contas_a_pagar
DROP TRIGGER IF EXISTS trigger_atualizar_paga_contas_pagar ON contas_a_pagar;
CREATE TRIGGER trigger_atualizar_paga_contas_pagar
  BEFORE UPDATE OF status ON contas_a_pagar
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_paga_quando_aprovado();

DROP TRIGGER IF EXISTS trigger_inserir_paga_contas_pagar ON contas_a_pagar;
CREATE TRIGGER trigger_inserir_paga_contas_pagar
  BEFORE INSERT ON contas_a_pagar
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_paga_ao_inserir_aprovado();

-- Triggers para parcelas_contas_pagar
DROP TRIGGER IF EXISTS trigger_atualizar_paga_parcelas_pagar ON parcelas_contas_pagar;
CREATE TRIGGER trigger_atualizar_paga_parcelas_pagar
  BEFORE UPDATE OF status ON parcelas_contas_pagar
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_paga_quando_aprovado();

DROP TRIGGER IF EXISTS trigger_inserir_paga_parcelas_pagar ON parcelas_contas_pagar;
CREATE TRIGGER trigger_inserir_paga_parcelas_pagar
  BEFORE INSERT ON parcelas_contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_paga_ao_inserir_aprovado();

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
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
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
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Garantir que o campo status existe (para tabelas que já existiam)
DO $$
BEGIN
  -- Verificar e adicionar status em contas_a_receber se necessário
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contas_a_receber' AND column_name = 'status') THEN
    ALTER TABLE contas_a_receber ADD COLUMN status TEXT DEFAULT 'pendente';
    ALTER TABLE contas_a_receber ADD CONSTRAINT contas_a_receber_status_check CHECK (status IN ('pendente', 'aprovado', 'cancelado'));
    UPDATE contas_a_receber SET status = 'pendente' WHERE status IS NULL;
    -- Atualizar registros que já estão recebidos para status 'aprovado'
    UPDATE contas_a_receber SET status = 'aprovado' WHERE recebida = true AND status = 'pendente';
  END IF;

  -- Verificar e adicionar status em parcelas_contas_receber se necessário
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parcelas_contas_receber' AND column_name = 'status') THEN
    ALTER TABLE parcelas_contas_receber ADD COLUMN status TEXT DEFAULT 'pendente';
    ALTER TABLE parcelas_contas_receber ADD CONSTRAINT parcelas_contas_receber_status_check CHECK (status IN ('pendente', 'aprovado', 'cancelado'));
    UPDATE parcelas_contas_receber SET status = 'pendente' WHERE status IS NULL;
    -- Atualizar registros que já estão recebidos para status 'aprovado'
    UPDATE parcelas_contas_receber SET status = 'aprovado' WHERE recebida = true AND status = 'pendente';
  END IF;
END $$;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_user_id ON contas_a_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_cliente_id ON contas_a_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_categoria_id ON contas_a_receber(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_data_vencimento ON contas_a_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_recebida ON contas_a_receber(recebida) WHERE recebida = false;
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_status ON contas_a_receber(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_user_id ON parcelas_contas_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_conta_receber_id ON parcelas_contas_receber(conta_receber_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_data_vencimento ON parcelas_contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_recebida ON parcelas_contas_receber(recebida) WHERE recebida = false;
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_status ON parcelas_contas_receber(status);

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

-- Função para atualizar recebida quando status for aprovado em contas a receber
CREATE OR REPLACE FUNCTION atualizar_recebida_quando_aprovado_receber()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    NEW.recebida = true;
    IF NEW.data_recebimento IS NULL THEN
      NEW.data_recebimento = CURRENT_DATE;
    END IF;
  ELSIF NEW.status = 'cancelado' THEN
    NEW.recebida = false;
    NEW.data_recebimento = NULL;
  ELSIF NEW.status = 'pendente' THEN
    -- Manter o estado atual de recebida, mas não forçar
    -- Se já estava recebida e mudou para pendente, manter recebida = false
    IF OLD.recebida = true AND NEW.status = 'pendente' AND OLD.status = 'aprovado' THEN
      NEW.recebida = false;
      NEW.data_recebimento = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers para contas_a_receber
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_contas_receber ON contas_a_receber;
CREATE TRIGGER trigger_atualizar_recebida_contas_receber
  BEFORE UPDATE OF status ON contas_a_receber
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_receber();

-- Triggers para parcelas_contas_receber
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_parcelas_receber ON parcelas_contas_receber;
CREATE TRIGGER trigger_atualizar_recebida_parcelas_receber
  BEFORE UPDATE OF status ON parcelas_contas_receber
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_receber();

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
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
  parcelada BOOLEAN DEFAULT false,
  total_parcelas INTEGER DEFAULT 1,
  observacoes TEXT,
  tipo_venda TEXT DEFAULT 'servico' CHECK (tipo_venda IN ('servico', 'produto')),
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  preco_custo DECIMAL(10, 2) DEFAULT 0,
  margem_lucro DECIMAL(10, 2) DEFAULT 0,
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
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Garantir que o campo status existe (para tabelas que já existiam)
-- Atualizar constraint de status em vendas se necessário
DO $$
BEGIN
  -- Verificar e atualizar status em vendas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'status') THEN
    -- Se já existe, verificar se precisa atualizar a constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name LIKE '%vendas%status%' 
      AND check_clause NOT LIKE '%aprovado%'
    ) THEN
      ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;
      ALTER TABLE vendas ADD CONSTRAINT vendas_status_check CHECK (status IN ('pendente', 'aprovado', 'cancelado'));
      -- Atualizar valores antigos
      UPDATE vendas SET status = 'aprovado' WHERE status = 'paga';
      UPDATE vendas SET status = 'pendente' WHERE status IS NULL;
    END IF;
  ELSE
    -- Adicionar campo status se não existir
    ALTER TABLE vendas ADD COLUMN status TEXT DEFAULT 'pendente';
    ALTER TABLE vendas ADD CONSTRAINT vendas_status_check CHECK (status IN ('pendente', 'aprovado', 'cancelado'));
    UPDATE vendas SET status = 'pendente' WHERE status IS NULL;
  END IF;

  -- Verificar e adicionar status em parcelas_vendas se necessário
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parcelas_vendas' AND column_name = 'status') THEN
    ALTER TABLE parcelas_vendas ADD COLUMN status TEXT DEFAULT 'pendente';
    ALTER TABLE parcelas_vendas ADD CONSTRAINT parcelas_vendas_status_check CHECK (status IN ('pendente', 'aprovado', 'cancelado'));
    UPDATE parcelas_vendas SET status = 'pendente' WHERE status IS NULL;
  END IF;

  -- Verificar e adicionar campos de tipo_venda, produto_id, preco_custo e margem_lucro em vendas se necessário
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'tipo_venda') THEN
    ALTER TABLE vendas ADD COLUMN tipo_venda TEXT DEFAULT 'servico';
    ALTER TABLE vendas ADD CONSTRAINT vendas_tipo_venda_check CHECK (tipo_venda IN ('servico', 'produto'));
    UPDATE vendas SET tipo_venda = 'servico' WHERE tipo_venda IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'produto_id') THEN
    ALTER TABLE vendas ADD COLUMN produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'preco_custo') THEN
    ALTER TABLE vendas ADD COLUMN preco_custo DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'margem_lucro') THEN
    ALTER TABLE vendas ADD COLUMN margem_lucro DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_user_id ON vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_categoria_id ON vendas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_status_pendente ON vendas(status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_vendas_tipo_venda ON vendas(tipo_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_produto_id ON vendas(produto_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_user_id ON parcelas_vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_venda_id ON parcelas_vendas(venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_data_vencimento ON parcelas_vendas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_recebida ON parcelas_vendas(recebida) WHERE recebida = false;
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_status ON parcelas_vendas(status);

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

-- Função para calcular margem de lucro automaticamente
CREATE OR REPLACE FUNCTION calcular_margem_lucro()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calcular margem de lucro apenas para vendas de produtos
  IF NEW.tipo_venda = 'produto' AND NEW.preco_custo > 0 AND NEW.valor_final > 0 THEN
    NEW.margem_lucro = ((NEW.valor_final - NEW.preco_custo) / NEW.preco_custo) * 100;
  ELSE
    NEW.margem_lucro = 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para calcular margem de lucro automaticamente
DROP TRIGGER IF EXISTS trigger_calcular_margem_lucro_vendas ON vendas;
CREATE TRIGGER trigger_calcular_margem_lucro_vendas
  BEFORE INSERT OR UPDATE OF valor_final, preco_custo, tipo_venda ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION calcular_margem_lucro();

-- Função para atualizar recebida quando status for aprovado em parcelas de vendas
CREATE OR REPLACE FUNCTION atualizar_recebida_quando_aprovado_venda()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas para parcelas_vendas (vendas principais não têm campo recebida)
  IF TG_TABLE_NAME = 'parcelas_vendas' THEN
    IF NEW.status = 'aprovado' THEN
      NEW.recebida = true;
      IF NEW.data_recebimento IS NULL THEN
        NEW.data_recebimento = CURRENT_DATE;
      END IF;
    ELSIF NEW.status = 'cancelado' THEN
      NEW.recebida = false;
      NEW.data_recebimento = NULL;
    ELSIF NEW.status = 'pendente' THEN
      -- Se já estava recebida e mudou para pendente, manter recebida = false
      IF OLD.recebida = true AND NEW.status = 'pendente' AND OLD.status = 'aprovado' THEN
        NEW.recebida = false;
        NEW.data_recebimento = NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers para parcelas_vendas
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_parcelas_vendas ON parcelas_vendas;
CREATE TRIGGER trigger_atualizar_recebida_parcelas_vendas
  BEFORE UPDATE OF status ON parcelas_vendas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_venda();

-- =====================================================
-- 005 - COMPRAS
-- =====================================================

-- Tabela de compras empresariais
CREATE TABLE IF NOT EXISTS compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  valor_desconto DECIMAL(10, 2) DEFAULT 0,
  valor_final DECIMAL(10, 2) NOT NULL,
  data_compra DATE NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito', 'parcelado')),
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('finalizado', 'em_andamento', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_compras_user_id ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id ON compras(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_categoria_id ON compras(categoria_id);
CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(status);
CREATE INDEX IF NOT EXISTS idx_compras_data_compra ON compras(data_compra);
CREATE INDEX IF NOT EXISTS idx_compras_status_em_andamento ON compras(status) WHERE status = 'em_andamento';

-- RLS (Row Level Security) Policies
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Políticas para compras
DROP POLICY IF EXISTS "Users can view their own compras" ON compras;
DROP POLICY IF EXISTS "Users can insert their own compras" ON compras;
DROP POLICY IF EXISTS "Users can update their own compras" ON compras;
DROP POLICY IF EXISTS "Users can delete their own compras" ON compras;

CREATE POLICY "Users can view their own compras"
  ON compras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras"
  ON compras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras"
  ON compras FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras"
  ON compras FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_compras_updated_at ON compras;

CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 006 - FLUXO DE CAIXA
-- =====================================================

-- Tabela de fluxo de caixa (registro consolidado de entradas e saídas)
CREATE TABLE IF NOT EXISTS fluxo_caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  origem TEXT NOT NULL CHECK (origem IN ('conta_pagar', 'conta_receber', 'venda', 'compra', 'outro')),
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
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo_data ON fluxo_caixa(tipo, data_movimentacao);

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
-- 007 - PERFIS
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
  celular TEXT,
  endereco TEXT,
  logo_empresa_url TEXT,
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

-- =====================================================
-- 008 - ORÇAMENTOS
-- =====================================================

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  status TEXT DEFAULT 'em_processo' CHECK (status IN ('concluido', 'em_processo', 'cancelado')),
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
CREATE INDEX IF NOT EXISTS idx_orcamentos_status_em_processo ON orcamentos(status) WHERE status = 'em_processo';
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
-- 009 - PRODUTOS
-- =====================================================

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  codigo TEXT, -- Código do produto (SKU, código de barras, etc)
  descricao TEXT,
  valor_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un', -- un, kg, m, l, etc
  estoque DECIMAL(10, 3) DEFAULT 0, -- Quantidade em estoque
  estoque_minimo DECIMAL(10, 3) DEFAULT 0, -- Quantidade mínima para alerta
  imagem_url TEXT, -- URL da imagem do produto
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, codigo) -- Garante que o código seja único por usuário
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_estoque_baixo ON produtos(user_id, estoque, estoque_minimo) WHERE ativo = true AND estoque <= estoque_minimo;

-- RLS (Row Level Security) Policies
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Políticas para produtos
DROP POLICY IF EXISTS "Users can view their own produtos" ON produtos;
DROP POLICY IF EXISTS "Users can insert their own produtos" ON produtos;
DROP POLICY IF EXISTS "Users can update their own produtos" ON produtos;
DROP POLICY IF EXISTS "Users can delete their own produtos" ON produtos;

CREATE POLICY "Users can view their own produtos"
  ON produtos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own produtos"
  ON produtos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own produtos"
  ON produtos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own produtos"
  ON produtos FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 010 - CONTRATOS (RECEITAS FIXAS MENSais)
-- =====================================================

-- Tabela de contratos (receitas fixas mensais)
CREATE TABLE IF NOT EXISTS contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome_contrato TEXT NOT NULL,
  descricao TEXT,
  valor_mensal DECIMAL(10, 2) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE, -- NULL = contrato sem data de término
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31), -- Dia do mês em que vence
  forma_recebimento TEXT CHECK (forma_recebimento IN ('dinheiro', 'pix', 'transferencia', 'boleto', 'cheque', 'cartao_debito', 'cartao_credito')) DEFAULT 'pix',
  observacoes TEXT,
  detalhes_contrato TEXT, -- Detalhes adicionais do contrato
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear quais meses já foram gerados para cada contrato
CREATE TABLE IF NOT EXISTS contratos_receitas_geradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  conta_receber_id UUID REFERENCES contas_a_receber(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(contrato_id, ano, mes)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_ativo ON contratos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_contratos_receitas_geradas_contrato_id ON contratos_receitas_geradas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_receitas_geradas_ano_mes ON contratos_receitas_geradas(ano, mes);

-- RLS (Row Level Security) Policies
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_receitas_geradas ENABLE ROW LEVEL SECURITY;

-- Políticas para contratos
DROP POLICY IF EXISTS "Users can view their own contratos" ON contratos;
DROP POLICY IF EXISTS "Users can insert their own contratos" ON contratos;
DROP POLICY IF EXISTS "Users can update their own contratos" ON contratos;
DROP POLICY IF EXISTS "Users can delete their own contratos" ON contratos;

CREATE POLICY "Users can view their own contratos"
  ON contratos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contratos"
  ON contratos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contratos"
  ON contratos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contratos"
  ON contratos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para contratos_receitas_geradas
DROP POLICY IF EXISTS "Users can view their own contratos_receitas_geradas" ON contratos_receitas_geradas;
DROP POLICY IF EXISTS "Users can insert their own contratos_receitas_geradas" ON contratos_receitas_geradas;
DROP POLICY IF EXISTS "Users can update their own contratos_receitas_geradas" ON contratos_receitas_geradas;
DROP POLICY IF EXISTS "Users can delete their own contratos_receitas_geradas" ON contratos_receitas_geradas;

CREATE POLICY "Users can view their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR SELECT
  USING (EXISTS (SELECT 1 FROM contratos WHERE contratos.id = contratos_receitas_geradas.contrato_id AND contratos.user_id = auth.uid()));

CREATE POLICY "Users can insert their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM contratos WHERE contratos.id = contratos_receitas_geradas.contrato_id AND contratos.user_id = auth.uid()));

CREATE POLICY "Users can update their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR UPDATE
  USING (EXISTS (SELECT 1 FROM contratos WHERE contratos.id = contratos_receitas_geradas.contrato_id AND contratos.user_id = auth.uid()));

CREATE POLICY "Users can delete their own contratos_receitas_geradas"
  ON contratos_receitas_geradas FOR DELETE
  USING (EXISTS (SELECT 1 FROM contratos WHERE contratos.id = contratos_receitas_geradas.contrato_id AND contratos.user_id = auth.uid()));

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_contratos_updated_at ON contratos;

CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 011 - SERVIÇOS (PARA REUTILIZAÇÃO EM VENDAS)
-- =====================================================

-- Tabela de serviços (para reutilização em vendas)
CREATE TABLE IF NOT EXISTS servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  codigo TEXT, -- Código do serviço (SKU, código interno, etc)
  descricao TEXT,
  valor_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un', -- un, h (hora), d (dia), etc
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, codigo) -- Garante que o código seja único por usuário
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_servicos_user_id ON servicos(user_id);
CREATE INDEX IF NOT EXISTS idx_servicos_categoria_id ON servicos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_servicos_codigo ON servicos(codigo) WHERE codigo IS NOT NULL;

-- RLS (Row Level Security) Policies
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

-- Políticas para servicos
DROP POLICY IF EXISTS "Users can view their own servicos" ON servicos;
DROP POLICY IF EXISTS "Users can insert their own servicos" ON servicos;
DROP POLICY IF EXISTS "Users can update their own servicos" ON servicos;
DROP POLICY IF EXISTS "Users can delete their own servicos" ON servicos;

CREATE POLICY "Users can view their own servicos"
  ON servicos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own servicos"
  ON servicos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own servicos"
  ON servicos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own servicos"
  ON servicos FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_servicos_updated_at ON servicos;

CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campo servico_id na tabela vendas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'servico_id') THEN
    ALTER TABLE vendas ADD COLUMN servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_vendas_servico_id ON vendas(servico_id);
  END IF;
END $$;

-- =====================================================
-- 012 - CONFIGURAÇÃO DO STORAGE - BUCKETS E POLÍTICAS
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
-- 4. contas_a_pagar - Contas a pagar (status: pendente, aprovado, cancelado)
-- 5. parcelas_contas_pagar - Parcelas de contas a pagar (status: pendente, aprovado, cancelado)
-- 6. contas_a_receber - Contas a receber (status: pendente, aprovado, cancelado)
-- 7. parcelas_contas_receber - Parcelas de contas a receber (status: pendente, aprovado, cancelado)
-- 8. vendas - Vendas realizadas (status: pendente, aprovado, cancelado) - Suporta vendas por serviço e produto com cálculo automático de margem de lucro
-- 9. parcelas_vendas - Parcelas de vendas (status: pendente, aprovado, cancelado)
-- 10. compras - Compras empresariais (status: finalizado, em_andamento, cancelado)
-- 11. fluxo_caixa - Fluxo de caixa consolidado (origens: conta_pagar, conta_receber, venda, compra, outro)
-- 12. perfis - Perfis de usuários (com campos: celular, endereco, logo_empresa_url)
-- 13. orcamentos - Orçamentos (status: concluido, em_processo, cancelado)
-- 14. orcamento_itens - Itens dos orçamentos
-- 15. produtos - Produtos cadastrados (com controle de estoque)
-- 16. servicos - Serviços cadastrados (para reutilização em vendas)
-- 17. contratos - Contratos de receitas fixas mensais
-- 18. contratos_receitas_geradas - Rastreamento de receitas geradas a partir de contratos
--
-- FUNÇÕES:
-- - update_updated_at_column() - Atualiza updated_at automaticamente (com search_path seguro)
-- - atualizar_paga_quando_aprovado() - Atualiza paga quando status for aprovado (contas a pagar)
-- - atualizar_paga_ao_inserir_aprovado() - Atualiza paga ao inserir com status aprovado (contas a pagar)
-- - atualizar_recebida_quando_aprovado_receber() - Atualiza recebida quando status for aprovado (contas a receber)
-- - atualizar_recebida_quando_aprovado_venda() - Atualiza recebida quando status for aprovado (parcelas de vendas)
-- - calcular_margem_lucro() - Calcula margem de lucro automaticamente para vendas de produtos
--
-- STORAGE BUCKETS NECESSÁRIOS (criar manualmente):
-- - Logo (público: true) - Para logos de empresas e templates (nome exato com L maiúsculo)
-- - avatars (público: true) - Para fotos de perfil
--
-- OTIMIZAÇÕES APLICADAS:
-- - Função update_updated_at_column com search_path seguro (corrige vulnerabilidades)
-- - Índices parciais para melhor performance (WHERE clauses)
-- - Status de orçamentos atualizados (concluido, em_processo, cancelado)
-- - Status de contas a pagar/receber e vendas padronizados (pendente, aprovado, cancelado)
-- - Triggers automáticos para atualizar campos relacionados quando status muda
-- - Todos os campos de perfis incluídos na criação da tabela
-- - Índices compostos para consultas frequentes
-- - Fluxo de caixa atualizado para incluir compras como origem
-- - Tabela de produtos com controle de estoque e alertas de estoque mínimo
-- - Tabela de contratos para receitas fixas mensais com geração automática
--
-- =====================================================
