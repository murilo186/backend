const db = require("../config/database");
const { createError } = require("../utils/errors");

class EmpresaModel {
  static async create(empresaData) {
    try {
      const {
        nomeEmpresa,
        senha_hash,
        emailCorporativo,
        cnpj,
        nomeAdministrador,
        cpfAdministrador,
        telefone,
        rua,
        numero,
        cep,
        bairro,
        cidade,
        estado,
        complemento
      } = empresaData;

      const result = await db.query(
        `INSERT INTO empresas
         (nome_empresa, senha_hash, email_corporativo, cnpj, nome_administrador, cpf_administrador,
          telefone, rua, numero, cep, bairro, cidade, estado, complemento, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         RETURNING id, nome_empresa, email_corporativo, cnpj, nome_administrador, created_at`,
        [nomeEmpresa, senha_hash, emailCorporativo, cnpj, nomeAdministrador, cpfAdministrador,
         telefone, rua, numero, cep, bairro, cidade, estado, complemento]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        if (error.constraint?.includes("email")) {
          throw createError.conflict("Email corporativo já está em uso", "email");
        }
        if (error.constraint?.includes("cnpj")) {
          throw createError.conflict("CNPJ já está cadastrado", "cnpj");
        }
      }
      throw createError.database(`Erro ao criar empresa: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const result = await db.query(
        `SELECT id, email_corporativo as email, nome_empresa, nome_administrador as nome,
                senha_hash, created_at, is_online, last_login
         FROM empresas WHERE email_corporativo = $1`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar empresa por email: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT id, nome_empresa, email_corporativo, cnpj, nome_administrador,
                is_online, last_login, created_at,
                telefone, site, whatsapp, descricao, setor, porte,
                data_fundacao, num_funcionarios,
                cep, rua, numero, complemento, bairro, cidade, estado,
                latitude, longitude
         FROM empresas WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao buscar empresa por ID: ${error.message}`);
    }
  }

  static async checkDuplicates(emailCorporativo, cnpj) {
    try {
      const [emailExists, cnpjExists] = await Promise.all([
        db.query("SELECT id FROM empresas WHERE email_corporativo = $1", [emailCorporativo]),
        db.query("SELECT id FROM empresas WHERE cnpj = $1", [cnpj])
      ]);

      return {
        email: emailExists.rows.length > 0,
        cnpj: cnpjExists.rows.length > 0
      };
    } catch (error) {
      throw createError.database(`Erro ao verificar duplicatas: ${error.message}`);
    }
  }

  static async updateLoginStatus(id, isOnline = true) {
    try {
      const result = await db.query(
        `UPDATE empresas
         SET last_login = NOW(), is_online = $1
         WHERE id = $2
         RETURNING id, is_online, last_login`,
        [isOnline, id]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw createError.database(`Erro ao atualizar status de login: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    try {
      const {
        nomeEmpresa,
        emailCorporativo,
        telefone,
        site,
        whatsapp,
        descricao,
        setor,
        porte,
        dataFundacao,
        numFuncionarios,
        cep,
        rua,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        latitude,
        longitude
      } = updateData;

      const result = await db.query(
        `UPDATE empresas
         SET nome_empresa = COALESCE($2, nome_empresa),
             email_corporativo = COALESCE($3, email_corporativo),
             telefone = $4,
             site = $5,
             whatsapp = $6,
             descricao = $7,
             setor = $8,
             porte = $9,
             data_fundacao = $10,
             num_funcionarios = $11,
             cep = $12,
             rua = $13,
             numero = $14,
             complemento = $15,
             bairro = $16,
             cidade = $17,
             estado = $18,
             latitude = $19,
             longitude = $20,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, nome_empresa, email_corporativo, cnpj, nome_administrador,
                   telefone, site, whatsapp, descricao, setor, porte,
                   data_fundacao, num_funcionarios,
                   cep, rua, numero, complemento, bairro, cidade, estado,
                   latitude, longitude`,
        [
          id, nomeEmpresa, emailCorporativo, telefone, site, whatsapp,
          descricao, setor, porte, dataFundacao, numFuncionarios,
          cep, rua, numero, complemento, bairro, cidade, estado,
          latitude, longitude
        ]
      );

      if (result.rows.length === 0) {
        throw createError.notFound("Empresa");
      }

      return result.rows[0];
    } catch (error) {
      if (error.isOperational) throw error;

      if (error.code === "23505") {
        if (error.constraint?.includes("email")) {
          throw createError.conflict("Email corporativo já está em uso", "email");
        }
      }

      throw createError.database(`Erro ao atualizar empresa: ${error.message}`);
    }
  }

  static async getStats(empresaId) {
    try {
      const result = await db.query(
        `SELECT
           COUNT(DISTINCT m.id) as total_motoristas,
           COUNT(DISTINCT c.id) as total_colaboradores,
           COUNT(DISTINCT f.id) as total_fretes,
           COUNT(DISTINCT CASE WHEN f.status_frete = 'finalizado' THEN f.id END) as fretes_finalizados
         FROM empresas e
         LEFT JOIN motoristas m ON e.id = m.empresa_id AND m.ativo = true
         LEFT JOIN colaboradores c ON e.id = c.empresa_id AND c.ativo = true
         LEFT JOIN fretes f ON e.id = f.empresa_id
         WHERE e.id = $1
         GROUP BY e.id`,
        [empresaId]
      );

      return result.rows[0] || {
        total_motoristas: 0,
        total_colaboradores: 0,
        total_fretes: 0,
        fretes_finalizados: 0
      };
    } catch (error) {
      throw createError.database(`Erro ao buscar estatísticas da empresa: ${error.message}`);
    }
  }

  static async findEmpresasProximas(latitude, longitude, raioKm = 30) {
    try {
      const result = await db.query(
        `SELECT
           id,
           nome_empresa,
           telefone,
           cidade,
           estado,
           latitude,
           longitude,
           calcular_distancia_km($1, $2, latitude, longitude) as distancia_km
         FROM empresas
         WHERE latitude IS NOT NULL
           AND longitude IS NOT NULL
           AND calcular_distancia_km($1, $2, latitude, longitude) <= $3
         ORDER BY distancia_km ASC`,
        [latitude, longitude, raioKm]
      );

      return result.rows;
    } catch (error) {
      throw createError.database(`Erro ao buscar empresas próximas: ${error.message}`);
    }
  }
}

module.exports = EmpresaModel;