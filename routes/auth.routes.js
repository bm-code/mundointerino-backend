const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Usuario = require('../models/Usuario')

const router = express.Router()

const generarToken = usuario => {
  return jwt.sign(
    {
      id: usuario._id,
      rol: usuario.rol,
      verificacionEstado: usuario.verificacionEstado,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

router.post('/registro', async (req, res) => {
  try {
    const {
      nombre,
      email,
      password,
      rol,
      telefono,
      verificacionEstado = 'pendiente',
    } = req.body

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    if (!['docente', 'propietario'].includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' })
    }

    const emailNormalizado = email.toLowerCase().trim()

    const existeUsuario = await Usuario.findOne({ email: emailNormalizado })
    if (existeUsuario) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
    }

    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      email: emailNormalizado,
      password,
      rol,
      telefono: telefono || '',
      verificacionEstado,
    })

    const token = generarToken(usuario)

    return res.status(201).json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        verificacionEstado: usuario.verificacionEstado,
      },
    })
  } catch (error) {
    console.error('ERROR REGISTRO:', error)
    return res.status(500).json({ error: error.message || 'Error al registrarse' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan credenciales' })
    }

    const usuario = await Usuario.findOne({
      email: email.toLowerCase().trim(),
    })

    if (!usuario) {
      return res.status(400).json({ error: 'Credenciales incorrectas' })
    }

    const passwordValida = await bcrypt.compare(password, usuario.password)
    if (!passwordValida) {
      return res.status(400).json({ error: 'Credenciales incorrectas' })
    }

    const token = generarToken(usuario)

    return res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        verificacionEstado: usuario.verificacionEstado,
      },
    })
  } catch (error) {
    return res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

module.exports = router