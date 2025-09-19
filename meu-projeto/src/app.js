const express = require("express");
const cors = require("cors");
const path = require("path");

const config = require("./config");
const Logger = require("./utils/logger");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const routes = require("./routes");

// Criar aplicação Express
const app = express();

// Middleware de logging
app.use(Logger.http);

// Configuração do CORS
app.use(cors(config.cors));

// Middleware para JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir arquivos estáticos
const uploadDir = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadDir));

// Rotas da API
app.use("/api", routes);

// =============================================
// BACKUP - Rotas antigas movidas para routes-backup/
// =============================================

// Middleware para rotas não encontradas
app.use(notFound);

// Middleware de tratamento de erros
app.use(errorHandler);

module.exports = app;