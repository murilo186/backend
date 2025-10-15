const { asyncHandler } = require("../middleware/errorHandler");
const EmpresaModel = require("../models/EmpresaModel");
const GeocodingService = require("../services/GeocodingService");
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

    // Se tem dados de endereço, buscar coordenadas
    if (mappedData.rua && mappedData.cidade && mappedData.estado) {
      Logger.info("Buscando coordenadas para endereço da empresa", { empresaId: id });

      const coordinates = await GeocodingService.getCoordinates({
        rua: mappedData.rua,
        numero: mappedData.numero,
        bairro: mappedData.bairro,
        cidade: mappedData.cidade,
        estado: mappedData.estado,
        cep: mappedData.cep
      });

      if (coordinates) {
        mappedData.latitude = coordinates.latitude;
        mappedData.longitude = coordinates.longitude;
        Logger.info("Coordenadas adicionadas aos dados da empresa", coordinates);
      }
    }

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

  // Atualizar apenas coordenadas da empresa
  static updateCoordenadas = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude e longitude são obrigatórias"
      });
    }

    Logger.info("Atualizando coordenadas da empresa", {
      empresaId: id,
      latitude,
      longitude
    });

    await db.query(
      'UPDATE empresas SET latitude = $1, longitude = $2 WHERE id = $3',
      [latitude, longitude, id]
    );

    Logger.info("Coordenadas da empresa atualizadas", { empresaId: id });

    res.json({
      success: true,
      message: "Coordenadas atualizadas com sucesso"
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