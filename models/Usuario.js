const mongoose = require('mongoose')

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    rol: { type: String, enum: ['docente', 'propietario', 'admin'], required: true, default: 'docente' },
    telefono: { type: String, default: '', trim: true },
    verificacionEstado: { type: String, enum: ['pendiente', 'verificado', 'rechazado'], default: 'pendiente' },
    motivoRechazo: { type: String, default: '' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Usuario', UsuarioSchema)