const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Storage para fotos de pisos (ya existente)
const storagePisos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mundointerino/pisos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
  },
})

// Storage para documentos de verificación de interinos
const storageVerificacion = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mundointerino/verificaciones',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto', // necesario para PDFs
  },
})

const uploadPiso         = multer({ storage: storagePisos })
const uploadVerificacion = multer({
  storage: storageVerificacion,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
})

// Exportamos todo — incluyendo `storage` para compatibilidad con código existente
module.exports = {
  cloudinary,
  storage: storagePisos,       // alias legacy para las rutas de pisos
  uploadPiso,
  uploadVerificacion,
}