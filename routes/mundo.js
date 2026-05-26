const express = require('express')
const router = express.Router()
const { proteger, soloAdmin, requireAdministracion } = require('../middleware/auth')

// ── Rutas públicas (cualquier usuario verificado) ──────────────────────────
router.get('/', proteger, (req, res) => {
  res.json({ mensaje: '🌍 Bienvenido al Espacio Mundo' })
})

// ── Rutas por administración ───────────────────────────────────────────────
router.get('/educacion', proteger, requireAdministracion('educacion'), (req, res) => {
  res.json({ mensaje: '📚 Foro de Educación', administracion: 'educacion' })
})

router.get('/sanidad', proteger, requireAdministracion('sanidad'), (req, res) => {
  res.json({ mensaje: '🏥 Foro de Sanidad', administracion: 'sanidad' })
})

router.get('/justicia', proteger, requireAdministracion('justicia'), (req, res) => {
  res.json({ mensaje: '⚖️ Foro de Justicia', administracion: 'justicia' })
})

router.get('/otros', proteger, requireAdministracion('otros'), (req, res) => {
  res.json({ mensaje: '🏛️ Foro Otros sectores', administracion: 'otros' })
})

// ── Grupos (accesible para cualquier usuario verificado) ───────────────────
router.get('/grupos', proteger, (req, res) => {
  res.json({ mensaje: '📲 Grupos por zona' })
})

// ── Ruta de admin ──────────────────────────────────────────────────────────
router.get('/admin', proteger, soloAdmin, (req, res) => {
  res.json({ mensaje: '🔧 Panel admin del Espacio Mundo' })
})

module.exports = router