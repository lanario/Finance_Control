-- Adicionar campo status nas tabelas contas_a_pagar e parcelas_contas_pagar
-- Status: 'pendente', 'aprovado', 'cancelado'
-- Aprovado = automaticamente marca como paga (paga = true)
-- Cancelado = não entra em nenhuma soma, apenas registro
-- Pendente = entra na soma de contas pendentes

-- Adicionar campo status em contas_a_pagar
ALTER TABLE contas_a_pagar
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado'));

-- Adicionar campo status em parcelas_contas_pagar
ALTER TABLE parcelas_contas_pagar
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_status ON contas_a_pagar(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_pagar_status ON parcelas_contas_pagar(status);

-- Atualizar registros existentes para ter status 'pendente' por padrão
UPDATE contas_a_pagar 
SET status = 'pendente' 
WHERE status IS NULL;

UPDATE parcelas_contas_pagar 
SET status = 'pendente' 
WHERE status IS NULL;

-- Trigger para quando status for 'aprovado', automaticamente marcar como paga
CREATE OR REPLACE FUNCTION atualizar_paga_quando_aprovado()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar triggers para contas_a_pagar
DROP TRIGGER IF EXISTS trigger_atualizar_paga_contas_pagar ON contas_a_pagar;
CREATE TRIGGER trigger_atualizar_paga_contas_pagar
  BEFORE UPDATE OF status ON contas_a_pagar
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_paga_quando_aprovado();

-- Criar triggers para parcelas_contas_pagar
DROP TRIGGER IF EXISTS trigger_atualizar_paga_parcelas_pagar ON parcelas_contas_pagar;
CREATE TRIGGER trigger_atualizar_paga_parcelas_pagar
  BEFORE UPDATE OF status ON parcelas_contas_pagar
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_paga_quando_aprovado();

-- Trigger também para INSERT (quando criar com status aprovado direto)
CREATE OR REPLACE FUNCTION atualizar_paga_ao_inserir_aprovado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    NEW.paga = true;
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento = CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inserir_paga_contas_pagar ON contas_a_pagar;
CREATE TRIGGER trigger_inserir_paga_contas_pagar
  BEFORE INSERT ON contas_a_pagar
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_paga_ao_inserir_aprovado();

DROP TRIGGER IF EXISTS trigger_inserir_paga_parcelas_pagar ON parcelas_contas_pagar;
CREATE TRIGGER trigger_inserir_paga_parcelas_pagar
  BEFORE INSERT ON parcelas_contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_paga_ao_inserir_aprovado();

