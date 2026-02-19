# Cadastros Empresarial – Categorias e Produtos/Serviços

## Categorias

- **Rota:** `/empresarial/categorias`
- **Sidebar:** Cadastros → Categorias
- **Funcionalidades:**
  - Alternar entre **Categoria de Despesa** e **Categoria de Receita**
  - Listar categorias por tipo
  - Criar/editar/excluir categoria
  - Definir **cor** da categoria (para uso nos gráficos do dashboard e demais telas)
  - Campos: Nome, Descrição (opcional), Tipo (despesa/receita), Cor

A tabela `categorias` já deve possuir a coluna `cor` (texto, ex: `#6366f1`). Se não existir, adicione no Supabase:

```sql
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#6366f1';
```

---

## Produtos e Serviços

- **Rota:** `/empresarial/produtos-servicos`
- **Sidebar:** Cadastros → Produtos/Serviços
- **Funcionalidades:**
  - Abas **Produtos** e **Serviços**
  - Cards em grid com animação ao passar o mouse (hover)
  - Foto do item (círculo no card), nome, categoria (pill com cor), preço de venda
  - **Produtos:** preço de custo e preço de venda
  - **Serviços:** preço de venda e descrição opcional
  - Botão "Ver Detalhes" (abre modal de edição) e ícone de excluir
  - Modal para novo/editar: nome, categoria, preço de venda, preço de custo (só produtos), descrição, upload de foto

### Requisitos no Supabase

1. **Coluna `foto_url` em `produtos` e `servicos`** (opcional; se não existir, as fotos não serão exibidas/salvas):

```sql
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS foto_url TEXT;
```

2. **Bucket de Storage para fotos dos itens**

- Nome do bucket: `itens`
- No dashboard do Supabase: **Storage** → **New bucket** → nome `itens`, público (ou políticas RLS que permitam leitura/escrita para usuários autenticados).

Com o bucket e as colunas configurados, o upload e a exibição das fotos passam a funcionar na página Produtos/Serviços.
