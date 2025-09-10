const express = require("express");
const cors = require("cors");
const path = require("path");

// Criando o app Express
const app = express();

// Middleware de logging para debugar as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
           
// Configuração do CORS (CORRIGIDO)                           
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para interpretar JSON no body
app.use(express.json({ limit: "10mb" }));

// Servir arquivos estáticos da pasta uploads
const uploadDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadDir));

// Importação das rotas
const authRoutes = require("./routes/authRoutes");
const imagemRoutes = require("./routes/imagemRoutes");
const fretesRoutes = require("./routes/fretesRoutes"); // Nova rota

// Uso das rotas
app.use("/api/auth", authRoutes);
app.use("/images", imagemRoutes);
app.use("/fretes", fretesRoutes); // Nova rota

// Endpoint simples para health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Backend TCC NALM GO funcionando"
  });
});

// Endpoint para testar conexão com banco
app.get("/test-db", async (req, res) => {
  try {
    const pool = require("./db");
    const result = await pool.query("SELECT NOW() as timestamp, COUNT(*) as total_empresas FROM empresas");
    res.json({
      success: true,
      database_connected: true,
      timestamp: result.rows[0].timestamp,
      total_empresas: result.rows[0].total_empresas
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      database_connected: false,
      error: err.message
    });
  }
});

// Middleware para rotas não encontradas (404) – deve vir antes do middleware de erro
app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint não encontrado" });
});

// Middleware de tratamento de erros centralizado
app.use((err, req, res, next) => {
  console.error("⚠️ Erro:", err.stack);
  res.status(500).json({
    error: "Erro interno",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor TCC NALM GO rodando em http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Test DB: http://localhost:${PORT}/test-db`);
});

// Exportação para testes ou controle externo (opcional)
module.exports = {
  app,
  server,
  start: async () => {
    return new Promise((resolve) => {
      server.on("listening", () => resolve(app));
    });
  },
  stop: () => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  },
};