const express = require("express");
const ConviteController = require("../controllers/ConviteController");

const router = express.Router();

// Rotas de Convites
router.post("/", ConviteController.sendConvite); // Empresa envia convite por código
router.get("/motorista/:motoristaId", ConviteController.getConvitesByMotorista); // Motorista vê convites pendentes
router.put("/:conviteId/aceitar", ConviteController.acceptConvite); // Motorista aceita convite
router.put("/:conviteId/rejeitar", ConviteController.rejectConvite); // Motorista rejeita convite
router.get("/stats/:empresaId", ConviteController.getConviteStats); // Estatísticas de convites

module.exports = router;