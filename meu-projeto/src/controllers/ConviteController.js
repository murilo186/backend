const { asyncHandler } = require("../middleware/errorHandler");
const ConviteService = require("../services/ConviteService");
const Logger = require("../utils/logger");

class ConviteController {
  // Empresa envia convite por código
  static sendConvite = asyncHandler(async (req, res) => {
    const { empresaId, codigoMotorista } = req.body;

    Logger.info("Enviando convite", { empresaId, codigoMotorista });

    const result = await ConviteService.sendConvite(empresaId, codigoMotorista);

    res.status(201).json({
      success: true,
      message: `Convite enviado para ${result.motorista.nome}`,
      convite: result.convite
    });
  });

  // Motorista vê convites pendentes
  static getConvitesByMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    const convites = await ConviteService.getConvitesByMotorista(motoristaId);

    res.json({
      success: true,
      convites
    });
  });

  // Motorista aceita convite
  static acceptConvite = asyncHandler(async (req, res) => {
    const { conviteId } = req.params;
    const { motoristaId } = req.body;

    Logger.info("Aceitando convite", { conviteId, motoristaId });

    const result = await ConviteService.acceptConvite(conviteId, motoristaId);

    res.json(result);
  });

  // Motorista rejeita convite
  static rejectConvite = asyncHandler(async (req, res) => {
    const { conviteId } = req.params;
    const { motoristaId } = req.body;

    Logger.info("Rejeitando convite", { conviteId, motoristaId });

    const result = await ConviteService.rejectConvite(conviteId, motoristaId);

    res.json(result);
  });

  // Estatísticas de convites
  static getConviteStats = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;

    const stats = await ConviteService.getConviteStats(empresaId);

    res.json({
      success: true,
      stats
    });
  });
}

module.exports = ConviteController;