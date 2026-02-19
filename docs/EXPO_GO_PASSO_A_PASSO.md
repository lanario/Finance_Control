# Rodar o app no celular com Expo Go (passo a passo)

Este guia leva você do zero até o app **Infinity Lines** aberto no **Expo Go** no celular, com o QR code funcionando.

---

## Pré-requisitos

- [ ] **Expo Go** instalado no celular ( [Android – Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iPhone – App Store](https://apps.apple.com/app/expo-go/id982107779) )
- [ ] **Node.js** instalado no PC (projeto já usa npm)
- [ ] **Celular e PC na mesma rede Wi‑Fi** (recomendado para conexão “LAN”). Se não der, use o modo **tunnel** no passo 4.

---

## Passo 1: Abrir o terminal na pasta do app mobile

No terminal (PowerShell ou CMD), vá até a pasta do app:

```bash
cd "c:\Users\alanb\Documents\1. Projetos\1. Infinity\Finance_Control\apps\mobile"
```

Se você estiver na raiz do repositório (`Finance_Control`):

```bash
cd apps\mobile
```

---

## Passo 2: Instalar dependências (se ainda não fez)

Na pasta `apps/mobile`:

```bash
npm install
```

Aguarde terminar. Se já rodou antes, pode pular para o passo 3.

---

## Passo 3: Iniciar o servidor do Expo

Na mesma pasta `apps/mobile`, execute:

```bash
npm run start:go
```

Ou, sem usar o script:

```bash
npx expo start
```

**Não use** `npm run start` (ele abre direto no navegador e o QR code pode não aparecer em destaque).

- Deve aparecer no terminal:
  - **Metro Bundler** subindo
  - Um **QR code** em ASCII
  - Algo como: “Metro waiting on exp://192.168.x.x:8081” (o IP pode mudar)
- **Deixe esse terminal aberto** o tempo em que quiser usar o app no celular.

---

## Passo 4: Escanear o QR code no celular

### Android (Expo Go)

1. Abra o app **Expo Go**.
2. Toque em **“Scan QR code”** (ou no ícone de câmera).
3. Aponte a câmera para o **QR code que está no terminal** (na tela do PC).
4. Toque na notificação ou no link que aparecer para abrir o projeto no Expo Go.

### iPhone (Expo Go)

1. Abra o app **Câmera** do iPhone.
2. Aponte para o **QR code no terminal**.
3. Toque na notificação que aparecer em cima para abrir no Expo Go.

Se o QR code do terminal estiver pequeno ou difícil de ler, use a opção **tunnel** (passo 5).

---

## Passo 5: Se não conectar (mesma rede) – usar tunnel

Quando o celular e o PC estão em redes diferentes ou o QR code “LAN” não conecta:

1. No terminal onde o Expo está rodando, pressione **`s`** para abrir o menu de opções (ou feche com Ctrl+C e rode de novo com tunnel).
2. Ou **pare o servidor** (Ctrl+C) e inicie em modo tunnel:

   ```bash
   npx expo start --tunnel
   ```

3. Aguarde aparecer a mensagem tipo “Tunnel ready” e um **novo QR code**.
4. Escaneie esse novo QR code com o Expo Go (Android) ou com a Câmera (iPhone).

No modo tunnel o Expo usa um serviço na nuvem; celular e PC não precisam estar na mesma Wi‑Fi. A primeira vez pode demorar um pouco mais para abrir.

---

## Passo 6: Abrir o app no Expo Go

Depois de escanear o QR code:

- O Expo Go deve abrir e carregar o projeto **mobile** (Infinity Lines).
- Na primeira vez pode levar alguns segundos (bundling).
- Quando terminar, você deve ver a tela inicial do app (escolha Pessoal / Empresarial).

Se aparecer erro de “Unable to connect” ou “Network response timed out”, volte ao **passo 5** e use `npx expo start --tunnel`.

---

## Resumo dos comandos

| O que fazer              | Comando (dentro de `apps/mobile`) |
|--------------------------|------------------------------------|
| Subir servidor + QR code | `npm run start:go` ou `npx expo start` |
| Usar tunnel (conexão mais garantida) | `npx expo start --tunnel` |
| Limpar cache (se der erro estranho)  | `npx expo start -c` ou `npx expo start --tunnel -c` |

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| **“[Worklets] Mismatch between JavaScript part and native part (0.7.3 vs 0.5.1)”** | O projeto já está corrigido com `overrides` no `package.json` para usar Worklets 0.5.1. Rode `npm install` em `apps/mobile` e depois `npx expo start -c` (limpar cache). Feche o Expo Go no celular e escaneie o QR code de novo. |
| **Rotas não funcionam no celular (web funciona)** | Foi adicionado `metro.config.js`, `scheme` no app.config, rotas em formato `/login` e `unstable_settings.initialRouteName` no layout. Rode `npx expo start -c` em `apps/mobile`, feche o app no celular e abra de novo pelo QR code. |
| QR code não aparece | Use `npm run start:go` ou `npx expo start` (evite `npm run start`, que prioriza web). |
| “Unable to connect” / timeout | Celular e PC na mesma Wi‑Fi, ou use `npx expo start --tunnel`. |
| “Something went wrong” no app | No terminal, rode `npx expo start -c` (clear cache) e escaneie o QR code de novo. |
| Firewall bloqueando | Permita o Node/Metro no firewall do Windows ou use `--tunnel`. |
| Expo Go pede atualização | Atualize o Expo Go na loja (Android/iPhone). |

---

## Checklist rápido

1. [ ] Expo Go instalado no celular  
2. [ ] Terminal em `apps/mobile`  
3. [ ] `npm install` (se necessário)  
4. [ ] `npm run start:go` ou `npx expo start` (ou `npx expo start --tunnel`)  
5. [ ] QR code visível no terminal  
6. [ ] Escanear com Expo Go (Android) ou Câmera (iPhone)  
7. [ ] App Infinity Lines aberto no celular  

Com isso, o passo a passo para rodar no Expo Go e usar o QR code de forma funcional está completo.
