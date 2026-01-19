-- Adicionar campo status nas tabelas contas_a_receber e parcelas_contas_receber
-- Status: 'pendente', 'aprovado', 'cancelado'
-- Aprovado = automaticamente marca como recebida (recebida = true)
-- Cancelado = não entra em nenhuma soma, apenas registro
-- Pendente = entra na soma de contas pendentes

-- Adicionar campo status em contas_a_receber
ALTER TABLE contas_a_receber
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado'));

-- Adicionar campo status em parcelas_contas_receber
ALTER TABLE parcelas_contas_receber
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_a_receber_status ON contas_a_receber(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_contas_receber_status ON parcelas_contas_receber(status);

-- Atualizar registros existentes para ter status 'pendente' por padrão
UPDATE contas_a_receber 
SET status = 'pendente' 
WHERE status IS NULL;

UPDATE parcelas_contas_receber 
SET status = 'pendente' 
WHERE status IS NULL;

-- Atualizar registros que já estão recebidos para status 'aprovado'
UPDATE contas_a_receber 
SET status = 'aprovado' 
WHERE recebida = true AND status = 'pendente';

UPDATE parcelas_contas_receber 
SET status = 'aprovado' 
WHERE recebida = true AND status = 'pendente';

-- Trigger para quando status for 'aprovado', automaticamente marcar como recebida
CREATE OR REPLACE FUNCTION atualizar_recebida_quando_aprovado_receber()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar triggers para contas_a_receber
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_contas_receber ON contas_a_receber;
CREATE TRIGGER trigger_atualizar_recebida_contas_receber
  BEFORE UPDATE OF status ON contas_a_receber
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_receber();

-- Criar triggers para parcelas_contas_receber
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_parcelas_receber ON parcelas_contas_receber;
CREATE TRIGGER trigger_atualizar_recebida_parcelas_receber
  BEFORE UPDATE OF status ON parcelas_contas_receber
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_receber();

