const { asyncHandler } = require("../middleware/errorHandler");
const AuthService = require("../services/AuthService");
const Logger = require("../utils/logger");

class AuthController {
  static registerMotorista = asyncHandler(async (req, res) => {
    Logger.info("Tentativa de registro de motorista", {
      email: req.body.email,
      usuario: req.body.usuario
    });

    const motorista = await AuthService.registerMotorista(req.body);

    res.status(201).json({
      success: true,
      message: "Motorista registrado com sucesso",
      motorista
    });
  });

  static loginMotorista = asyncHandler(async (req, res) => {
    Logger.info("Tentativa de login motorista", {
      email: req.body.email
    });

    const result = await AuthService.loginMotorista(req.body.email, req.body.senha);

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      ...result
    });
  });

  static registerEmpresa = asyncHandler(async (req, res) => {
    Logger.info("Tentativa de registro de empresa", {
      emailCorporativo: req.body.emailCorporativo,
      nomeEmpresa: req.body.nomeEmpresa
    });

    const empresa = await AuthService.registerEmpresa(req.body);

    res.status(201).json({
      success: true,
      message: "Empresa registrada com sucesso",
      empresa
    });
  });

  static loginEmpresa = asyncHandler(async (req, res) => {
    Logger.info("🔑 Tentativa de login empresa", {
      email: req.body.email,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    try {
      const result = await AuthService.loginEmpresa(req.body.email, req.body.senha);

      Logger.info("✅ Login empresa bem-sucedido", {
        email: req.body.email,
        empresaId: result.empresa?.id || result.colaborador?.empresa_id
      });

      res.json({
        success: true,
        message: "Login realizado com sucesso",
        ...result
      });
    } catch (error) {
      Logger.error("❌ Erro no login empresa", {
        email: req.body.email,
        error: error.message,
        ip: req.ip
      });
      throw error;
    }
  });

  static logout = asyncHandler(async (req, res) => {
    Logger.info("🚪 Tentativa de logout", {
      userId: req.body.userId,
      userType: req.body.userType,
      ip: req.ip
    });

    try {
      await AuthService.logout(req.body.userId, req.body.userType);

      Logger.info("✅ Logout realizado com sucesso", {
        userId: req.body.userId,
        userType: req.body.userType
      });

      res.json({
        success: true,
        message: "Logout realizado com sucesso"
      });
    } catch (error) {
      Logger.error("❌ Erro no logout", {
        userId: req.body.userId,
        userType: req.body.userType,
        error: error.message
      });
      throw error;
    }
  });
}

module.exports = AuthController;