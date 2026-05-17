const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    rol: {
      type: String,
      enum: ['docente', 'propietario'],
      required: true,
      default: 'docente',
    },
    telefono: { type: String, default: '', trim: true },
    verificacionEstado: {
      type: String,
      enum: ['pendiente', 'verificado', 'rechazado'],
      default: 'pendiente',
    },
  },
  { timestamps: true }
)

UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

module.exports = mongoose.model('Usuario', UsuarioSchema)