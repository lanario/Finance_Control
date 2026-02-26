# Configuração Stripe – Assinatura R$ 30/mês com trial 24h (Pessoal e Empresarial)

Pessoal e Empresarial usam **bancos e usuários separados** (dois projetos Supabase). Cada um tem seu próprio produto/preço no Stripe e o mesmo webhook atualiza o banco correto via `metadata.context`.

## 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- **STRIPE_SECRET_KEY**: Dashboard Stripe → Developers → API keys → Secret key (use `sk_test_` em dev).
- **STRIPE_WEBHOOK_SECRET**: Criado ao adicionar o endpoint (passo 3).
- **STRIPE_PRICE_ID**: Preço assinatura **Pessoal** (passo 2).
- **STRIPE_PRICE_ID_EMPRESARIAL**: Preço assinatura **Empresarial** (passo 2).
- **STRIPE_PRICE_ID_INFINITY**: Preço assinatura **Plano Infinity** (pessoal + empresarial juntos; passo 2).
- **SUPABASE_PESSOAL_SERVICE_ROLE_KEY**: Supabase (projeto Pessoal) → Project Settings → API → `service_role`.
- **SUPABASE_EMPRESARIAL_SERVICE_ROLE_KEY**: Supabase (projeto Empresarial) → Project Settings → API → `service_role`.

## 2. Produtos e preços no Stripe

Crie **dois produtos** (ou dois preços), um para cada contexto:

**Pessoal**
1. Stripe Dashboard → **Products** → **Add product**.
2. Nome: ex. "Assinatura do site (Pessoal)".
3. **Pricing**: **Recurring**, **Monthly**, **R$ 30,00**.
4. Copie o **Price ID** → `STRIPE_PRICE_ID`.

**Empresarial**
1. Outro produto: ex. "Assinatura do site (Empresarial)".
2. **Pricing**: **Recurring**, **Monthly**, **R$ 30,00**.
3. Copie o **Price ID** → `STRIPE_PRICE_ID_EMPRESARIAL`.

**Plano Infinity** (opcional – landing e assinatura com `?plan=infinity`)
1. Outro produto: ex. "Plano Infinity (Pessoal + Empresarial)".
2. **Pricing**: **Recurring**, **Monthly**, valor desejado (ex. **R$ 49,00**).
3. Copie o **Price ID** → `STRIPE_PRICE_ID_INFINITY`.

## 3. Webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**: `https://seu-dominio.com/api/stripe/webhook` (em dev use o túnel, ex. ngrok: `https://xxxx.ngrok.io/api/stripe/webhook`).
3. **Eventos**: marque:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Salve e copie o **Signing secret** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.

## 4. Banco de dados

Rode as migrations em **cada** projeto Supabase:

- **Pessoal**: migration `019_assinatura_perfis.sql` (colunas em `perfis`).
- **Empresarial**: migration `024_assinatura_perfis.sql` (colunas em `perfis`).

Colunas: `trial_ends_at`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`.

## 5. Fluxo resumido

- **Novo usuário**: ao acessar a área logada (pessoal ou empresarial), o perfil é criado (se não existir) com `trial_ends_at = created_at + 24h` e `subscription_status = 'trialing'`.
- **Acesso**: usuário tem acesso enquanto estiver no trial (24h) ou com `subscription_status = 'active'`.
- **Após o trial**: redirecionamento para `/pessoal/assinatura` ou `/empresarial/assinatura` conforme o contexto; botão "Assinar por R$ 30/mês" abre o Stripe Checkout (com `context` no body para usar o preço e URLs corretos).
- **Após pagamento**: o webhook `checkout.session.completed` lê `metadata.context` e atualiza o perfil no banco **pessoal** ou **empresarial** para `subscription_status = 'active'`.
- **Cancelamento**: o webhook `customer.subscription.deleted` define `subscription_status = 'expired'` no perfil correspondente (usando `metadata.context`).

## 6. Usuários isentos de pagamento

Para que alguns usuários **não precisem pagar** (acesso liberado sem trial e sem assinatura):

1. Rode a migration que adiciona o status `free` (se ainda não rodou):
   - **Pessoal**: `020_perfis_status_free.sql`
   - **Empresarial**: `025_perfis_status_free.sql`
2. No **Supabase** (projeto Pessoal ou Empresarial):
   - **Table Editor** → tabela **perfis**
   - Localize o perfil pelo `user_id` (ou pelo nome/email do usuário em `auth.users` se precisar cruzar)
   - Edite a linha e em **subscription_status** altere para **`free`**
   - Salve

O usuário passa a ter acesso total sem ver o timer de trial e sem ser redirecionado para a página de assinatura. Para voltar a exigir pagamento, altere de volta para `trialing` ou `expired`.
