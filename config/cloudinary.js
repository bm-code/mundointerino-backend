const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Storage para fotos de pisos
const storagePisos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mundointerino/pisos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
  },
})

// Storage para documentos de verificación — PDFs como 'raw', imágenes como 'image'
const storageVerificacion = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const esPDF = file.mimetype === 'application/pdf'
    return {
      folder: 'mundointerino/verificaciones',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: esPDF ? 'raw' : 'image',
    }
  },
})

const uploadPiso = multer({ storage: storagePisos })
const uploadVerificacion = multer({
  storage: storageVerificacion,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

module.exports = {
  cloudinary,
  storage: storagePisos, // alias legacy para rutas de pisos
  uploadPiso,
  uploadVerificacion,
}