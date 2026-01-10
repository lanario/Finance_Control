# 💰 Financeiro Pessoal

Sistema de gestão financeira pessoal desenvolvido com Next.js, TypeScript, Supabase e TailwindCSS.

## 🚀 Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Supabase** - Backend e autenticação
- **TailwindCSS** - Estilização
- **Recharts** - Gráficos e visualizações

## 📋 Funcionalidades

- ✅ Autenticação de usuários
- ✅ Dashboard com visão geral financeira
- ✅ Gerenciamento de cartões de crédito
- ✅ Controle de compras e faturas
- ✅ Categorização de gastos (essenciais e outros)
- ✅ Visualizações e gráficos

## 🛠️ Instalação

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.local.example .env.local
```

Preencha com suas credenciais do Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Execute o projeto:

```bash
npm run dev
```

## 📊 Estrutura do Banco de Dados

O projeto utiliza Supabase. Execute os scripts SQL fornecidos na pasta `supabase/migrations` para criar as tabelas necessárias.

## 🎨 Cores do Tema

- **Azul Marinho** (#1e3a5f) - Cor principal
- **Cinza** (#6b7280) - Cor secundária
- **Branco** (#ffffff) - Fundo

```
#Atualizações do sistema

parcelas de cada cartao --

implementar open finance para automacao de faturas do cartao

```
