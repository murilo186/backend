# Deploy no Render - NALM GO Backend

## Problema CORS Resolvido

O erro de CORS que estava ocorrendo foi causado pela configuração incorreta da variável de ambiente `CORS_ORIGIN` no Render.

## Configurações no Render

### 1. Variáveis de Ambiente

No painel do Render (https://dashboard.render.com), acesse seu serviço backend e configure as seguintes variáveis de ambiente:

#### Obrigatórias:

```
NODE_ENV=production
DATABASE_PUBLIC_URL=postgresql://usuario:senha@host:porta/database
JWT_SECRET=sua_chave_secreta_super_segura
CORS_ORIGIN=https://nalm-go-frontend.onrender.com
```

#### Opcionais (mas recomendadas):

```
PORT=3000
HOST=0.0.0.0
CORS_CREDENTIALS=true
LOG_LEVEL=info
BCRYPT_ROUNDS=10
CONVITE_EXPIRE_HOURS=24
```

### 2. Como adicionar/editar variáveis de ambiente no Render:

1. Acesse https://dashboard.render.com
2. Clique no seu serviço backend
3. Vá em **Environment** no menu lateral
4. Adicione ou edite as variáveis
5. Clique em **Save Changes**
6. O Render fará automaticamente o redeploy

### 3. Importante sobre CORS_ORIGIN:

- Se você tiver **múltiplos domínios** (produção + desenvolvimento), use:
  ```
  CORS_ORIGIN=https://nalm-go-frontend.onrender.com,http://localhost:5173
  ```
  (separados por vírgula, sem espaços)

- Se quiser permitir **qualquer origem** (NÃO recomendado em produção):
  ```
  CORS_ORIGIN=*
  ```

### 4. Verificar DATABASE_PUBLIC_URL:

O Render disponibiliza automaticamente a variável `DATABASE_PUBLIC_URL` quando você conecta um banco PostgreSQL. Certifique-se de que:

1. Você criou um banco PostgreSQL no Render
2. Conectou o banco ao seu serviço backend
3. A variável `DATABASE_PUBLIC_URL` está visível nas Environment Variables

### 5. Testar após deploy:

Após fazer as alterações e o redeploy:

1. Acesse o health check: `https://nalm-go-backend.onrender.com/api/health`
2. Teste a conexão com o banco: `https://nalm-go-backend.onrender.com/api/test-db`
3. Abra o console do navegador no frontend e verifique se os erros de CORS sumiram

## Logs

Para verificar se está funcionando:

1. No painel do Render, vá em **Logs**
2. Procure por mensagens como:
   - `🚀 NALM GO Backend rodando em...`
   - Erros de CORS (não devem mais aparecer)
   - Conexões bem-sucedidas com o banco

## Dica de Segurança

Nunca compartilhe suas variáveis de ambiente reais (especialmente `DATABASE_PUBLIC_URL` e `JWT_SECRET`) publicamente ou em commits do Git!

## Rollback

Se algo der errado, você pode reverter para um deploy anterior:

1. No Render, vá em **Events**
2. Encontre um deploy que funcionava
3. Clique em **Rollback**
