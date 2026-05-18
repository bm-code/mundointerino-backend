const express = require('express')
const router = express.Router()
const Usuario = require('../models/Usuario')
const { proteger } = require('../middleware/auth')

// GET /api/usuarios/me
router.get('/me', proteger, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select('-password')
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json(usuario)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/usuarios/me
router.put('/me', proteger, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    const {
      nombre,
      telefono,
      email,
    } = req.body

    if (nombre !== undefined) usuario.nombre = nombre
    if (telefono !== undefined) usuario.telefono = telefono
    if (email !== undefined) usuario.email = email

    await usuario.save()

    const usuarioActualizado = await Usuario.findById(req.usuario._id).select('-password')
    res.json(usuarioActualizado)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router