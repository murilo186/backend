const db = require("../config/database");
const { createError } = require("../utils/errors");

class ColaboradorModel {
  static async create(colaboradorData) {
    try {
      const {
        empresaId,
        nome,
        email,
        senha_hash,
        cargo,
        isAdmin = false
      } = colaboradorData;

      const result = await db.query(
        `INSERT INTO colaboradores (empresa_id, nome, email, senha_hash, cargo, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nome, email, cargo, is_admin, ativo, created_at`,
        [empresaId, nome, email, senha_hash, cargo, isAdmin]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        if (error.constraint?.includes("email")) {
          throw createError.conflict("Email já está em uso", "email");
        }
      }
      throw createError.database(`Erro ao criar colaborador: ${error.message}`);
    }
  }

  static async findByEmailWithEmpresa(email) {
    try {
      const result = await db.query(
        `SELECT c.id, c.email, c.nome, c.cargo, c.is_admin, c.senha_hash,
                c.created_at, c.empresa_id, c.ativo, c.is_online, c.last_login,
                c.status_trabalho, e.nome_empresa
         FROM colaboradores c
         JOIN empresas e ON c.empresa_id = e.id
         WHERE c.email = $1`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar colaborador por email: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT id, empresa_id, nome, email, cargo, is_admin, ativo,
                is_online, last_login, status_trabalho, created_at
         FROM colaboradores WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar colaborador por ID: ${error.message}`);
    }
  }

  static async findByEmpresa(empresaId, includeInactive = false) {
    try {
      let query = `
        SELECT id, nome, email, cargo, is_admin, ativo, is_online, last_login, status_trabalho, created_at
        FROM colaboradores
        WHERE empresa_id = $1
      `;

      const params = [empresaId];

      if (!includeInactive) {
        query += ` AND ativo = true`;
      }

      query += ` ORDER BY is_admin DESC, nome`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar colaboradores da empresa: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    try {
      const { nome, cargo, ativo, isAdmin } = updateData;

      const result = await db.query(
        `UPDATE colaboradores
         SET nome = $1, cargo = $2, ativo = $3, is_admin = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, nome, email, cargo, is_admin, ativo`,
        [nome, cargo, ativo, isAdmin, id]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Colaborador");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar colaborador: ${error.message}`);
    }
  }

  static async deactivate(id) {
    try {
      const result = await db.query(
        `UPDATE colaboradores
         SET ativo = false, updated_at = NOW()
         WHERE id = $1
         RETURNING id, nome`,
        [id]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Colaborador");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao desativar colaborador: ${error.message}`);
    }
  }

  static async updateLoginStatus(id, isOnline = true) {
    try {
      const statusTrabalho = isOnline ? 'online' : 'offline';
      const result = await db.query(
        `UPDATE colaboradores
         SET last_login = NOW(), is_online = $1, status_trabalho = $2
         WHERE id = $3
         RETURNING id, is_online, last_login, status_trabalho`,
        [isOnline, statusTrabalho, id]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao atualizar status de login: ${error.message}`);
    }
  }

  static async updateStatusTrabalho(id, statusTrabalho) {
    try {
      const validStatuses = ['online', 'ausente', 'ocupado', 'offline'];
      if (!validStatuses.includes(statusTrabalho)) {
        throw createError.validation('Status de trabalho inválido');
      }

      const result = await db.query(
        `UPDATE colaboradores
         SET status_trabalho = $1
         WHERE id = $2
         RETURNING id, status_trabalho`,
        [statusTrabalho, id]
      );

      if (result.rows.length === 0) {
        throw createError.notFound('Colaborador');
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar status de trabalho: ${error.message}`);
    }
  }

  static async checkEmailExists(email, excludeId = null) {
    try {
      let query = "SELECT id FROM colaboradores WHERE email = $1";
      const params = [email];

      if (excludeId) {
        query += " AND id != $2";
        params.push(excludeId);
      }

      const result = await db.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      throw createError.database(`Erro ao verificar email: ${error.message}`);
    }
  }

  static async countByEmpresa(empresaId) {
    try {
      const result = await db.query(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
           COUNT(CASE WHEN is_admin = true AND ativo = true THEN 1 END) as admins
         FROM colaboradores WHERE empresa_id = $1`,
        [empresaId]
      );

      return result.rows[0];
    } catch (error) {
      throw createError.database(`Erro ao contar colaboradores: ${error.message}`);
    }
  }
}

module.exports = ColaboradorModel;