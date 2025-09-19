const { Pool } = require("pg");
const config = require("./index");

let pool;

if (config.database.url) {
  pool = new Pool({
    connectionString: config.database.url,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    max: config.database.pool.max,
    idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
  });
} else {
  pool = new Pool({
    user: config.database.user,
    password: config.database.password,
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    max: config.database.pool.max,
    idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
  });
}

pool
  .query("SELECT NOW()")
  .then(() =>
    console.log("✅ Conexão com o PostgreSQL estabelecida com sucesso")
  )
  .catch((err) => {
    console.error("❌ Erro ao conectar ao PostgreSQL:", err.message);
    if (config.app.env !== "test") {
      process.exit(1);
    }
  });

pool.on("connect", () => {
  if (config.app.env === "development") {
    console.log("📊 Nova conexão estabelecida com o banco de dados");
  }
});

pool.on("error", (err) => {
  console.error("⚠️ Erro inesperado no pool do PostgreSQL:", err.message);
});

module.exports = {
  query: (text, params) => {
    if (config.app.env === "development" && config.app.debugQueries) {
      console.log(`📝 Executando query: ${text}`, params || "");
    }
    return pool.query(text, params);
  },
  getClient: async () => {
    return await pool.connect();
  },
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  end: () => pool.end(),
};