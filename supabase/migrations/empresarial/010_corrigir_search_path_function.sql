-- ============================================================================
-- MIGRAÇÃO: Corrigir vulnerabilidade de segurança na função update_updated_at_column
-- ============================================================================
-- 
-- PROBLEMA: A função update_updated_at_column não tinha o parâmetro search_path
-- definido, o que pode causar vulnerabilidades de segurança (search path hijacking).
--
-- SOLUÇÃO: Adicionar SET search_path = public e SECURITY DEFINER na definição
-- da função para garantir que ela sempre execute no contexto correto.
-- ============================================================================

-- Corrigir função update_updated_at_column com search_path seguro
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

