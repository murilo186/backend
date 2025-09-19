const express = require("express");
const AuthController = require("../controllers/AuthController");

const router = express.Router();

// Rotas de Motoristas
router.post("/register-motorista", AuthController.registerMotorista);
router.post("/login-motorista", AuthController.loginMotorista);

// Rotas de Empresas
router.post("/register-empresa", AuthController.registerEmpresa);
router.post("/login-empresa", AuthController.loginEmpresa);

// Logout universal
router.post("/logout", AuthController.logout);

// Rotas específicas de empresa (para compatibilidade com frontend)
router.get("/empresa/:empresaId/colaboradores", async (req, res) => {
  try {
    const ColaboradorController = require("../controllers/ColaboradorController");
    // Ajustar parâmetros - o controller espera empresaId no params
    req.params.empresaId = req.params.empresaId;
    return await ColaboradorController.getColaboradoresByEmpresa(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/empresa/:empresaId/motoristas", async (req, res) => {
  try {
    const { empresaId } = req.params;
    const db = require("../config/database");

    const resultado = await db.query(
      `SELECT id, nome, usuario, email, codigo, status_disponibilidade, ativo, created_at
       FROM motoristas
       WHERE empresa_id = $1
       ORDER BY nome`,
      [empresaId]
    );

    res.json({
      success: true,
      motoristas: resultado.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas para colaboradores
router.post("/colaboradores", async (req, res) => {
  try {
    const ColaboradorController = require("../controllers/ColaboradorController");
    return await ColaboradorController.createColaborador(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/colaboradores/:id", async (req, res) => {
  try {
    const ColaboradorController = require("../controllers/ColaboradorController");
    return await ColaboradorController.updateColaborador(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/colaboradores/:id", async (req, res) => {
  try {
    const ColaboradorController = require("../controllers/ColaboradorController");
    return await ColaboradorController.deactivateColaborador(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;