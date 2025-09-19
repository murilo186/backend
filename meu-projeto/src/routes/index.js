const express = require("express");
const authRoutes = require("./auth");
const fretesRoutes = require("./fretes");
const convitesRoutes = require("./convites");
const colaboradoresRoutes = require("./colaboradores");
const motoristasRoutes = require("./motoristas");
const empresasRoutes = require("./empresas");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "NALM GO Backend funcionando",
    version: "2.0.0"
  });
});

// Test database connection
router.get("/test-db", async (req, res) => {
  try {
    const db = require("../config/database");
    const result = await db.query("SELECT NOW() as timestamp, COUNT(*) as total_empresas FROM empresas");
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

// Mount sub-routes
router.use("/auth", authRoutes);
router.use("/fretes", fretesRoutes);
router.use("/convites", convitesRoutes);
router.use("/colaboradores", colaboradoresRoutes);
router.use("/motoristas", motoristasRoutes);
router.use("/empresas", empresasRoutes);

module.exports = router;