const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const MotoristaModel = require("../models/MotoristaModel");
const Logger = require("../utils/logger");

const router = express.Router();

// Listar motoristas da equipe de uma empresa
const getMotoristasByEmpresa = asyncHandler(async (req, res) => {
  const { empresaId } = req.params;

  Logger.info("Listando motoristas da empresa", { empresaId });

  const motoristas = await MotoristaModel.findByEmpresa(empresaId);

  res.json({
    success: true,
    motoristas
  });
});

// Listar equipe completa da empresa (agregados + terceirizados)
const getEquipeCompletaByEmpresa = asyncHandler(async (req, res) => {
  const { empresaId } = req.params;

  Logger.info("Listando equipe completa da empresa", { empresaId });

  const equipeCompleta = await MotoristaModel.findEquipeCompleta(empresaId);

  // Separar entre agregados e terceirizados
  const agregados = equipeCompleta.filter(m => m.tipo_vinculo === 'agregado');
  const terceirizados = equipeCompleta.filter(m =>
    m.tipo_vinculo === 'terceirizado_ativo' || m.tipo_vinculo === 'terceirizado'
  );

  Logger.info("Equipe separada", {
    agregados: agregados.length,
    terceirizados: terceirizados.length
  });

  res.json({
    success: true,
    equipe: {
      agregados,
      terceirizados
    }
  });
});

// Atualizar status do motorista
const updateMotoristaStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status_disponibilidade } = req.body;

  Logger.info("Atualizando status do motorista", { id, status_disponibilidade });

  const motorista = await MotoristaModel.updateStatus(id, status_disponibilidade);

  res.json({
    success: true,
    message: "Status atualizado",
    motorista
  });
});

// Buscar motorista por ID
const getMotoristaById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const motorista = await MotoristaModel.findById(id);

  if (!motorista) {
    return res.status(404).json({
      success: false,
      error: "Motorista não encontrado"
    });
  }

  res.json({
    success: true,
    motorista
  });
});

// Rotas
router.get("/empresa/:empresaId", getMotoristasByEmpresa); // Listar motoristas da empresa
router.get("/empresa/:empresaId/equipe", getEquipeCompletaByEmpresa); // Listar equipe completa (agregados + terceirizados)
router.put("/:id/status", updateMotoristaStatus); // Atualizar status do motorista
// Sair da empresa (motorista)
const sairDaEmpresa = asyncHandler(async (req, res) => {
  const { motoristaId } = req.params;

  Logger.info("Motorista saindo da empresa", { motoristaId });

  const motorista = await MotoristaModel.updateEmpresa(motoristaId, null);

  res.json({
    success: true,
    message: "Você saiu da empresa com sucesso",
    motorista
  });
});

// Atualizar localização do motorista
const atualizarLocalizacao = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, localizacao_atualizada_em, ultima_localizacao } = req.body;

  Logger.info("🔵 [LOCALIZACAO] Recebendo atualização", {
    motoristaId: id,
    latitude,
    longitude,
    localizacao_atualizada_em,
    ultima_localizacao
  });

  // Validar coordenadas
  if (!latitude || !longitude) {
    Logger.error("🔴 [LOCALIZACAO] Coordenadas inválidas", { latitude, longitude });
    return res.status(400).json({
      success: false,
      error: "Latitude e longitude são obrigatórias"
    });
  }

  // Atualizar no banco de dados
  Logger.info("🟡 [LOCALIZACAO] Salvando no banco...");
  const motorista = await MotoristaModel.updateLocalizacao(id, latitude, longitude);
  Logger.info("🟢 [LOCALIZACAO] Salvo com sucesso!", { motorista });

  res.json({
    success: true,
    message: "Localização atualizada com sucesso",
    motorista: {
      id: motorista.id,
      latitude: motorista.latitude,
      longitude: motorista.longitude,
      ultima_localizacao: motorista.ultima_localizacao
    }
  });
});

// Ranking de motoristas por quantidade de fretes
const getRankingMotoristas = asyncHandler(async (req, res) => {
  const { empresaId } = req.params;
  const db = require("../config/database");

  Logger.info("Buscando ranking de motoristas", { empresaId });

  const query = `
    SELECT
      m.id,
      m.nome,
      m.codigo,
      COUNT(f.id) as total_fretes,
      SUM(CASE WHEN f.status_frete = 'finalizado' THEN 1 ELSE 0 END) as fretes_finalizados,
      SUM(CASE WHEN f.status_frete IN ('aceito', 'em_andamento') THEN 1 ELSE 0 END) as fretes_andamento
    FROM motoristas m
    LEFT JOIN fretes f ON m.id = f.motorista_id AND f.empresa_id = $1
    WHERE m.empresa_id = $1
    GROUP BY m.id, m.nome, m.codigo
    HAVING COUNT(f.id) > 0
    ORDER BY total_fretes DESC, fretes_finalizados DESC
    LIMIT 10
  `;

  const result = await db.query(query, [empresaId]);

  const ranking = result.rows.map(row => ({
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    total_fretes: parseInt(row.total_fretes) || 0,
    fretes_finalizados: parseInt(row.fretes_finalizados) || 0,
    fretes_andamento: parseInt(row.fretes_andamento) || 0
  }));

  res.json({
    success: true,
    ranking
  });
});

// Buscar estatísticas do motorista
const getEstatisticasMotorista = asyncHandler(async (req, res) => {
  const { motoristaId } = req.params;

  Logger.info("Buscando estatísticas do motorista", { motoristaId });

  const pool = require("../config/database");

  // Query para buscar estatísticas do motorista
  const query = `
    WITH fretes_motorista AS (
      SELECT
        f.*,
        CAST(REGEXP_REPLACE(f.distancia, '[^0-9.]', '', 'g') AS NUMERIC) as distancia_num
      FROM fretes f
      WHERE f.motorista_id = $1
        AND f.status_frete = 'finalizado'
        AND f.valor IS NOT NULL
    ),
    mes_atual AS (
      SELECT
        COALESCE(SUM(valor), 0) as ganhos_mes
      FROM fretes_motorista
      WHERE DATE_TRUNC('month', data_finalizacao) = DATE_TRUNC('month', CURRENT_DATE)
    ),
    fretes_oferecidos AS (
      SELECT COUNT(*) as total_oferecidos
      FROM fretes
      WHERE motorista_id = $1
        AND status_frete = 'pendente'
    )
    SELECT
      -- Ganhos do mês
      (SELECT ganhos_mes FROM mes_atual) as ganhos_mes_atual,
      -- Média por frete
      COALESCE(AVG(valor), 0) as ganho_medio_frete,
      -- Total de fretes finalizados
      COUNT(*) as total_fretes_finalizados,
      -- KMs rodados (soma das distâncias × 2 para ida e volta)
      COALESCE(SUM(distancia_num * 2), 0) as kms_rodados,
      -- Fretes oferecidos pendentes
      (SELECT total_oferecidos FROM fretes_oferecidos) as fretes_pendentes
    FROM fretes_motorista
  `;

  const result = await pool.query(query, [motoristaId]);

  if (result.rows.length === 0) {
    return res.json({
      success: true,
      estatisticas: {
        ganhos_mes_atual: 0,
        ganho_medio_frete: 0,
        total_fretes_finalizados: 0,
        kms_rodados: 0,
        fretes_pendentes: 0
      }
    });
  }

  const stats = result.rows[0];

  res.json({
    success: true,
    estatisticas: {
      ganhos_mes_atual: parseFloat(stats.ganhos_mes_atual) || 0,
      ganho_medio_frete: parseFloat(stats.ganho_medio_frete) || 0,
      total_fretes_finalizados: parseInt(stats.total_fretes_finalizados) || 0,
      kms_rodados: parseFloat(stats.kms_rodados) || 0,
      fretes_pendentes: parseInt(stats.fretes_pendentes) || 0
    }
  });
});

// Buscar top rotas mais lucrativas do motorista
const getTopRotasLucrativasMotorista = asyncHandler(async (req, res) => {
  const { motoristaId } = req.params;

  Logger.info("Buscando top rotas lucrativas do motorista", { motoristaId });

  const pool = require("../config/database");

  const query = `
    SELECT
      origem,
      destino,
      COUNT(*) as quantidade,
      SUM(valor) as lucro_total,
      AVG(valor) as lucro_medio,
      SUM(CAST(REGEXP_REPLACE(distancia, '[^0-9.]', '', 'g') AS NUMERIC) * 2) as kms_rodados
    FROM fretes
    WHERE motorista_id = $1
      AND status_frete = 'finalizado'
      AND valor IS NOT NULL
    GROUP BY origem, destino
    HAVING SUM(valor) > 0
    ORDER BY lucro_total DESC
    LIMIT 3
  `;

  const result = await pool.query(query, [motoristaId]);

  const rotas = result.rows.map(row => ({
    origem: row.origem,
    destino: row.destino,
    quantidade: parseInt(row.quantidade),
    lucro_total: parseFloat(row.lucro_total),
    lucro_medio: parseFloat(row.lucro_medio),
    kms_rodados: parseFloat(row.kms_rodados) || 0
  }));

  res.json({
    success: true,
    rotas
  });
});

// Buscar top rotas mais frequentes do motorista
const getTopRotasFrequentesMotorista = asyncHandler(async (req, res) => {
  const { motoristaId } = req.params;

  Logger.info("Buscando top rotas frequentes do motorista", { motoristaId });

  const pool = require("../config/database");

  const query = `
    SELECT
      origem,
      destino,
      COUNT(*) as quantidade,
      SUM(valor) as valor_total,
      AVG(valor) as valor_medio,
      SUM(CAST(REGEXP_REPLACE(distancia, '[^0-9.]', '', 'g') AS NUMERIC) * 2) as kms_rodados
    FROM fretes
    WHERE motorista_id = $1
      AND status_frete = 'finalizado'
    GROUP BY origem, destino
    ORDER BY quantidade DESC
    LIMIT 3
  `;

  const result = await pool.query(query, [motoristaId]);

  const rotas = result.rows.map(row => ({
    origem: row.origem,
    destino: row.destino,
    quantidade: parseInt(row.quantidade),
    valor_total: parseFloat(row.valor_total) || 0,
    valor_medio: parseFloat(row.valor_medio) || 0,
    kms_rodados: parseFloat(row.kms_rodados) || 0
  }));

  res.json({
    success: true,
    rotas
  });
});

// Atualizar documentos do veículo/condutor
const atualizarDocumentosVeiculo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { antt, placa_veiculo, renavam, chassi, cnh } = req.body;

  Logger.info("🚗 [DOCS_VEICULO] Atualizando documentos", {
    motoristaId: id,
    antt,
    placa_veiculo,
    renavam,
    chassi,
    cnh
  });

  const motorista = await MotoristaModel.updateDocumentosVeiculo(id, {
    antt,
    placa_veiculo,
    renavam,
    chassi,
    cnh
  });

  res.json({
    success: true,
    message: "Documentos do veículo atualizados com sucesso",
    motorista
  });
});

// Atualizar telefone do motorista
const atualizarTelefone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { telefone } = req.body;

  Logger.info("📞 [TELEFONE] Atualizando telefone do motorista", {
    motoristaId: id,
    telefone
  });

  if (!telefone || telefone.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Telefone é obrigatório"
    });
  }

  const motorista = await MotoristaModel.updateTelefone(id, telefone.trim());

  res.json({
    success: true,
    message: "Telefone atualizado com sucesso",
    motorista
  });
});

// Adicionar as rotas
router.get("/estatisticas/:motoristaId", getEstatisticasMotorista); // Estatísticas do motorista
router.get("/top-rotas-lucrativas/:motoristaId", getTopRotasLucrativasMotorista); // Top rotas lucrativas do motorista
router.get("/top-rotas-frequentes/:motoristaId", getTopRotasFrequentesMotorista); // Top rotas frequentes do motorista
router.get("/ranking/:empresaId", getRankingMotoristas); // Ranking de motoristas
router.put("/:motoristaId/sair-empresa", sairDaEmpresa); // Sair da empresa
router.put("/:id/localizacao", atualizarLocalizacao); // Atualizar localização
router.put("/:id/documentos-veiculo", atualizarDocumentosVeiculo); // Atualizar documentos do veículo
router.put("/:id/telefone", atualizarTelefone); // Atualizar telefone
router.get("/:id", getMotoristaById); // Buscar motorista por ID

module.exports = router;