import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary } from 'cloudinary'
import * as multer from 'multer'
import { verificationStorage, pisosStorage } from './cloudinary-storage'

@Injectable()
export class UploadService {
  public uploadPiso: multer.Multer
  public uploadVerificacion: multer.Multer

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    })

    this.uploadPiso = multer({
      storage: pisosStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if (permitidos.includes(file.mimetype)) cb(null, true)
        else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
      },
    })

    this.uploadVerificacion = multer({
      storage: verificationStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  }

  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    return files.map(f => f.path)
  }

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    return file.path
  }

  async deleteImages(urls: string[]): Promise<void> {
    if (!urls.length) return
    await Promise.all(
      urls.map(url => {
        const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
        return cloudinary.uploader.destroy(publicId)
      }),
    )
  }
}
