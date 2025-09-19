const { asyncHandler } = require("../middleware/errorHandler");
const EmpresaModel = require("../models/EmpresaModel");
const Logger = require("../utils/logger");

class EmpresaController {
  // Obter dados da empresa
  static getEmpresaById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    Logger.info("Buscando dados da empresa", { empresaId: id });

    const empresa = await EmpresaModel.findById(id);

    if (!empresa) {
      return res.status(404).json({
        success: false,
        error: "Empresa não encontrada"
      });
    }

    res.json({
      success: true,
      empresa
    });
  });

  // Atualizar dados da empresa
  static updateEmpresa = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    Logger.info("Atualizando dados da empresa", {
      empresaId: id,
      campos: Object.keys(updateData)
    });

    // Mapear campos do frontend para o formato do backend
    const mappedData = {
      nomeEmpresa: updateData.nome_empresa,
      emailCorporativo: updateData.email_corporativo,
      telefone: updateData.telefone,
      site: updateData.site,
      whatsapp: updateData.whatsapp,
      descricao: updateData.descricao,
      setor: updateData.setor,
      porte: updateData.porte,
      dataFundacao: updateData.data_fundacao || null,
      numFuncionarios: updateData.num_funcionarios ? parseInt(updateData.num_funcionarios) : null,
      cep: updateData.cep,
      rua: updateData.rua,
      numero: updateData.numero,
      complemento: updateData.complemento,
      bairro: updateData.bairro,
      cidade: updateData.cidade,
      estado: updateData.estado
    };

    const empresa = await EmpresaModel.update(id, mappedData);

    Logger.info("Empresa atualizada com sucesso", {
      empresaId: id,
      nomeEmpresa: empresa.nome_empresa
    });

    res.json({
      success: true,
      message: "Dados da empresa atualizados com sucesso",
      empresa
    });
  });

  // Obter estatísticas da empresa
  static getEmpresaStats = asyncHandler(async (req, res) => {
    const { id } = req.params;

    Logger.info("Buscando estatísticas da empresa", { empresaId: id });

    const stats = await EmpresaModel.getStats(id);

    res.json({
      success: true,
      stats
    });
  });
}

module.exports = EmpresaController;