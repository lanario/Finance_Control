-- =====================================================
-- SCHEMA COMPLETO - FINANCEIRO PESSOAL
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase Pessoal
-- 
-- IMPORTANTE: Este schema está otimizado e atualizado com:
-- - Funções com search_path seguro (corrige vulnerabilidades)
-- - Todas as tabelas, índices, RLS e triggers configurados
-- - Storage buckets e políticas configuradas
-- - Suporte completo a cartões, compras, parcelas, investimentos, sonhos
-- - Upload de PDFs de faturas
--
-- ORDEM DE EXECUÇÃO: Execute este arquivo completo de uma vez
-- =====================================================

-- =====================================================
-- 001 - SCHEMA INICIAL (Cartões e Compras)
-- =====================================================

-- Tabela de cartões de crédito
CREATE TABLE IF NOT EXISTS cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bandeira TEXT NOT NULL,
  limite DECIMAL(10, 2) NOT NULL,
  fechamento INTEGER NOT NULL CHECK (fechamento >= 1 AND fechamento <= 31),
  vencimento INTEGER NOT NULL CHECK (vencimento >= 1 AND vencimento <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de compras
CREATE TABLE IF NOT EXISTS compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT DEFAULT 'cartao',
  parcelada BOOLEAN DEFAULT FALSE,
  total_parcelas INTEGER CHECK (total_parcelas >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (metodo_pagamento IN ('cartao', 'pix', 'dinheiro', 'debito'))
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cartoes_user_id ON cartoes(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_user_id ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_cartao_id ON compras(cartao_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON compras(data);
CREATE INDEX IF NOT EXISTS idx_compras_categoria ON compras(categoria);
CREATE INDEX IF NOT EXISTS idx_compras_metodo_pagamento ON compras(metodo_pagamento);

-- RLS (Row Level Security) Policies
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Políticas para cartões
DROP POLICY IF EXISTS "Users can view their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can insert their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can update their own cartoes" ON cartoes;
DROP POLICY IF EXISTS "Users can delete their own cartoes" ON cartoes;

CREATE POLICY "Users can view their own cartoes"
  ON cartoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cartoes"
  ON cartoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cartoes"
  ON cartoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cartoes"
  ON cartoes FOR DELETE
  USING (auth.uid() = user_id);

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
DROP TRIGGER IF EXISTS update_cartoes_updated_at ON cartoes;
DROP TRIGGER IF EXISTS update_compras_updated_at ON compras;

CREATE TRIGGER update_cartoes_updated_at BEFORE UPDATE ON cartoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 002 - TIPOS DE GASTOS
-- =====================================================

-- Tabela de tipos de gastos personalizados
CREATE TABLE IF NOT EXISTS tipos_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, nome)
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_tipos_gastos_user_id ON tipos_gastos(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE tipos_gastos ENABLE ROW LEVEL SECURITY;

-- Políticas para tipos_gastos
DROP POLICY IF EXISTS "Users can view their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can insert their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can update their own tipos_gastos" ON tipos_gastos;
DROP POLICY IF EXISTS "Users can delete their own tipos_gastos" ON tipos_gastos;

CREATE POLICY "Users can view their own tipos_gastos"
  ON tipos_gastos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tipos_gastos"
  ON tipos_gastos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tipos_gastos"
  ON tipos_gastos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tipos_gastos"
  ON tipos_gastos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_tipos_gastos_updated_at ON tipos_gastos;

CREATE TRIGGER update_tipos_gastos_updated_at BEFORE UPDATE ON tipos_gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 003 - ADICIONAR PIX E OUTROS MÉTODOS DE PAGAMENTO
-- =====================================================

-- Atualizar registros existentes para ter método 'cartao'
UPDATE compras 
SET metodo_pagamento = 'cartao' 
WHERE metodo_pagamento IS NULL AND cartao_id IS NOT NULL;

-- =====================================================
-- 004 - RECEITAS
-- =====================================================

-- Tabela de receitas
CREATE TABLE IF NOT EXISTS receitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixa', 'extra')),
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_receitas_user_id ON receitas(user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
CREATE INDEX IF NOT EXISTS idx_receitas_mes_ano ON receitas(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_receitas_tipo ON receitas(tipo);

-- RLS (Row Level Security) Policies
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;

-- Políticas para receitas
DROP POLICY IF EXISTS "Users can view their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can insert their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can update their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can delete their own receitas" ON receitas;

CREATE POLICY "Users can view their own receitas"
  ON receitas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receitas"
  ON receitas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receitas"
  ON receitas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receitas"
  ON receitas FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_receitas_updated_at ON receitas;

CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON receitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 005 - MELHORIAS NOS CARTÕES (Cor e Faturas Pagas)
-- =====================================================

-- Adicionar campo cor aos cartões
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#1e3a5f';

-- Tabela para rastrear faturas pagas (fechamento antecipado)
CREATE TABLE IF NOT EXISTS faturas_pagas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  data_pagamento DATE NOT NULL,
  total_pago DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cartao_id, mes_referencia, ano_referencia)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_cartao_id ON faturas_pagas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_user_id ON faturas_pagas(user_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_data ON faturas_pagas(data_pagamento);

-- RLS (Row Level Security) Policies
ALTER TABLE faturas_pagas ENABLE ROW LEVEL SECURITY;

-- Políticas para faturas_pagas
DROP POLICY IF EXISTS "Users can view their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can insert their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can update their own faturas_pagas" ON faturas_pagas;
DROP POLICY IF EXISTS "Users can delete their own faturas_pagas" ON faturas_pagas;

CREATE POLICY "Users can view their own faturas_pagas"
  ON faturas_pagas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own faturas_pagas"
  ON faturas_pagas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own faturas_pagas"
  ON faturas_pagas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own faturas_pagas"
  ON faturas_pagas FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 006 - PARCELAS
-- =====================================================

-- Tabela de parcelas de compras parceladas
CREATE TABLE IF NOT EXISTS parcelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  numero_parcela INTEGER NOT NULL CHECK (numero_parcela >= 1),
  total_parcelas INTEGER NOT NULL CHECK (total_parcelas >= 1),
  data_vencimento DATE NOT NULL,
  categoria TEXT NOT NULL,
  paga BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (numero_parcela <= total_parcelas)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id ON parcelas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_compra_id ON parcelas(compra_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_id ON parcelas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_paga ON parcelas(paga);

-- RLS (Row Level Security) Policies
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

-- Políticas para parcelas
DROP POLICY IF EXISTS "Users can view their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can insert their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can update their own parcelas" ON parcelas;
DROP POLICY IF EXISTS "Users can delete their own parcelas" ON parcelas;

CREATE POLICY "Users can view their own parcelas"
  ON parcelas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parcelas"
  ON parcelas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas"
  ON parcelas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas"
  ON parcelas FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_parcelas_updated_at ON parcelas;

CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 007 - INVESTIMENTOS
-- =====================================================

-- Tabela de investimentos
CREATE TABLE IF NOT EXISTS investimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- Ex: Ações, FIIs, Tesouro Direto, CDB, etc.
  valor_investido DECIMAL(10, 2) NOT NULL,
  valor_atual DECIMAL(10, 2) NOT NULL,
  data_aquisicao DATE NOT NULL,
  quantidade DECIMAL(10, 4) DEFAULT 1,
  cotacao_aquisicao DECIMAL(10, 4),
  cotacao_atual DECIMAL(10, 4),
  -- Configurações para investimentos com rendimento fixo (CDB, LCI/LCA, etc.)
  taxa_juros DECIMAL(5, 2), -- Taxa de juros anual (ex: 12.5 para 12.5%)
  periodicidade TEXT, -- Quando o rendimento é liquidado (mensal, semestral, anual)
  data_proxima_liquidacao DATE, -- Data da próxima liquidação de rendimento
  liquidar_em_receitas BOOLEAN DEFAULT TRUE, -- Se o rendimento deve ser adicionado automaticamente às receitas
  -- Configurações para ações e FIIs (dividend yield)
  dividend_yield DECIMAL(5, 2), -- Dividend Yield anual esperado em % (ex: 8.5 para 8.5% a.a.)
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (valor_investido >= 0),
  CHECK (valor_atual >= 0),
  CHECK (quantidade >= 0),
  CHECK (taxa_juros IS NULL OR taxa_juros >= 0),
  CHECK (periodicidade IS NULL OR periodicidade IN ('mensal', 'semestral', 'anual')),
  CHECK (dividend_yield IS NULL OR dividend_yield >= 0)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_data_aquisicao ON investimentos(data_aquisicao);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_investimentos_data_proxima_liquidacao ON investimentos(data_proxima_liquidacao)
WHERE data_proxima_liquidacao IS NOT NULL;

-- RLS (Row Level Security)
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver seus próprios investimentos
DROP POLICY IF EXISTS "Users can view their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can insert their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can update their own investments" ON investimentos;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investimentos;

CREATE POLICY "Users can view their own investments"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_investimentos_updated_at ON investimentos;

CREATE TRIGGER update_investimentos_updated_at BEFORE UPDATE ON investimentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 011 - DESPESAS FIXAS
-- =====================================================

-- Tabela de despesas fixas (recorrentes mensais)
CREATE TABLE IF NOT EXISTS despesas_fixas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT NOT NULL DEFAULT 'cartao',
  cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear quais despesas fixas já foram criadas em cada mês
CREATE TABLE IF NOT EXISTS despesas_fixas_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despesa_fixa_id UUID NOT NULL REFERENCES despesas_fixas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(despesa_fixa_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_user_id ON despesas_fixas(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_ativa ON despesas_fixas(ativa);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_mensais_despesa_fixa_id ON despesas_fixas_mensais(despesa_fixa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_mensais_user_id ON despesas_fixas_mensais(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_mensais_mes_ano ON despesas_fixas_mensais(mes, ano);

-- RLS (Row Level Security) Policies
ALTER TABLE despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas_fixas_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas para despesas_fixas
DROP POLICY IF EXISTS "Users can view their own despesas_fixas" ON despesas_fixas;
DROP POLICY IF EXISTS "Users can insert their own despesas_fixas" ON despesas_fixas;
DROP POLICY IF EXISTS "Users can update their own despesas_fixas" ON despesas_fixas;
DROP POLICY IF EXISTS "Users can delete their own despesas_fixas" ON despesas_fixas;

CREATE POLICY "Users can view their own despesas_fixas"
  ON despesas_fixas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas_fixas"
  ON despesas_fixas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas_fixas"
  ON despesas_fixas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas_fixas"
  ON despesas_fixas FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para despesas_fixas_mensais
DROP POLICY IF EXISTS "Users can view their own despesas_fixas_mensais" ON despesas_fixas_mensais;
DROP POLICY IF EXISTS "Users can insert their own despesas_fixas_mensais" ON despesas_fixas_mensais;
DROP POLICY IF EXISTS "Users can update their own despesas_fixas_mensais" ON despesas_fixas_mensais;
DROP POLICY IF EXISTS "Users can delete their own despesas_fixas_mensais" ON despesas_fixas_mensais;

CREATE POLICY "Users can view their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas_fixas_mensais"
  ON despesas_fixas_mensais FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_despesas_fixas_updated_at ON despesas_fixas;

CREATE TRIGGER update_despesas_fixas_updated_at BEFORE UPDATE ON despesas_fixas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 012 - PERFIS
-- =====================================================

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS perfis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfis_user_id ON perfis(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis
DROP POLICY IF EXISTS "Users can view their own perfis" ON perfis;
DROP POLICY IF EXISTS "Users can insert their own perfis" ON perfis;
DROP POLICY IF EXISTS "Users can update their own perfis" ON perfis;
DROP POLICY IF EXISTS "Users can delete their own perfis" ON perfis;

CREATE POLICY "Users can view their own perfis"
  ON perfis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own perfis"
  ON perfis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own perfis"
  ON perfis FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own perfis"
  ON perfis FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_perfis_updated_at ON perfis;

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 013 - COMPRAS RECORRENTES
-- =====================================================

-- Tabela de compras recorrentes (recorrentes mensais)
CREATE TABLE IF NOT EXISTS compras_recorrentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT NOT NULL DEFAULT 'cartao' CHECK (metodo_pagamento IN ('cartao', 'pix', 'dinheiro', 'debito')),
  cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
  dia_compra INTEGER NOT NULL CHECK (dia_compra >= 1 AND dia_compra <= 31),
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear quais compras recorrentes já foram criadas em cada mês
CREATE TABLE IF NOT EXISTS compras_recorrentes_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  compra_recorrente_id UUID NOT NULL REFERENCES compras_recorrentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(compra_recorrente_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_user_id ON compras_recorrentes(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_ativa ON compras_recorrentes(ativa) WHERE ativa = TRUE;
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_user_ativa ON compras_recorrentes(user_id, ativa) WHERE ativa = TRUE;
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_compra_recorrente_id ON compras_recorrentes_mensais(compra_recorrente_id);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_user_id ON compras_recorrentes_mensais(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_mes_ano ON compras_recorrentes_mensais(mes, ano);
CREATE INDEX IF NOT EXISTS idx_compras_recorrentes_mensais_user_mes_ano ON compras_recorrentes_mensais(user_id, ano, mes);

-- RLS (Row Level Security) Policies
ALTER TABLE compras_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_recorrentes_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas para compras_recorrentes
DROP POLICY IF EXISTS "Users can view their own compras_recorrentes" ON compras_recorrentes;
DROP POLICY IF EXISTS "Users can insert their own compras_recorrentes" ON compras_recorrentes;
DROP POLICY IF EXISTS "Users can update their own compras_recorrentes" ON compras_recorrentes;
DROP POLICY IF EXISTS "Users can delete their own compras_recorrentes" ON compras_recorrentes;

CREATE POLICY "Users can view their own compras_recorrentes"
  ON compras_recorrentes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras_recorrentes"
  ON compras_recorrentes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras_recorrentes"
  ON compras_recorrentes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras_recorrentes"
  ON compras_recorrentes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para compras_recorrentes_mensais
DROP POLICY IF EXISTS "Users can view their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;
DROP POLICY IF EXISTS "Users can insert their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;
DROP POLICY IF EXISTS "Users can update their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;
DROP POLICY IF EXISTS "Users can delete their own compras_recorrentes_mensais" ON compras_recorrentes_mensais;

CREATE POLICY "Users can view their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras_recorrentes_mensais"
  ON compras_recorrentes_mensais FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_compras_recorrentes_updated_at ON compras_recorrentes;

CREATE TRIGGER update_compras_recorrentes_updated_at BEFORE UPDATE ON compras_recorrentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 014 - SONHOS (METAS FUTURAS)
-- =====================================================

-- Tabela de sonhos
CREATE TABLE IF NOT EXISTS sonhos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_objetivo DECIMAL(10, 2) NOT NULL CHECK (valor_objetivo > 0),
  valor_atual DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (valor_atual >= 0),
  data_objetivo DATE,
  valor_mensal DECIMAL(10, 2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela para rastrear depósitos mensais nos sonhos
CREATE TABLE IF NOT EXISTS sonhos_depositos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sonho_id UUID NOT NULL REFERENCES sonhos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(sonho_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sonhos_user_id ON sonhos(user_id);
CREATE INDEX IF NOT EXISTS idx_sonhos_ativo ON sonhos(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_sonhos_user_ativo ON sonhos(user_id, ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_sonho_id ON sonhos_depositos(sonho_id);
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_user_id ON sonhos_depositos(user_id);
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_mes_ano ON sonhos_depositos(mes, ano);
CREATE INDEX IF NOT EXISTS idx_sonhos_depositos_user_mes_ano ON sonhos_depositos(user_id, ano, mes);

-- RLS (Row Level Security) Policies
ALTER TABLE sonhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonhos_depositos ENABLE ROW LEVEL SECURITY;

-- Políticas para sonhos
DROP POLICY IF EXISTS "Users can view their own sonhos" ON sonhos;
DROP POLICY IF EXISTS "Users can insert their own sonhos" ON sonhos;
DROP POLICY IF EXISTS "Users can update their own sonhos" ON sonhos;
DROP POLICY IF EXISTS "Users can delete their own sonhos" ON sonhos;

CREATE POLICY "Users can view their own sonhos"
  ON sonhos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sonhos"
  ON sonhos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sonhos"
  ON sonhos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sonhos"
  ON sonhos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para sonhos_depositos
DROP POLICY IF EXISTS "Users can view their own sonhos_depositos" ON sonhos_depositos;
DROP POLICY IF EXISTS "Users can insert their own sonhos_depositos" ON sonhos_depositos;
DROP POLICY IF EXISTS "Users can update their own sonhos_depositos" ON sonhos_depositos;
DROP POLICY IF EXISTS "Users can delete their own sonhos_depositos" ON sonhos_depositos;

CREATE POLICY "Users can view their own sonhos_depositos"
  ON sonhos_depositos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sonhos_depositos"
  ON sonhos_depositos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sonhos_depositos"
  ON sonhos_depositos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sonhos_depositos"
  ON sonhos_depositos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_sonhos_updated_at ON sonhos;

CREATE TRIGGER update_sonhos_updated_at BEFORE UPDATE ON sonhos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar valor_atual quando houver depósito (com search_path seguro)
CREATE OR REPLACE FUNCTION atualizar_valor_atual_sonho()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sonho_id_uuid UUID;
BEGIN
  -- Determinar o sonho_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    sonho_id_uuid := OLD.sonho_id;
  ELSE
    sonho_id_uuid := NEW.sonho_id;
  END IF;

  -- Atualizar o valor_atual do sonho
  UPDATE sonhos
  SET valor_atual = (
    SELECT COALESCE(SUM(valor), 0)
    FROM sonhos_depositos
    WHERE sonho_id = sonho_id_uuid
  )
  WHERE id = sonho_id_uuid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para atualizar valor_atual quando inserir/atualizar/deletar depósito
DROP TRIGGER IF EXISTS trigger_atualizar_valor_atual_sonho ON sonhos_depositos;

CREATE TRIGGER trigger_atualizar_valor_atual_sonho
  AFTER INSERT OR UPDATE OR DELETE ON sonhos_depositos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_atual_sonho();

-- =====================================================
-- 016 - FATURAS PDF
-- =====================================================

-- Tabela para armazenar referências aos PDFs de faturas
CREATE TABLE IF NOT EXISTS faturas_pdf (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  pdf_url TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  total_extracao DECIMAL(10, 2),
  quantidade_transacoes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cartao_id, mes_referencia, ano_referencia)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_faturas_pdf_cartao_id ON faturas_pdf(cartao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pdf_user_id ON faturas_pdf(user_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pdf_mes_ano ON faturas_pdf(mes_referencia, ano_referencia);

-- RLS (Row Level Security) Policies
ALTER TABLE faturas_pdf ENABLE ROW LEVEL SECURITY;

-- Políticas para faturas_pdf
DROP POLICY IF EXISTS "Users can view their own faturas_pdf" ON faturas_pdf;
DROP POLICY IF EXISTS "Users can insert their own faturas_pdf" ON faturas_pdf;
DROP POLICY IF EXISTS "Users can update their own faturas_pdf" ON faturas_pdf;
DROP POLICY IF EXISTS "Users can delete their own faturas_pdf" ON faturas_pdf;

CREATE POLICY "Users can view their own faturas_pdf"
  ON faturas_pdf FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own faturas_pdf"
  ON faturas_pdf FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own faturas_pdf"
  ON faturas_pdf FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own faturas_pdf"
  ON faturas_pdf FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_faturas_pdf_updated_at ON faturas_pdf;

CREATE TRIGGER update_faturas_pdf_updated_at BEFORE UPDATE ON faturas_pdf
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 017 - CONFIGURAÇÃO DO STORAGE - BUCKETS E POLÍTICAS
-- =====================================================
-- IMPORTANTE: Antes de executar este SQL, você precisa criar os buckets manualmente:
-- 1. Vá em Storage no dashboard do Supabase
-- 2. Clique em "New bucket"
-- 3. Crie os seguintes buckets:
--    - "avatars" (para fotos de perfil)
--    - "faturas-pdf" (para PDFs de faturas)
-- 4. Configure os buckets como PRIVADOS (public: false) para segurança
-- =====================================================

-- Políticas para o bucket avatars
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
CREATE POLICY "Users can view their own avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Políticas para o bucket faturas-pdf
DROP POLICY IF EXISTS "Users can view their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can view their own faturas-pdf"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'faturas-pdf' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can upload their own faturas-pdf"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'faturas-pdf' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can update their own faturas-pdf"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'faturas-pdf' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own faturas-pdf" ON storage.objects;
CREATE POLICY "Users can delete their own faturas-pdf"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'faturas-pdf' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- 018 - MESES PAGOS
-- =====================================================

-- Tabela para rastrear quais meses/anos de despesas foram pagos
CREATE TABLE IF NOT EXISTS meses_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  paga BOOLEAN NOT NULL DEFAULT true,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, mes, ano)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meses_pagos_user_id ON meses_pagos(user_id);
CREATE INDEX IF NOT EXISTS idx_meses_pagos_mes_ano ON meses_pagos(mes, ano);
CREATE INDEX IF NOT EXISTS idx_meses_pagos_user_mes_ano ON meses_pagos(user_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_meses_pagos_paga ON meses_pagos(paga) WHERE paga = TRUE;

-- RLS (Row Level Security) Policies
ALTER TABLE meses_pagos ENABLE ROW LEVEL SECURITY;

-- Políticas para meses_pagos
DROP POLICY IF EXISTS "Users can view their own meses_pagos" ON meses_pagos;
DROP POLICY IF EXISTS "Users can insert their own meses_pagos" ON meses_pagos;
DROP POLICY IF EXISTS "Users can update their own meses_pagos" ON meses_pagos;
DROP POLICY IF EXISTS "Users can delete their own meses_pagos" ON meses_pagos;

CREATE POLICY "Users can view their own meses_pagos"
  ON meses_pagos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meses_pagos"
  ON meses_pagos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meses_pagos"
  ON meses_pagos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meses_pagos"
  ON meses_pagos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_meses_pagos_updated_at ON meses_pagos;
CREATE TRIGGER update_meses_pagos_updated_at BEFORE UPDATE ON meses_pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RESUMO DO SCHEMA
-- =====================================================
-- 
-- TABELAS CRIADAS:
-- 1. cartoes - Cartões de crédito
-- 2. compras - Compras e despesas
-- 3. tipos_gastos - Categorias personalizadas de gastos
-- 4. receitas - Receitas (fixas e extras)
-- 5. faturas_pagas - Controle de faturas pagas antecipadamente
-- 6. parcelas - Parcelas de compras parceladas
-- 7. investimentos - Investimentos diversos
-- 8. despesas_fixas - Despesas recorrentes mensais
-- 9. despesas_fixas_mensais - Rastreamento de despesas fixas criadas
-- 10. perfis - Perfis de usuário
-- 11. compras_recorrentes - Compras recorrentes mensais
-- 12. compras_recorrentes_mensais - Rastreamento de compras recorrentes criadas
-- 13. sonhos - Metas futuras (sonhos)
-- 14. sonhos_depositos - Depósitos mensais nos sonhos
-- 15. faturas_pdf - Referências aos PDFs de faturas
-- 16. meses_pagos - Rastreamento de meses de despesas pagos
--
-- FUNÇÕES:
-- 1. update_updated_at_column() - Atualiza updated_at automaticamente
-- 2. atualizar_valor_atual_sonho() - Atualiza valor_atual dos sonhos
--
-- STORAGE BUCKETS NECESSÁRIOS (criar manualmente):
-- 1. avatars - Para fotos de perfil
-- 2. faturas-pdf - Para PDFs de faturas
--
-- =====================================================
