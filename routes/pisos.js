const express  = require('express');
const Piso     = require('../models/Piso');
const { proteger } = require('../middleware/auth');
const multer   = require('multer');
const { cloudinary, storage } = require('../config/cloudinary');
const router   = express.Router();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (permitidos.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
  }
});

// GET /api/pisos — Listar con filtros
router.get('/', async (req, res) => {
  try {
    const { ciudad, tipo, precioMax, habitaciones, pagina = 1, limite = 12 } = req.query;
    const filtro = { activo: true };

    if (ciudad)       filtro.ciudad = new RegExp(ciudad, 'i');
    if (tipo)         filtro.tipoEstancia = tipo;
    if (precioMax)    filtro.precio = { $lte: parseInt(precioMax) };
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

// GET /api/pisos/mis-pisos — Pisos del propietario autenticado
router.get('/mis-pisos', proteger, async (req, res) => {
  try {
    const pisos = await Piso.find({ propietario: req.usuario._id }).sort({ createdAt: -1 });
    res.json(pisos);
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

// POST /api/pisos — Crear piso
router.post('/', proteger, upload.array('imagenes', 8), async (req, res) => {
  try {
    // Cloudinary devuelve la URL pública en f.path
    const fotos = req.files ? req.files.map(f => f.path) : [];

    const piso = await Piso.create({
      ...req.body,
      fotos,
      propietario: req.usuario._id,
      activo: true,
    });
    res.status(201).json(piso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pisos/:id — Editar piso (sin cambiar fotos)
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

// PUT /api/pisos/:id/fotos — Actualizar fotos del piso
router.put('/:id/fotos', proteger, upload.array('imagenes', 8), async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id);
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
    if (piso.propietario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    // Borrar fotos antiguas de Cloudinary
    if (piso.fotos?.length > 0) {
      const deletePromises = piso.fotos.map(url => {
        const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
        return cloudinary.uploader.destroy(publicId)
      })
      await Promise.all(deletePromises)
    }

    const fotos = req.files ? req.files.map(f => f.path) : [];
    const actualizado = await Piso.findByIdAndUpdate(req.params.id, { fotos }, { new: true });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/pisos/:id/disponibilidad — Cambiar disponibilidad
router.patch('/:id/disponibilidad', proteger, async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id);
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
    if (piso.propietario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    piso.activo = !piso.activo;
    await piso.save();
    res.json(piso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pisos/:id — Eliminar piso y sus fotos de Cloudinary
router.delete('/:id', proteger, async (req, res) => {
  try {
    const piso = await Piso.findById(req.params.id);
    if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
    if (piso.propietario.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    // Borrar fotos de Cloudinary al eliminar el piso
    if (piso.fotos?.length > 0) {
      const deletePromises = piso.fotos.map(url => {
        const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
        return cloudinary.uploader.destroy(publicId)
      })
      await Promise.all(deletePromises)
    }

    await piso.deleteOne();
    res.json({ mensaje: 'Piso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;