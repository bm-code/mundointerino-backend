const mongoose = require('mongoose');

const PisoSchema = new mongoose.Schema({
  titulo: {
    type: String, required: [true, 'El título es obligatorio'], trim: true, maxlength: 100
  },
  descripcion: {
    type: String, required: [true, 'La descripción es obligatoria'], maxlength: 1000
  },
  ciudad: {
    type: String, required: true,
    enum: ['Zaragoza', 'Huesca', 'Teruel']
  },
  barrio:        { type: String, trim: true },
  precio:        { type: Number, required: true, min: 50 },
  precioDia:     { type: Number, min: 10 },
  tipoEstancia:  { type: String, enum: ['corta', 'larga', 'ambas'], required: true },
  habitaciones:  { type: Number, required: true, min: 1, max: 10 },
  servicios:     [{ type: String }],
  imagenes:      [{ type: String }],
  disponible:    { type: Date, required: true },
  fianza:        { type: Number, default: 0 },
  activo:        { type: Boolean, default: true },
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
}, { timestamps: true });

// Índice para búsquedas por ciudad
PisoSchema.index({ ciudad: 1, tipoEstancia: 1, precio: 1 });

module.exports = mongoose.model('Piso', PisoSchema);