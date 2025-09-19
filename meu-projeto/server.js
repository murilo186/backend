const app = require("./src/app");
const config = require("./src/config");
const Logger = require("./src/utils/logger");

// Tratamento de erros não capturados
process.on("uncaughtException", (err) => {
  Logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  Logger.error("Unhandled Rejection", { error: err.message, stack: err.stack });
  process.exit(1);
});

// Inicializar servidor
const server = app.listen(config.app.port, config.app.host, () => {
  Logger.info(`🚀 ${config.app.name} rodando em http://${config.app.host}:${config.app.port}`);
  Logger.info(`🌍 Ambiente: ${config.app.env}`);
  Logger.info(`📊 Health check: http://${config.app.host}:${config.app.port}/api/health`);
  Logger.info(`🔧 Test DB: http://${config.app.host}:${config.app.port}/api/test-db`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  Logger.info(`Recebido sinal ${signal}. Encerrando servidor...`);

  server.close(async () => {
    Logger.info("Servidor HTTP encerrado");

    try {
      const db = require("./src/config/database");
      await db.end();
      Logger.info("Conexões do banco de dados encerradas");
    } catch (err) {
      Logger.error("Erro ao encerrar conexões do banco", { error: err.message });
    }

    process.exit(0);
  });

  // Força o encerramento após 10 segundos
  setTimeout(() => {
    Logger.error("Forçando encerramento após timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, server };