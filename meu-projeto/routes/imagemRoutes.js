const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Tipo de arquivo não suportado. Apenas JPEG, PNG e GIF são permitidos."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/upload-foto", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    const userId = req.body.userId;
    if (!userId) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    // Verifica usuário existe
    const userExists = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1",
      [userId]
    );
    if (userExists.rows.length === 0) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    await pool.query("UPDATE usuarios SET imagem_url = $1 WHERE id = $2", [
      imageUrl,
      userId,
    ]);

    res.status(200).json({
      success: true,
      message: "Upload realizado com sucesso",
      imageUrl,
      fileInfo: {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error("Erro no upload:", err);

    if (req.file) {
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
    }

    let errorMessage = "Erro ao processar upload";
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      errorMessage = "Arquivo muito grande (limite: 5MB)";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
