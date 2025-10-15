# 🚀 Guia de Deploy no Render - NALM GO Backend

## ✅ Checklist Pré-Deploy

Antes de fazer o deploy, confirme que:

- [x] ✅ Código está funcionando localmente
- [x] ✅ `.gitignore` criado (não commitar `.env`, `node_modules`)
- [x] ✅ `render.yaml` configurado
- [x] ✅ `.env.example` atualizado com todas as variáveis
- [x] ✅ README.md completo com documentação
- [x] ✅ `package.json` com scripts corretos
- [x] ✅ Banco PostgreSQL testado localmente

## 📦 Passo 1: Preparar o Repositório Git

### Se ainda não tem repositório Git:

```bash
cd C:\nalmgoo\backend

# Inicializar Git
git init

# Adicionar arquivos
git add .

# Primeiro commit
git commit -m "Initial commit: Backend NALM GO pronto para deploy"

# Conectar ao GitHub
git remote add origin https://github.com/murilo186/backend.git

# Push para o GitHub
git branch -M main
git push -u origin main
```

### Se já tem repositório Git:

```bash
cd C:\nalmgoo\backend

# Adicionar novos arquivos
git add .

# Commit
git commit -m "Adicionar configurações para deploy no Render"

# Push
git push origin main
```

## 🎯 Passo 2: Deploy no Render

### Opção A: Deploy Automático via Blueprint (RECOMENDADO)

1. **Acesse** [render.com](https://render.com) e faça login

2. **Clique em "New +"** → **"Blueprint"**

3. **Conecte seu GitHub**
   - Autorize o Render a acessar seus repositórios
   - Selecione o repositório `backend`

4. **Render detectará automaticamente o `render.yaml`**
   - Revise as configurações
   - Clique em **"Apply"**

5. **O Render criará automaticamente:**
   - ✅ Web Service (API Backend)
   - ✅ PostgreSQL Database
   - ✅ Variáveis de ambiente conectadas

6. **Aguarde o deploy** (5-10 minutos)

### Opção B: Deploy Manual

#### 2.1 - Criar o Banco de Dados PostgreSQL

1. No Render Dashboard, clique **"New +"** → **"PostgreSQL"**

2. Configure:
   - **Name**: `nalm-go-db`
   - **Database**: `nalm_go_db`
   - **User**: `nalm_go_user`
   - **Region**: `Oregon (US West)`
   - **Plan**: `Free`

3. Clique em **"Create Database"**

4. **Aguarde a criação** (~2 minutos)

5. **Anote a "Internal Database URL"** - você usará em breve

6. **Execute as migrations**:
   - Clique em "Connect" → "External Connection"
   - Use um cliente PostgreSQL (psql, DBeaver, pgAdmin)
   - Execute os arquivos SQL na ordem:
     ```sql
     -- 1. Estrutura de empresas
     \i meu-projeto/add_empresa_campos.sql

     -- 2. Status de colaboradores
     \i meu-projeto/add_status_campo.sql

     -- 3. Sistema de candidaturas
     \i meu-projeto/candidaturas_table.sql
     ```

#### 2.2 - Criar o Web Service

1. No Render Dashboard, clique **"New +"** → **"Web Service"**

2. Conecte seu repositório GitHub:
   - Selecione o repositório `backend`

3. Configure o serviço:
   - **Name**: `nalm-go-backend`
   - **Region**: `Oregon (US West)` (mesma do banco!)
   - **Branch**: `main`
   - **Root Directory**: (deixe vazio)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. Clique em **"Advanced"** e adicione as variáveis de ambiente:

```env
NODE_ENV=production
APP_NAME=NALM GO Backend
HOST=0.0.0.0
DATABASE_PUBLIC_URL=[COLAR A INTERNAL DATABASE URL AQUI]
CORS_ORIGIN=https://seu-frontend.onrender.com
CORS_CREDENTIALS=true
JWT_SECRET=GERE_UMA_STRING_ALEATORIA_LONGA_E_SEGURA_AQUI
BCRYPT_ROUNDS=10
DEBUG_QUERIES=false
LOG_LEVEL=info
```

⚠️ **Importante**:
- Gere um JWT_SECRET forte: `openssl rand -base64 32` ou use um gerador online
- Substitua `seu-frontend.onrender.com` pela URL real do frontend (ou use `*` temporariamente)

5. Clique em **"Create Web Service"**

6. **Aguarde o build e deploy** (5-10 minutos)

## 🧪 Passo 3: Testar o Deploy

### 3.1 - Verificar Logs

No Render Dashboard:
- Abra seu Web Service
- Vá em **"Logs"**
- Procure por:
  ```
  ✅ Conexão com o PostgreSQL estabelecida com sucesso
  🚀 NALM GO Backend rodando em http://0.0.0.0:10000
  ```

### 3.2 - Testar Endpoints

Sua API estará disponível em: `https://nalm-go-backend.onrender.com`

**Health Check:**
```bash
curl https://nalm-go-backend.onrender.com/api/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2025-10-15T...",
  "uptime": 123.45,
  "environment": "production"
}
```

**Database Check:**
```bash
curl https://nalm-go-backend.onrender.com/api/test-db
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Conexão com banco de dados funcionando!",
  "timestamp": "..."
}
```

### 3.3 - Testar Registro de Empresa

```bash
curl -X POST https://nalm-go-backend.onrender.com/api/auth/register-empresa \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Empresa Teste",
    "email": "teste@empresa.com",
    "senha": "senha123",
    "cnpj": "12345678000100"
  }'
```

## 🔧 Passo 4: Conectar o Frontend

No seu projeto frontend (`my-frete-app`):

1. **Crie o arquivo `.env`:**

```env
VITE_API_URL=https://nalm-go-backend.onrender.com
```

2. **Atualize `apiService.js`** para usar a variável:

```javascript
constructor() {
  this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
}
```

3. **Atualize CORS no backend** (se necessário):
   - No Render, vá em Environment
   - Edite `CORS_ORIGIN` para incluir a URL do frontend
   - Exemplo: `https://meu-frontend.onrender.com,http://localhost:5173`

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

**Causa**: DATABASE_PUBLIC_URL incorreta ou banco não criado

**Solução**:
1. Verifique se o banco PostgreSQL está rodando
2. Confirme que a URL do banco está correta em Environment Variables
3. Use a "Internal Database URL" (não a Externa)

### Erro: "Port already in use"

**Causa**: Render usa porta dinâmica, não 3000

**Solução**: O código já está correto, usa `process.env.PORT`

### Erro: CORS bloqueando requisições

**Causa**: Frontend não está na lista de origens permitidas

**Solução**:
1. Adicione a URL do frontend em `CORS_ORIGIN`
2. Formato: `https://frontend.onrender.com` (sem barra no final)
3. Para desenvolvimento: `https://frontend.onrender.com,http://localhost:5173`

### Build falha: "Cannot find module"

**Causa**: Dependências não instaladas

**Solução**:
1. Confirme que `package.json` está na raiz do repositório
2. Build Command deve ser `npm install`
3. Limpe o cache do Render (Settings → Clear Build Cache)

### Aplicação fica "Deploying" eternamente

**Causa**: Servidor não está aceitando conexões

**Solução**:
1. Verifique os logs para erros
2. Confirme que HOST está como `0.0.0.0` (não localhost)
3. Verifique se todas variáveis obrigatórias estão configuradas

### Erro 503: Service Unavailable

**Causa**: Aplicação crashou ou não iniciou

**Solução**:
1. Veja os logs para stack trace
2. Verifique se migrations foram executadas
3. Teste localmente com `NODE_ENV=production npm start`

## 📊 Monitoramento

### Logs em Tempo Real

No Render Dashboard → Seu Web Service → **"Logs"**

### Métricas

No Render Dashboard → Seu Web Service → **"Metrics"**
- CPU Usage
- Memory Usage
- Request Count
- Response Time

### Reiniciar Serviço

Se necessário:
- Settings → **"Manual Deploy"** → "Clear build cache & deploy"

## 🔄 Atualizações Futuras

Para atualizar o backend:

```bash
# Faça suas alterações no código
git add .
git commit -m "Descrição das alterações"
git push origin main
```

O Render fará deploy automático a cada push!

## 📝 Variáveis de Ambiente - Referência Completa

### Obrigatórias em Produção:
```
NODE_ENV=production
DATABASE_PUBLIC_URL=postgresql://...
JWT_SECRET=string-aleatoria-segura
HOST=0.0.0.0
```

### Recomendadas:
```
APP_NAME=NALM GO Backend
CORS_ORIGIN=https://seu-frontend.com
CORS_CREDENTIALS=true
BCRYPT_ROUNDS=10
DEBUG_QUERIES=false
LOG_LEVEL=info
```

### Opcionais:
```
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
CONVITE_EXPIRE_HOURS=24
```

## 🎉 Conclusão

Seu backend agora está rodando em produção no Render!

**Próximos passos:**
1. ✅ Deploy do frontend
2. ✅ Conectar frontend ao backend
3. ✅ Configurar domínio customizado (opcional)
4. ✅ Configurar SSL (já incluído no Render)
5. ✅ Monitorar logs e métricas

**URLs importantes:**
- Backend API: `https://nalm-go-backend.onrender.com`
- Health Check: `https://nalm-go-backend.onrender.com/api/health`
- Render Dashboard: `https://dashboard.render.com`

---

💡 **Dica**: O plano Free do Render hiberna após 15 minutos de inatividade. A primeira requisição pode demorar ~30 segundos para acordar o serviço.

🆘 **Suporte**: Se tiver problemas, abra uma issue no GitHub!
