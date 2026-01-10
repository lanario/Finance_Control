# Configuração de Email de Confirmação - Supabase

## Problema
Quando um usuário cria uma conta e recebe o email de confirmação, ao clicar no link, ele é redirecionado para `localhost:3000` ao invés da URL da VPS (`http://69.62.87.91:3001/`).

## Solução

### 1. Configuração no Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration** (ou **Settings** → **Auth** → **URLs**)
4. Na seção **Redirect URLs**, adicione as seguintes URLs permitidas:
   ```
   http://69.62.87.91:3001/auth/login?confirmed=true
   http://69.62.87.91:3001/**
   http://localhost:3000/auth/login?confirmed=true (para desenvolvimento local)
   http://localhost:3000/** (para desenvolvimento local)
   ```

5. Na seção **Site URL**, configure como:
   ```
   http://69.62.87.91:3001
   ```

### 2. Variável de Ambiente (Opcional mas Recomendado)

Adicione no arquivo `.env.local` na VPS:
```env
NEXT_PUBLIC_SITE_URL=http://69.62.87.91:3001
```

Isso permite que o código detecte automaticamente a URL base da aplicação.

### 3. Templates de Email (Opcional)

Se quiser personalizar o email de confirmação:

1. Vá em **Authentication** → **Email Templates**
2. Selecione **Confirm signup**
3. Verifique que o link de confirmação está usando a variável `{{ .ConfirmationURL }}`
4. O Supabase automaticamente usará a URL configurada em **Redirect URLs**

## Como Funciona

1. Quando um usuário se cadastra, o código passa a URL de redirecionamento via `emailRedirectTo`:
   ```typescript
   await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: 'http://69.62.87.91:3001/auth/login?confirmed=true'
     },
   })
   ```

2. O Supabase envia um email com um link de confirmação
3. Quando o usuário clica no link, o Supabase:
   - Confirma a conta do usuário
   - Redireciona para a URL especificada em `emailRedirectTo`
   - Esta URL deve estar na lista de **Redirect URLs** permitidas no Supabase

4. Ao retornar para `/auth/login?confirmed=true`, a página mostra uma mensagem de sucesso

## Verificação

Para testar se está funcionando:

1. Crie uma nova conta de teste
2. Verifique o email recebido
3. Clique no link de confirmação
4. Deve ser redirecionado para: `http://69.62.87.91:3001/auth/login?confirmed=true`
5. Deve ver a mensagem: "✅ Email confirmado com sucesso! Agora você pode fazer login."

## Troubleshooting

- Se ainda redirecionar para localhost:
  1. Verifique se as URLs estão corretas no Supabase Dashboard
  2. Verifique se a variável `NEXT_PUBLIC_SITE_URL` está configurada na VPS
  3. Reinicie o servidor Next.js após mudar variáveis de ambiente
  4. Limpe o cache do navegador

- Se o email não chega:
  1. Verifique a pasta de spam
  2. Verifique os logs do Supabase em **Logs** → **Auth Logs**
  3. Verifique se o email está sendo enviado corretamente
