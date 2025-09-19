const db = require("../config/database");
const { createError } = require("../utils/errors");

class MotoristaModel {
  static async create(motoristaData) {
    try {
      const {
        nome,
        usuario,
        cpf,
        email,
        senha_hash,
        codigo
      } = motoristaData;

      const result = await db.query(
        `INSERT INTO motoristas (nome, usuario, cpf, email, senha_hash, codigo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nome, usuario, email, codigo, created_at`,
        [nome, usuario, cpf, email, senha_hash, codigo]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        if (error.constraint?.includes("email")) {
          throw createError.conflict("Email já está em uso", "email");
        }
        if (error.constraint?.includes("usuario")) {
          throw createError.conflict("Nome de usuário já está em uso", "usuario");
        }
        if (error.constraint?.includes("cpf")) {
          throw createError.conflict("CPF já está cadastrado", "cpf");
        }
        if (error.constraint?.includes("codigo")) {
          throw createError.conflict("Código já existe", "codigo");
        }
      }
      throw createError.database(`Erro ao criar motorista: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const result = await db.query(
        `SELECT id, nome, usuario, cpf, email, senha_hash, codigo, empresa_id,
                status_disponibilidade, ativo, total_fretes_concluidos, created_at
         FROM motoristas WHERE email = $1`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar motorista por email: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT id, nome, usuario, cpf, email, codigo, empresa_id,
                status_disponibilidade, ativo, total_fretes_concluidos, created_at
         FROM motoristas WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar motorista por ID: ${error.message}`);
    }
  }

  static async findByCodigo(codigo) {
    try {
      const result = await db.query(
        `SELECT id, nome, usuario, email, empresa_id, status_disponibilidade, ativo
         FROM motoristas WHERE codigo = $1`,
        [codigo]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar motorista por código: ${error.message}`);
    }
  }

  static async checkDuplicates(email, usuario, cpf) {
    try {
      const [emailExists, usuarioExists, cpfExists] = await Promise.all([
        db.query("SELECT id FROM motoristas WHERE email = $1", [email]),
        db.query("SELECT id FROM motoristas WHERE usuario = $1", [usuario]),
        db.query("SELECT id FROM motoristas WHERE cpf = $1", [cpf])
      ]);

      return {
        email: emailExists.rows.length > 0,
        usuario: usuarioExists.rows.length > 0,
        cpf: cpfExists.rows.length > 0
      };
    } catch (error) {
      throw createError.database(`Erro ao verificar duplicatas: ${error.message}`);
    }
  }

  static async checkCodigoExists(codigo) {
    try {
      const result = await db.query(
        "SELECT id FROM motoristas WHERE codigo = $1",
        [codigo]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw createError.database(`Erro ao verificar código: ${error.message}`);
    }
  }

  static async updateStatus(id, status_disponibilidade) {
    try {
      const result = await db.query(
        "UPDATE motoristas SET status_disponibilidade = $1 WHERE id = $2 RETURNING *",
        [status_disponibilidade, id]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Motorista");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao atualizar status do motorista: ${error.message}`);
    }
  }

  static async updateEmpresa(motoristaId, empresaId) {
    try {
      const result = await db.query(
        "UPDATE motoristas SET empresa_id = $1 WHERE id = $2 RETURNING *",
        [empresaId, motoristaId]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Motorista");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.database(`Erro ao vincular motorista à empresa: ${error.message}`);
    }
  }

  static async findByEmpresa(empresaId) {
    try {
      const result = await db.query(
        `SELECT id, nome, usuario, email, codigo, status_disponibilidade, ativo,
                total_fretes_concluidos, created_at
         FROM motoristas
         WHERE empresa_id = $1 AND ativo = true
         ORDER BY nome`,
        [empresaId]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar motoristas da empresa: ${error.message}`);
    }
  }

  static async incrementFretesConcluidos(motoristaId) {
    try {
      const result = await db.query(
        `UPDATE motoristas
         SET total_fretes_concluidos = total_fretes_concluidos + 1
         WHERE id = $1
         RETURNING total_fretes_concluidos`,
        [motoristaId]
      );

      return result.rows[0]?.total_fretes_concluidos || 0;
    } catch (error) {
      throw createError.database(`Erro ao incrementar fretes concluídos: ${error.message}`);
    }
  }
}

module.exports = MotoristaModel;