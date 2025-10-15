const express = require("express");
const pool = require("../db");
const router = express.Router();

// ===============================
// ROTAS DE FRETES
// ===============================

// Criar candidatura para frete terceirizado (Mobile App)
router.post("/:freteId/candidatar", async (req, res) => {
  try {
    const { freteId } = req.params;
    const { motoristaId, observacoes } = req.body;

    console.log("🔥 DEBUG candidatar - dados recebidos:", {
      freteId,
      motoristaId,
      observacoes
    });

    // Verificar se o frete existe e está disponível para terceiros
    const freteResult = await pool.query(
      "SELECT * FROM fretes WHERE id = $1 AND disponivel_terceiros = true AND status_frete = 'pendente'",
      [freteId]
    );

    if (freteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Frete não encontrado ou não disponível para terceiros"
      });
    }

    const frete = freteResult.rows[0];

    // Verificar se já existe candidatura
    const existingResult = await pool.query(
      "SELECT id FROM candidaturas_fretes WHERE frete_id = $1 AND motorista_id = $2",
      [freteId, motoristaId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Você já se candidatou para este frete"
      });
    }

    // Criar candidatura
    const candidaturaResult = await pool.query(
      `INSERT INTO candidaturas_fretes
       (frete_id, motorista_id, empresa_id, observacoes_motorista)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [freteId, motoristaId, frete.empresa_id, observacoes || null]
    );

    console.log("✅ Candidatura criada com sucesso:", candidaturaResult.rows[0]);

    res.status(201).json({
      success: true,
      message: "Candidatura enviada com sucesso!",
      candidatura: candidaturaResult.rows[0]
    });

  } catch (error) {
    console.error("❌ Erro ao criar candidatura:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor"
    });
  }
});

// Buscar fretes disponíveis para terceiros (Mobile App)
router.get("/terceirizados", async (req, res) => {
  try {
    console.log("🔥 DEBUG /terceirizados - endpoint chamado");

    const resultado = await pool.query(
      `SELECT f.*, e.nome_empresa, e.telefone as empresa_telefone,
              e.email_corporativo as empresa_email
       FROM fretes f
       JOIN empresas e ON f.empresa_id = e.id
       WHERE f.disponivel_terceiros = true
         AND f.status_frete = 'pendente'
         AND f.motorista_id IS NULL
       ORDER BY f.created_at DESC`,
      []
    );

    console.log("✅ DEBUG /terceirizados - resultado encontrado:", resultado.rows.length, "fretes");

    res.json({
      success: true,
      fretes: resultado.rows,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar fretes terceirizados:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Criar frete (empresa)
router.post("/", async (req, res) => {
  try {
    const {
      empresaId,
      origem,
      destino,
      distancia,
      valor,
      tipoCarga,
      peso,
      eixosRequeridos,
      observacoes,
    } = req.body;

    if (!empresaId || !origem || !destino || !valor || !tipoCarga) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: empresaId, origem, destino, valor, tipoCarga",
      });
    }

    // Inserir frete (codigo_frete será gerado automaticamente pelo trigger)
    const resultado = await pool.query(
      `INSERT INTO fretes 
       (empresa_id, origem, destino, distancia, valor, tipo_carga, peso, eixos_requeridos, observacoes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        empresaId,
        origem,
        destino,
        distancia || null,
        valor,
        tipoCarga,
        peso || null,
        eixosRequeridos || 3,
        observacoes || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Frete criado com sucesso",
      frete: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Listar fretes da empresa
router.get("/empresa/:empresaId", async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { status } = req.query; // Filtro opcional por status

    let query = `
      SELECT f.*, m.nome as motorista_nome, m.codigo as motorista_codigo
      FROM fretes f
      LEFT JOIN motoristas m ON f.motorista_id = m.id
      WHERE f.empresa_id = $1
    `;

    const params = [empresaId];

    if (status) {
      query += ` AND f.status_frete = $2`;
      params.push(status);
    }

    query += ` ORDER BY f.created_at DESC`;

    const resultado = await pool.query(query, params);

    // Agrupar por status para facilitar o frontend
    const fretes = resultado.rows;
    const agrupados = {
      pendentes: fretes.filter((f) => f.status_frete === "pendente"),
      andamento: fretes.filter((f) =>
        ["oferecido", "aceito", "em_andamento"].includes(f.status_frete)
      ),
      finalizados: fretes.filter((f) => f.status_frete === "finalizado"),
    };

    res.json({
      success: true,
      fretes: agrupados,
      total: fretes.length,
    });
  } catch (err) {
    console.error("Erro ao buscar fretes:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Oferecer frete para motorista
router.post("/:freteId/oferecer", async (req, res) => {
  try {
    const { freteId } = req.params;
    const { motoristaId, empresaId } = req.body;

    // Verificar se frete existe e está pendente
    const freteResult = await pool.query(
      "SELECT * FROM fretes WHERE id = $1 AND empresa_id = $2 AND status_frete = 'pendente'",
      [freteId, empresaId]
    );

    if (freteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Frete não encontrado ou não está pendente" });
    }

    // Verificar se motorista existe e está livre
    const motoristaResult = await pool.query(
      `SELECT * FROM motoristas 
       WHERE id = $1 AND empresa_id = $2 AND status_disponibilidade = 'livre' AND ativo = true`,
      [motoristaId, empresaId]
    );

    if (motoristaResult.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Motorista não encontrado ou não está disponível" });
    }

    // Verificar se já existe oferta ativa para este frete+motorista
    const ofertaExiste = await pool.query(
      `SELECT id FROM ofertas_fretes 
       WHERE frete_id = $1 AND motorista_id = $2 AND status_oferta = 'oferecido'`,
      [freteId, motoristaId]
    );

    if (ofertaExiste.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Já existe uma oferta ativa para este motorista" });
    }

    // Transação: criar oferta + atualizar status do frete
    await pool.query("BEGIN");

    try {
      // Criar oferta
      await pool.query(
        `INSERT INTO ofertas_fretes 
         (frete_id, motorista_id, empresa_id, data_expiracao) 
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
        [freteId, motoristaId, empresaId]
      );

      // Atualizar status do frete
      await pool.query(
        `UPDATE fretes 
         SET status_frete = 'oferecido', data_oferta = NOW() 
         WHERE id = $1`,
        [freteId]
      );

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: "Frete oferecido com sucesso",
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Erro ao oferecer frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Listar fretes oferecidos para um motorista
router.get("/motorista/:motoristaId/oferecidos", async (req, res) => {
  try {
    const { motoristaId } = req.params;

    const resultado = await pool.query(
      `SELECT f.*, e.nome_empresa, of.data_oferta, of.data_expiracao
       FROM ofertas_fretes of
       JOIN fretes f ON of.frete_id = f.id
       JOIN empresas e ON f.empresa_id = e.id
       WHERE of.motorista_id = $1 AND of.status_oferta = 'oferecido' 
       AND of.data_expiracao > NOW()
       ORDER BY of.data_oferta DESC`,
      [motoristaId]
    );

    res.json({
      success: true,
      fretes: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar fretes oferecidos:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Atualizar status do motorista
// Atualizar status do motorista
router.put("/motorista/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status_disponibilidade } = req.body;

  try {
    const resultado = await pool.query(
      "UPDATE motoristas SET status_disponibilidade = $1 WHERE id = $2 RETURNING *",
      [status_disponibilidade, id]
    );

    if (resultado.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Motorista não encontrado" });
    }

    res.json({
      success: true,
      message: "Status atualizado",
      motorista: resultado.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Aceitar frete (motorista)
router.put("/:freteId/aceitar", async (req, res) => {
  try {
    const { freteId } = req.params;
    const { motoristaId } = req.body;

    // Verificar se existe oferta ativa
    const ofertaResult = await pool.query(
      `SELECT of.*, f.status_frete
       FROM ofertas_fretes of
       JOIN fretes f ON of.frete_id = f.id
       WHERE of.frete_id = $1 AND of.motorista_id = $2 AND of.status_oferta = 'oferecido'
       AND of.data_expiracao > NOW()`,
      [freteId, motoristaId]
    );

    if (ofertaResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Oferta não encontrada ou expirada" });
    }

    // Transação: aceitar oferta + atualizar frete + atualizar motorista
    await pool.query("BEGIN");

    try {
      // Atualizar oferta
      await pool.query(
        `UPDATE ofertas_fretes 
         SET status_oferta = 'aceito', data_resposta = NOW() 
         WHERE frete_id = $1 AND motorista_id = $2`,
        [freteId, motoristaId]
      );

      // Atualizar frete
      await pool.query(
        `UPDATE fretes 
         SET status_frete = 'aceito', motorista_id = $1, data_aceite = NOW() 
         WHERE id = $2`,
        [motoristaId, freteId]
      );

      // Atualizar status do motorista
      await pool.query(
        `UPDATE motoristas 
         SET status_disponibilidade = 'em-frete' 
         WHERE id = $1`,
        [motoristaId]
      );

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: "Frete aceito com sucesso",
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Erro ao aceitar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Recusar frete (motorista)
router.put("/:freteId/recusar", async (req, res) => {
  try {
    const { freteId } = req.params;
    const { motoristaId, observacoes } = req.body;

    // Verificar se existe oferta ativa
    const ofertaResult = await pool.query(
      `SELECT * FROM ofertas_fretes 
       WHERE frete_id = $1 AND motorista_id = $2 AND status_oferta = 'oferecido'`,
      [freteId, motoristaId]
    );

    if (ofertaResult.rows.length === 0) {
      return res.status(404).json({ error: "Oferta não encontrada" });
    }

    // Transação: recusar oferta + voltar frete para pendente
    await pool.query("BEGIN");

    try {
      // Atualizar oferta
      await pool.query(
        `UPDATE ofertas_fretes 
         SET status_oferta = 'recusado', data_resposta = NOW(), observacoes_motorista = $1 
         WHERE frete_id = $2 AND motorista_id = $3`,
        [observacoes || null, freteId, motoristaId]
      );

      // Voltar frete para pendente
      await pool.query(
        `UPDATE fretes 
         SET status_frete = 'pendente' 
         WHERE id = $1`,
        [freteId]
      );

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: "Frete recusado",
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Erro ao recusar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Finalizar frete (empresa)
router.put("/:freteId/finalizar", async (req, res) => {
  try {
    const { freteId } = req.params;
    const { empresaId, finalizadoPor } = req.body;

    // Verificar se frete existe e pode ser finalizado
    const freteResult = await pool.query(
      `SELECT f.*, m.id as motorista_id 
       FROM fretes f
       LEFT JOIN motoristas m ON f.motorista_id = m.id
       WHERE f.id = $1 AND f.empresa_id = $2 AND f.status_frete IN ('aceito', 'em_andamento')`,
      [freteId, empresaId]
    );

    if (freteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Frete não encontrado ou não pode ser finalizado" });
    }

    const frete = freteResult.rows[0];

    // Transação: finalizar frete + liberar motorista + atualizar contador
    await pool.query("BEGIN");

    try {
      // Finalizar frete
      await pool.query(
        `UPDATE fretes 
         SET status_frete = 'finalizado', data_finalizacao = NOW(), finalizado_por = $1 
         WHERE id = $2`,
        [finalizadoPor || "Admin", freteId]
      );

      // Liberar motorista se houver
      if (frete.motorista_id) {
        await pool.query(
          `UPDATE motoristas 
           SET status_disponibilidade = 'livre', total_fretes_concluidos = total_fretes_concluidos + 1
           WHERE id = $1`,
          [frete.motorista_id]
        );
      }

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: "Frete finalizado com sucesso",
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Erro ao finalizar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Buscar frete específico
router.get("/:freteId", async (req, res) => {
  try {
    const { freteId } = req.params;

    const resultado = await pool.query(
      `SELECT f.*, m.nome as motorista_nome, m.codigo as motorista_codigo,
              e.nome_empresa
       FROM fretes f
       LEFT JOIN motoristas m ON f.motorista_id = m.id
       LEFT JOIN empresas e ON f.empresa_id = e.id
       WHERE f.id = $1`,
      [freteId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Frete não encontrado" });
    }

    res.json({
      success: true,
      frete: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao buscar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Atualizar frete (empresa)
router.put("/:freteId", async (req, res) => {
  try {
    const { freteId } = req.params;
    const {
      empresaId,
      origem,
      destino,
      distancia,
      valor,
      tipoCarga,
      peso,
      eixosRequeridos,
      observacoes,
    } = req.body;

    // Verificar se frete existe e pertence à empresa
    const freteExiste = await pool.query(
      "SELECT id FROM fretes WHERE id = $1 AND empresa_id = $2 AND status_frete = 'pendente'",
      [freteId, empresaId]
    );

    if (freteExiste.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Frete não encontrado ou não pode ser editado" });
    }

    // Atualizar frete
    const resultado = await pool.query(
      `UPDATE fretes 
       SET origem = $1, destino = $2, distancia = $3, valor = $4, 
           tipo_carga = $5, peso = $6, eixos_requeridos = $7, observacoes = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        origem,
        destino,
        distancia,
        valor,
        tipoCarga,
        peso,
        eixosRequeridos || 3,
        observacoes,
        freteId,
      ]
    );

    res.json({
      success: true,
      message: "Frete atualizado com sucesso",
      frete: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Deletar frete (empresa)
router.delete("/:freteId", async (req, res) => {
  try {
    const { freteId } = req.params;
    const { empresaId } = req.body;

    // Verificar se frete existe e pode ser deletado
    const resultado = await pool.query(
      "DELETE FROM fretes WHERE id = $1 AND empresa_id = $2 AND status_frete = 'pendente' RETURNING *",
      [freteId, empresaId]
    );

    if (resultado.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Frete não encontrado ou não pode ser removido" });
    }

    res.json({
      success: true,
      message: "Frete removido com sucesso",
    });
  } catch (err) {
    console.error("Erro ao deletar frete:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Listar fretes ativos do motorista
router.get("/motorista/:motoristaId/ativos", async (req, res) => {
  try {
    const { motoristaId } = req.params;

    const resultado = await pool.query(
      `SELECT f.*, e.nome_empresa
       FROM fretes f
       JOIN empresas e ON f.empresa_id = e.id
       WHERE f.motorista_id = $1 AND f.status_frete IN ('aceito', 'em_andamento')
       ORDER BY f.data_aceite DESC`,
      [motoristaId]
    );

    res.json({
      success: true,
      fretes: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar fretes ativos:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Listar histórico de fretes do motorista (finalizados)
router.get("/motorista/:motoristaId/historico", async (req, res) => {
  try {
    const { motoristaId } = req.params;

    const resultado = await pool.query(
      `SELECT f.*, e.nome_empresa
       FROM fretes f
       JOIN empresas e ON f.empresa_id = e.id
       WHERE f.motorista_id = $1 AND f.status_frete = 'finalizado'
       ORDER BY f.data_finalizacao DESC`,
      [motoristaId]
    );

    res.json({
      success: true,
      fretes: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar histórico de fretes:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

module.exports = router;
