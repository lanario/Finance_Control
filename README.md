# 💰 Financeiro Pessoal

Sistema completo de gestão financeira pessoal desenvolvido para ajudar você a ter controle total sobre suas finanças. Gerencie cartões de crédito, acompanhe despesas, receitas, investimentos e visualize sua situação financeira através de gráficos e relatórios detalhados.

## 📖 Sobre o Sistema

O **Financeiro Pessoal** é uma aplicação web moderna que permite:

- **Controle de Cartões de Crédito**: Cadastre e gerencie seus cartões, acompanhe faturas e limite disponível
- **Gestão de Compras**: Registre suas compras, organize por categoria e acompanhe gastos mensais
- **Controle de Parcelas**: Sistema completo para gerenciar compras parceladas com controle de vencimentos
- **Gestão de Receitas**: Registre suas receitas mensais e acompanhe sua renda
- **Investimentos**: Controle seus investimentos (CDB, Ações, Fundos, etc.) com cálculo de rentabilidade
- **Dashboard Inteligente**: Visualize sua situação financeira através de gráficos e métricas importantes
- **Categorização**: Organize seus gastos por categorias (Alimentação, Transporte, Saúde, etc.)
- **Relatórios Mensais**: Acompanhe seus gastos e receitas mês a mês

## 🚀 Tecnologias Utilizadas

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática para maior segurança
- **Supabase** - Backend como serviço (autenticação, banco de dados PostgreSQL)
- **TailwindCSS** - Framework CSS para estilização moderna
- **Recharts** - Biblioteca para criação de gráficos interativos
- **React Icons** - Ícones para interface

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 18.0.0 ou superior
- **npm** 9.0.0 ou superior (ou yarn 1.22.0+)
- Conta no **Supabase** (gratuita em [supabase.com](https://supabase.com))

## 🛠️ Tutorial de Instalação e Configuração

### Passo 1: Clone o Repositório

```bash
git clone <url-do-repositorio>
cd financeiro-pessoal
```

### Passo 2: Instale as Dependências

Instale todas as dependências necessárias do projeto:

```bash
npm install
```

### Passo 3: Configure o Supabase

#### 3.1. Crie um Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login (ou crie uma conta gratuita)
2. Clique em "New Project"
3. Preencha os dados do projeto:
   - Nome do projeto
   - Senha do banco de dados (guarde esta senha!)
   - Região (escolha a mais próxima)
4. Aguarde alguns minutos enquanto o projeto é criado

#### 3.2. Execute as Migrations do Banco de Dados

1. No dashboard do Supabase, vá em **SQL Editor**
2. Abra os arquivos SQL na pasta `supabase/migrations/pessoal` na seguinte ordem:
   - `001_initial_schema.sql`
   - `002_tipos_gastos.sql`
   - `003_adicionar_pix.sql`
   - `004_receitas.sql`
   - `005_cartoes_melhorias.sql`
   - `006_parcelas.sql`
   - `007_investimentos.sql`
   - `008_investimentos_rendimento.sql`
   - `009_corrigir_constraint_periodicidade.sql`
   - `010_adicionar_dividend_yield.sql`
   - `011_despesas_fixas.sql`
   - `012_perfis.sql`
   - `013_compras_recorrentes.sql`
   - `014_sonhos.sql`
3. Execute cada script no SQL Editor do Supabase (clique em "Run")

> ⚠️ **Importante**: Execute as migrations da pasta `pessoal/` apenas no projeto Supabase do Financeiro Pessoal. As migrations do empresarial estão em `supabase/migrations/empresarial/`

#### 3.3. Obtenha as Credenciais do Supabase

1. No dashboard do Supabase, vá em **Settings** → **API**
2. Você encontrará:
   - **URL do Projeto** (Project URL)
   - **Chave Anônima** (anon/public key)
3. Copie esses valores (você vai precisar no próximo passo)

### Passo 4: Configure as Variáveis de Ambiente

1. Crie um arquivo `.env.local` na raiz do projeto:

```bash
# No Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# No Linux/Mac
touch .env.local
```

2. Adicione as seguintes variáveis no arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase_aqui
```

**Exemplo:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Importante**: Nunca commite o arquivo `.env.local` no Git! Ele já está no `.gitignore`.

### Passo 5: Execute o Projeto

Agora você está pronto para rodar o projeto! Execute o comando:

```bash
npm run dev
```

O servidor de desenvolvimento será iniciado e você verá uma mensagem como:

```
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

### Passo 6: Acesse a Aplicação

Abra seu navegador e acesse:

```
http://localhost:3000
```

## 📝 Primeiros Passos

1. **Crie sua Conta**: Na tela inicial, clique em "Criar conta" e preencha seus dados
2. **Confirme seu Email**: Verifique sua caixa de entrada e clique no link de confirmação
3. **Faça Login**: Após confirmar o email, faça login com suas credenciais
4. **Cadastre um Cartão**: Vá em "Cartões" e adicione seu primeiro cartão de crédito
5. **Registre uma Receita**: Vá em "Receitas" e adicione sua receita mensal
6. **Comece a Usar**: Explore o dashboard e comece a registrar suas compras!

## 📁 Estrutura do Projeto

```
financeiro-pessoal/
├── src/
│   ├── app/              # Páginas e rotas (Next.js App Router)
│   │   ├── auth/         # Autenticação
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── cartoes/      # Gerenciamento de cartões
│   │   ├── compras/      # Registro de compras
│   │   ├── receitas/     # Gerenciamento de receitas
│   │   ├── gastos/       # Visualização de gastos
│   │   └── investimentos/# Gestão de investimentos
│   ├── components/       # Componentes reutilizáveis
│   └── lib/              # Bibliotecas e utilitários
├── supabase/
│   └── migrations/       # Scripts SQL de migração do banco
├── package.json          # Dependências do projeto
├── tsconfig.json         # Configuração TypeScript
├── tailwind.config.ts    # Configuração TailwindCSS
└── next.config.js        # Configuração Next.js
```

## 🎨 Tema e Cores

O sistema utiliza um tema escuro moderno com as seguintes cores principais:

- **Azul Marinho** (#1e3a5f) - Cor principal da interface
- **Cinza** (#6b7280) - Cor secundária
- **Branco** (#ffffff) - Textos e elementos destacados
- **Verde** (#10b981) - Receitas e valores positivos
- **Vermelho** (#ef4444) - Despesas e valores negativos

## 📊 Banco de Dados

O sistema utiliza **PostgreSQL** através do Supabase com as seguintes tabelas principais:

- `cartoes` - Cartões de crédito dos usuários
- `compras` - Compras realizadas
- `parcelas` - Parcelas de compras parceladas
- `receitas` - Receitas mensais
- `investimentos` - Investimentos cadastrados
- `tipos_gastos` - Categorias de gastos

Todas as tabelas possuem **Row Level Security (RLS)** habilitada, garantindo que cada usuário só acesse seus próprios dados.

## 🚀 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm run start` - Inicia o servidor de produção (após build)
- `npm run lint` - Executa o linter para verificar código

## 🔮 Funcionalidades Futuras

- 📦 Visualização de parcelas de cada cartão
- 🔄 Integração com Open Finance para automação de faturas
- 📱 Aplicativo mobile
- 📧 Notificações por email
- 💾 Exportação de relatórios em PDF/Excel

## 📄 Licença

Este projeto é privado e de uso pessoal.

## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões e feedback são bem-vindos!

---

Desenvolvido com ❤️ para ajudar no controle financeiro pessoal
