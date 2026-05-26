const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')
const Usuario  = require('../models/Usuario')
const { proteger, soloAdmin } = require('../middleware/auth')
const { uploadVerificacion } = require('../config/cloudinary')

// ─────────────────────────────────────────────
// GET /api/usuarios/me
// ─────────────────────────────────────────────
router.get('/me', proteger, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password')
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(usuario)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

// ─────────────────────────────────────────────
// PUT /api/usuarios/me
// ─────────────────────────────────────────────
router.put('/me', proteger, async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body
    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario.id,
      { nombre, email, telefono },
      { new: true, runValidators: true }
    ).select('-password')

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(usuario)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el perfil' })
  }
})

// ─────────────────────────────────────────────
// PUT /api/usuarios/me/password  ← NUEVO
// ─────────────────────────────────────────────
router.put('/me/password', proteger, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const usuario = await Usuario.findById(req.usuario.id)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    const passwordValida = await bcrypt.compare(passwordActual, usuario.password)
    if (!passwordValida) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' })
    }

    usuario.password = await bcrypt.hash(passwordNueva, 10)
    await usuario.save()

    res.json({ mensaje: 'Contraseña actualizada correctamente' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

// ─────────────────────────────────────────────
// POST /api/usuarios/verificacion-docente
// ─────────────────────────────────────────────
router.post(
  '/verificacion-docente',
  proteger,
  uploadVerificacion.single('documento'),
  async (req, res) => {
    try {
      const { tipoDocumento, administracion } = req.body

      if (!req.file)        return res.status(400).json({ error: 'Debes adjuntar un documento' })
      if (!tipoDocumento)   return res.status(400).json({ error: 'Indica el tipo de documento' })
      if (!administracion)  return res.status(400).json({ error: 'Indica tu administración' })

      const usuario = await Usuario.findByIdAndUpdate(
        req.usuario.id,
        {
          verificacionEstado: 'pendiente',
          tipoDocumento,
          administracion,
          urlDocumento: req.file.path,
        },
        { new: true }
      ).select('-password')

      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

      res.json({
        mensaje: 'Documentación enviada correctamente. Revisaremos tu perfil en 24-48h.',
        usuario,
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Error al procesar la verificación' })
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/usuarios — solo admin
// ─────────────────────────────────────────────
router.get('/', proteger, soloAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password').sort({ createdAt: -1 })
    res.json(usuarios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ─────────────────────────────────────────────
// PATCH /api/usuarios/:id/verificar — solo admin
// ─────────────────────────────────────────────
router.patch('/:id/verificar', proteger, soloAdmin, async (req, res) => {
  try {
    const { estado, motivoRechazo } = req.body

    if (!['verificado', 'rechazado', 'pendiente'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' })
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      {
        verificacionEstado: estado,
        motivoRechazo: estado === 'rechazado' ? (motivoRechazo || '') : '',
      },
      { new: true }
    ).select('-password')

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(usuario)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al verificar usuario' })
  }
})

module.exports = router