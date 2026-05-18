const express  = require('express')
const Piso     = require('../models/Piso')
const { proteger } = require('../middleware/auth')
const multer   = require('multer')
const { cloudinary, storage } = require('../config/cloudinary')
const router   = express.Router()

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (permitidos.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
  }
})

// Helper — borra fotos de Cloudinary por URL
const borrarFotosCloudinary = async (urls = []) => {
  if (!urls.length) return
  await Promise.all(
    urls.map(url => {
      const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
      return cloudinary.uploader.destroy(publicId)
    })
  )
}

// Helper — normaliza campos array que vienen de FormData como string
const toArray = (val) => {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

// ─────────────────────────────────────────────────────────────
// GET /api/pisos — Listar con filtros
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { ciudad, tipo, precioMax, habitaciones, pagina = 1, limite = 12 } = req.query
    const filtro = { activo: true }

    if (ciudad)       filtro.ciudad = new RegExp(ciudad, 'i')
    if (tipo)         filtro.tipoEstancia = tipo
    if (precioMax)    filtro.precio = { $lte: parseInt(precioMax) }
    if (habitaciones) filtro.habitaciones = parseInt(habitaciones)

    const total = await Piso.countDocuments(filtro)
    const pisos = await Piso.find(filtro)
      .populate('propietario', 'nombre telefono email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limite))
      .skip((parseInt(pagina) - 1) * parseInt(limite))

    res.json({
      pisos,
      total,
      paginas: Math.ceil(total / parseInt(limite)),
      paginaActual: parseInt(pagina)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/pisos/mis-pisos — Pisos del propietario autenticado
// ─────────────────────────────────────────────────────────────
router.get('/mis-pisos', proteger, async (req, res) => {
  try {
    const pisos = await Piso.find({ propietario: req.usuario._id }).sort({ createdAt: -1 })
    res.json(pisos)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/pisos/:id — Detalle de un piso
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id)
      .populate('propietario', 'nombre telefono email')
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' })
    res.json(piso)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/pisos — Crear piso con fotos
// ─────────────────────────────────────────────────────────────
router.post('/', proteger, upload.array('imagenes', 8), async (req, res) => {
  try {
    console.log('FILES recibidos:', req.files?.length || 0)
    const fotos    = req.files ? req.files.map(f => f.path) : []
    const servicios = toArray(req.body.servicios)

    const piso = await Piso.create({
      ...req.body,
      servicios,
      fotos,
      propietario: req.usuario._id,
      activo: true,
    })
    res.status(201).json(piso)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// PUT /api/pisos/:id — Editar piso + gestión de fotos
// ─────────────────────────────────────────────────────────────
router.put('/:id', proteger, upload.array('imagenes', 8), async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id)
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' })
    if (piso.propietario.toString() !== req.usuario._id.toString())
      return res.status(403).json({ error: 'No tienes permiso para editar este piso' })

    // Fotos que el usuario conserva
    const fotosActuales = toArray(req.body.fotosActuales)

    // Borrar de Cloudinary las fotos que el usuario eliminó
    const fotosEliminadas = piso.fotos.filter(url => !fotosActuales.includes(url))
    await borrarFotosCloudinary(fotosEliminadas)

    // Fotos nuevas subidas en esta petición
    const fotosNuevas = req.files ? req.files.map(f => f.path) : []

    const servicios = toArray(req.body.servicios)
    const activo    = req.body.activo === 'true' || req.body.activo === true

    const actualizado = await Piso.findByIdAndUpdate(
      req.params.id,
      {
        titulo:       req.body.titulo,
        descripcion:  req.body.descripcion,
        ciudad:       req.body.ciudad,
        barrio:       req.body.barrio,
        contacto:     req.body.contacto,
        precio:       req.body.precio,
        precioDia:    req.body.precioDia,
        fianza:       req.body.fianza,
        habitaciones: req.body.habitaciones,
        banos:        req.body.banos,
        metros:       req.body.metros,
        planta:       req.body.planta,
        tipoEstancia: req.body.tipoEstancia,
        disponible:   req.body.disponible,
        servicios,
        activo,
        fotos: [...fotosActuales, ...fotosNuevas],
      },
      { new: true }
    )

    res.json(actualizado)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// PATCH /api/pisos/:id/disponibilidad — Toggle activo
// ─────────────────────────────────────────────────────────────
router.patch('/:id/disponibilidad', proteger, async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id)
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' })
    if (piso.propietario.toString() !== req.usuario._id.toString())
      return res.status(403).json({ error: 'No tienes permiso' })

    piso.activo = !piso.activo
    await piso.save()
    res.json(piso)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/pisos/:id — Eliminar piso y fotos de Cloudinary
// ─────────────────────────────────────────────────────────────
router.delete('/:id', proteger, async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id)
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' })
    if (piso.propietario.toString() !== req.usuario._id.toString())
      return res.status(403).json({ error: 'No tienes permiso' })

    await borrarFotosCloudinary(piso.fotos)
    await piso.deleteOne()
    res.json({ mensaje: 'Piso eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router