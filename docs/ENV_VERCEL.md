# Variáveis de ambiente no Vercel

Para o deployment funcionar, configure no Vercel as mesmas variáveis que você tem no `.env.local`.

## Onde configurar

1. Acesse [vercel.com](https://vercel.com) → seu projeto **Finance_Control**
2. **Settings** → **Environment Variables**
3. Adicione cada variável abaixo (copie os **valores** do seu `.env.local`)

## Variáveis obrigatórias

| Nome | Onde usar |
|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Pessoal (URL do projeto) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Pessoal (chave anon) |
| `NEXT_PUBLIC_SUPABASE_EMPRESARIAL_URL` | Supabase Empresarial (URL) |
| `NEXT_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY` | Supabase Empresarial (chave anon) |
| `SUPABASE_PESSOAL_SERVICE_ROLE_KEY` | API/checkout Pessoal (secret) |
| `SUPABASE_EMPRESARIAL_SERVICE_ROLE_KEY` | API/checkout Empresarial (secret) |
| `STRIPE_SECRET_KEY` | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `STRIPE_PRICE_ID` | Preço assinatura Pessoal |
| `STRIPE_PRICE_ID_EMPRESARIAL` | Preço assinatura Empresarial |

## Importante

- **`NEXT_PUBLIC_SITE_URL`**: no Vercel use a URL real do site, por exemplo:  
  `https://seu-projeto.vercel.app`  
  (não use `http://localhost:3000` em produção.)

- Marque as variáveis para **Production**, **Preview** e **Development** conforme quiser (para deploy em produção, marque ao menos **Production**).

Depois de salvar, faça um novo deploy (Redeploy) para aplicar as variáveis.
