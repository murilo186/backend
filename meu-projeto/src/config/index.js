require("dotenv").config();

const config = {
  app: {
    name: process.env.APP_NAME || "NALM GO Backend",
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || "0.0.0.0",
    debugQueries: process.env.DEBUG_QUERIES === "true",
  },

  database: {
    url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_DATABASE || process.env.DB_NAME || "nalm_go_db",
    user: process.env.DB_USER || process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    ssl: process.env.DATABASE_PUBLIC_URL ? true : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT, 10) || 2000,
    },
  },

  cors: {
    origin: function (origin, callback) {
      // Permitir requisições sem origin (como apps mobile, Postman, etc)
      if (!origin) return callback(null, true);

      // Lista de origens permitidas
      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
        : [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://nalm-go-frontend.onrender.com"
          ];

      // Verificar se a origem está na lista ou se é um padrão permitido
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-requested-with", "Accept"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 600, // Cache preflight por 10 minutos
  },

  uploads: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(",") || [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf"
    ],
    destination: process.env.UPLOAD_DESTINATION || "uploads/",
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  business: {
    codigoMotorista: {
      length: 7, // 2 letras + 5 números
      letters: 2,
      numbers: 5,
    },
    conviteExpireHours: parseInt(process.env.CONVITE_EXPIRE_HOURS, 10) || 24,
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "combined",
  },
};

// Validação de configurações críticas
if (config.app.env === "production") {
  const requiredEnvVars = [
    "DATABASE_PUBLIC_URL",
    "JWT_SECRET",
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    console.error("❌ Variáveis de ambiente obrigatórias em produção:", missing.join(", "));
    process.exit(1);
  }
}

module.exports = config;