const db = require("../config/database");
const { createError } = require("../utils/errors");

class FreteModel {
  static async create(freteData) {
    try {
      const {
        empresaId,
        origem,
        destino,
        distancia,
        valor,
        valorEmpresa,
        tipoCarga,
        peso,
        eixosRequeridos,
        observacoes,
        disponivelTerceiros,
        dataColeta,
        dataEntregaPrevista
      } = freteData;

      const result = await db.query(
        `INSERT INTO fretes
         (empresa_id, origem, destino, distancia, valor, valor_empresa, tipo_carga, peso, eixos_requeridos, observacoes, disponivel_terceiros, data_coleta, data_entrega_prevista)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          empresaId,
          origem,
          destino,
          distancia || null,
          valor,
          valorEmpresa || null,
          tipoCarga,
          peso || null,
          eixosRequeridos || 3,
          observacoes || null,
          disponivelTerceiros || false,
          dataColeta || null,
          dataEntregaPrevista || null
        ]
      );

      return result.rows[0];
    } catch (error) {
      throw createError.database(`Erro ao criar frete: ${error.message}`);
    }
  }

  static async findByEmpresa(empresaId, status = null) {
    try {
      let query = `
        SELECT f.*, m.nome as motorista_nome, m.codigo as motorista_codigo
        FROM fretes f
        LEFT JOIN motoristas m ON f.motorista_id = m.id
        WHERE f.empresa_id = $1
      `;

      const params = [empresaId];

      if (status) {
        query += ` AND f.status_frete = $2`;
        params.push(status);
      }

      query += ` ORDER BY f.created_at DESC`;

      console.log("🔧 DEBUG findByEmpresa - query:", query);
      console.log("🔧 DEBUG findByEmpresa - params:", params);

      const result = await db.query(query, params);

      console.log("🔧 DEBUG findByEmpresa - resultado:", result.rows.map(row => ({
        id: row.id,
        origem: row.origem,
        destino: row.destino,
        disponivel_terceiros: row.disponivel_terceiros
      })));

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar fretes da empresa: ${error.message}`);
    }
  }

  static async findById(freteId) {
    try {
      const result = await db.query(
        `SELECT f.*, m.nome as motorista_nome, m.codigo as motorista_codigo,
                e.nome_empresa
         FROM fretes f
         LEFT JOIN motoristas m ON f.motorista_id = m.id
         LEFT JOIN empresas e ON f.empresa_id = e.id
         WHERE f.id = $1`,
        [freteId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar frete: ${error.message}`);
    }
  }

  static async update(freteId, empresaId, updateData) {
    try {
      const {
        origem,
        destino,
        distancia,
        valor,
        valorEmpresa,
        tipoCarga,
        peso,
        eixosRequeridos,
        observacoes,
        disponivelTerceiros
      } = updateData;

      console.log("🔧 DEBUG FreteModel.update - parâmetros recebidos:", {
        freteId,
        empresaId,
        updateData,
        origem,
        destino,
        distancia,
        valor,
        valorEmpresa,
        tipoCarga,
        peso,
        eixosRequeridos,
        observacoes,
        disponivelTerceiros
      });

      const params = [
        origem,
        destino,
        distancia || null,
        valor,
        valorEmpresa || null,
        tipoCarga,
        peso || null,
        eixosRequeridos || 3,
        observacoes || null,
        disponivelTerceiros !== undefined ? Boolean(disponivelTerceiros) : false,
        parseInt(freteId),
        parseInt(empresaId)
      ];

      console.log("🔧 DEBUG FreteModel.update - parâmetros da query:", params);

      const result = await db.query(
        `UPDATE fretes
         SET origem = $1, destino = $2, distancia = $3, valor = $4, valor_empresa = $5,
             tipo_carga = $6, peso = $7, eixos_requeridos = $8, observacoes = $9,
             disponivel_terceiros = $10, updated_at = NOW()
         WHERE id = $11 AND empresa_id = $12 AND status_frete = 'pendente'
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Frete não encontrado ou não pode ser editado");
      }

      console.log("✅ DEBUG FreteModel.update - query executada com sucesso");
      return result.rows[0];
    } catch (error) {
      console.error("❌ DEBUG FreteModel.update - erro na query:", {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetail: error.detail,
        errorConstraint: error.constraint,
        errorColumn: error.column,
        errorTable: error.table,
        errorSchema: error.schema,
        fullError: error
      });

      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar frete: ${error.message} | Code: ${error.code}`);
    }
  }

  static async delete(freteId, empresaId) {
    try {
      const result = await db.query(
        "DELETE FROM fretes WHERE id = $1 AND empresa_id = $2 AND status_frete = 'pendente' RETURNING *",
        [freteId, empresaId]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Frete não encontrado ou não pode ser removido");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao deletar frete: ${error.message}`);
    }
  }

  static async updateStatus(freteId, status, extraData = {}) {
    try {
      let query = "UPDATE fretes SET status_frete = $1, updated_at = NOW()";
      const params = [status];
      let paramIndex = 1;

      // Adicionar campos específicos baseados no status
      if (status === 'oferecido') {
      }

      if (status === 'aceito' && extraData.motoristaId) {
        query += `, motorista_id = $${++paramIndex}, data_aceite = NOW()`;
        params.push(extraData.motoristaId);
      }

      if (status === 'finalizado') {
        query += `, data_finalizacao = NOW()`;
        if (extraData.finalizadoPor) {
          query += `, finalizado_por = $${++paramIndex}`;
          params.push(extraData.finalizadoPor);
        }
      }

      // Adicionar freteId por último
      params.push(freteId);
      query += ` WHERE id = $${params.length} RETURNING *`;

      console.log("🔥 DEBUG FreteModel.updateStatus - QUERY FINAL:", {
        query,
        params,
        paramsTypes: params.map(p => typeof p),
        paramsValues: params,
        paramsLength: params.length
      });

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        throw createError.notFound("Frete");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar status do frete: ${error.message}`);
    }
  }

  static async findByMotorista(motoristaId, status = null) {
    try {
      let query = `
        SELECT f.*, e.nome_empresa
        FROM fretes f
        JOIN empresas e ON f.empresa_id = e.id
        WHERE f.motorista_id = $1
      `;

      const params = [motoristaId];

      if (status) {
        if (Array.isArray(status)) {
          query += ` AND f.status_frete = ANY($2)`;
          params.push(status);
        } else {
          query += ` AND f.status_frete = $2`;
          params.push(status);
        }
      }

      query += ` ORDER BY f.created_at DESC`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar fretes do motorista: ${error.message}`);
    }
  }

  static async getStats(empresaId = null, motoristaId = null) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_fretes,
          COUNT(CASE WHEN status_frete = 'pendente' THEN 1 END) as pendentes,
          COUNT(CASE WHEN status_frete IN ('oferecido', 'aceito', 'em_andamento') THEN 1 END) as em_andamento,
          COUNT(CASE WHEN status_frete = 'finalizado' THEN 1 END) as finalizados,
          SUM(CASE WHEN status_frete = 'finalizado' THEN valor ELSE 0 END) as valor_total_finalizado
        FROM fretes f
        WHERE 1=1
      `;

      const params = [];

      if (empresaId) {
        query += ` AND f.empresa_id = $${params.length + 1}`;
        params.push(empresaId);
      }

      if (motoristaId) {
        query += ` AND f.motorista_id = $${params.length + 1}`;
        params.push(motoristaId);
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      throw createError.database(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  // MÉTODOS ESPECÍFICOS MOBILE APP
  static async getFretesAtivosMotorista(motoristaId) {
    try {
      const result = await db.query(
        `SELECT f.*, e.nome_empresa, m.nome as nome_motorista
         FROM fretes f
         JOIN empresas e ON f.empresa_id = e.id
         LEFT JOIN motoristas m ON f.motorista_id = m.id
         WHERE f.motorista_id = $1 AND f.status_frete IN ('aceito', 'em_andamento')
         ORDER BY f.created_at DESC`,
        [motoristaId]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar fretes ativos: ${error.message}`);
    }
  }

  static async getHistoricoMotorista(motoristaId) {
    try {
      const result = await db.query(
        `SELECT f.*, e.nome_empresa, m.nome as nome_motorista
         FROM fretes f
         JOIN empresas e ON f.empresa_id = e.id
         LEFT JOIN motoristas m ON f.motorista_id = m.id
         WHERE f.motorista_id = $1 AND f.status_frete = 'finalizado'
         ORDER BY f.data_finalizacao DESC, f.created_at DESC`,
        [motoristaId]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar histórico de fretes: ${error.message}`);
    }
  }

  // Buscar fretes disponíveis para terceiros (motoristas avulsos)
  static async getFretesTerceirizados() {
    try {
      const result = await db.query(
        `SELECT f.*, e.nome_empresa, e.telefone as empresa_telefone,
                e.email_corporativo as empresa_email
         FROM fretes f
         JOIN empresas e ON f.empresa_id = e.id
         WHERE f.disponivel_terceiros = true
           AND f.status_frete = 'pendente'
           AND f.motorista_id IS NULL
         ORDER BY f.created_at DESC`,
        []
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar fretes terceirizados: ${error.message}`);
    }
  }
}

module.exports = FreteModel;
