const express  = require('express');
const Usuario  = require('../models/Usuario');
const { proteger, soloAdmin } = require('../middleware/auth');
const router   = express.Router();

// GET /api/usuarios — Todos los usuarios (solo admin)
router.get('/', proteger, soloAdmin, async (req, res) => {
  try {
    const { estado, rol } = req.query
    const filtro = {}
    if (estado) filtro.verificacionEstado = estado
    if (rol) filtro.rol = rol
    const usuarios = await Usuario.find(filtro).select('-password').sort({ createdAt: -1 })
    res.json(usuarios)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/usuarios/pendientes — Solo pendientes (solo admin)
router.get('/pendientes', proteger, soloAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find({ verificacionEstado: 'pendiente' })
      .select('-password')
      .sort({ createdAt: -1 })
    res.json(usuarios)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/usuarios/:id/verificar — Aprobar o rechazar (solo admin)
router.patch('/:id/verificar', proteger, soloAdmin, async (req, res) => {
  try {
    const { verificacionEstado, motivoRechazo } = req.body
    if (!['verificado', 'rechazado'].includes(verificacionEstado)) {
      return res.status(400).json({ error: 'Estado no válido. Usa: verificado o rechazado' })
    }
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { verificacionEstado, motivoRechazo: motivoRechazo || '' },
      { new: true }
    ).select('-password')
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(usuario)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/usuarios/perfil — Editar mi perfil
router.put('/perfil', proteger, async (req, res) => {
  try {
    const { nombre, telefono } = req.body
    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      { nombre, telefono },
      { new: true }
    ).select('-password')
    res.json(usuario)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/usuarios/me — Mi perfil
router.get('/me', proteger, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select('-password')
    res.json(usuario)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router