const express = require("express");
const router = express.Router();

// Basic image route placeholder
router.get("/test", (req, res) => {
  res.json({ message: "Image route working" });
});

module.exports = router;