# 🚚 NALM GO Backend

Backend profissional para sistema de gestão de fretes e motoristas. Desenvolvido com Node.js, Express e PostgreSQL.

## 📋 Índice

- [Recursos](#recursos)
- [Tecnologias](#tecnologias)
- [Instalação Local](#instalação-local)
- [Configuração](#configuração)
- [Deploy no Render](#deploy-no-render)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Variáveis de Ambiente](#variáveis-de-ambiente)

## ✨ Recursos

- 🔐 **Autenticação e autorização** de empresas e motoristas
- 📦 **Sistema completo de fretes** (CRUD + candidaturas)
- 👥 **Gerenciamento de equipe** (motoristas e colaboradores)
- 🎯 **Sistema de convites** para motoristas
- 📊 **Dashboard com métricas** e estatísticas
- 🗺️ **Geolocalização** e cálculo de rotas
- 📈 **Relatórios financeiros** por período
- 🔄 **Pool de conexões** otimizado
- ⚡ **Graceful shutdown** e tratamento de erros

## 🛠️ Tecnologias

- **Node.js** v16+
- **Express** v5.1.0
- **PostgreSQL** (via pg)
- **bcryptjs** - Hash de senhas
- **dotenv** - Variáveis de ambiente
- **cors** - Controle de acesso
- **multer** - Upload de arquivos

## 💻 Instalação Local

### Pré-requisitos

- Node.js v16 ou superior
- PostgreSQL v12 ou superior
- npm ou yarn

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/murilo186/backend.git
cd backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**

Crie um banco PostgreSQL:
```sql
CREATE DATABASE nalm_go_db;
```

Execute as migrations em `meu-projeto/`:
- `add_empresa_campos.sql`
- `add_status_campo.sql`
- `candidaturas_table.sql`

4. **Configure as variáveis de ambiente**

Copie o arquivo de exemplo:
```bash
cp meu-projeto/.env.example meu-projeto/.env
```

Edite `meu-projeto/.env` com suas configurações.

5. **Inicie o servidor**

Desenvolvimento:
```bash
npm run dev
```

Produção:
```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`

## ⚙️ Configuração

### Arquivo .env

Configure as variáveis no arquivo `meu-projeto/.env`:

```env
# Aplicação
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=nalm_go_db
DB_USER=postgres
DB_PASSWORD=sua_senha

# Segurança
JWT_SECRET=seu-secret-super-seguro
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true
```

## 🚀 Deploy no Render

### Método 1: Usando render.yaml (Recomendado)

1. **Faça push do código para o GitHub**
```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

2. **No Render Dashboard:**
   - Clique em "New +" → "Blueprint"
   - Conecte seu repositório GitHub
   - O Render detectará automaticamente o `render.yaml`
   - Revise as configurações e clique em "Apply"

3. **Configure variáveis adicionais:**
   - `CORS_ORIGIN`: URL do seu frontend (ex: `https://seu-app.onrender.com`)
   - `JWT_SECRET`: Será gerado automaticamente

4. **Aguarde o deploy** (5-10 minutos)

### Método 2: Manual

1. **Criar Web Service**
   - New + → Web Service
   - Conecte o repositório
   - Configure:
     - **Name**: nalm-go-backend
     - **Region**: Oregon (US West)
     - **Branch**: main
     - **Root Directory**: (deixe vazio)
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

2. **Criar PostgreSQL Database**
   - New + → PostgreSQL
   - Nome: nalm-go-db
   - Região: Oregon (mesma do web service)
   - Plano: Free

3. **Conectar Database ao Web Service**
   - No Web Service, vá em Environment
   - Adicione: `DATABASE_PUBLIC_URL` → Internal Database URL

4. **Configurar variáveis de ambiente:**
```
NODE_ENV=production
APP_NAME=NALM GO Backend
HOST=0.0.0.0
CORS_ORIGIN=https://seu-frontend.onrender.com
JWT_SECRET=gere-uma-string-aleatoria-segura
BCRYPT_ROUNDS=10
DEBUG_QUERIES=false
```

### ⚠️ Importante após o Deploy

1. **Execute as migrations no banco PostgreSQL do Render**
   - Conecte ao banco via psql ou ferramenta GUI
   - Execute os arquivos SQL em ordem

2. **Atualize o frontend**
   - Configure `VITE_API_URL=https://seu-backend.onrender.com`

3. **Teste os endpoints**
```bash
# Health check
curl https://seu-backend.onrender.com/api/health

# Test database
curl https://seu-backend.onrender.com/api/test-db
```

## 📁 Estrutura do Projeto

```
backend/
├── meu-projeto/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # Configuração do PostgreSQL
│   │   │   └── index.js         # Configurações gerais
│   │   ├── controllers/         # Controladores de rotas
│   │   ├── models/              # Modelos de dados
│   │   ├── routes/              # Definição de rotas
│   │   ├── services/            # Lógica de negócio
│   │   ├── middleware/          # Middlewares personalizados
│   │   ├── utils/               # Utilitários (logger, validators)
│   │   └── app.js               # Configuração do Express
│   ├── server.js                # Entry point
│   ├── .env.example             # Exemplo de variáveis
│   └── *.sql                    # Migrations SQL
├── package.json
├── render.yaml                   # Configuração do Render
├── .gitignore
└── README.md
```

## 🌐 API Endpoints

### Autenticação
- `POST /api/auth/register-empresa` - Registrar empresa
- `POST /api/auth/login-empresa` - Login empresa
- `POST /api/auth/colaboradores` - Criar colaborador

### Fretes
- `GET /api/fretes/empresa/:id` - Listar fretes da empresa
- `POST /api/fretes` - Criar frete
- `PUT /api/fretes/:id` - Atualizar frete
- `DELETE /api/fretes/:id` - Deletar frete
- `PUT /api/fretes/:id/finalizar` - Finalizar frete

### Candidaturas
- `GET /api/candidaturas/frete/:id` - Ver candidatos
- `PUT /api/candidaturas/:id/aprovar` - Aprovar candidato
- `PUT /api/candidaturas/:id/recusar` - Recusar candidato

### Convites
- `POST /api/convites` - Enviar convite para motorista
- `GET /api/convites/empresa/:id` - Listar convites

### Empresas
- `GET /api/empresas/:id` - Dados da empresa
- `PUT /api/empresas/:id` - Atualizar empresa
- `GET /api/empresas/:id/stats` - Estatísticas

### Colaboradores
- `GET /api/auth/empresa/:id/colaboradores` - Listar colaboradores
- `PUT /api/colaboradores/:id/status` - Atualizar status

### Sistema
- `GET /api/health` - Health check
- `GET /api/test-db` - Testar conexão DB

## 🔐 Variáveis de Ambiente

### Obrigatórias em Produção
- `DATABASE_PUBLIC_URL` - URL do PostgreSQL
- `JWT_SECRET` - Secret para tokens JWT
- `NODE_ENV` - Ambiente (production)

### Opcionais
- `PORT` - Porta do servidor (padrão: 3000)
- `HOST` - Host (padrão: 0.0.0.0)
- `CORS_ORIGIN` - Origens permitidas
- `BCRYPT_ROUNDS` - Rounds do bcrypt (padrão: 10)
- `DEBUG_QUERIES` - Logar queries SQL (padrão: false)

## 🐛 Troubleshooting

### Erro de conexão com o banco
```
❌ Erro ao conectar ao PostgreSQL
```
**Solução**: Verifique se `DATABASE_PUBLIC_URL` está configurada corretamente.

### CORS bloqueando requisições
```
Access-Control-Allow-Origin error
```
**Solução**: Configure `CORS_ORIGIN` com a URL exata do frontend (sem barra final).

### Aplicação não inicia no Render
**Solução**:
- Verifique os logs no Render Dashboard
- Confirme que `npm start` funciona localmente
- Valide todas variáveis de ambiente obrigatórias

## 📝 Licença

ISC

## 👥 Autor

NALM GO Team

## 🔗 Links

- [Repositório GitHub](https://github.com/murilo186/backend)
- [Documentação Render](https://render.com/docs)
- [Issues](https://github.com/murilo186/backend/issues)
