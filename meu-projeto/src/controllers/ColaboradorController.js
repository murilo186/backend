const { asyncHandler } = require("../middleware/errorHandler");
const ColaboradorService = require("../services/ColaboradorService");
const Logger = require("../utils/logger");

class ColaboradorController {
  // Criar colaborador (para o modal)
  static createColaborador = asyncHandler(async (req, res) => {
    Logger.info("Criando colaborador", {
      empresaId: req.body.empresaId,
      nome: req.body.nome,
      email: req.body.email,
      cargo: req.body.cargo
    });

    const colaborador = await ColaboradorService.createColaborador(req.body);

    res.status(201).json({
      success: true,
      message: "Colaborador criado com sucesso",
      colaborador
    });
  });

  // Listar colaboradores da empresa
  static getColaboradoresByEmpresa = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;

    Logger.info("Listando colaboradores da empresa", { empresaId });

    const colaboradores = await ColaboradorService.getColaboradoresByEmpresa(empresaId);

    res.json({
      success: true,
      colaboradores
    });
  });

  // Atualizar colaborador
  static updateColaborador = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const colaborador = await ColaboradorService.updateColaborador(id, req.body);

    res.json({
      success: true,
      message: "Colaborador atualizado",
      colaborador
    });
  });

  // Remover colaborador (desativar)
  static deactivateColaborador = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await ColaboradorService.deactivateColaborador(id);

    res.json({
      success: true,
      message: `Colaborador ${result.nome} removido`
    });
  });

  // Estatísticas de colaboradores
  static getColaboradorStats = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;

    const stats = await ColaboradorService.getColaboradorStats(empresaId);

    res.json({
      success: true,
      stats
    });
  });

  // Atualizar status de trabalho
  static updateStatusTrabalho = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status_trabalho } = req.body;

    Logger.info("Atualizando status de trabalho", {
      colaboradorId: id,
      novoStatus: status_trabalho
    });

    const result = await ColaboradorService.updateStatusTrabalho(id, status_trabalho);

    res.json({
      success: true,
      message: "Status atualizado com sucesso",
      colaborador: result
    });
  });
}

module.exports = ColaboradorController;