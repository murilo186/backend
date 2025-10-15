const express = require("express");
const ProximityController = require("../controllers/ProximityController");

const router = express.Router();

// Empresa buscar motoristas próximos
router.get("/empresa/:empresaId/motoristas", ProximityController.getMotoristasPróximos);

// Motorista buscar empresas próximas
router.get("/motorista/:motoristaId/empresas", ProximityController.getEmpresasPróximas);

// Dashboard geral de proximidade
router.get("/dashboard", ProximityController.getDashboardProximidade);

module.exports = router;