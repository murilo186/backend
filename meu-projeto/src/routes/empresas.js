const express = require("express");
const EmpresaController = require("../controllers/EmpresaController");

const router = express.Router();

// Rotas de Empresas
router.get("/:id", EmpresaController.getEmpresaById); // Obter dados da empresa
router.put("/:id", EmpresaController.updateEmpresa); // Atualizar dados da empresa
router.post("/:id/coordenadas", EmpresaController.updateCoordenadas); // Atualizar coordenadas
router.get("/:id/stats", EmpresaController.getEmpresaStats); // Estatísticas da empresa

module.exports = router;