const express = require("express");
const CandidaturaController = require("../controllers/CandidaturaController");

const router = express.Router();

// Rotas específicas (devem vir ANTES das rotas com parâmetros)
router.get("/fretes-com-candidaturas", CandidaturaController.getFretesComCandidaturas);
router.post("/fretes/batch", CandidaturaController.getCandidaturasFretesBatch);

// Motorista se candidatar a um frete
router.post("/frete/:freteId/candidatar", CandidaturaController.createCandidatura);

// Listar candidaturas de um frete
router.get("/frete/:freteId", CandidaturaController.getCandidaturasByFrete);

// Contar candidaturas pendentes de um frete
router.get("/frete/:freteId/count", CandidaturaController.getCountCandidaturas);

// Aprovar ou recusar candidatura
router.put("/:candidaturaId/status", CandidaturaController.updateStatusCandidatura);

// Aprovar candidatura (endpoint específico)
router.put("/:candidaturaId/aprovar", CandidaturaController.aprovarCandidatura);

// Recusar candidatura (endpoint específico)
router.put("/:candidaturaId/recusar", CandidaturaController.recusarCandidatura);

// Listar candidaturas de um motorista
router.get("/motorista/:motoristaId", CandidaturaController.getCandidaturasByMotorista);

module.exports = router;