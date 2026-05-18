const mongoose = require('mongoose')

const pisoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  ciudad: {
    type: String,
    required: true,
    trim: true
  },
  barrio: {
    type: String,
    trim: true
  },
  contacto: {
    type: String,
    trim: true
  },
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  precioDia: {
    type: Number,
    min: 0
  },
  fianza: {
    type: Number,
    min: 0,
    default: 0
  },
  habitaciones: {
    type: Number,
    required: true,
    min: 1
  },
  banos: {
    type: Number,
    min: 1
  },
  metros: {
    type: Number,
    min: 0
  },
  planta: {
    type: String,
    trim: true
  },
  tipoEstancia: {
    type: String,
    enum: ['corta', 'larga', 'ambas'],
    required: true
  },
  disponible: {
    type: Date
  },
  servicios: {
    type: [String],
    default: []
  },
  fotos: {
    type: [String],   // ← URLs de Cloudinary
    default: []
  },
  activo: {
    type: Boolean,
    default: true
  },
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Piso', pisoSchema)