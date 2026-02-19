# Planejamento: App Mobile Infinity Lines

Documento de planejamento em fases para construção do aplicativo mobile com as mesmas funcionalidades do sistema web, com opção de instalação nas telas de cadastro, login e dashboard. Foco inicial em **Android**, com arquitetura pronta para **iOS**.

---

## 1. Stack tecnológica recomendada

Alinhada ao que você já usa no projeto:

| Web (atual)        | Mobile (recomendado)                                    | Motivo                                                                              |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Next.js 14 + React | **Expo (React Native)**                                 | Mesmo ecossistema React/TypeScript; Supabase oficial; um código para Android e iOS. |
| TypeScript         | **TypeScript**                                          | Tipos e regras de negócio podem ser compartilhados (monorepo ou pacote shared).     |
| Supabase           | **@supabase/supabase-js**                               | Mesmo cliente; auth (email, OAuth) e banco já configurados.                         |
| TailwindCSS        | **NativeWind** ou **Tamagui**                           | Estilo declarativo; NativeWind usa sintaxe Tailwind no RN.                          |
| Recharts           | **Victory Native** ou **react-native-gifted-charts**    | Gráficos nativos performáticos.                                                     |
| React Icons        | **@expo/vector-icons** ou **react-native-vector-icons** | Ícones consistentes com o brand.                                                    |

**Por que Expo e não React Native “bare”?**

- Build na nuvem (EAS Build) sem precisar de Android Studio/Xcode no dia a dia.
- OTA (over-the-air) para correções e pequenas features.
- Deep linking e notificações push mais simples.
- Um projeto único para Android e iOS.

---

## 2. Onde exibir a opção “Instalar o app” no web

Objetivo: aparecer na **tela de cadastro**, na **tela de login** e no **dashboard** (e opcionalmente na home).

| Local               | Onde no código                                                                    | Comportamento                                                                         |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Login**           | `src/app/pessoal/auth/login/page.tsx` e `src/app/empresarial/auth/login/page.tsx` | Banner ou link discreto: “Baixe o app” com link para Play Store (e depois App Store). |
| **Cadastro**        | Mesma página de login (toggle “Cadastrar”)                                        | Mesmo banner/link quando `isSignUp === true`.                                         |
| **Dashboard**       | `MainLayout` (Sidebar ou header) em Pessoal e Empresarial                         | Card/botão “Instalar app Infinity Lines” (ex.: no rodapé da sidebar ou no header).    |
| **Home** (opcional) | `src/app/page.tsx`                                                                | Texto ou botão “Também disponível no celular” próximo aos cards Pessoal/Empresarial.  |

Implementação sugerida no web:

- Componente reutilizável `InstallAppBanner` ou `InstallAppCta`.
- Detecção de dispositivo móvel: se for mobile, pode mostrar “Abrir no app” (deep link) em vez de “Baixar na loja”.
- Links: Play Store (Android) e App Store (iOS) quando o app estiver publicado.

---

## 3. Visão geral das fases

- **Fase 1:** Ambiente, projeto Expo e integração Supabase (auth + primeiro fluxo).
- **Fase 2:** Navegação, layout e telas equivalentes ao login/cadastro e dashboard.
- **Fase 3:** Módulo Pessoal (telas principais e gráficos).
- **Fase 4:** Módulo Empresarial (telas principais e gráficos).
- **Fase 5:** Polish, PWA/install prompt no web e publicação Android (e preparação iOS).

---

## 4. Fase 1 – Fundação (ambiente e auth)

**Objetivo:** Projeto Expo rodando com TypeScript e Supabase; login/cadastro funcionando (email/senha e Google).

**Entregas:**

1. Criar projeto Expo (TypeScript) na pasta `apps/mobile` (monorepo) ou em repositório separado `finance-control-mobile`.
2. Configurar variáveis de ambiente (Supabase Pessoal e Empresarial), espelhando `.env.local` do web.
3. Instalar e configurar `@supabase/supabase-js`; criar clientes `supabasePessoal` e `supabaseEmpresarial` (ou shared em pacote).
4. Telas iniciais:
   - Splash / escolha de contexto: “Pessoal” ou “Empresarial”.
   - Login/Cadastro (uma tela com toggle, espelhando o web): email/senha e botão “Continuar com Google”.
5. Fluxo OAuth no mobile: uso de `expo-auth-session` ou `expo-web-browser` para abrir o fluxo do Supabase e voltar ao app (deep link ou scheme).
6. Persistência de sessão (AsyncStorage) e redirecionamento para o dashboard após login.

**Critério de conclusão:** Usuário consegue se cadastrar, confirmar e-mail (no web) e fazer login no app (email e Google), e ser redirecionado para o dashboard.

**Duração estimada:** 2–3 semanas.

---

## 5. Fase 2 – Navegação e layout base

**Objetivo:** Navegação por abas/drawer e layout base equivalente ao web (sidebar → bottom tabs ou drawer no mobile).

**Entregas:**

1. Definir navegação (React Navigation):
   - Stack: Auth (Login/Cadastro) → Escolha Pessoal/Empresarial.
   - Para logado: Bottom Tabs (Dashboard, Cartões, Despesas, etc.) ou Drawer, conforme UX definida.
2. Layout base:
   - Header com logo e menu (perfil, notificações, logout).
   - Reutilizar paleta e tipografia do web (cores primary/secondary; fontes Inter/Bungee se possível).
3. Telas “shell” do Dashboard (Pessoal e Empresarial):
   - Placeholder com título e mensagem “Em breve: gráficos e resumos”.
4. Tela de Perfil mínima (dados do usuário e logout).

**Critério de conclusão:** Após login, usuário navega entre Dashboard, abas principais e perfil sem erros.

**Duração estimada:** 1–2 semanas.

---

## 6. Fase 3 – Módulo Pessoal (funcionalidades web)

**Objetivo:** Reproduzir no app as telas e funções do módulo Pessoal do web.

**Entregas:**

1. **Dashboard Pessoal:**
   - Cards de totais (gastos, cartões, gastos/receitas do mês).
   - Gráficos: linha (gastos mensais), barras, pizza (despesas por categoria, investimentos por tipo) usando Victory Native ou gifted-charts.
   - Mesmas queries Supabase que o web (ou API compartilhada).
2. **Cartões:** listagem, detalhe por cartão, parcelas, inclusão de compra (formulário).
3. **Categorias:** listagem e CRUD (nome, cor, ícone).
4. **Receitas:** listagem e cadastro de receitas.
5. **Despesas (Gastos):** listagem por mês/ano, por categoria; cadastro/edição de despesa; compras recorrentes se aplicável.
6. **Investimentos:** listagem, cadastro e edição (tipo, valor investido, valor atual, data).
7. **Sonhos Infinity:** listagem de sonhos, depósitos e progresso.

**Critério de conclusão:** Usuário consegue realizar no app as mesmas ações principais que no web (consultar, criar, editar, excluir onde existir no web).

**Duração estimada:** 4–6 semanas.

---

## 7. Fase 4 – Módulo Empresarial (funcionalidades web)

**Objetivo:** Reproduzir no app as telas e funções do módulo Empresarial do web.

**Entregas:**

1. **Dashboard Empresarial:**
   - Cards (contas a pagar/receber, vendas, fornecedores, clientes, saldo).
   - Gráficos: fluxo de caixa mensal, despesas por categoria, vendas por categoria.
2. **Clientes e Fornecedores:** listagem e CRUD.
3. **Contas a pagar / Contas a receber:** listagem e registro de pagamentos.
4. **Vendas:** listagem e registro de vendas.
5. **Despesas e Compras:** listagem e cadastro.
6. **Orçamentos:** listagem, criação, edição, visualização e envio (e-mail/PDF conforme web).
7. **Fluxo de caixa:** visão consolidada (resumo e gráficos).
8. **Receitas:** conforme regras do web.

**Critério de conclusão:** Fluxos principais do módulo empresarial utilizáveis no app com mesma base de dados do web.

**Duração estimada:** 4–6 semanas.

---

## 8. Fase 5 – Polish, “Instalar app” no web e publicação

**Objetivo:** Experiência consistente, divulgação do app nas telas web e app publicado na Play Store (e preparado para App Store).

**Entregas:**

1. **Web – Opção de instalação:**
   - Criar componente `InstallAppBanner` (ou `InstallAppCta`):
     - Texto + botão “Baixar no Google Play” (e depois “Na App Store”).
     - Em mobile web: opção “Abrir no app” via deep link (ex.: `infinitylines://`).
   - Inserir o componente em:
     - `src/app/pessoal/auth/login/page.tsx` (visível em login e cadastro).
     - `src/app/empresarial/auth/login/page.tsx` (idem).
     - Layout do dashboard (Sidebar/MainLayout Pessoal e Empresarial).
   - Opcional: na home (`src/app/page.tsx`), linha “Disponível para Android e iOS”.
2. **App mobile:**
   - Deep link (Expo: `linking` no `app.json`); tratar `infinitylines://` para abrir o app (e, se possível, rota específica).
   - Ajustes de acessibilidade e feedback (loading, toasts, mensagens de erro).
   - Testes em dispositivos reais (Android e, se possível, iOS).
3. **Publicação Android:**
   - Conta Google Play Developer; configuração de assinatura (EAS).
   - Build de release (EAS Build); store listing (textos, screenshots).
   - Publicação na Play Store (interno/alfa/beta conforme estratégia).
4. **Preparação iOS:**
   - Conta Apple Developer; configuração de certificados e provisioning no EAS.
   - Build iOS e TestFlight para testes; quando aprovado, submissão à App Store.

**Critério de conclusão:** Banner/link de instalação visível nas telas combinadas; app instalável na Play Store; projeto pronto para submissão iOS.

**Duração estimada:** 2–3 semanas (Android); +1–2 para iOS (dependendo da conta e revisão).

---

## 9. Resumo do cronograma

| Fase | Conteúdo                        | Duração estimada    |
| ---- | ------------------------------- | ------------------- |
| 1    | Fundação (Expo, Supabase, auth) | 2–3 semanas         |
| 2    | Navegação e layout base         | 1–2 semanas         |
| 3    | Módulo Pessoal                  | 4–6 semanas         |
| 4    | Módulo Empresarial              | 4–6 semanas         |
| 5    | Install CTA no web + publicação | 2–3 semanas (+ iOS) |

Total aproximado: **13–20 semanas** (considerando uma pessoa e imprevistos). Fases 3 e 4 podem ter partes paralelizadas se houver mais de um dev.

---

## 10. Estrutura sugerida do projeto mobile (Expo)

```
apps/mobile/                    # ou repositório finance-control-mobile
├── app/                        # Expo Router (file-based)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── callback.tsx
│   ├── (tabs)/                 # Pessoal ou Empresarial
│   │   ├── dashboard.tsx
│   │   ├── cartoes.tsx
│   │   ├── gastos.tsx
│   │   └── ...
│   ├── _layout.tsx
│   └── index.tsx               # Escolha Pessoal / Empresarial
├── components/
├── lib/
│   ├── supabase-pessoal.ts
│   ├── supabase-empresarial.ts
│   └── utils.ts
├── hooks/
├── app.json
├── eas.json                    # EAS Build (Android/iOS)
└── package.json
```

Se usar **monorepo** (ex.: Turborepo) com o Next.js:

```
Finance_Control/
├── apps/
│   ├── web/                    # Next.js atual
│   └── mobile/                 # Expo
├── packages/
│   └── shared/                 # tipos, constantes, helpers Supabase
│       ├── types/
│       └── supabase/
└── package.json (workspace)
```

Assim, tipos e regras compartilhadas ficam em `packages/shared` e são usados por web e mobile.

---

## 11. Riscos e mitigações

| Risco                           | Mitigação                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| OAuth no mobile mais complexo   | Usar documentação Supabase para React Native e exemplos Expo (expo-auth-session + redirect URI). |
| Gráficos pesados no mobile      | Escolher lib leve (Victory Native / gifted-charts); limitar pontos no eixo do tempo.             |
| Duplicação de lógica web/mobile | Extrair queries e regras para `packages/shared` ou módulos reutilizáveis.                        |
| Revisão Apple demorada          | Preparar iOS desde a Fase 2 (builds TestFlight) e enviar para revisão assim que estável.         |

---

## 12. Próximos passos imediatos

1. Decidir: monorepo (`apps/mobile` + `packages/shared`) ou repositório separado.
2. Criar projeto Expo com TypeScript e instalar Supabase.
3. Implementar telas de login/cadastro e fluxo OAuth (Fase 1).
4. Em paralelo (ou após Fase 1): implementar o componente `InstallAppBanner` no web e inseri-lo nas telas de login, cadastro e dashboard, com link temporário “Em breve na Play Store” até a publicação.

Se quiser, na próxima etapa podemos detalhar apenas a **Fase 1** (comandos e trechos de código) ou o **componente InstallAppBanner** no Next.js.
