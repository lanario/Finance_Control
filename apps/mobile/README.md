# Infinity Lines – App Mobile

App mobile (Expo / React Native) do Finance Control. Fase 1: fundação com auth (email/senha e Google) e dashboard placeholder.

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (projetos Pessoal e Empresarial)
- Expo Go no celular (para testes) ou Android Studio / Xcode para emulador

## Configuração

### 1. Variáveis de ambiente

Na pasta `apps/mobile`:

```bash
cp .env.example .env
```

Edite o `.env` e preencha com as mesmas URLs e chaves do app web (use o prefixo `EXPO_PUBLIC_` em vez de `NEXT_PUBLIC_`). Exemplo:

```env
EXPO_PUBLIC_SUPABASE_PESSOAL_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_PESSOAL_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_EMPRESARIAL_URL=https://yyy.supabase.co
EXPO_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY=eyJ...
```

### 2. Redirect URL no Supabase (OAuth Google)

Para login com Google no app, adicione a URL de redirect no Supabase:

1. Dashboard do Supabase → **Authentication** → **URL Configuration**
2. Em **Redirect URLs**, adicione:
   - Desenvolvimento (Expo Go): use a URL que aparece no terminal ao rodar `npx expo start` (ex.: `exp://192.168.x.x:8081`) ou o scheme do app:
   - **Scheme do app:** `infinitylines:///(auth)/callback`

Para testes locais com Expo Go, o `Linking.createURL('/(auth)/callback')` gera uma URL que você pode copiar e colar nas Redirect URLs do Supabase (ex.: `exp://192.168.1.1:8081/--/(auth)/callback`). Rode o app uma vez, veja no console a URL gerada e adicione no Supabase.

### 3. Instalar e rodar

Na raiz do monorepo ou em `apps/mobile`:

```bash
cd apps/mobile
npm install
npx expo start
```

- Pressione **a** para abrir no Android ou **i** para iOS (simulador).
- Ou escaneie o QR code com o app **Expo Go** no celular.

## Estrutura (Fase 1 + Fase 2 + Fase 3)

- `app/index.tsx` – Escolha de contexto (Pessoal / Empresarial) e checagem de sessão
- `app/(auth)/login.tsx` – Login e cadastro (email/senha + Google)
- `app/(auth)/callback.tsx` – Callback OAuth
- `app/(tabs)/_layout.tsx` – Bottom Tabs + header “Infinity Lines”
- `app/(tabs)/dashboard.tsx` – Dashboard Pessoal: cards (despesas, receitas, cartões, saldo) e gráficos (linha 6 meses, pizza por categoria)
- `app/(tabs)/cartoes/` – Listagem, detalhe por cartão, parcelas, nova compra (formulário)
- `app/(tabs)/despesas.tsx` – Despesas: Total Geral, períodos, lista por mês (compras + parcelas), Marcar Pago
- `app/(tabs)/receitas/` – Listagem por mês e cadastro de receita
- `app/(tabs)/mais/` – Categorias (CRUD), Investimentos (listagem, novo, editar), Sonhos (listagem, novo, depósito)
- `app/(tabs)/perfil.tsx` – Perfil (email, contexto, logout)
- `lib/supabase-pessoal.ts`, `lib/supabase-empresarial.ts`, `lib/utils.ts` – Clientes Supabase e formatarMoeda
- `lib/context.ts` – Contexto Pessoal/Empresarial persistido

## Critério de conclusão (Fase 1)

- Usuário consegue se cadastrar, confirmar e-mail (no web) e fazer login no app (email e Google).
- Após login, é redirecionado para o dashboard.
- Sessão persiste (AsyncStorage) e logout retorna à tela de escolha de contexto.
