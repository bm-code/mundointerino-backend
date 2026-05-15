const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
  nombre:    { type: String, required: true, trim: true },
  apellidos: { type: String, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  telefono:  { type: String, trim: true },
  password:  { type: String, required: true, minlength: 8 },
  rol:       { type: String, enum: ['docente', 'propietario', 'admin'], default: 'docente' },
  activo:    { type: Boolean, default: true },
  avatar:    { type: String }
}, { timestamps: true });

// Sin usar next — compatible con Express 5
UsuarioSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UsuarioSchema.methods.compararPassword = async function(passwordIntroducida) {
  return await bcrypt.compare(passwordIntroducida, this.password);
};

module.exports = mongoose.model('Usuario', UsuarioSchema);