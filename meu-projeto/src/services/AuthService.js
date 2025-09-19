const bcrypt = require("bcryptjs");
const config = require("../config");
const { createError } = require("../utils/errors");
const Logger = require("../utils/logger");
const {
  validateEmail,
  validateCPF,
  validateCNPJ,
  validatePassword,
  cleanCPF,
  cleanCNPJ,
  generateCodigoMotorista,
  validateRequiredFields
} = require("../utils/validators");
const MotoristaModel = require("../models/MotoristaModel");
const EmpresaModel = require("../models/EmpresaModel");
const ColaboradorModel = require("../models/ColaboradorModel");

class AuthService {
  static async registerMotorista(data) {
    const { nome, usuario, cpf, email, senha } = data;

    // Validação de campos obrigatórios
    const validation = validateRequiredFields(
      ["nome", "usuario", "cpf", "email", "senha"],
      data
    );
    if (!validation.isValid) {
      throw createError.validation(validation.message);
    }

    // Validações específicas
    if (!validateEmail(email)) {
      throw createError.validation("Formato de email inválido", "email");
    }

    if (!validateCPF(cpf)) {
      throw createError.validation("CPF deve conter 11 dígitos", "cpf");
    }

    if (!validatePassword(senha)) {
      throw createError.validation("Senha deve ter pelo menos 6 caracteres", "senha");
    }

    // Verificar duplicatas
    const cleanedCPF = cleanCPF(cpf);
    const duplicates = await MotoristaModel.checkDuplicates(email, usuario, cleanedCPF);

    if (duplicates.email) {
      throw createError.conflict("Email já está em uso", "email");
    }
    if (duplicates.usuario) {
      throw createError.conflict("Nome de usuário já está em uso", "usuario");
    }
    if (duplicates.cpf) {
      throw createError.conflict("CPF já está cadastrado", "cpf");
    }

    // Gerar código único
    let codigoUnico;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      codigoUnico = generateCodigoMotorista();
      attempts++;

      if (attempts > maxAttempts) {
        throw createError.generic("Erro ao gerar código único. Tente novamente.");
      }
    } while (await MotoristaModel.checkCodigoExists(codigoUnico));

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, config.security.bcryptRounds);

    // Criar motorista
    const motoristaData = {
      nome,
      usuario,
      cpf: cleanedCPF,
      email: email.toLowerCase().trim(),
      senha_hash: senhaHash,
      codigo: codigoUnico
    };

    const motorista = await MotoristaModel.create(motoristaData);

    Logger.info("Motorista registrado com sucesso", {
      motoristaId: motorista.id,
      codigo: motorista.codigo
    });

    return motorista;
  }

  static async loginMotorista(email, senha) {
    if (!email || !senha) {
      throw createError.validation("Email e senha são obrigatórios");
    }

    if (!validateEmail(email)) {
      throw createError.validation("Formato de email inválido");
    }

    const motorista = await MotoristaModel.findByEmail(email.toLowerCase().trim());

    if (!motorista) {
      throw createError.unauthorized("Credenciais inválidas");
    }

    const senhaValida = await bcrypt.compare(senha, motorista.senha_hash);
    if (!senhaValida) {
      throw createError.unauthorized("Credenciais inválidas");
    }

    if (!motorista.ativo) {
      throw createError.forbidden("Conta desativada. Entre em contato com o suporte.");
    }

    // Remove senha do retorno
    const { senha_hash, ...motoristaSemSenha } = motorista;

    Logger.info("Login de motorista realizado", {
      motoristaId: motorista.id,
      email: motorista.email
    });

    return {
      motorista: motoristaSemSenha,
      tipo: "motorista"
    };
  }

  static async registerEmpresa(data) {
    const {
      nomeEmpresa,
      senha,
      emailCorporativo,
      cnpj,
      nomeAdministrador,
      cpfAdministrador
    } = data;

    // Validação de campos obrigatórios
    const validation = validateRequiredFields([
      "nomeEmpresa",
      "senha",
      "emailCorporativo",
      "cnpj",
      "nomeAdministrador",
      "cpfAdministrador"
    ], data);
    if (!validation.isValid) {
      throw createError.validation(validation.message);
    }

    // Validações específicas
    if (!validateEmail(emailCorporativo)) {
      throw createError.validation("Formato de email inválido", "emailCorporativo");
    }

    if (!validateCNPJ(cnpj)) {
      throw createError.validation("CNPJ deve conter 14 dígitos", "cnpj");
    }

    if (!validateCPF(cpfAdministrador)) {
      throw createError.validation("CPF do administrador deve conter 11 dígitos", "cpfAdministrador");
    }

    if (!validatePassword(senha)) {
      throw createError.validation("Senha deve ter pelo menos 6 caracteres", "senha");
    }

    // Verificar duplicatas
    const cleanedCNPJ = cleanCNPJ(cnpj);
    const cleanedCPF = cleanCPF(cpfAdministrador);
    const duplicates = await EmpresaModel.checkDuplicates(emailCorporativo, cleanedCNPJ);

    if (duplicates.email) {
      throw createError.conflict("Email corporativo já está em uso", "emailCorporativo");
    }
    if (duplicates.cnpj) {
      throw createError.conflict("CNPJ já está cadastrado", "cnpj");
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, config.security.bcryptRounds);

    // Usar transação para criar empresa + colaborador admin
    const db = require("../config/database");
    return await db.transaction(async (client) => {
      // Criar empresa
      const empresaData = {
        nomeEmpresa,
        senha_hash: senhaHash,
        emailCorporativo: emailCorporativo.toLowerCase().trim(),
        cnpj: cleanedCNPJ,
        nomeAdministrador,
        cpfAdministrador: cleanedCPF
      };

      const empresa = await EmpresaModel.create(empresaData);

      // Criar admin como colaborador
      const colaboradorData = {
        empresaId: empresa.id,
        nome: nomeAdministrador,
        email: emailCorporativo.toLowerCase().trim(),
        senha_hash: senhaHash,
        cargo: "Administrador",
        isAdmin: true
      };

      await ColaboradorModel.create(colaboradorData);

      Logger.info("Empresa e administrador criados", {
        empresaId: empresa.id,
        nomeEmpresa: empresa.nome_empresa
      });

      return empresa;
    });
  }

  static async loginEmpresa(email, senha) {
    if (!email || !senha) {
      throw createError.validation("Email e senha são obrigatórios");
    }

    if (!validateEmail(email)) {
      throw createError.validation("Formato de email inválido");
    }

    const emailLower = email.toLowerCase().trim();

    // Tentar login como admin da empresa
    let usuario = await EmpresaModel.findByEmail(emailLower);
    let userType = "admin_empresa";
    let sourceTable = "empresas";

    // Se não encontrou, tentar como colaborador
    if (!usuario) {
      usuario = await ColaboradorModel.findByEmailWithEmpresa(emailLower);
      if (usuario && usuario.ativo) {
        userType = usuario.is_admin ? "admin_colaborador" : "colaborador";
        sourceTable = "colaboradores";
      }
    }

    if (!usuario) {
      throw createError.unauthorized("Credenciais inválidas");
    }

    // Verificar se colaborador está ativo
    if (sourceTable === "colaboradores" && !usuario.ativo) {
      throw createError.forbidden("Conta desativada. Entre em contato com o administrador.");
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw createError.unauthorized("Credenciais inválidas");
    }

    // Atualizar status de login
    if (sourceTable === "empresas") {
      await EmpresaModel.updateLoginStatus(usuario.id, true);
    } else {
      await ColaboradorModel.updateLoginStatus(usuario.id, true);
    }

    // Remove senha do retorno
    const { senha_hash, ...usuarioSemSenha } = usuario;

    // Estruturar resposta baseada no tipo de usuário
    let responseData = {
      tipo: "empresa",
      usuario: {
        ...usuarioSemSenha,
        tipo_usuario: userType
      }
    };

    if (sourceTable === "empresas") {
      responseData.empresa = {
        id: usuario.id,
        nome_empresa: usuario.nome_empresa,
        nome_administrador: usuario.nome,
        email_corporativo: usuario.email,
        created_at: usuario.created_at
      };
    } else {
      responseData.empresa = {
        id: usuario.empresa_id,
        nome_empresa: usuario.nome_empresa
      };
      responseData.colaborador = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        is_admin: usuario.is_admin,
        empresa_id: usuario.empresa_id,
        created_at: usuario.created_at
      };
    }

    Logger.info("Login de empresa/colaborador realizado", {
      usuarioId: usuario.id,
      email: usuario.email,
      tipo: userType
    });

    return responseData;
  }

  static async logout(userId, userType) {
    if (!userId || !userType) {
      throw createError.validation("userId e userType são obrigatórios");
    }

    if (!["empresa", "colaborador", "motorista"].includes(userType)) {
      throw createError.validation("userType deve ser 'empresa', 'colaborador' ou 'motorista'");
    }

    try {
      if (userType === "empresa") {
        await EmpresaModel.updateLoginStatus(userId, false);
      } else if (userType === "colaborador") {
        await ColaboradorModel.updateLoginStatus(userId, false);
      }
      // Motoristas não têm status de login por enquanto

      Logger.info("Logout realizado", { userId, userType });

      return { success: true };
    } catch (error) {
      if (error.isOperational) throw error;
      throw createError.generic("Erro ao realizar logout");
    }
  }
}

module.exports = AuthService;