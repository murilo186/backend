const ConviteModel = require("../models/ConviteModel");
const MotoristaModel = require("../models/MotoristaModel");
const { createError } = require("../utils/errors");
const { validateRequiredFields } = require("../utils/validators");
const Logger = require("../utils/logger");
const db = require("../config/database");

class ConviteService {
  static async sendConvite(empresaId, codigoMotorista) {
    // Validação de campos
    const validation = validateRequiredFields(
      ["empresaId", "codigoMotorista"],
      { empresaId, codigoMotorista }
    );
    if (!validation.isValid) {
      throw createError.validation(validation.message);
    }

    // Buscar motorista pelo código
    const motorista = await MotoristaModel.findByCodigo(codigoMotorista.toUpperCase());

    if (!motorista) {
      throw createError.notFound("Motorista não encontrado com este código");
    }

    // Verificar se motorista já está vinculado a alguma empresa
    if (motorista.empresa_id) {
      throw createError.conflict("Motorista já está vinculado a uma empresa");
    }

    // Verificar se já existe convite pendente
    const conviteExistente = await ConviteModel.checkExisting(empresaId, motorista.id);
    if (conviteExistente) {
      throw createError.conflict("Já existe um convite pendente para este motorista");
    }

    // Criar convite
    const convite = await ConviteModel.create(empresaId, motorista.id);

    Logger.info("Convite enviado", {
      empresaId,
      motoristaId: motorista.id,
      codigoMotorista: motorista.codigo
    });

    return {
      convite,
      motorista: {
        nome: motorista.nome,
        codigo: motorista.codigo
      }
    };
  }

  static async getConvitesByMotorista(motoristaId) {
    const convites = await ConviteModel.findPendingByMotorista(motoristaId);

    Logger.info("Convites consultados", {
      motoristaId,
      total: convites.length
    });

    return convites;
  }

  static async acceptConvite(conviteId, motoristaId) {
    // Buscar dados do convite
    const convite = await ConviteModel.findById(conviteId);

    if (!convite) {
      throw createError.notFound("Convite não encontrado");
    }

    if (convite.motorista_id !== parseInt(motoristaId)) {
      throw createError.forbidden("Convite não pertence a este motorista");
    }

    if (convite.status !== 'pendente') {
      throw createError.validation("Convite já foi processado");
    }

    // Usar transação para aceitar convite
    return await db.transaction(async (client) => {
      // Atualizar status do convite
      await ConviteModel.updateStatus(conviteId, "aceito", motoristaId);

      // Vincular motorista à empresa
      await MotoristaModel.updateEmpresa(motoristaId, convite.empresa_id);

      // Rejeitar outros convites pendentes deste motorista
      await ConviteModel.rejectOtherPendingInvites(motoristaId, conviteId);

      Logger.info("Convite aceito", {
        conviteId,
        motoristaId,
        empresaId: convite.empresa_id
      });

      return {
        success: true,
        message: `Você agora faz parte da equipe da ${convite.nome_empresa}!`
      };
    });
  }

  static async rejectConvite(conviteId, motoristaId) {
    // Atualizar status do convite
    await ConviteModel.updateStatus(conviteId, "rejeitado", motoristaId);

    Logger.info("Convite rejeitado", { conviteId, motoristaId });

    return {
      success: true,
      message: "Convite rejeitado"
    };
  }

  static async getConviteStats(empresaId) {
    const stats = await ConviteModel.getConviteStats(empresaId);
    return stats;
  }
}

module.exports = ConviteService;