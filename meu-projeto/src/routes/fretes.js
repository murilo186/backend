const express = require("express");
const FreteController = require("../controllers/FreteController");

const router = express.Router();

// Rotas de Fretes para Empresas
router.post("/", FreteController.createFrete);
router.get("/empresa/:empresaId", FreteController.getFretesByEmpresa);
router.get("/:freteId", FreteController.getFreteById);
router.put("/:freteId", FreteController.updateFrete);
router.delete("/:freteId", FreteController.deleteFrete);

// Ofertas de Fretes
router.post("/:freteId/oferecer", FreteController.offerFreteToMotorista);
router.get("/motorista/:motoristaId/oferecidos", FreteController.getOfertasForMotorista);

// Rotas Mobile App específicas
router.get("/motorista/:motoristaId/ativos", FreteController.getFretesAtivosMotorista);
router.get("/motorista/:motoristaId/historico", FreteController.getHistoricoMotorista);

// Ações do Motorista
router.put("/:freteId/aceitar", FreteController.acceptFrete);
router.put("/:freteId/recusar", FreteController.rejectFrete);

// Finalização e Status
router.put("/:freteId/finalizar", FreteController.finalizarFrete);
router.put("/motorista/:id/status", FreteController.updateMotoristaStatus);

// Estatísticas
router.get("/stats", FreteController.getStats);

module.exports = router;
