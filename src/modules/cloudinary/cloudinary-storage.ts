import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const verificationStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req: any, file: Express.Multer.File) => {
    const esPDF = file.mimetype === 'application/pdf'
    return {
      folder: 'mundointerino/verificaciones',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'image',
    }
  },
})

export const pisosStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mundointerino/pisos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
  } as any,
})
