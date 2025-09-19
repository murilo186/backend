const config = require("../config");
const Logger = require("../utils/logger");
const { AppError } = require("../utils/errors");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro
  Logger.error(`Error ${error.statusCode || 500}: ${error.message}`, {
    error: error.message,
    stack: config.app.env === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent")
  });

  // Erro de validação do PostgreSQL
  if (err.code === "23505") {
    const message = "Dados duplicados. Verifique se o registro já existe";
    error = new AppError(message, 409, "DUPLICATE_ENTRY");
  }

  // Erro de constraint do PostgreSQL
  if (err.code === "23503") {
    const message = "Operação não permitida. Verifique as dependências";
    error = new AppError(message, 400, "CONSTRAINT_VIOLATION");
  }

  // Erro de conexão com banco
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
    const message = "Erro de conexão com o banco de dados";
    error = new AppError(message, 503, "DATABASE_CONNECTION_ERROR");
  }

  // Erro de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    const message = "Formato JSON inválido";
    error = new AppError(message, 400, "INVALID_JSON");
  }

  // Erro personalizado da aplicação
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.field && { field: error.field }),
      ...(config.app.env === "development" && { stack: err.stack })
    });
  }

  // Erro não tratado - não expor detalhes em produção
  const message = config.app.env === "production"
    ? "Erro interno do servidor"
    : err.message;

  res.status(500).json({
    success: false,
    error: message,
    ...(config.app.env === "development" && {
      stack: err.stack,
      details: err
    })
  });
};

// Middleware para capturar erros assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware para rotas não encontradas
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    code: "NOT_FOUND"
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound
};