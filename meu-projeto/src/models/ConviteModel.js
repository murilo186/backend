const db = require("../config/database");
const { createError } = require("../utils/errors");

class ConviteModel {
  static async create(empresaId, motoristaId) {
    try {
      const result = await db.query(
        `INSERT INTO convites_motoristas (empresa_id, motorista_id, data_convite)
         VALUES ($1, $2, NOW())
         RETURNING *`,
        [empresaId, motoristaId]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw createError.conflict("Já existe um convite ativo para este motorista");
      }
      throw createError.database(`Erro ao criar convite: ${error.message}`);
    }
  }

  static async findPendingByMotorista(motoristaId) {
    try {
      const result = await db.query(
        `SELECT c.*, e.nome_empresa, e.email_corporativo
         FROM convites_motoristas c
         JOIN empresas e ON c.empresa_id = e.id
         WHERE c.motorista_id = $1 AND c.status = 'pendente'
         
         ORDER BY c.data_convite DESC`,
        [motoristaId]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar convites: ${error.message}`);
    }
  }

  static async findById(conviteId) {
    try {
      const result = await db.query(
        `SELECT c.*, e.nome_empresa
         FROM convites_motoristas c
         JOIN empresas e ON c.empresa_id = e.id
         WHERE c.id = $1`,
        [conviteId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar convite: ${error.message}`);
    }
  }

  static async checkExisting(empresaId, motoristaId) {
    try {
      const result = await db.query(
        `SELECT id FROM convites_motoristas
         WHERE empresa_id = $1 AND motorista_id = $2 AND status = 'pendente'`,
        [empresaId, motoristaId]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw createError.database(`Erro ao verificar convite existente: ${error.message}`);
    }
  }

  static async updateStatus(conviteId, status, motoristaId = null) {
    try {
      let query = `
        UPDATE convites_motoristas
        SET status = $1, data_resposta = NOW()
        WHERE id = $2
      `;
      const params = [status, conviteId];

      if (motoristaId) {
        query += ` AND motorista_id = $3`;
        params.push(motoristaId);
      }

      query += ` AND status = 'pendente' RETURNING *`;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        throw createError.notFound("Convite não encontrado ou já processado");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar convite: ${error.message}`);
    }
  }

  static async rejectOtherPendingInvites(motoristaId, excludeConviteId) {
    try {
      const result = await db.query(
        `UPDATE convites_motoristas
         SET status = 'rejeitado', data_resposta = NOW()
         WHERE motorista_id = $1 AND status = 'pendente' AND id != $2
         RETURNING id`,
        [motoristaId, excludeConviteId]
      );

      return result.rows.length;
    } catch (error) {
      throw createError.database(`Erro ao rejeitar outros convites: ${error.message}`);
    }
  }

  static async getConviteStats(empresaId) {
    try {
      const result = await db.query(
        `SELECT
           COUNT(*) as total_enviados,
           COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
           COUNT(CASE WHEN status = 'aceito' THEN 1 END) as aceitos,
           COUNT(CASE WHEN status = 'rejeitado' THEN 1 END) as rejeitados
         FROM convites_motoristas
         WHERE empresa_id = $1`,
        [empresaId]
      );

      return result.rows[0];
    } catch (error) {
      throw createError.database(`Erro ao buscar estatísticas de convites: ${error.message}`);
    }
  }
}

module.exports = ConviteModel;