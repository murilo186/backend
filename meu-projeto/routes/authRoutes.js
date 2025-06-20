const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const router = express.Router();

// Validações auxiliares
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateCPF = (cpf) => cpf.replace(/\D/g, "").length === 11;

// Rota de registro
router.post("/register", async (req, res) => {
  try {
    const { nome, usuario, cpf, email, senha } = req.body;
    console.log("Tentativa de registro:", { usuario, email });

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
      pool.query("SELECT id FROM usuarios WHERE email = $1", [email]),
      pool.query("SELECT id FROM usuarios WHERE usuario = $1", [usuario]),
      pool.query("SELECT id FROM usuarios WHERE cpf = $1", [
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

    // Inserção no banco
    const resultado = await pool.query(
      `INSERT INTO usuarios 
       (nome, usuario, cpf, email, senha, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, nome, usuario, email, created_at`,
      [nome, usuario, cpf.replace(/\D/g, ""), email, senhaCriptografada]
    );

    res.status(201).json({
      success: true,
      message: "Usuário registrado com sucesso",
      usuario: resultado.rows[0],
    });
  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Rota de login
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log("Tentativa de login:", { email });

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const resultado = await pool.query(
      `SELECT id, nome, usuario, cpf, email, senha, imagem_url 
       FROM usuarios WHERE email = $1`,
      [email]
    );

    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Remove a senha do objeto de retorno
    const { senha: _, ...usuarioSemSenha } = usuario;

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      usuario: usuarioSemSenha,
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno no servidor",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Exportação correta do router
module.exports = router;
