-- Cartões de crédito empresarial (mesma lógica do finance pessoal)
-- Tabelas: cartoes_empresa, compras_cartao_empresa, parcelas_cartao_empresa, faturas_pagas_cartao_empresa

-- Cartões de crédito da empresa
CREATE TABLE IF NOT EXISTS cartoes_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bandeira TEXT NOT NULL,
  limite DECIMAL(10, 2) NOT NULL,
  fechamento INTEGER NOT NULL CHECK (fechamento >= 1 AND fechamento <= 31),
  vencimento INTEGER NOT NULL CHECK (vencimento >= 1 AND vencimento <= 31),
  cor TEXT DEFAULT '#1e3a5f',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Compras no cartão (evita conflito com tabela compras de fornecedores)
CREATE TABLE IF NOT EXISTS compras_cartao_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_empresa(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL,
  metodo_pagamento TEXT DEFAULT 'cartao',
  parcelada BOOLEAN DEFAULT FALSE,
  total_parcelas INTEGER CHECK (total_parcelas IS NULL OR total_parcelas >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Parcelas (compras parceladas ou parcelas avulsas)
CREATE TABLE IF NOT EXISTS parcelas_cartao_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compra_id UUID REFERENCES compras_cartao_empresa(id) ON DELETE CASCADE,
  cartao_id UUID REFERENCES cartoes_empresa(id) ON DELETE CASCADE,
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

-- Faturas pagas (controle de fechamento)
CREATE TABLE IF NOT EXISTS faturas_pagas_cartao_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes_empresa(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
  ano_referencia INTEGER NOT NULL,
  data_pagamento DATE NOT NULL,
  total_pago DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(cartao_id, mes_referencia, ano_referencia)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cartoes_empresa_user_id ON cartoes_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_cartao_empresa_user_id ON compras_cartao_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_cartao_empresa_cartao_id ON compras_cartao_empresa(cartao_id);
CREATE INDEX IF NOT EXISTS idx_compras_cartao_empresa_data ON compras_cartao_empresa(data);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_empresa_user_id ON parcelas_cartao_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_empresa_cartao_id ON parcelas_cartao_empresa(cartao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_empresa_compra_id ON parcelas_cartao_empresa(compra_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_empresa_data_vencimento ON parcelas_cartao_empresa(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_cartao_empresa_cartao_id ON faturas_pagas_cartao_empresa(cartao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_pagas_cartao_empresa_user_id ON faturas_pagas_cartao_empresa(user_id);

-- RLS
ALTER TABLE cartoes_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_cartao_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_cartao_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas_pagas_cartao_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cartoes_empresa" ON cartoes_empresa;
DROP POLICY IF EXISTS "Users can insert their own cartoes_empresa" ON cartoes_empresa;
DROP POLICY IF EXISTS "Users can update their own cartoes_empresa" ON cartoes_empresa;
DROP POLICY IF EXISTS "Users can delete their own cartoes_empresa" ON cartoes_empresa;
CREATE POLICY "Users can view their own cartoes_empresa" ON cartoes_empresa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cartoes_empresa" ON cartoes_empresa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cartoes_empresa" ON cartoes_empresa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cartoes_empresa" ON cartoes_empresa FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own compras_cartao_empresa" ON compras_cartao_empresa;
DROP POLICY IF EXISTS "Users can insert their own compras_cartao_empresa" ON compras_cartao_empresa;
DROP POLICY IF EXISTS "Users can update their own compras_cartao_empresa" ON compras_cartao_empresa;
DROP POLICY IF EXISTS "Users can delete their own compras_cartao_empresa" ON compras_cartao_empresa;
CREATE POLICY "Users can view their own compras_cartao_empresa" ON compras_cartao_empresa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own compras_cartao_empresa" ON compras_cartao_empresa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own compras_cartao_empresa" ON compras_cartao_empresa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own compras_cartao_empresa" ON compras_cartao_empresa FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own parcelas_cartao_empresa" ON parcelas_cartao_empresa;
DROP POLICY IF EXISTS "Users can insert their own parcelas_cartao_empresa" ON parcelas_cartao_empresa;
DROP POLICY IF EXISTS "Users can update their own parcelas_cartao_empresa" ON parcelas_cartao_empresa;
DROP POLICY IF EXISTS "Users can delete their own parcelas_cartao_empresa" ON parcelas_cartao_empresa;
CREATE POLICY "Users can view their own parcelas_cartao_empresa" ON parcelas_cartao_empresa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own parcelas_cartao_empresa" ON parcelas_cartao_empresa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own parcelas_cartao_empresa" ON parcelas_cartao_empresa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own parcelas_cartao_empresa" ON parcelas_cartao_empresa FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa;
DROP POLICY IF EXISTS "Users can insert their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa;
DROP POLICY IF EXISTS "Users can update their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa;
DROP POLICY IF EXISTS "Users can delete their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa;
CREATE POLICY "Users can view their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own faturas_pagas_cartao_empresa" ON faturas_pagas_cartao_empresa FOR DELETE USING (auth.uid() = user_id);

-- Triggers updated_at
DROP TRIGGER IF EXISTS update_cartoes_empresa_updated_at ON cartoes_empresa;
DROP TRIGGER IF EXISTS update_compras_cartao_empresa_updated_at ON compras_cartao_empresa;
DROP TRIGGER IF EXISTS update_parcelas_cartao_empresa_updated_at ON parcelas_cartao_empresa;
CREATE TRIGGER update_cartoes_empresa_updated_at BEFORE UPDATE ON cartoes_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compras_cartao_empresa_updated_at BEFORE UPDATE ON compras_cartao_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parcelas_cartao_empresa_updated_at BEFORE UPDATE ON parcelas_cartao_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
