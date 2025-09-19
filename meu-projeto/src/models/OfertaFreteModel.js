const db = require("../config/database");
const { createError } = require("../utils/errors");

class OfertaFreteModel {
  static async create(freteId, motoristaId, empresaId) {
    try {
      const result = await db.query(
        `INSERT INTO ofertas_fretes (frete_id, motorista_id, empresa_id, data_expiracao)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
         RETURNING *`,
        [freteId, motoristaId, empresaId]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw createError.conflict("Já existe uma oferta ativa para este motorista");
      }
      throw createError.database(`Erro ao criar oferta: ${error.message}`);
    }
  }

  static async findByFrete(freteId, motoristaId = null) {
    try {
      let query = `
        SELECT of.*, f.status_frete
        FROM ofertas_fretes of
        JOIN fretes f ON of.frete_id = f.id
        WHERE of.frete_id = $1
      `;
      const params = [freteId];

      if (motoristaId) {
        query += ` AND of.motorista_id = $2`;
        params.push(motoristaId);
      }

      query += ` AND of.status_oferta = 'oferecido' AND of.data_expiracao > NOW()`;

      const result = await db.query(query, params);
      return motoristaId ? result.rows[0] || null : result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar ofertas: ${error.message}`);
    }
  }

  static async findOfertasForMotorista(motoristaId) {
    try {
      const result = await db.query(
        `SELECT f.*, e.nome_empresa, of.data_oferta, of.data_expiracao
         FROM ofertas_fretes of
         JOIN fretes f ON of.frete_id = f.id
         JOIN empresas e ON f.empresa_id = e.id
         WHERE of.motorista_id = $1 AND of.status_oferta = 'oferecido'
         AND of.data_expiracao > NOW()
         ORDER BY of.data_oferta DESC`,
        [motoristaId]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar ofertas do motorista: ${error.message}`);
    }
  }

  static async updateStatus(freteId, motoristaId, status, observacoes = null) {
    try {
      let query = `
        UPDATE ofertas_fretes
        SET status_oferta = $1, data_resposta = NOW()
      `;
      const params = [status, freteId, motoristaId];

      if (observacoes && status === 'recusado') {
        query += `, observacoes_motorista = $4`;
        params.push(observacoes);
      }

      query += ` WHERE frete_id = $2 AND motorista_id = $3 AND status_oferta = 'oferecido' RETURNING *`;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        throw createError.notFound("Oferta não encontrada");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar oferta: ${error.message}`);
    }
  }

  static async checkExistingActive(freteId, motoristaId) {
    try {
      const result = await db.query(
        `SELECT id FROM ofertas_fretes
         WHERE frete_id = $1 AND motorista_id = $2 AND status_oferta = 'oferecido'`,
        [freteId, motoristaId]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw createError.database(`Erro ao verificar oferta existente: ${error.message}`);
    }
  }

  static async getStats(empresaId = null) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_ofertas,
          COUNT(CASE WHEN of.status_oferta = 'oferecido' AND of.data_expiracao > NOW() THEN 1 END) as ativas,
          COUNT(CASE WHEN of.status_oferta = 'aceito' THEN 1 END) as aceitas,
          COUNT(CASE WHEN of.status_oferta = 'recusado' THEN 1 END) as recusadas
        FROM ofertas_fretes of
        JOIN fretes f ON of.frete_id = f.id
      `;

      const params = [];

      if (empresaId) {
        query += ` WHERE f.empresa_id = $1`;
        params.push(empresaId);
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      throw createError.database(`Erro ao buscar estatísticas de ofertas: ${error.message}`);
    }
  }
}

module.exports = OfertaFreteModel;