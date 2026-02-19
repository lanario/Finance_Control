# Configuração do Android SDK (Windows)

Quando você roda `npx expo start --android` e vê:

```
Failed to resolve the Android SDK path. Default install location not found: C:\Users\alanb\AppData\Local\Android\Sdk.
Use ANDROID_HOME to set the Android SDK location.
Error: 'adb' não é reconhecido como um comando interno ou externo.
```

**Causa:** o Android SDK não está instalado ou o Windows não sabe onde ele está (variável `ANDROID_HOME` não definida e `adb` fora do `PATH`).

---

## Solução rápida (escolha uma)

| Situação | O que fazer |
|----------|-------------|
| **Ainda não instalei o Android Studio** | Use a **Opção 1** abaixo (rodar no navegador ou no celular com Expo Go). |
| **Já instalei o Android Studio** | Use a **Opção 2**: defina `ANDROID_HOME` e o `PATH` (script ou variáveis permanentes). Depois **abra um novo terminal** e rode `npx expo start --android` de novo. |
| **SDK instalado em outro pasta** | Defina `ANDROID_HOME` com o caminho real da pasta do SDK (ex.: `D:\Android\Sdk`) e inclua `%ANDROID_HOME%\platform-tools` no `PATH`. |

---

Siga uma das opções abaixo em detalhe.

---

## Opção 1: Usar o app no navegador ou no celular (sem instalar o SDK)

Enquanto o SDK não estiver configurado, você pode rodar o app assim:

- **No navegador:** na pasta `apps/mobile`, execute:
  ```bash
  npm run web
  ```
  Ou, com `npx expo start`, pressione **`w`** no terminal para abrir a versão web.

- **No celular (Android ou iPhone):** instale o app **Expo Go** na loja. Passo a passo completo (QR code, tunnel, troubleshooting): **[Rodar no Expo Go – Passo a passo](EXPO_GO_PASSO_A_PASSO.md)**. Em resumo: em `apps/mobile` rode `npm run start:go` (ou `npx expo start`) e escaneie o QR code. Não é necessário Android SDK no PC.

---

## Opção 2: Instalar o Android SDK e configurar ANDROID_HOME

### Passo 1: Instalar o Android Studio

1. Baixe o [Android Studio](https://developer.android.com/studio) para Windows.
2. Execute o instalador e conclua o assistente.
3. Na primeira abertura, use **Setup Wizard** e instale:
   - **Android SDK**
   - **Android SDK Platform** (pelo menos uma versão, ex.: API 34)
   - **Android Virtual Device (AVD)** se quiser emulador

O SDK costuma ser instalado em:
`C:\Users\<SEU_USUARIO>\AppData\Local\Android\Sdk`

### Passo 2: Definir as variáveis de ambiente no Windows

**Método A – Script (recomendado para testar agora)**

Na **raiz do repositório** (pasta `Finance_Control`), no PowerShell:

```powershell
.\scripts\set-android-env.ps1
```

Se o script mostrar "ANDROID_HOME definido para esta sessão", no **mesmo** PowerShell:

```powershell
cd apps\mobile
npx expo start --android
```

Se o script avisar que o SDK não foi encontrado, instale o Android Studio primeiro (Passo 1) ou use o Método B com o caminho onde você instalou o SDK.

**Método B – Variáveis permanentes no sistema**

1. Pressione **Win + R**, digite `sysdm.cpl` e Enter.
2. Aba **Avançado** → **Variáveis de Ambiente**.
3. Em **Variáveis do usuário**, clique em **Novo**:
   - Nome: `ANDROID_HOME`
   - Valor: `C:\Users\alanb\AppData\Local\Android\Sdk`  
     (troque `alanb` pelo seu usuário do Windows se for diferente)
4. Edite a variável **Path** e adicione:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
5. Confirme com OK em todas as janelas.
6. **Feche e abra de novo** o terminal (ou o Cursor) para carregar as variáveis.

### Passo 3: Conferir

Em um **novo** PowerShell:

```powershell
echo $env:ANDROID_HOME
# Deve mostrar: C:\Users\alanb\AppData\Local\Android\Sdk

adb version
# Deve mostrar a versão do adb
```

Se aparecer o caminho e a versão do `adb`, rode de novo no projeto:

```bash
cd apps/mobile
npx expo start --android
```

---

## Resumo

| Objetivo              | Ação |
|-----------------------|------|
| Ver o app sem SDK     | `apps/mobile` → `npm run web` ou pressionar `w` no Expo. |
| Ver no celular        | Expo Go + QR code (não precisa de SDK no PC). |
| Emulador Android no PC | Instalar Android Studio, configurar `ANDROID_HOME` e `Path` como acima. |
