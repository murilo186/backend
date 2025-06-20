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

// Configuração do CORS
app.use(
  cors({
    origin: ["http://localhost:8081", "exp://your-ip:8081"],
    credentials: true,
  })
);

// Middleware para interpretar JSON no body
app.use(express.json({ limit: "10mb" }));

// Servir arquivos estáticos da pasta uploads
const uploadDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadDir));

// Importação das rotas
const authRoutes = require("./routes/authRoutes");
const imagemRoutes = require("./routes/imagemRoutes");

// Uso das rotas
app.use("/auth", authRoutes);
app.use("/images", imagemRoutes);

// Endpoint simples para health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Middleware para rotas não encontradas (404) — deve vir antes do middleware de erro
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
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT} - Rodando em Railway`);
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
