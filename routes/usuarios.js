const express  = require('express')
const router   = express.Router()
const Usuario  = require('../models/Usuario')
const auth     = require('../middleware/auth')
const { uploadVerificacion } = require('../config/cloudinary')

// ─────────────────────────────────────────────
// GET /api/usuarios/me — perfil del usuario autenticado
// ─────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
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
// PUT /api/usuarios/me — actualizar datos personales
// ─────────────────────────────────────────────
router.put('/me', auth, async (req, res) => {
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
// POST /api/usuarios/verificacion-docente
// Sube documento de verificación (nómina, nombramiento, etc.)
// ─────────────────────────────────────────────
router.post(
  '/verificacion-docente',
  auth,
  uploadVerificacion.single('documento'),
  async (req, res) => {
    try {
      const { tipoDocumento, administracion } = req.body

      if (!req.file) {
        return res.status(400).json({ error: 'Debes adjuntar un documento' })
      }

      if (!tipoDocumento) {
        return res.status(400).json({ error: 'Indica el tipo de documento' })
      }

      if (!administracion) {
        return res.status(400).json({ error: 'Indica tu administración' })
      }

      const usuario = await Usuario.findByIdAndUpdate(
        req.usuario.id,
        {
          verificacionEstado: 'pendiente',
          tipoDocumento,
          administracion,
          urlDocumento: req.file.path, // URL pública de Cloudinary
        },
        { new: true }
      ).select('-password')

      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

      res.json({ mensaje: 'Documentación enviada correctamente. Revisaremos tu perfil en 24-48h.', usuario })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Error al procesar la verificación' })
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/usuarios — solo admin: listar todos los usuarios
// ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }
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
router.patch('/:id/verificar', auth, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

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