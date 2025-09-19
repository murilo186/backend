const { asyncHandler } = require("../middleware/errorHandler");
const FreteService = require("../services/FreteService");
const Logger = require("../utils/logger");

class FreteController {
  // Criar frete (empresa)
  static createFrete = asyncHandler(async (req, res) => {
    Logger.info("Criando frete", {
      empresaId: req.body.empresaId,
      origem: req.body.origem,
      destino: req.body.destino
    });

    const frete = await FreteService.createFrete(req.body);

    res.status(201).json({
      success: true,
      message: "Frete criado com sucesso",
      frete
    });
  });

  // Listar fretes da empresa
  static getFretesByEmpresa = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const { status } = req.query;

    const result = await FreteService.getFretesByEmpresa(empresaId, status);

    res.json({
      success: true,
      ...result
    });
  });

  // Buscar frete específico
  static getFreteById = asyncHandler(async (req, res) => {
    const { freteId } = req.params;

    const frete = await FreteService.getFreteById(freteId);

    res.json({
      success: true,
      frete
    });
  });

  // Atualizar frete (empresa)
  static updateFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { empresaId } = req.body;

    const frete = await FreteService.updateFrete(freteId, empresaId, req.body);

    res.json({
      success: true,
      message: "Frete atualizado com sucesso",
      frete
    });
  });

  // Deletar frete (empresa)
  static deleteFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { empresaId } = req.body;

    await FreteService.deleteFrete(freteId, empresaId);

    res.json({
      success: true,
      message: "Frete removido com sucesso"
    });
  });

  // Oferecer frete para motorista
  static offerFreteToMotorista = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId, empresaId } = req.body;

    Logger.info("Oferecendo frete", { freteId, motoristaId, empresaId });

    const result = await FreteService.offerFreteToMotorista(freteId, motoristaId, empresaId);

    res.json(result);
  });

  // Listar fretes oferecidos para um motorista
  static getOfertasForMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    Logger.info("Buscando ofertas para motorista", { motoristaId });

    const fretes = await FreteService.getOfertasForMotorista(motoristaId);

    res.json({
      success: true,
      fretes
    });
  });

  // Aceitar frete (motorista)
  static acceptFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId } = req.body;

    console.log("🔥 DEBUG Controller - DADOS RECEBIDOS:", {
      freteId: freteId,
      motoristaId: motoristaId,
      freteIdType: typeof freteId,
      motoristaIdType: typeof motoristaId,
      reqParams: req.params,
      reqBody: req.body
    });

    // Converter para integer para garantir tipo correto
    const freteIdInt = parseInt(freteId);
    const motoristaIdInt = parseInt(motoristaId);

    console.log("🔥 DEBUG Controller - APÓS CONVERSÃO:", {
      freteIdInt,
      motoristaIdInt,
      freteIdIntType: typeof freteIdInt,
      motoristaIdIntType: typeof motoristaIdInt,
      isNaNFreteId: isNaN(freteIdInt),
      isNaNMotoristaId: isNaN(motoristaIdInt)
    });

    Logger.info("Aceitando frete", { freteId: freteIdInt, motoristaId: motoristaIdInt });

    try {
      const result = await FreteService.acceptFrete(freteIdInt, motoristaIdInt);
      console.log("✅ DEBUG Controller - SUCESSO:", result);
      res.json(result);
    } catch (error) {
      console.error("❌ DEBUG Controller - ERRO CAPTURADO:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  });

  // Recusar frete (motorista)
  static rejectFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId, observacoes } = req.body;

    // Converter para integer para garantir tipo correto
    const freteIdInt = parseInt(freteId);
    const motoristaIdInt = parseInt(motoristaId);

    Logger.info("Rejeitando frete", { freteId: freteIdInt, motoristaId: motoristaIdInt });

    const result = await FreteService.rejectFrete(freteIdInt, motoristaIdInt, observacoes);

    res.json(result);
  });

  // Finalizar frete (empresa)
  static finalizarFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { empresaId, finalizadoPor } = req.body;

    Logger.info("Finalizando frete", { freteId, empresaId, finalizadoPor });

    const result = await FreteService.finalizarFrete(freteId, empresaId, finalizadoPor);

    res.json(result);
  });

  // Listar fretes ativos do motorista
  static getFretesByMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;
    const { tipo } = req.params; // 'ativos' ou 'historico'

    const fretes = await FreteService.getFretesByMotorista(motoristaId, tipo);

    res.json({
      success: true,
      fretes
    });
  });

  // Atualizar status do motorista
  static updateMotoristaStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status_disponibilidade } = req.body;

    Logger.info("Atualizando status do motorista", { id, status_disponibilidade });

    const MotoristaModel = require("../models/MotoristaModel");
    const motorista = await MotoristaModel.updateStatus(id, status_disponibilidade);

    res.json({
      success: true,
      message: "Status atualizado",
      motorista
    });
  });

  // Estatísticas
  static getStats = asyncHandler(async (req, res) => {
    const { empresaId, motoristaId } = req.query;

    const stats = await FreteService.getStats(empresaId, motoristaId);

    res.json({
      success: true,
      stats
    });
  });

  // Buscar fretes ativos do motorista (Mobile App)
  static getFretesAtivosMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    Logger.info("Buscando fretes ativos", { motoristaId });

    const fretes = await FreteService.getFretesAtivosMotorista(motoristaId);

    res.json({
      success: true,
      fretes
    });
  });

  // Buscar histórico de fretes do motorista (Mobile App)
  static getHistoricoMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    Logger.info("Buscando histórico de fretes", { motoristaId });

    const fretes = await FreteService.getHistoricoMotorista(motoristaId);

    res.json({
      success: true,
      fretes
    });
  });
}


module.exports = FreteController;
