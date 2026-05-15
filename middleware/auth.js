const jwt = require('jsonwebtoken')
const Usuario = require('../models/Usuario')

const proteger = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No autorizado, token requerido' })
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = await Usuario.findById(decoded.id).select('-password')
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

const soloAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === 'admin') {
    next()
  } else {
    res.status(403).json({ error: 'Acceso denegado, se requiere rol admin' })
  }
}

module.exports = { proteger, soloAdmin }