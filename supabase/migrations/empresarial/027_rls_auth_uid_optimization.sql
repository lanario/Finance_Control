-- Otimização RLS: evita reavaliação desnecessária de auth.uid()
-- Altera APENAS a forma de avaliação das políticas (performance).
-- NÃO altera dados, NÃO altera quem pode ver/editar o quê.
-- Cada bloco só roda se a tabela existir (evita erro em banco sem schema base).
-- Usa EXECUTE para não referenciar tabelas na análise, evitando "relation does not exist".
-- Documentação: https://supabase.com/docs/guides/database/postgres/row-level-security#call-authuid-in-a-stable-function

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['categorias','fornecedores','clientes','contas_a_pagar','parcelas_contas_pagar','contas_a_receber','parcelas_contas_receber'];
  pol_prefix text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      pol_prefix := 'Users can view their own ' || t;
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_prefix, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Users can insert their own ' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Users can update their own ' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Users can delete their own ' || t, t);
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING ((SELECT auth.uid()) = user_id)', pol_prefix, t);
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id)', 'Users can insert their own ' || t, t);
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING ((SELECT auth.uid()) = user_id)', 'Users can update their own ' || t, t);
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING ((SELECT auth.uid()) = user_id)', 'Users can delete their own ' || t, t);
    END IF;
  END LOOP;
END $$;
