const express  = require('express');
const jwt      = require('jsonwebtoken');
const Usuario  = require('../models/Usuario');
const { proteger } = require('../middleware/auth');
const router   = express.Router();

const generarToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, apellidos, email, password, telefono, rol } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    const usuario = await Usuario.create({ nombre, apellidos, email, password, telefono, rol });

    return res.status(201).json({
      _id:    usuario._id,
      nombre: usuario.nombre,
      email:  usuario.email,
      rol:    usuario.rol,
      token:  generarToken(usuario._id)
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ email }).select('+password');
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordCorrecta = await usuario.compararPassword(password);
    if (!passwordCorrecta) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    return res.json({
      _id:    usuario._id,
      nombre: usuario.nombre,
      email:  usuario.email,
      rol:    usuario.rol,
      token:  generarToken(usuario._id)
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/perfil
router.get('/perfil', proteger, async (req, res) => {
  return res.json(req.usuario);
});

module.exports = router;