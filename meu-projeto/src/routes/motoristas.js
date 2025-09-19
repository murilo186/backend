const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const MotoristaModel = require("../models/MotoristaModel");
const Logger = require("../utils/logger");

const router = express.Router();

// Listar motoristas da equipe de uma empresa
const getMotoristasByEmpresa = asyncHandler(async (req, res) => {
  const { empresaId } = req.params;

  Logger.info("Listando motoristas da empresa", { empresaId });

  const motoristas = await MotoristaModel.findByEmpresa(empresaId);

  res.json({
    success: true,
    motoristas
  });
});

// Atualizar status do motorista
const updateMotoristaStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status_disponibilidade } = req.body;

  Logger.info("Atualizando status do motorista", { id, status_disponibilidade });

  const motorista = await MotoristaModel.updateStatus(id, status_disponibilidade);

  res.json({
    success: true,
    message: "Status atualizado",
    motorista
  });
});

// Buscar motorista por ID
const getMotoristaById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const motorista = await MotoristaModel.findById(id);

  if (!motorista) {
    return res.status(404).json({
      success: false,
      error: "Motorista não encontrado"
    });
  }

  res.json({
    success: true,
    motorista
  });
});

// Rotas
router.get("/empresa/:empresaId", getMotoristasByEmpresa); // Listar motoristas da empresa
router.put("/:id/status", updateMotoristaStatus); // Atualizar status do motorista
router.get("/:id", getMotoristaById); // Buscar motorista por ID

module.exports = router;