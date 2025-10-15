const db = require("../config/database");
const { createError } = require("../utils/errors");

class CandidaturaModel {
  static async create(candidaturaData) {
    try {
      const {
        freteId,
        motoristaId,
        empresaId,
        observacoesMotorista
      } = candidaturaData;

      // Verificar se já existe candidatura para este frete e motorista
      const existingResult = await db.query(
        "SELECT id FROM candidaturas_fretes WHERE frete_id = $1 AND motorista_id = $2",
        [freteId, motoristaId]
      );

      if (existingResult.rows.length > 0) {
        throw createError.conflict("Você já se candidatou para este frete");
      }

      // Criar nova candidatura
      const result = await db.query(
        `INSERT INTO candidaturas_fretes
         (frete_id, motorista_id, empresa_id, observacoes_motorista)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [freteId, motoristaId, empresaId, observacoesMotorista || null]
      );

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao criar candidatura: ${error.message}`);
    }
  }

  static async findByFrete(freteId) {
    try {
      const result = await db.query(
        `SELECT c.*, m.nome as motorista_nome, m.codigo as motorista_codigo,
                m.telefone as motorista_telefone
         FROM candidaturas_fretes c
         JOIN motoristas m ON c.motorista_id = m.id
         WHERE c.frete_id = $1
         ORDER BY c.data_candidatura DESC`,
        [freteId]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar candidaturas: ${error.message}`);
    }
  }

  static async findById(candidaturaId) {
    try {
      const result = await db.query(
        "SELECT * FROM candidaturas_fretes WHERE id = $1",
        [candidaturaId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar candidatura por ID: ${error.message}`);
    }
  }

  static async updateStatus(candidaturaId, status, dadosResposta = {}) {
    try {
      const {
        observacoesEmpresa,
        respondidoPor
      } = dadosResposta;

      const result = await db.query(
        `UPDATE candidaturas_fretes
         SET status_candidatura = $1,
             observacoes_empresa = $2,
             respondido_por = $3,
             data_resposta = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, observacoesEmpresa || null, respondidoPor || null, candidaturaId]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Candidatura não encontrada");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar candidatura: ${error.message}`);
    }
  }

  static async countByFrete(freteId, status = 'pendente') {
    try {
      const result = await db.query(
        "SELECT COUNT(*) as total FROM candidaturas_fretes WHERE frete_id = $1 AND status_candidatura = $2",
        [freteId, status]
      );

      return parseInt(result.rows[0].total);
    } catch (error) {
      throw createError.database(`Erro ao contar candidaturas: ${error.message}`);
    }
  }

  static async findByMotorista(motoristaId, status = null) {
    try {
      let query = `
        SELECT c.*, f.origem, f.destino, f.valor, f.tipo_carga,
               e.nome_empresa
        FROM candidaturas_fretes c
        JOIN fretes f ON c.frete_id = f.id
        JOIN empresas e ON c.empresa_id = e.id
        WHERE c.motorista_id = $1
      `;

      const params = [motoristaId];

      if (status) {
        query += ` AND c.status_candidatura = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.data_candidatura DESC`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar candidaturas do motorista: ${error.message}`);
    }
  }

  static async getCandidaturasComContagem() {
    try {
      const result = await db.query(
        `SELECT f.id as frete_id, f.origem, f.destino, f.valor,
                COUNT(c.id) as total_candidaturas
         FROM fretes f
         LEFT JOIN candidaturas_fretes c ON f.id = c.frete_id AND c.status_candidatura = 'pendente'
         WHERE f.disponivel_terceiros = true AND f.status_frete = 'pendente'
         GROUP BY f.id, f.origem, f.destino, f.valor
         HAVING COUNT(c.id) > 0
         ORDER BY COUNT(c.id) DESC`
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar fretes com candidaturas: ${error.message}`);
    }
  }
}

module.exports = CandidaturaModel;