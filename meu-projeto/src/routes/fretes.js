const express = require("express");
const FreteController = require("../controllers/FreteController");
const GeocodingService = require("../services/GeocodingService");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// Rotas específicas (devem vir ANTES das rotas com parâmetros)
router.get("/terceirizados", FreteController.getFretesTerceirizados);
router.get("/stats", FreteController.getStats);
router.get("/receita/:empresaId", (req, res, next) => {
  console.log("🔥🔥🔥 ROTA /receita/:empresaId FOI CHAMADA!", req.params);
  next();
}, FreteController.getReceitaPorPeriodo);
router.get("/top-rotas-lucrativas/:empresaId", FreteController.getTopRotasLucrativas);
router.get("/top-rotas-usadas/:empresaId", FreteController.getTopRotasUsadas);
router.get("/estatisticas/:empresaId", FreteController.getEstatisticasDetalhadas);

// Rotas de Fretes para Empresas
router.post("/", FreteController.createFrete);
router.get("/empresa/:empresaId", FreteController.getFretesByEmpresa);

// Rotas Mobile App específicas
router.get("/motorista/:motoristaId/ativos", FreteController.getFretesAtivosMotorista);
router.get("/motorista/:motoristaId/historico", FreteController.getHistoricoMotorista);
router.get("/motorista/:motoristaId/oferecidos", FreteController.getOfertasForMotorista);

// DEBUG - Verificar frete específico
router.get("/debug/:freteId", FreteController.debugFrete);

// Rotas com parâmetros genéricos (devem vir DEPOIS das específicas)
router.get("/:freteId", FreteController.getFreteById);
router.put("/:freteId", FreteController.updateFrete);
router.delete("/:freteId", FreteController.deleteFrete);

// Calcular distância entre cidades
router.post("/calcular-distancia", asyncHandler(async (req, res) => {
  const { origem, destino } = req.body;

  if (!origem || !destino) {
    return res.status(400).json({
      success: false,
      error: "Origem e destino são obrigatórios"
    });
  }

  const resultado = await GeocodingService.calcularDistancia(origem, destino);

  if (!resultado) {
    return res.status(400).json({
      success: false,
      error: "Não foi possível calcular a distância entre as cidades"
    });
  }

  res.json({
    success: true,
    data: resultado
  });
}));

// Ofertas de Fretes
router.post("/:freteId/oferecer", FreteController.offerFreteToMotorista);

// Ações do Motorista
router.put("/:freteId/aceitar", FreteController.acceptFrete);
router.put("/:freteId/recusar", FreteController.rejectFrete);

// Finalização e Status
router.put("/:freteId/finalizar", FreteController.finalizarFrete);
router.put("/motorista/:id/status", FreteController.updateMotoristaStatus);

module.exports = router;
