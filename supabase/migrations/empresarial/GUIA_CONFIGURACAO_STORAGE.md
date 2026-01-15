# Guia de Configuração do Supabase Storage

Este guia explica como configurar o Storage do Supabase para permitir upload de imagens (logos e avatares).

## Passo 1: Criar os Buckets

1. Acesse o dashboard do Supabase
2. Vá em **Storage** no menu lateral
3. Clique em **"New bucket"** ou **"Criar bucket"**

### Bucket 1: `Logo`

- **Nome**: `Logo` (com L maiúsculo - case-sensitive)
- **Público**: ✅ **SIM** (marque como público)
- **Descrição**: Armazena logos de empresas e templates de orçamento

### Bucket 2: `avatars`

- **Nome**: `avatars`
- **Público**: ✅ **SIM** (marque como público)
- **Descrição**: Armazena fotos de perfil dos usuários

## Passo 2: Executar as Políticas SQL

1. No dashboard do Supabase, vá em **SQL Editor**
2. Abra o arquivo `016_configurar_storage.sql`
3. Copie e cole o conteúdo no editor
4. Clique em **"Run"** ou **"Executar"**

Isso criará as políticas de segurança que permitem:

- ✅ Leitura pública dos arquivos
- ✅ Upload apenas para usuários autenticados
- ✅ Atualização/exclusão apenas pelo próprio usuário

## Passo 3: Verificar a Configuração

Após executar o SQL, verifique:

1. **Storage > Buckets**: Os buckets `Logo` e `avatars` devem estar visíveis
2. **Storage > Policies**: As políticas devem estar listadas para cada bucket

## Estrutura de Pastas

Os arquivos são organizados da seguinte forma:

```
logo/
  └── {user_id}/
      └── logo-empresa-{timestamp}.{ext}
      └── logo-template-{timestamp}.{ext}

avatars/
  └── {user_id}/
      └── {user_id}-{timestamp}.jpg
```

## Solução de Problemas

### Erro: "Bucket not found"

- ✅ Certifique-se de que os buckets foram criados manualmente
- ✅ Verifique se os nomes estão exatamente: `Logo` (com L maiúsculo) e `avatars` (minúsculas)

### Erro: "new row violates row-level security policy"

- ✅ Execute o arquivo `016_configurar_storage.sql` para criar as políticas
- ✅ Verifique se o usuário está autenticado

### Erro: "The resource already exists"

- ✅ Isso é normal se você tentar criar o bucket novamente
- ✅ O bucket já existe, pode continuar

### Imagens não aparecem

- ✅ Verifique se o bucket está marcado como **Público**
- ✅ Verifique se as políticas de SELECT foram criadas
- ✅ Verifique a URL gerada no console do navegador

## Teste Manual

Para testar se está funcionando:

1. Faça login na aplicação
2. Vá em **Perfil**
3. Tente fazer upload de uma logo
4. Se funcionar, a imagem deve aparecer imediatamente

## Notas Importantes

- ⚠️ Buckets públicos permitem que qualquer pessoa com a URL acesse o arquivo
- ⚠️ As políticas garantem que apenas o dono pode modificar/excluir
- ⚠️ O tamanho máximo de arquivo é configurado no Supabase (padrão: 50MB)
- ⚠️ Formatos suportados: JPG, PNG, GIF, WebP, etc.
