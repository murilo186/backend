const express = require("express");
const cors = require("cors");
const path = require("path");

// Middlewares primeiro
const app = express();
app.use(
  cors({
    origin: ["http://localhost:8081", "exp://your-ip:8081"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

const uploadDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadDir));
// Importação de rotas (verificação opcional)
const authRoutes = require("./routes/authRoutes");
const imagemRoutes = require("./routes/imagemRoutes");

console.assert(
  typeof authRoutes === "function",
  "authRoutes deve ser uma função"
);
console.assert(
  typeof imagemRoutes === "function",
  "imagemRoutes deve ser uma função"
);

// Rotas
app.use("/auth", authRoutes);
app.use("/images", imagemRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Tratamento de erros centralizado
app.use((err, req, res, next) => {
  console.error("⚠️ Erro:", err.stack);
  res.status(500).json({
    error: "Erro interno",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
});

// Inicialização
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}
   Rodando em railway`);
});

// Exportação para testes e outros usos
module.exports = {
  app,
  server, // Para controle de shutdown
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
