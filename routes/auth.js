const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Usuario = require('../models/Usuario')

// REGISTRO
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body

    const existe = await Usuario.findOne({ email })
    if (existe) return res.status(400).json({ error: 'El email ya está registrado' })

    const usuario = new Usuario({ nombre, email, password, rol })
    await usuario.save()

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error registro:', error.message)
    res.status(500).json({ error: 'Error al registrarse' })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const usuario = await Usuario.findOne({ email }).select('+password')
    if (!usuario) return res.status(400).json({ error: 'Email o contraseña incorrectos' })

    const ok = await bcrypt.compare(password, usuario.password)
    if (!ok) return res.status(400).json({ error: 'Email o contraseña incorrectos' })

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error login:', error.message)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

module.exports = router