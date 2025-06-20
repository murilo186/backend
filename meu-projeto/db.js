const { Pool } = require("pg");
require("dotenv").config();

// Configuração com valores padrão para desenvolvimento
const config = {
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "sua_senha_padrao",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || "seu_banco_dev",
  max: 20, // Número máximo de clientes no pool
  idleTimeoutMillis: 30000, // Tempo que um cliente pode ficar inativo no pool
  connectionTimeoutMillis: 2000, // Tempo para tentar conectar
};

// Criação do pool com tratamento de erro
let pool;

try {
  pool = new Pool(config);

  // Testa a conexão imediatamente
  pool
    .query("SELECT NOW()")
    .then(() =>
      console.log("✅ Conexão com o PostgreSQL estabelecida com sucesso")
    )
    .catch((err) => {
      console.error("❌ Erro ao conectar ao PostgreSQL:", err.message);
      process.exit(1); // Encerra o aplicativo se não conseguir conectar
    });
} catch (err) {
  console.error("❌ Erro ao criar pool de conexões:", err.message);
  process.exit(1);
}

// Listeners para eventos do pool
pool.on("connect", () => {
  console.log("📊 Nova conexão estabelecida com o banco de dados");
});

pool.on("error", (err) => {
  console.error("⚠️ Erro inesperado no pool do PostgreSQL:", err.message);
});

module.exports = {
  query: (text, params) => {
    console.log(`📝 Executando query: ${text}`, params || "");
    return pool.query(text, params);
  },

  // Método para encerrar o pool (útil para testes)
  end: () => pool.end(),
};
