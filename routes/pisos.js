const express  = require('express');
const Piso     = require('../models/Piso');
const { proteger } = require('../middleware/auth');
const multer   = require('multer');
const path     = require('path');
const router   = express.Router();

// Configurar subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// GET /api/pisos — Listar con filtros
router.get('/', async (req, res) => {
  try {
    const { ciudad, tipo, precioMax, habitaciones, pagina = 1, limite = 12 } = req.query;
    const filtro = { activo: true };

    if (ciudad)      filtro.ciudad = new RegExp(ciudad, 'i');
    if (tipo)        filtro.tipoEstancia = tipo;
    if (precioMax)   filtro.precio = { $lte: parseInt(precioMax) };
    if (habitaciones) filtro.habitaciones = parseInt(habitaciones);

    const total = await Piso.countDocuments(filtro);
    const pisos = await Piso.find(filtro)
      .populate('propietario', 'nombre telefono email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limite))
      .skip((parseInt(pagina) - 1) * parseInt(limite));

    res.json({
      pisos,
      total,
      paginas: Math.ceil(total / parseInt(limite)),
      paginaActual: parseInt(pagina)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pisos/:id — Detalle de un piso
router.get('/:id', async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id)
      .populate('propietario', 'nombre telefono email');
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
    res.json(piso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pisos — Crear piso (requiere login)
router.post('/', proteger, upload.array('imagenes', 5), async (req, res) => {
  try {
    const imagenes = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const piso = await Piso.create({
      ...req.body,
      imagenes,
      propietario: req.usuario._id
    });
    res.status(201).json(piso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pisos/:id — Editar piso
router.put('/:id', proteger, async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id);
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
    if (piso.propietario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para editar este piso' });
    }
    const actualizado = await Piso.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pisos/:id — Eliminar piso
router.delete('/:id', proteger, async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id);
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
    if (piso.propietario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    await piso.deleteOne();
    res.json({ mensaje: 'Piso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;