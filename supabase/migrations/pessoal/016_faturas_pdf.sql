-- Migration 016: Tabela para armazenar PDFs de faturas
-- ============================================

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
