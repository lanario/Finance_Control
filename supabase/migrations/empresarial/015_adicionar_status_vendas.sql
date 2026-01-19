-- Adicionar campo status nas tabelas vendas e parcelas_vendas
-- Status: 'pendente', 'aprovado', 'cancelado'
-- Aprovado = automaticamente marca como paga (status = 'paga')
-- Cancelado = não entra em nenhuma soma, apenas registro
-- Pendente = entra na soma de vendas pendentes

-- Alterar status existente em vendas de 'paga' para 'aprovado'
UPDATE vendas 
SET status = 'aprovado' 
WHERE status = 'paga';

-- Alterar constraint de status em vendas
ALTER TABLE vendas
DROP CONSTRAINT IF EXISTS vendas_status_check;

ALTER TABLE vendas
ADD CONSTRAINT vendas_status_check CHECK (status IN ('pendente', 'aprovado', 'cancelado'));

-- Atualizar registros existentes para ter status 'pendente' por padrão se for NULL
UPDATE vendas 
SET status = 'pendente' 
WHERE status IS NULL;

-- Adicionar campo status em parcelas_vendas
ALTER TABLE parcelas_vendas
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vendas_status ON parcelas_vendas(status);

-- Atualizar registros existentes de parcelas_vendas para ter status 'pendente' por padrão
UPDATE parcelas_vendas 
SET status = 'pendente' 
WHERE status IS NULL;

-- Trigger para quando status for 'aprovado', automaticamente marcar como recebida nas parcelas
CREATE OR REPLACE FUNCTION atualizar_recebida_quando_aprovado_venda()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar triggers para vendas
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_vendas ON vendas;
CREATE TRIGGER trigger_atualizar_recebida_vendas
  BEFORE UPDATE OF status ON vendas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_venda();

-- Criar triggers para parcelas_vendas
DROP TRIGGER IF EXISTS trigger_atualizar_recebida_parcelas_vendas ON parcelas_vendas;
CREATE TRIGGER trigger_atualizar_recebida_parcelas_vendas
  BEFORE UPDATE OF status ON parcelas_vendas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION atualizar_recebida_quando_aprovado_venda();

