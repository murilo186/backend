const express = require("express");
const ColaboradorController = require("../controllers/ColaboradorController");

const router = express.Router();

// Rotas de Colaboradores
router.post("/", ColaboradorController.createColaborador); // Criar colaborador
router.get("/empresa/:empresaId", ColaboradorController.getColaboradoresByEmpresa); // Listar colaboradores da empresa
router.put("/:id", ColaboradorController.updateColaborador); // Atualizar colaborador
router.put("/:id/status", ColaboradorController.updateStatusTrabalho); // Atualizar status de trabalho
router.delete("/:id", ColaboradorController.deactivateColaborador); // Remover colaborador (desativar)
router.get("/stats/:empresaId", ColaboradorController.getColaboradorStats); // Estatísticas

module.exports = router;