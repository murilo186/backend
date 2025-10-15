const { asyncHandler } = require("../middleware/errorHandler");
const FreteService = require("../services/FreteService");
const Logger = require("../utils/logger");

class FreteController {
  // Criar frete (empresa)
  static createFrete = asyncHandler(async (req, res) => {
    Logger.info("Criando frete", {
      empresaId: req.body.empresaId,
      origem: req.body.origem,
      destino: req.body.destino
    });

    const frete = await FreteService.createFrete(req.body);

    res.status(201).json({
      success: true,
      message: "Frete criado com sucesso",
      frete
    });
  });

  // Listar fretes da empresa
  static getFretesByEmpresa = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const { status } = req.query;

    const result = await FreteService.getFretesByEmpresa(empresaId, status);

    res.json({
      success: true,
      ...result
    });
  });

  // Buscar frete específico
  static getFreteById = asyncHandler(async (req, res) => {
    const { freteId } = req.params;

    const frete = await FreteService.getFreteById(freteId);

    res.json({
      success: true,
      frete
    });
  });

  // Atualizar frete (empresa)
  static updateFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { empresaId } = req.body;

    const frete = await FreteService.updateFrete(freteId, empresaId, req.body);

    res.json({
      success: true,
      message: "Frete atualizado com sucesso",
      frete
    });
  });

  // Deletar frete (empresa)
  static deleteFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { empresaId } = req.body;

    await FreteService.deleteFrete(freteId, empresaId);

    res.json({
      success: true,
      message: "Frete removido com sucesso"
    });
  });

  // Oferecer frete para motorista
  static offerFreteToMotorista = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId, empresaId } = req.body;

    Logger.info("Oferecendo frete", { freteId, motoristaId, empresaId });

    const result = await FreteService.offerFreteToMotorista(freteId, motoristaId, empresaId);

    res.json(result);
  });

  // Listar fretes oferecidos para um motorista
  static getOfertasForMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    Logger.info("Buscando ofertas para motorista", { motoristaId });

    const fretes = await FreteService.getOfertasForMotorista(motoristaId);

    res.json({
      success: true,
      fretes
    });
  });

  // Aceitar frete (motorista)
  static acceptFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId } = req.body;

    console.log("🔥 DEBUG Controller - DADOS RECEBIDOS:", {
      freteId: freteId,
      motoristaId: motoristaId,
      freteIdType: typeof freteId,
      motoristaIdType: typeof motoristaId,
      reqParams: req.params,
      reqBody: req.body
    });

    // Converter para integer para garantir tipo correto
    const freteIdInt = parseInt(freteId);
    const motoristaIdInt = parseInt(motoristaId);

    console.log("🔥 DEBUG Controller - APÓS CONVERSÃO:", {
      freteIdInt,
      motoristaIdInt,
      freteIdIntType: typeof freteIdInt,
      motoristaIdIntType: typeof motoristaIdInt,
      isNaNFreteId: isNaN(freteIdInt),
      isNaNMotoristaId: isNaN(motoristaIdInt)
    });

    Logger.info("Aceitando frete", { freteId: freteIdInt, motoristaId: motoristaIdInt });

    try {
      const result = await FreteService.acceptFrete(freteIdInt, motoristaIdInt);
      console.log("✅ DEBUG Controller - SUCESSO:", result);
      res.json(result);
    } catch (error) {
      console.error("❌ DEBUG Controller - ERRO CAPTURADO:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  });

  // Recusar frete (motorista)
  static rejectFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { motoristaId, observacoes } = req.body;

    // Converter para integer para garantir tipo correto
    const freteIdInt = parseInt(freteId);
    const motoristaIdInt = parseInt(motoristaId);

    Logger.info("Rejeitando frete", { freteId: freteIdInt, motoristaId: motoristaIdInt });

    const result = await FreteService.rejectFrete(freteIdInt, motoristaIdInt, observacoes);

    res.json(result);
  });

  // Finalizar frete (empresa)
  static finalizarFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;
    const { empresaId, finalizadoPor } = req.body;

    Logger.info("Finalizando frete", { freteId, empresaId, finalizadoPor });

    const result = await FreteService.finalizarFrete(freteId, empresaId, finalizadoPor);

    res.json(result);
  });

  // Listar fretes ativos do motorista
  static getFretesByMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;
    const { tipo } = req.params; // 'ativos' ou 'historico'

    const fretes = await FreteService.getFretesByMotorista(motoristaId, tipo);

    res.json({
      success: true,
      fretes
    });
  });

  // Atualizar status do motorista
  static updateMotoristaStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status_disponibilidade } = req.body;

    Logger.info("Atualizando status do motorista", { id, status_disponibilidade });

    const MotoristaModel = require("../models/MotoristaModel");
    const motorista = await MotoristaModel.updateStatus(id, status_disponibilidade);

    res.json({
      success: true,
      message: "Status atualizado",
      motorista
    });
  });

  // Estatísticas
  static getStats = asyncHandler(async (req, res) => {
    const { empresaId, motoristaId } = req.query;

    const stats = await FreteService.getStats(empresaId, motoristaId);

    res.json({
      success: true,
      stats
    });
  });

  // Buscar fretes ativos do motorista (Mobile App)
  static getFretesAtivosMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    Logger.info("Buscando fretes ativos", { motoristaId });

    const fretes = await FreteService.getFretesAtivosMotorista(motoristaId);

    res.json({
      success: true,
      fretes
    });
  });

  // Buscar histórico de fretes do motorista (Mobile App)
  static getHistoricoMotorista = asyncHandler(async (req, res) => {
    const { motoristaId } = req.params;

    Logger.info("Buscando histórico de fretes", { motoristaId });

    const fretes = await FreteService.getHistoricoMotorista(motoristaId);

    res.json({
      success: true,
      fretes
    });
  });

  // Buscar fretes disponíveis para terceiros (Mobile App)
  static getFretesTerceirizados = asyncHandler(async (req, res) => {
    Logger.info("Buscando fretes terceirizados");

    const fretes = await FreteService.getFretesTerceirizados();

    res.json({
      success: true,
      fretes
    });
  });

  // DEBUG - Verificar dados de um frete específico
  static debugFrete = asyncHandler(async (req, res) => {
    const { freteId } = req.params;

    const db = require("../config/database");
    const result = await db.query(
      "SELECT id, origem, destino, disponivel_terceiros, created_at, updated_at FROM fretes WHERE id = $1",
      [freteId]
    );

    res.json({
      success: true,
      frete: result.rows[0] || null,
      message: result.rows[0] ? "Frete encontrado" : "Frete não encontrado"
    });
  });

  // Buscar dados de receita por período
  static getReceitaPorPeriodo = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const { periodo = '6meses' } = req.query;

    console.log("🔥 DEBUG getReceitaPorPeriodo CHAMADO!", { empresaId, periodo, params: req.params, query: req.query });
    Logger.info("Buscando dados de receita por período", { empresaId, periodo });

    const db = require("../config/database");

    let query, result;

    // Determinar query baseada no período
    switch (periodo) {
      case '7dias':
        // Últimos 7 dias
        query = `
          SELECT
            DATE(created_at) as periodo,
            COUNT(*) as total_fretes,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor_empresa ELSE 0 END) as receita_total,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor ELSE 0 END) as custos_motorista,
            SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_liquido
          FROM fretes
          WHERE empresa_id = $1
            AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY periodo ASC
        `;
        break;

      case 'estemes':
        // Este mês (agrupado por dia)
        query = `
          SELECT
            DATE(created_at) as periodo,
            COUNT(*) as total_fretes,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor_empresa ELSE 0 END) as receita_total,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor ELSE 0 END) as custos_motorista,
            SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_liquido
          FROM fretes
          WHERE empresa_id = $1
            AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
          GROUP BY DATE(created_at)
          ORDER BY periodo ASC
        `;
        break;

      case '30dias':
        // Últimos 30 dias (agrupado por semana)
        query = `
          SELECT
            DATE_TRUNC('week', created_at) as periodo,
            COUNT(*) as total_fretes,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor_empresa ELSE 0 END) as receita_total,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor ELSE 0 END) as custos_motorista,
            SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_liquido
          FROM fretes
          WHERE empresa_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('week', created_at)
          ORDER BY periodo ASC
        `;
        break;

      case '3meses':
      case '6meses':
      case '1ano':
        // Períodos por mês
        const monthsCount = periodo === '3meses' ? 3 : periodo === '1ano' ? 12 : 6;
        query = `
          SELECT
            DATE_TRUNC('month', created_at) as periodo,
            COUNT(*) as total_fretes,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor_empresa ELSE 0 END) as receita_total,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor ELSE 0 END) as custos_motorista,
            SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_liquido
          FROM fretes
          WHERE empresa_id = $1
            AND created_at >= NOW() - INTERVAL '${monthsCount} months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY periodo ASC
        `;
        break;

      default:
        // Default: 6 meses
        query = `
          SELECT
            DATE_TRUNC('month', created_at) as periodo,
            COUNT(*) as total_fretes,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor_empresa ELSE 0 END) as receita_total,
            SUM(CASE WHEN status_frete = 'finalizado' THEN valor ELSE 0 END) as custos_motorista,
            SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_liquido
          FROM fretes
          WHERE empresa_id = $1
            AND created_at >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY periodo ASC
        `;
    }

    result = await db.query(query, [empresaId]);

    // Formatar dados de acordo com o período
    const dadosCompletos = result.rows.map(row => {
      let label;
      const data = new Date(row.periodo);

      if (periodo === '7dias' || periodo === 'estemes') {
        // Formato: "12/Out"
        label = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      } else if (periodo === '30dias') {
        // Formato: "Sem 12/Out"
        label = `Sem ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
      } else {
        // Formato: "Out" ou "Out/24"
        const showYear = periodo === '1ano';
        label = data.toLocaleDateString('pt-BR', {
          month: 'short',
          year: showYear ? '2-digit' : undefined
        });
      }

      return {
        mes: label,
        receita_total: parseFloat(row.receita_total) || 0,
        custos_motorista: parseFloat(row.custos_motorista) || 0,
        lucro_liquido: parseFloat(row.lucro_liquido) || 0,
        total_fretes: parseInt(row.total_fretes) || 0
      };
    });

    res.json({
      success: true,
      periodo,
      dados: dadosCompletos
    });
  });

  // Top 5 Rotas Mais Lucrativas
  static getTopRotasLucrativas = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const db = require("../config/database");

    const query = `
      SELECT
        origem,
        destino,
        COUNT(*) as quantidade,
        SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_total,
        AVG(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) as lucro_medio
      FROM fretes
      WHERE empresa_id = $1
        AND status_frete = 'finalizado'
        AND valor_empresa IS NOT NULL
      GROUP BY origem, destino
      HAVING SUM(CASE WHEN status_frete = 'finalizado' THEN (valor_empresa - valor) ELSE 0 END) > 0
      ORDER BY lucro_total DESC
      LIMIT 5
    `;

    const result = await db.query(query, [empresaId]);

    const rotas = result.rows.map(row => ({
      origem: row.origem,
      destino: row.destino,
      quantidade: parseInt(row.quantidade),
      lucro_total: parseFloat(row.lucro_total) || 0,
      lucro_medio: parseFloat(row.lucro_medio) || 0
    }));

    res.json({
      success: true,
      rotas
    });
  });

  // Top 5 Rotas Mais Usadas (apenas finalizadas)
  static getTopRotasUsadas = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const db = require("../config/database");

    const query = `
      SELECT
        origem,
        destino,
        COUNT(*) as quantidade
      FROM fretes
      WHERE empresa_id = $1
        AND status_frete = 'finalizado'
      GROUP BY origem, destino
      ORDER BY quantidade DESC
      LIMIT 5
    `;

    const result = await db.query(query, [empresaId]);

    const rotas = result.rows.map(row => ({
      origem: row.origem,
      destino: row.destino,
      quantidade: parseInt(row.quantidade)
    }));

    res.json({
      success: true,
      rotas
    });
  });

  // Estatísticas detalhadas da empresa
  static getEstatisticasDetalhadas = asyncHandler(async (req, res) => {
    const { empresaId } = req.params;
    const db = require("../config/database");

    // Query principal com todas as estatísticas
    const query = `
      WITH fretes_finalizados AS (
        SELECT
          f.*,
          CAST(REGEXP_REPLACE(f.distancia, '[^0-9.]', '', 'g') AS NUMERIC) as distancia_num,
          TO_CHAR(f.data_finalizacao, 'YYYY-MM') as mes_finalizacao,
          TO_CHAR(f.data_finalizacao, 'YYYY-MM-DD') as dia_finalizacao
        FROM fretes f
        WHERE f.empresa_id = $1
          AND f.status_frete = 'finalizado'
          AND f.valor IS NOT NULL
      )
      SELECT
        -- Financeiro
        COALESCE(SUM(valor), 0) as ganhos_totais,
        COALESCE(AVG(valor), 0) as media_por_frete,
        COUNT(*) as total_fretes_finalizados,

        -- Melhor mês
        (
          SELECT mes_finalizacao
          FROM fretes_finalizados
          GROUP BY mes_finalizacao
          ORDER BY SUM(valor) DESC
          LIMIT 1
        ) as melhor_mes,
        (
          SELECT SUM(valor)
          FROM fretes_finalizados
          GROUP BY mes_finalizacao
          ORDER BY SUM(valor) DESC
          LIMIT 1
        ) as valor_melhor_mes,

        -- Distâncias
        COALESCE(SUM(distancia_num * 2), 0) as kms_rodados,
        COALESCE(AVG(distancia_num), 0) as distancia_media,
        COALESCE(MAX(distancia_num), 0) as maior_distancia,

        -- Rota mais rentável
        (
          SELECT origem || ' → ' || destino
          FROM fretes_finalizados
          GROUP BY origem, destino
          ORDER BY SUM(valor) DESC
          LIMIT 1
        ) as rota_mais_rentavel,
        (
          SELECT SUM(valor)
          FROM fretes_finalizados
          GROUP BY origem, destino
          ORDER BY SUM(valor) DESC
          LIMIT 1
        ) as valor_rota_rentavel,

        -- Performance
        COUNT(DISTINCT dia_finalizacao) as dias_trabalhados,
        COUNT(*) / NULLIF(EXTRACT(WEEK FROM MAX(data_finalizacao)) - EXTRACT(WEEK FROM MIN(data_finalizacao)) + 1, 0) as frequencia_semanal

      FROM fretes_finalizados
    `;

    const result = await db.query(query, [empresaId]);
    const stats = result.rows[0];

    // Formatar resposta
    const estatisticas = {
      financeiro: {
        ganhos_totais: parseFloat(stats.ganhos_totais) || 0,
        media_por_frete: parseFloat(stats.media_por_frete) || 0,
        melhor_mes: stats.melhor_mes || null,
        valor_melhor_mes: parseFloat(stats.valor_melhor_mes) || 0
      },
      rotas: {
        kms_rodados: parseFloat(stats.kms_rodados) || 0,
        distancia_media: parseFloat(stats.distancia_media) || 0,
        maior_distancia: parseFloat(stats.maior_distancia) || 0,
        rota_mais_rentavel: stats.rota_mais_rentavel || 'N/A',
        valor_rota_rentavel: parseFloat(stats.valor_rota_rentavel) || 0
      },
      performance: {
        total_fretes: parseInt(stats.total_fretes_finalizados) || 0,
        dias_trabalhados: parseInt(stats.dias_trabalhados) || 0,
        frequencia_semanal: parseFloat(stats.frequencia_semanal) || 0
      }
    };

    res.json({
      success: true,
      estatisticas
    });
  });
}


module.exports = FreteController;
