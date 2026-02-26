# Análise de Performance — Finance Control (Pessoal + Empresarial)

## Resumo executivo

Foram identificados gargalos em **consultas ao banco**, **requisições em série**, **padrão N+1**, **falta de paginação**, **busca/filtro no cliente** e **ausência de cache**. As refatorações priorizam redução de latência e de uso de CPU.

---

## 1. Consultas ao banco (Supabase/PostgreSQL)

### 1.1 Dashboard Pessoal — Queries em série

**Problema:** Em `src/app/pessoal/dashboard/page.tsx`, `loadDashboardData()` executa **8+ queries em sequência** (cada `await` bloqueia a próxima). O tempo total é a soma das latências.

**Impacto:** Latência alta na primeira carga e ao trocar mês/ano.

**Solução:** Executar todas as queries independentes em **`Promise.all()`** (já aplicada na refatoração).

---

### 1.2 Dashboard Pessoal — Overfetching (`select('*')`)

**Problema:** Uso de `.select('*')` em cartões, compras, parcelas, receitas e investimentos. Colunas desnecessárias aumentam payload e tempo de serialização.

**Solução:** Selecionar apenas colunas usadas (ex.: `id, valor, data, categoria, user_id` nas compras).

---

### 1.3 Dashboard Pessoal — Filtro `parcelada` no cliente

**Problema:** Compras e parcelas são buscadas sem filtrar `parcelada`/`total_parcelas` no banco; o filtro é feito em JS. Isso traz mais linhas do que o necessário.

**Solução:** Incluir `.eq('parcelada', false)` (ou condição equivalente) na query quando só compras à vista forem necessárias; usar `.or()` quando a regra for composta.

---

### 1.4 Dashboard Empresarial — N+1 por categoria

**Problema:** Em `src/app/empresarial/dashboard/page.tsx`, para **despesas por categoria** e **vendas por categoria** são feitas **2 queries por categoria** (contas a pagar + parcelas, ou vendas + parcelas). Com 10 categorias = 20+ queries extras.

**Impacto:** Muitas round-trips ao banco e tempo de resposta proporcional ao número de categorias.

**Solução:** Buscar **uma vez** todas as contas a pagar e parcelas do mês (com `categoria_id`), agregar por `categoria_id` em memória e fazer join com a lista de categorias. Mesma ideia para vendas/parcelas de vendas (já refatorado).

---

### 1.5 Dashboard Empresarial — 36 queries para histórico (6 meses)

**Problema:** Para os gráficos dos últimos 6 meses, são montadas 6 queries por mês (contas a receber, vendas, parcelas vendas, contas a pagar, parcelas pagar, compras) e executadas em paralelo = 36 queries.

**Impacto:** Pico de carga no banco e latência agregada alta.

**Solução (recomendação):** Criar **funções RPC (PostgreSQL)** que recebem `user_id` e intervalo de datas e retornam totais já agregados por mês (receitas, despesas, faturamento). Assim reduz-se para 1–2 chamadas por dashboard. Opcional: manter abordagem atual mas com `Promise.all` e colunas mínimas.

---

### 1.6 Índices

**Status:** Já existem índices em `user_id`, `data_vencimento`, `data_compra`, `data_venda`, `status`, etc. nas migrations.

**Recomendação:** Para filtros compostos muito usados (ex.: dashboard por mês), considerar índices compostos, por exemplo:

- `(user_id, data_vencimento)` em `parcelas_contas_pagar`, `contas_a_pagar`, `parcelas_vendas`, `contas_a_receber`
- `(user_id, data_compra)` em `compras`
- `(user_id, mes_referencia, ano_referencia)` em `receitas` (pessoal)

Isso acelera os filtros por período sem alterar a lógica da aplicação.

---

## 2. Renderização e estado (React)

### 2.1 Re-renders desnecessários

**Problema:** Em várias páginas, listas e opções são recriadas a cada render (ex.: `mesesNomes` dentro do componente no dashboard pessoal, `statCards` sem `useMemo` no pessoal).

**Solução:**  
- Constantes estáticas (ex.: nomes de meses) fora do componente ou em `useMemo` com deps vazias.  
- Objetos/arrays usados em listas (ex.: `statCards`) em `useMemo` dependendo apenas dos dados (ex.: `stats`).

**Status:** Dashboard empresarial já usa `useMemo` para `statCards` e `opcoesMesDropdown`; dashboard pessoal foi ajustado para evitar recriação de arrays estáticos.

---

### 2.2 Dependência de efeito — `mesSelecionado` (objeto)

**Problema:** No dashboard empresarial, `mesSelecionado` é um objeto `{ ano, mes }`. Se for recriado a cada render (ex.: no `onChangeMesSelect`), o `useCallback(loadDashboardData, [..., mesSelecionado])` pode causar nova função e novo `useEffect`, gerando recarregamentos extras.

**Solução:** Estabilizar a referência (ex.: dependência em `mesSelecionado.ano` e `mesSelecionado.mes` no efeito que chama `loadDashboardData`, ou usar um valor primitivo como `mesAnoKey = `${ano}-${mes}`).

---

## 3. Requisições HTTP e fluxo de dados

### 3.1 Perfil empresarial — Dupla busca possível

**Problema:** Em `MainLayoutEmpresarial`, ao criar perfil via `/api/empresarial/ensure-profile`, é feita uma **segunda** query ao Supabase para buscar o perfil novo. Em cenários de alta concorrência pode haver duplicidade de lógica.

**Solução:** A API pode retornar os campos necessários do perfil criado (ex.: `trial_ends_at`, `subscription_status`) no JSON de resposta, evitando a segunda query no layout.

---

### 3.2 Compras (ComprasContent) — Múltiplas fontes em série

**Problema:** `loadCompras()` busca: (1) compras, (2) compras_cartao_empresa por compra_id, (3) parcelas_cartao_empresa, (4) compras_cartao sem compra_id, (5) contas_a_pagar, (6) parcelas_contas_pagar, (7) parcelas_cartao_empresa (vencimento no mês). Várias dessas podem ser paralelizadas.

**Solução:** Agrupar em `Promise.all` as queries que não dependem umas das outras (ex.: compras + contas_a_pagar + parcelas_contas_pagar + compras_cartao em paralelo; depois, com os `compra_id` obtidos, buscar compras_cartao_empresa e parcelas em uma segunda leva).

---

## 4. Cache e revalidação

**Problema:** Não há camada de cache (ex.: React Query / TanStack Query ou SWR). Cada navegação ou mudança de filtro refaz todas as requisições.

**Impacto:** Latência repetida e mais carga no Supabase.

**Solução:**  
- Introduzir **React Query** (ou SWR) para dashboards e listas:  
  - `staleTime` de 30–60 s para dados de dashboard.  
  - `queryKey` incluindo `userId`, `mes`, `ano` (e filtros relevantes).  
- Para mutações (criar/editar compra, venda, etc.), usar `invalidateQueries` nas keys correspondentes para revalidar após sucesso.

---

## 5. Paginação e volume de dados

### 5.1 Listas sem paginação

**Problema:**  
- **Clientes:** `loadClientes()` busca todos os clientes com `.select('*')` e aplica busca por texto no cliente.  
- **Compras/Despesas:** Todas as compras do período (compras + contas + parcelas) são carregadas e depois filtradas por `buscaTexto` no cliente.  
- **Orçamentos:** `.select('*').eq('user_id', userId)` sem `range`/`limit`.

**Impacto:** Com muitos registros, aumento de tempo de resposta, memória e CPU no cliente.

**Solução:**  
- **Paginação no servidor:** `.range(offset, offset + pageSize - 1)` e estado de página no componente.  
- **Busca no servidor:** Para clientes, usar `.or(\`nome.ilike.%${term}%\`, ...)` (e equivalentes para outros campos) em vez de trazer tudo e filtrar no cliente.  
- Manter filtros de período e status no banco; aplicar `limit` (ex.: 50) por página.

---

## 6. Serialização e tipagem

- Uso de `(compra as any)` no dashboard pessoal reduz segurança de tipo; preferir interfaces e tipos explícitos.  
- Payloads menores (select específico) reduzem tempo de serialização/deserialização e uso de memória.

---

## 7. Melhorias arquiteturais sugeridas

| Área              | Ação                                                                 |
|-------------------|----------------------------------------------------------------------|
| Dashboard         | RPCs no Supabase para totais por mês (receitas, despesas, saldo)     |
| Cache             | React Query ou SWR para listas e dashboards com staleTime curto     |
| Paginação         | Padrão em todas as listas (clientes, orçamentos, compras, vendas)   |
| Busca             | Sempre no servidor (ilike/text search) em listas grandes             |
| Perfil            | API ensure-profile retornar perfil criado para evitar 2ª query      |
| Estado            | Estabilizar deps (objetos de mês/ano) e useMemo em listas/opções     |

---

## 8. Refatorações já aplicadas no código

1. **Dashboard Pessoal** (`src/app/pessoal/dashboard/page.tsx`)
   - Todas as queries independentes executadas em **`Promise.all()`**: cartões, compras do mês, parcelas do mês, receitas, compras 6 meses, parcelas 6 meses, investimentos. Reduz a latência total de “soma de round-trips” para “um único round-trip em paralelo”.
   - **`select()`** restrito às colunas usadas: `id`, `valor`, `data`, `categoria` (e `parcelada`, `total_parcelas` onde aplicável), evitando overfetch e menor serialização.
   - Constante **`MESES_NOMES_ABREV`** definida fora do componente para evitar recriação a cada render.

2. **Dashboard Empresarial** (`src/app/empresarial/dashboard/page.tsx`)
   - **Despesas por categoria:** em vez de 2×N queries (N categorias), os dados vêm do primeiro batch: `contas_a_pagar` e `parcelas_contas_pagar` já retornam `categoria_id`. Agregação por `categoria_id` em memória + join com a lista de categorias. Compras finalizadas (já com `categoria_id`) entram na mesma agregação.
   - **Vendas por categoria:** dois novos itens no primeiro `Promise.all`: uma query de vendas (valor_final, categoria_id) e uma de parcelas_vendas (valor, categoria_id), ambas com status pendente+aprovado e período do mês. Agregação em memória por `categoria_id` e join com categorias de receita. Elimina o loop de 2×M queries (M = categorias de receita).
   - Primeiro batch passou a incluir `categoria_id` em contas a pagar e parcelas contas a pagar para alimentar o gráfico de despesas por categoria sem N+1.

3. **Clientes (recomendação no doc)**  
   - Busca por texto via `.or(...ilike...)` no Supabase e paginação com `.range()` (a implementar conforme necessidade).

As mudanças mantêm a lógica de negócio e os comportamentos atuais, priorizando latência e uso de CPU.
