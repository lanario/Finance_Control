-- ============================================================================
-- MIGRAÇÃO: Corrigir vulnerabilidades de segurança nas funções do schema pessoal
-- ============================================================================
-- 
-- PROBLEMA: As funções não tinham o parâmetro search_path definido, o que pode
-- causar vulnerabilidades de segurança (search path hijacking).
--
-- SOLUÇÃO: Adicionar SET search_path = public e SECURITY DEFINER na definição
-- das funções para garantir que elas sempre executem no contexto correto.
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

-- Corrigir função atualizar_valor_atual_sonho com search_path seguro
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

