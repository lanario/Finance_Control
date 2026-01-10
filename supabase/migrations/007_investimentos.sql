-- Migration: Criar tabela de investimentos
-- Created: 2025-01-XX

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
-- NOTA: Índice para data_proxima_liquidacao será criado após confirmar que a coluna existe
-- (Este índice será criado na migration 008)

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_investimentos_updated_at BEFORE UPDATE ON investimentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver seus próprios investimentos
CREATE POLICY "Users can view their own investments"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários só podem inserir seus próprios investimentos
CREATE POLICY "Users can insert their own investments"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários só podem atualizar seus próprios investimentos
CREATE POLICY "Users can update their own investments"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários só podem deletar seus próprios investimentos
CREATE POLICY "Users can delete their own investments"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);
