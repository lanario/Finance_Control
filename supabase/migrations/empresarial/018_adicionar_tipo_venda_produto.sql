-- Adicionar campos para diferenciar vendas por serviço e por produto
-- e calcular margem de lucro automaticamente

-- Adicionar campos na tabela vendas
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS tipo_venda TEXT DEFAULT 'servico' CHECK (tipo_venda IN ('servico', 'produto'));

ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL;

ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(10, 2) DEFAULT 0;

-- Criar função para calcular margem de lucro automaticamente
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

-- Atualizar registros existentes para ter tipo_venda = 'servico' por padrão
UPDATE vendas SET tipo_venda = 'servico' WHERE tipo_venda IS NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendas_tipo_venda ON vendas(tipo_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_produto_id ON vendas(produto_id);

