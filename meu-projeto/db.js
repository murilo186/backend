const { Pool } = require("pg");
require("dotenv").config();

let pool;

if (process.env.DATABASE_PUBLIC_URL) {
  // Em produção Railway: usa a URL completa e habilita SSL
  pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  // Ambiente local - usa as variáveis DB separadas ou valores padrão
  pool = new Pool({
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "sua_senha_padrao",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || "seu_banco_dev",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

pool
  .query("SELECT NOW()")
  .then(() =>
    console.log("✅ Conexão com o PostgreSQL estabelecida com sucesso")
  )
  .catch((err) => {
    console.error("❌ Erro ao conectar ao PostgreSQL:", err.message);
    process.exit(1);
  });

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
  end: () => pool.end(),
};
