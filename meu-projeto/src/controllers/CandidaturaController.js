const { asyncHandler } = require("../middleware/errorHandler");
const CandidaturaModel = require("../models/CandidaturaModel");
const Logger = require("../utils/logger");

class CandidaturaController {
  // Motorista se candidatar a um frete
  static createCandidatura = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId, empresaId, observacoes } = req.body;

    Logger.info("Criando candidatura", {
      freteId,
      motoristaId,
      empresaId
    });

    const candidatura = await CandidaturaModel.create({
      freteId: parseInt(freteId),
      motoristaId: parseInt(motoristaId),
      empresaId: parseInt(empresaId),
      observacoesMotorista: observacoes
    });

    res.status(201).json({
      success: true,
      message: "Candidatura enviada com sucesso",
      candidatura
    });
  });

  // Listar candidaturas de um frete
  static getCandidaturasByFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;

    Logger.info("Buscando candidaturas do frete", { freteId });

    const candidaturas = await CandidaturaModel.findByFrete(parseInt(freteId));

    res.json({
      success: true,
      candidaturas,
      total: candidaturas.length
    });
  });

  // Aprovar ou recusar candidatura
  static updateStatusCandidatura = asyncHandler(async (req, res) => {
    const { candidaturaId } = req.params;
    const { status, observacoes, respondidoPor } = req.body;

    Logger.info("Atualizando status da candidatura", {
      candidaturaId,
      status,
      respondidoPor
    });

    const candidatura = await CandidaturaModel.updateStatus(
      parseInt(candidaturaId),
      status,
      {
        observacoesEmpresa: observacoes,
        respondidoPor
      }
    );

    res.json({
      success: true,
      message: `Candidatura ${status === 'aprovado' ? 'aprovada' : 'recusada'} com sucesso`,
      candidatura
    });
  });

  // Contar candidaturas pendentes de um frete
  static getCountCandidaturas = asyncHandler(async (req, res) => {
    const { freteId } = req.params;

    const count = await CandidaturaModel.countByFrete(parseInt(freteId));

    res.json({
      success: true,
      count
    });
  });

  // Listar candidaturas de um motorista
  static getCandidaturasByMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;
    const { status } = req.query;

    Logger.info("Buscando candidaturas do motorista", { motoristaId, status });

    const candidaturas = await CandidaturaModel.findByMotorista(
      parseInt(motoristaId),
      status
    );

    res.json({
      success: true,
      candidaturas,
      total: candidaturas.length
    });
  });

  // Obter fretes com contagem de candidaturas (para badges)
  static getFretesComCandidaturas = asyncHandler(async (req, res) => {
    Logger.info("Buscando fretes com candidaturas");

    const fretes = await CandidaturaModel.getCandidaturasComContagem();

    res.json({
      success: true,
      fretes
    });
  });

  // Aprovar candidatura
  static aprovarCandidatura = asyncHandler(async (req, res) => {
    const { candidaturaId } = req.params;
    const { observacoes, respondidoPor } = req.body;

    Logger.info("Aprovando candidatura", { candidaturaId, respondidoPor });

    // 1. Buscar dados da candidatura ANTES de aprovar
    const candidaturaExistente = await CandidaturaModel.findById(parseInt(candidaturaId));

    Logger.info("Dados da candidatura encontrada", {
      candidaturaId: parseInt(candidaturaId),
      candidatura: candidaturaExistente
    });

    if (!candidaturaExistente) {
      return res.status(404).json({
        success: false,
        error: "Candidatura não encontrada"
      });
    }

    // 2. Atualizar status da candidatura
    const candidatura = await CandidaturaModel.updateStatus(
      parseInt(candidaturaId),
      'aprovado',
      {
        observacoesEmpresa: observacoes,
        respondidoPor: respondidoPor || 'Sistema'
      }
    );

    // 2.1. Definir empresa temporária para motorista terceirizado
    const MotoristaModel = require("../models/MotoristaModel");
    await MotoristaModel.setEmpresaTemporaria(
      candidaturaExistente.motorista_id,
      candidaturaExistente.empresa_id
    );

    Logger.info("✅ Empresa temporária definida", {
      motoristaId: candidaturaExistente.motorista_id,
      empresaTemporaria: candidaturaExistente.empresa_id
    });

    // 3. Usar o serviço de frete existente para oferecer o frete
    try {
      Logger.info("INICIANDO oferecimento de frete", {
        freteId: candidaturaExistente.frete_id,
        motoristaId: candidaturaExistente.motorista_id,
        empresaId: candidaturaExistente.empresa_id
      });

      const FreteService = require("../services/FreteService");

      // 1. Oferecer o frete
      const resultadoOferta = await FreteService.offerFreteToMotorista(
        candidaturaExistente.frete_id,
        candidaturaExistente.motorista_id,
        candidaturaExistente.empresa_id
      );

      Logger.info("✅ Frete oferecido para motorista terceirizado", {
        candidaturaId: parseInt(candidaturaId),
        freteId: candidaturaExistente.frete_id,
        motoristaId: candidaturaExistente.motorista_id,
        resultado: resultadoOferta
      });

      // 2. Aceitar automaticamente (para terceirizados aprovados)
      const resultadoAceite = await FreteService.acceptFrete(
        candidaturaExistente.frete_id,
        candidaturaExistente.motorista_id
      );

      // 3. Garantir que vai para em_andamento
      const FreteModel = require("../models/FreteModel");
      await FreteModel.updateStatus(candidaturaExistente.frete_id, "em_andamento", {
        motoristaId: candidaturaExistente.motorista_id,
        dataInicio: new Date()
      });

      Logger.info("✅ SUCESSO - Frete automaticamente aceito para motorista terceirizado", {
        candidaturaId: parseInt(candidaturaId),
        freteId: candidaturaExistente.frete_id,
        motoristaId: candidaturaExistente.motorista_id,
        empresaId: candidaturaExistente.empresa_id,
        resultadoOferta,
        resultadoAceite
      });
    } catch (freteError) {
      Logger.error("❌ ERRO ao oferecer frete após aprovar candidatura", {
        candidaturaId: parseInt(candidaturaId),
        freteId: candidaturaExistente.frete_id,
        motoristaId: candidaturaExistente.motorista_id,
        empresaId: candidaturaExistente.empresa_id,
        error: freteError.message,
        stack: freteError.stack
      });
      // Não falha a operação, só loga o erro mas retorna erro para debug
      return res.status(500).json({
        success: false,
        error: `Candidatura aprovada, mas erro ao oferecer frete: ${freteError.message}`,
        candidatura
      });
    }

    res.json({
      success: true,
      message: "Candidatura aprovada! Frete iniciado automaticamente.",
      candidatura
    });
  });

  // Recusar candidatura
  static recusarCandidatura = asyncHandler(async (req, res) => {
    const { candidaturaId } = req.params;
    const { observacoes, respondidoPor } = req.body;

    Logger.info("Recusando candidatura", { candidaturaId, respondidoPor });

    const candidatura = await CandidaturaModel.updateStatus(
      parseInt(candidaturaId),
      'recusado',
      {
        observacoesEmpresa: observacoes,
        respondidoPor: respondidoPor || 'Sistema'
      }
    );

    res.json({
      success: true,
      message: "Candidatura recusada com sucesso",
      candidatura
    });
  });

  // Buscar candidaturas de múltiplos fretes (para badges)
  static getCandidaturasFretesBatch = asyncHandler(async (req, res) => {
    const { freteIds } = req.body;

    if (!freteIds || !Array.isArray(freteIds)) {
      return res.status(400).json({
        success: false,
        error: "freteIds deve ser um array"
      });
    }

    Logger.info("Buscando candidaturas em lote", { freteIds });

    const candidaturasCount = {};

    // Buscar contagem para cada frete
    for (const freteId of freteIds) {
      const count = await CandidaturaModel.countByFrete(parseInt(freteId), 'pendente');
      candidaturasCount[freteId] = count;
    }

    res.json({
      success: true,
      candidaturasCount
    });
  });
}

module.exports = CandidaturaController;