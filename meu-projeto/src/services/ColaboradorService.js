const ColaboradorModel = require("../models/ColaboradorModel");
const EmpresaModel = require("../models/EmpresaModel");
const bcrypt = require("bcryptjs");
const config = require("../config");
const { createError } = require("../utils/errors");
const { validateRequiredFields, validateEmail, validatePassword } = require("../utils/validators");
const Logger = require("../utils/logger");

class ColaboradorService {
  static async createColaborador(data) {
    const { empresaId, nome, email, cargo, senha, isAdmin } = data;

    // Validação de campos obrigatórios
    const validation = validateRequiredFields(
      ["empresaId", "nome", "email", "cargo", "senha"],
      data
    );
    if (!validation.isValid) {
      throw createError.validation(validation.message);
    }

    // Validações específicas
    if (!validateEmail(email)) {
      throw createError.validation("Formato de email inválido", "email");
    }

    if (!validatePassword(senha)) {
      throw createError.validation("Senha deve ter pelo menos 6 caracteres", "senha");
    }

    // Verificar se empresa existe
    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) {
      throw createError.notFound("Empresa");
    }

    // Verificar se email já existe (colaboradores e empresas)
    const emailColaboradorExist = await ColaboradorModel.checkEmailExists(email);
    const empresaEmailExist = await EmpresaModel.findByEmail(email);

    if (emailColaboradorExist || empresaEmailExist) {
      throw createError.conflict("Email já está em uso", "email");
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, config.security.bcryptRounds);

    // Criar colaborador
    const colaboradorData = {
      empresaId,
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senha_hash: senhaHash,
      cargo: cargo.trim(),
      isAdmin: isAdmin || false
    };

    const colaborador = await ColaboradorModel.create(colaboradorData);

    Logger.info("Colaborador criado", {
      colaboradorId: colaborador.id,
      empresaId,
      nome: colaborador.nome,
      cargo: colaborador.cargo
    });

    return colaborador;
  }

  static async getColaboradoresByEmpresa(empresaId, includeInactive = false) {
    // Verificar se empresa existe
    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) {
      throw createError.notFound("Empresa");
    }

    const colaboradores = await ColaboradorModel.findByEmpresa(empresaId, includeInactive);
    return colaboradores;
  }

  static async updateColaborador(id, updateData) {
    const { nome, cargo, ativo, isAdmin } = updateData;

    // Verificar se colaborador existe
    const colaborador = await ColaboradorModel.findById(id);
    if (!colaborador) {
      throw createError.notFound("Colaborador");
    }

    const updatedData = {
      nome: nome?.trim() || colaborador.nome,
      cargo: cargo?.trim() || colaborador.cargo,
      ativo: ativo !== undefined ? ativo : colaborador.ativo,
      isAdmin: isAdmin !== undefined ? isAdmin : colaborador.is_admin
    };

    const result = await ColaboradorModel.update(id, updatedData);

    Logger.info("Colaborador atualizado", {
      colaboradorId: id,
      empresaId: colaborador.empresa_id
    });

    return result;
  }

  static async deactivateColaborador(id) {
    // Verificar se colaborador existe
    const colaborador = await ColaboradorModel.findById(id);
    if (!colaborador) {
      throw createError.notFound("Colaborador");
    }

    const result = await ColaboradorModel.deactivate(id);

    Logger.info("Colaborador desativado", {
      colaboradorId: id,
      nome: result.nome,
      empresaId: colaborador.empresa_id
    });

    return result;
  }

  static async getColaboradorStats(empresaId) {
    const stats = await ColaboradorModel.countByEmpresa(empresaId);
    return stats;
  }

  static async updateStatusTrabalho(id, statusTrabalho) {
    // Verificar se colaborador existe
    const colaborador = await ColaboradorModel.findById(id);
    if (!colaborador) {
      throw createError.notFound("Colaborador");
    }

    const result = await ColaboradorModel.updateStatusTrabalho(id, statusTrabalho);

    Logger.info("Status de trabalho atualizado", {
      colaboradorId: id,
      statusAnterior: colaborador.status_trabalho,
      novoStatus: statusTrabalho,
      empresaId: colaborador.empresa_id
    });

    return result;
  }
}

module.exports = ColaboradorService;