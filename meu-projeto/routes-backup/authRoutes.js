const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const router = express.Router();

// Validações auxiliares
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateCPF = (cpf) => cpf.replace(/\D/g, "").length === 11;
const validateCNPJ = (cnpj) => cnpj.replace(/\D/g, "").length === 14;

// 🚛 REGISTRO DE MOTORISTA - ETAPA 1 CLEAN
router.post("/register-motorista", async (req, res) => {
  try {
    const { nome, usuario, cpf, email, senha } = req.body;
    console.log("Tentativa de registro de motorista:", { usuario, email });

    // Validação dos campos
    if (!nome || !usuario || !cpf || !email || !senha) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    if (!validateCPF(cpf)) {
      return res.status(400).json({ error: "CPF deve conter 11 dígitos" });
    }

    // Verificações no banco de dados
    const [emailExiste, usuarioExiste, cpfExiste] = await Promise.all([
      pool.query("SELECT id FROM motoristas WHERE email = $1", [email]),
      pool.query("SELECT id FROM motoristas WHERE usuario = $1", [usuario]),
      pool.query("SELECT id FROM motoristas WHERE cpf = $1", [
        cpf.replace(/\D/g, ""),
      ]),
    ]);

    if (emailExiste.rows.length > 0) {
      return res.status(400).json({ error: "Email já está em uso" });
    }

    if (usuarioExiste.rows.length > 0) {
      return res.status(400).json({ error: "Nome de usuário já está em uso" });
    }

    if (cpfExiste.rows.length > 0) {
      return res.status(400).json({ error: "CPF já está cadastrado" });
    }

    // Criptografia da senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // ✅ GERAR CÓDIGO ÚNICO: 2 LETRAS + 5 NÚMEROS
    let codigoUnico;
    let codigoExiste = true;

    while (codigoExiste) {
      const letras = Math.random().toString(36).substring(2, 4).toUpperCase();
      const numeros = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0");
      codigoUnico = letras + numeros;

      const verificaCodigo = await pool.query(
        "SELECT id FROM motoristas WHERE codigo = $1",
        [codigoUnico]
      );

      codigoExiste = verificaCodigo.rows.length > 0;
    }

    console.log("Código único gerado:", codigoUnico);

    // ✅ INSERÇÃO CLEAN - SÓ O ESSENCIAL
    const resultado = await pool.query(
      `INSERT INTO motoristas (nome, usuario, cpf, email, senha_hash, codigo) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nome, usuario, email, codigo, created_at`,
      [
        nome,
        usuario,
        cpf.replace(/\D/g, ""),
        email,
        senhaCriptografada,
        codigoUnico,
      ]
    );

    console.log("✅ Motorista inserido com sucesso:", resultado.rows[0]);

    res.status(201).json({
      success: true,
      message: "Motorista registrado com sucesso",
      motorista: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro no registro do motorista:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// Login de motorista - CLEAN
router.post("/login-motorista", async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log("Tentativa de login motorista:", { email });

    const resultado = await pool.query(
      `SELECT id, nome, usuario, cpf, email, senha_hash, codigo, created_at
       FROM motoristas WHERE email = $1`,
      [email]
    );

    // ADICIONE ESTES LOGS:
    console.log("📊 Resultado da query:");
    console.log("- Linhas encontradas:", resultado.rows.length);
    console.log("- Dados do motorista:", resultado.rows[0]);

    const motorista = resultado.rows[0];
    if (!motorista) {
      console.log("❌ Motorista não encontrado");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    console.log("✅ Motorista encontrado, verificando senha...");

    const senhaValida = await bcrypt.compare(senha, motorista.senha_hash);
    console.log("🔐 Senha válida:", senhaValida);

    if (!senhaValida) {
      console.log("❌ Senha inválida");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    console.log("✅ Login válido, preparando resposta...");

    // Remove a senha do retorno
    const { senha_hash: _, ...motoristaSemSenha } = motorista;

    console.log("📤 Enviando resposta para mobile");

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      motorista: motoristaSemSenha,
      tipo: "motorista",
    });
  } catch (err) {
    console.error("❌ Erro no login do motorista:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 🏢 REGISTRO DE EMPRESA - CAMPOS OBRIGATÓRIOS APENAS
router.post("/register-empresa", async (req, res) => {
  try {
    const {
      nomeEmpresa,
      senha,
      emailCorporativo,
      cnpj,
      nomeAdministrador,
      cpfAdministrador,
    } = req.body;

    console.log("Tentativa de registro de empresa:", {
      emailCorporativo,
      nomeEmpresa,
    });

    // Validação dos campos obrigatórios
    if (
      !nomeEmpresa ||
      !senha ||
      !emailCorporativo ||
      !cnpj ||
      !nomeAdministrador ||
      !cpfAdministrador
    ) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: nome da empresa, senha, email corporativo, CNPJ, nome do administrador e CPF do administrador",
      });
    }

    if (!validateEmail(emailCorporativo)) {
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    if (!validateCNPJ(cnpj)) {
      return res.status(400).json({ error: "CNPJ deve conter 14 dígitos" });
    }

    if (!validateCPF(cpfAdministrador)) {
      return res
        .status(400)
        .json({ error: "CPF do administrador deve conter 11 dígitos" });
    }

    // Verificar se já existe empresa com mesmo email ou CNPJ
    const [emailExiste, cnpjExiste] = await Promise.all([
      pool.query("SELECT id FROM empresas WHERE email_corporativo = $1", [
        emailCorporativo,
      ]),
      pool.query("SELECT id FROM empresas WHERE cnpj = $1", [
        cnpj.replace(/\D/g, ""),
      ]),
    ]);

    if (emailExiste.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Email corporativo já está em uso" });
    }

    if (cnpjExiste.rows.length > 0) {
      return res.status(400).json({ error: "CNPJ já está cadastrado" });
    }

    // Criptografia da senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Iniciar transação para inserir empresa + colaborador
    await pool.query("BEGIN");

    try {
      // 1. Inserir empresa
      const resultadoEmpresa = await pool.query(
        `INSERT INTO empresas 
         (nome_empresa, senha_hash, email_corporativo, cnpj, nome_administrador, cpf_administrador, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING id, nome_empresa, email_corporativo, cnpj, nome_administrador, created_at`,
        [
          nomeEmpresa,
          senhaCriptografada,
          emailCorporativo,
          cnpj.replace(/\D/g, ""),
          nomeAdministrador,
          cpfAdministrador.replace(/\D/g, ""),
        ]
      );

      const empresa = resultadoEmpresa.rows[0];

      // 2. Inserir admin como colaborador automaticamente
      await pool.query(
        `INSERT INTO colaboradores (empresa_id, nome, email, senha_hash, cargo, is_admin, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          empresa.id,
          nomeAdministrador,
          emailCorporativo,
          senhaCriptografada,
          "Administrador",
          true,
        ]
      );

      await pool.query("COMMIT");

      console.log("✅ Empresa e admin colaborador criados:", empresa);

      res.status(201).json({
        success: true,
        message: "Empresa registrada com sucesso",
        empresa: empresa,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (err) {
    console.error("Erro no registro da empresa:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// 🔐 LOGIN UNIFICADO - EMPRESA E COLABORADORES
router.post("/login-empresa", async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log("Tentativa de login:", { email });

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    // 1. Primeiro tentar login como admin da empresa (tabela empresas)
    const empresaResult = await pool.query(
      `SELECT id, email_corporativo as email, nome_empresa, nome_administrador as nome, senha_hash, created_at,
              'admin' as user_type, 'empresa' as source_table
       FROM empresas WHERE email_corporativo = $1`,
      [email]
    );

    // 2. Se não encontrou, tentar como colaborador (tabela colaboradores)
    let colaboradorResult = { rows: [] };
    if (empresaResult.rows.length === 0) {
      colaboradorResult = await pool.query(
        `SELECT c.id, c.email, c.nome, c.cargo, c.is_admin, c.senha_hash, c.created_at, c.empresa_id,
                e.nome_empresa,
                CASE WHEN c.is_admin = true THEN 'admin' ELSE 'colaborador' END as user_type,
                'colaboradores' as source_table
         FROM colaboradores c
         JOIN empresas e ON c.empresa_id = e.id
         WHERE c.email = $1 AND c.ativo = true`,
        [email]
      );
    }

    // Determinar qual usuário foi encontrado
    const usuario = empresaResult.rows[0] || colaboradorResult.rows[0];

    if (!usuario) {
      console.log("❌ Usuário não encontrado");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    console.log(
      "✅ Usuário encontrado:",
      usuario.user_type,
      "da",
      usuario.source_table
    );

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      console.log("❌ Senha inválida");
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // ADICIONAR AQUI: Atualizar status de login
    if (usuario.source_table === "empresa") {
      // Atualizar na tabela empresas
      await pool.query(
        `UPDATE empresas 
     SET last_login = NOW(), is_online = true 
     WHERE id = $1`,
        [usuario.id]
      );
    } else {
      // Atualizar na tabela colaboradores
      await pool.query(
        `UPDATE colaboradores 
     SET last_login = NOW(), is_online = true 
     WHERE id = $1`,
        [usuario.id]
      );
    }

    console.log("✅ Status online atualizado para usuário:", usuario.id);

    // Remove a senha do retorno
    const { senha_hash: _, source_table, ...usuarioSemSenha } = usuario;

    // Estruturar resposta baseada no tipo de usuário
    let responseData;

    if (usuario.source_table === "empresa") {
      // Admin da empresa (original)
      responseData = {
        success: true,
        message: "Login realizado com sucesso",
        empresa: {
          id: usuario.id,
          nome_empresa: usuario.nome_empresa,
          nome_administrador: usuario.nome,
          email_corporativo: usuario.email,
          created_at: usuario.created_at,
        },
        usuario: {
          ...usuarioSemSenha,
          tipo_usuario: "admin_empresa",
        },
        tipo: "empresa",
      };
    } else {
      // Colaborador
      responseData = {
        success: true,
        message: "Login realizado com sucesso",
        empresa: {
          id: usuario.empresa_id,
          nome_empresa: usuario.nome_empresa,
        },
        colaborador: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
          is_admin: usuario.is_admin,
          empresa_id: usuario.empresa_id,
          created_at: usuario.created_at,
        },
        usuario: {
          ...usuarioSemSenha,
          tipo_usuario: usuario.is_admin ? "admin_colaborador" : "colaborador",
        },
        tipo: "empresa", // Mantém como empresa para compatibilidade frontend
      };
    }

    console.log("📤 Enviando resposta de login");
    res.json(responseData);
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 🎯 SISTEMA DE CONVITES - EMPRESA CONVIDA MOTORISTA

// 1. EMPRESA ENVIA CONVITE POR CÓDIGO
router.post("/convites", async (req, res) => {
  try {
    const { empresaId, codigoMotorista } = req.body;
    console.log("Enviando convite:", { empresaId, codigoMotorista });

    if (!empresaId || !codigoMotorista) {
      return res
        .status(400)
        .json({ error: "EmpresaId e código do motorista são obrigatórios" });
    }

    // Buscar motorista pelo código
    const motoristaResult = await pool.query(
      "SELECT id, nome, email, empresa_id FROM motoristas WHERE codigo = $1",
      [codigoMotorista.toUpperCase()]
    );

    if (motoristaResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Motorista não encontrado com este código" });
    }

    const motorista = motoristaResult.rows[0];

    // Verificar se motorista já está vinculado a alguma empresa
    if (motorista.empresa_id) {
      return res
        .status(400)
        .json({ error: "Motorista já está vinculado a uma empresa" });
    }

    // Verificar se já existe convite pendente
    const conviteExiste = await pool.query(
      `SELECT id FROM convites_motoristas 
       WHERE empresa_id = $1 AND motorista_id = $2 AND status = 'pendente'`,
      [empresaId, motorista.id]
    );

    if (conviteExiste.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Já existe um convite pendente para este motorista" });
    }

    // Criar convite
    const resultado = await pool.query(
      `INSERT INTO convites_motoristas (empresa_id, motorista_id) 
       VALUES ($1, $2) 
       RETURNING *`,
      [empresaId, motorista.id]
    );

    console.log("✅ Convite criado:", resultado.rows[0]);

    res.status(201).json({
      success: true,
      message: `Convite enviado para ${motorista.nome}`,
      convite: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao enviar convite:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 2. MOTORISTA VÊ CONVITES PENDENTES
router.get("/motorista/:motoristaId/convites", async (req, res) => {
  try {
    const { motoristaId } = req.params;
    console.log("Buscando convites para motorista:", motoristaId);

    const resultado = await pool.query(
      `SELECT c.*, e.nome_empresa, e.email_corporativo
       FROM convites_motoristas c
       JOIN empresas e ON c.empresa_id = e.id
       WHERE c.motorista_id = $1 AND c.status = 'pendente'
       ORDER BY c.data_convite DESC`,
      [motoristaId]
    );

    console.log("Convites encontrados:", resultado.rows.length);

    res.json({
      success: true,
      convites: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar convites:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 3. MOTORISTA ACEITA CONVITE
router.put("/convites/:conviteId/aceitar", async (req, res) => {
  try {
    const { conviteId } = req.params;
    const { motoristaId } = req.body;
    console.log("Aceitando convite:", { conviteId, motoristaId });

    if (!motoristaId) {
      return res.status(400).json({ error: "ID do motorista é obrigatório" });
    }

    // Buscar dados do convite
    const conviteResult = await pool.query(
      `SELECT c.*, e.nome_empresa 
       FROM convites_motoristas c
       JOIN empresas e ON c.empresa_id = e.id
       WHERE c.id = $1 AND c.motorista_id = $2 AND c.status = 'pendente'`,
      [conviteId, motoristaId]
    );

    if (conviteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Convite não encontrado ou já processado" });
    }

    const convite = conviteResult.rows[0];

    // Iniciar transação
    await pool.query("BEGIN");

    try {
      // 1. Atualizar status do convite
      await pool.query(
        `UPDATE convites_motoristas 
         SET status = 'aceito', data_resposta = NOW() 
         WHERE id = $1`,
        [conviteId]
      );

      // 2. Vincular motorista à empresa
      await pool.query(
        `UPDATE motoristas 
         SET empresa_id = $1 
         WHERE id = $2`,
        [convite.empresa_id, motoristaId]
      );

      // 3. Rejeitar outros convites pendentes deste motorista
      await pool.query(
        `UPDATE convites_motoristas 
         SET status = 'rejeitado', data_resposta = NOW() 
         WHERE motorista_id = $1 AND status = 'pendente' AND id != $2`,
        [motoristaId, conviteId]
      );

      await pool.query("COMMIT");

      console.log(
        `✅ Motorista ${motoristaId} agora faz parte da empresa ${convite.nome_empresa}`
      );

      res.json({
        success: true,
        message: `Você agora faz parte da equipe da ${convite.nome_empresa}!`,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (err) {
    console.error("Erro ao aceitar convite:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 4. MOTORISTA REJEITA CONVITE
router.put("/convites/:conviteId/rejeitar", async (req, res) => {
  try {
    const { conviteId } = req.params;
    const { motoristaId } = req.body;
    console.log("Rejeitando convite:", { conviteId, motoristaId });

    const resultado = await pool.query(
      `UPDATE convites_motoristas 
       SET status = 'rejeitado', data_resposta = NOW() 
       WHERE id = $1 AND motorista_id = $2 AND status = 'pendente'
       RETURNING *`,
      [conviteId, motoristaId]
    );

    if (resultado.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Convite não encontrado ou já processado" });
    }

    res.json({
      success: true,
      message: "Convite rejeitado",
    });
  } catch (err) {
    console.error("Erro ao rejeitar convite:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 5. EMPRESA LISTA MOTORISTAS DA EQUIPE
router.get("/empresa/:empresaId/motoristas", async (req, res) => {
  try {
    const { empresaId } = req.params;
    console.log("Listando motoristas da empresa:", empresaId);

    const resultado = await pool.query(
      `SELECT id, nome, usuario, email, codigo, status_disponibilidade, ativo, created_at
       FROM motoristas 
       WHERE empresa_id = $1 
       ORDER BY nome`,
      [empresaId]
    );

    res.json({
      success: true,
      motoristas: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao listar motoristas:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 6. ATUALIZAR STATUS DO MOTORISTA
router.put("/motorista/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status_disponibilidade } = req.body;

  try {
    console.log(
      "🔄 Atualizando status do motorista:",
      id,
      "para:",
      status_disponibilidade
    );

    const resultado = await pool.query(
      "UPDATE motoristas SET status_disponibilidade = $1 WHERE id = $2 RETURNING *",
      [status_disponibilidade, id]
    );

    if (resultado.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Motorista não encontrado" });
    }

    console.log("✅ Status atualizado com sucesso");
    res.json({
      success: true,
      message: "Status atualizado",
      motorista: resultado.rows[0],
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================
// SISTEMA DE COLABORADORES/FUNCIONÁRIOS
// ===================================

// 1. CRIAR COLABORADOR (para o modal)
router.post("/colaboradores", async (req, res) => {
  try {
    const { empresaId, nome, email, cargo, senha, isAdmin } = req.body;
    console.log("Criando colaborador:", { empresaId, nome, email, cargo });

    // Validação dos campos
    if (!empresaId || !nome || !email || !cargo || !senha) {
      return res.status(400).json({
        error: "Todos os campos são obrigatórios: nome, email, cargo, senha",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    // Verificar se email já existe (tanto em colaboradores quanto em empresas)
    const [emailColaborador, emailEmpresa] = await Promise.all([
      pool.query("SELECT id FROM colaboradores WHERE email = $1", [email]),
      pool.query("SELECT id FROM empresas WHERE email_corporativo = $1", [
        email,
      ]),
    ]);

    if (emailColaborador.rows.length > 0 || emailEmpresa.rows.length > 0) {
      return res.status(400).json({ error: "Email já está em uso" });
    }

    // Criptografar senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Inserir colaborador
    const resultado = await pool.query(
      `INSERT INTO colaboradores (empresa_id, nome, email, senha_hash, cargo, is_admin) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nome, email, cargo, is_admin, ativo, created_at`,
      [
        empresaId,
        nome,
        email.trim().toLowerCase(),
        senhaCriptografada,
        cargo,
        isAdmin || false,
      ]
    );

    console.log("✅ Colaborador criado:", resultado.rows[0]);

    res.status(201).json({
      success: true,
      message: "Colaborador criado com sucesso",
      colaborador: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar colaborador:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 2. LISTAR COLABORADORES DA EMPRESA
router.get("/empresa/:empresaId/colaboradores", async (req, res) => {
  try {
    const { empresaId } = req.params;
    console.log("Listando colaboradores da empresa:", empresaId);

    const resultado = await pool.query(
      `SELECT id, nome, email, cargo, is_admin, ativo, is_online, last_login, created_at
     FROM colaboradores
     WHERE empresa_id = $1 AND ativo = true
     ORDER BY is_admin DESC, nome`,
      [empresaId]
    );

    res.json({
      success: true,
      colaboradores: resultado.rows,
    });
  } catch (err) {
    console.error("Erro ao listar colaboradores:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 3. ATUALIZAR COLABORADOR
router.put("/colaboradores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cargo, ativo, isAdmin } = req.body;

    const resultado = await pool.query(
      `UPDATE colaboradores 
       SET nome = $1, cargo = $2, ativo = $3, is_admin = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, nome, email, cargo, is_admin, ativo`,
      [nome, cargo, ativo, isAdmin, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    res.json({
      success: true,
      message: "Colaborador atualizado",
      colaborador: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar colaborador:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

// 4. REMOVER COLABORADOR (desativar)
router.delete("/colaboradores/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `UPDATE colaboradores 
       SET ativo = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, nome`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }

    res.json({
      success: true,
      message: `Colaborador ${resultado.rows[0].nome} removido`,
    });
  } catch (err) {
    console.error("Erro ao remover colaborador:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const { userId, userType } = req.body; // userType: 'empresa' ou 'colaborador'

    console.log("Fazendo logout do usuário:", { userId, userType });

    if (!userId || !userType) {
      return res.status(400).json({
        error: "userId e userType são obrigatórios",
      });
    }

    if (userType === "empresa") {
      // Admin original da tabela empresas
      await pool.query(
        `UPDATE empresas 
         SET is_online = false 
         WHERE id = $1`,
        [userId]
      );
    } else if (userType === "colaborador") {
      // Funcionário da tabela colaboradores
      await pool.query(
        `UPDATE colaboradores 
         SET is_online = false 
         WHERE id = $1`,
        [userId]
      );
    } else {
      return res.status(400).json({
        error: "userType deve ser 'empresa' ou 'colaborador'",
      });
    }

    console.log("✅ Usuário marcado como offline");

    res.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  } catch (err) {
    console.error("Erro no logout:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
    });
  }
});

module.exports = router;
