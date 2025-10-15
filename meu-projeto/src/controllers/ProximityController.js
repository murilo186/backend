const { asyncHandler } = require("../middleware/errorHandler");
const db = require("../config/database");
const Logger = require("../utils/logger");

class ProximityController {
  // Empresa buscar motoristas próximos
  static getMotoristasPróximos = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const { raio = 30 } = req.query; // Default 30km

    Logger.info("Buscando motoristas próximos da empresa", { empresaId, raio });

    // 1. Buscar coordenadas da empresa
    const empresaResult = await db.query(
      `SELECT id, nome_empresa, latitude, longitude
       FROM empresas
       WHERE id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [empresaId]
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Empresa não encontrada ou sem localização definida"
      });
    }

    const empresa = empresaResult.rows[0];

    // 2. Buscar motoristas próximos
    const motoristas = await db.query(`
      SELECT
        m.id,
        m.nome,
        m.usuario,
        m.codigo,
        m.email,
        m.telefone,
        m.status_disponibilidade,
        m.latitude,
        m.longitude,
        m.ultima_localizacao,
        calcular_distancia_km(m.latitude, m.longitude, $2, $3) as distancia_km,
        CASE
          WHEN m.empresa_id = $1 THEN 'proprio'
          ELSE 'terceirizado'
        END as tipo_vinculo
      FROM motoristas m
      WHERE m.latitude IS NOT NULL
        AND m.longitude IS NOT NULL
        AND m.ativo = true
        AND calcular_distancia_km(m.latitude, m.longitude, $2, $3) <= $4
      ORDER BY distancia_km ASC
    `, [empresaId, empresa.latitude, empresa.longitude, raio]);

    Logger.info("Motoristas próximos encontrados", {
      total: motoristas.rows.length,
      raio: `${raio}km`,
      empresa_coords: { lat: empresa.latitude, lng: empresa.longitude },
      motoristas_detalhes: motoristas.rows.map(m => ({
        id: m.id,
        nome: m.nome,
        coords: { lat: m.latitude, lng: m.longitude },
        distancia: m.distancia_km,
        tipo: m.tipo_vinculo
      }))
    });

    res.json({
      success: true,
      empresa: {
        id: empresa.id,
        nome: empresa.nome_empresa,
        latitude: empresa.latitude,
        longitude: empresa.longitude
      },
      motoristas: motoristas.rows,
      total: motoristas.rows.length,
      raio: `${raio}km`
    });
  });

  // Motorista buscar empresas próximas
  static getEmpresasPróximas = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;
    const { raio = 30 } = req.query;

    Logger.info("🔵 [EMPRESAS_PROXIMAS] Iniciando busca", { motoristaId, raio });

    // Primeiro, verificar se o motorista existe e tem coordenadas
    const motoristaCheck = await db.query(
      `SELECT id, nome, latitude, longitude, ultima_localizacao
       FROM motoristas
       WHERE id = $1`,
      [motoristaId]
    );

    Logger.info("🔵 [EMPRESAS_PROXIMAS] Dados do motorista", {
      encontrado: motoristaCheck.rows.length > 0,
      motorista: motoristaCheck.rows[0]
    });

    if (motoristaCheck.rows.length === 0) {
      Logger.error("🔴 [EMPRESAS_PROXIMAS] Motorista não encontrado", { motoristaId });
      return res.status(404).json({
        success: false,
        error: "Motorista não encontrado"
      });
    }

    const motoristaData = motoristaCheck.rows[0];

    if (!motoristaData.latitude || !motoristaData.longitude) {
      Logger.error("🔴 [EMPRESAS_PROXIMAS] Motorista sem localização", {
        motoristaId,
        latitude: motoristaData.latitude,
        longitude: motoristaData.longitude
      });
      return res.status(404).json({
        success: false,
        error: "Motorista sem localização definida"
      });
    }

    Logger.info("🟡 [EMPRESAS_PROXIMAS] Buscando empresas próximas...", {
      motorista_coords: {
        lat: motoristaData.latitude,
        lng: motoristaData.longitude
      },
      raio: `${raio}km`
    });

    // Query completa com parâmetros seguros
    const result = await db.query(`
      SELECT
        e.id,
        e.nome_empresa,
        e.cidade,
        e.estado,
        e.telefone,
        e.email_corporativo,
        e.latitude,
        e.longitude,
        calcular_distancia_km(e.latitude, e.longitude, $1, $2) as distancia_km
      FROM empresas e
      WHERE e.latitude IS NOT NULL
        AND e.longitude IS NOT NULL
        AND calcular_distancia_km(e.latitude, e.longitude, $1, $2) <= $3
      ORDER BY distancia_km ASC
    `, [motoristaData.latitude, motoristaData.longitude, raio]);

    Logger.info("🟢 [EMPRESAS_PROXIMAS] Empresas encontradas", {
      total: result.rows.length,
      empresas: result.rows.map(e => ({
        id: e.id,
        nome: e.nome_empresa,
        distancia: e.distancia_km + 'km'
      }))
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Nenhuma empresa próxima encontrada"
      });
    }

    const motorista = {
      id: motoristaData.id,
      nome: motoristaData.nome,
      latitude: motoristaData.latitude,
      longitude: motoristaData.longitude
    };

    const empresas = result.rows.map(row => ({
      id: row.id,
      nome_empresa: row.nome_empresa,
      cidade: row.cidade,
      estado: row.estado,
      telefone: row.telefone,
      email_corporativo: row.email_corporativo,
      latitude: row.latitude,
      longitude: row.longitude,
      distancia_km: row.distancia_km
    }));

    res.json({
      success: true,
      motorista,
      empresas,
      total: empresas.length,
      raio: `${raio}km`
    });
  });

  // Dashboard geral - todos próximos
  static getDashboardProximidade = asyncHandler(async (req, res) => {
    const { latitude, longitude, raio = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude e longitude são obrigatórias"
      });
    }

    Logger.info("Buscando dashboard de proximidade", { latitude, longitude, raio });

    // Buscar motoristas próximos
    const motoristas = await db.query(`
      SELECT
        'motorista' as tipo,
        m.id,
        m.nome,
        m.status_disponibilidade as status,
        m.latitude,
        m.longitude,
        m.ultima_localizacao as ultima_atualizacao,
        calcular_distancia_km(m.latitude, m.longitude, $1, $2) as distancia_km
      FROM motoristas m
      WHERE m.latitude IS NOT NULL
        AND m.longitude IS NOT NULL
        AND m.ativo = true
        AND calcular_distancia_km(m.latitude, m.longitude, $1, $2) <= $3
    `, [latitude, longitude, raio]);

    // Buscar empresas próximas
    const empresas = await db.query(`
      SELECT
        'empresa' as tipo,
        e.id,
        e.nome_empresa as nome,
        'ativa' as status,
        e.latitude,
        e.longitude,
        e.created_at as ultima_atualizacao,
        calcular_distancia_km(e.latitude, e.longitude, $1, $2) as distancia_km
      FROM empresas e
      WHERE e.latitude IS NOT NULL
        AND e.longitude IS NOT NULL
        AND calcular_distancia_km(e.latitude, e.longitude, $1, $2) <= $3
    `, [latitude, longitude, raio]);

    const todos = [...motoristas.rows, ...empresas.rows]
      .sort((a, b) => parseFloat(a.distancia_km) - parseFloat(b.distancia_km));

    res.json({
      success: true,
      centro: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      raio: `${raio}km`,
      resultados: {
        motoristas: motoristas.rows,
        empresas: empresas.rows,
        todos,
        total: todos.length
      }
    });
  });
}

module.exports = ProximityController;