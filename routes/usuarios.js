const express  = require('express');
const Usuario  = require('../models/Usuario');
const { proteger, soloAdmin } = require('../middleware/auth');
const router   = express.Router();

// GET /api/usuarios — Solo admin
router.get('/', proteger, soloAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password');
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/usuarios/perfil — Editar mi perfil
router.put('/perfil', proteger, async (req, res) => {
  try {
    const { nombre, apellidos, telefono } = req.body;
    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      { nombre, apellidos, telefono },
      { new: true }
    );
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;