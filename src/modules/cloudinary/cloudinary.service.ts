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

  /**
   * Elimina un recurso de Cloudinary a partir de su URL.
   * Acepta tanto /image/upload/ como /raw/upload/ (PDFs).
   * Retorna true si Cloudinary borró algo (o ya no existía); false si falló.
   */
  async deleteByUrl(url: string): Promise<boolean> {
    if (!url || typeof url !== 'string') return false
    try {
      const publicId = extractPublicId(url)
      if (!publicId) return false
      // resource_type: 'image' cubre jpg/png y también PDFs subidos con resource_type:'image'
      const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
      return res?.result === 'ok' || res?.result === 'not found'
    } catch (err) {
      // Si el resource_type no es image, probar con raw (PDFs convertidos manualmente).
      try {
        const publicId = extractPublicId(url)
        if (!publicId) return false
        const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
        return res?.result === 'ok' || res?.result === 'not found'
      } catch (err2) {
        return false
      }
    }
  }
}

function extractPublicId(url: string): string | null {
  const match = url.match(/\/(?:image|raw)\/upload\/(?:v\d+\/)?(.+?)$/)
  if (!match) return null
  return match[1].replace(/\.[^.]+$/, '')
}
