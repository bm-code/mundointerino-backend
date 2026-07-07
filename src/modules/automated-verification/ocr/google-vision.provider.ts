import { Injectable, Logger } from '@nestjs/common'
import { OcrProvider, OcrResult } from './ocr-provider.interface'

@Injectable()
export class GoogleVisionProvider implements OcrProvider {
  readonly name = 'google-vision'
  private readonly logger = new Logger(GoogleVisionProvider.name)
  private client: any = null

  constructor(private credentialsPath?: string) {
    if (credentialsPath) {
      try {
        const { ImageAnnotatorClient } = require('@google-cloud/vision')
        this.client = new ImageAnnotatorClient({
          keyFilename: credentialsPath,
        })
        this.logger.log('Google Vision client inicializado')
      } catch (err) {
        this.logger.warn('Google Vision no disponible: ' + (err as Error).message)
      }
    }
  }

  isConfigured(): boolean {
    return this.client !== null
  }

  async recognize(input: Buffer | string, mime?: string): Promise<OcrResult> {
    if (!this.client) {
      throw new Error('Google Vision no configurado')
    }

    let imageContent: Buffer

    if (typeof input === 'string') {
      if (input.endsWith('.pdf') || input.includes('/raw/upload/')) {
        const response = await fetch(input)
        if (!response.ok) {
          throw new Error(`Error descargando documento: ${response.status}`)
        }
        imageContent = Buffer.from(await response.arrayBuffer())
      } else {
        const [result] = await this.client.documentTextDetection(input)
        return this.parseResult(result)
      }
    } else {
      imageContent = input
    }

    const request = {
      image: { content: imageContent },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    }

    const [result] = await this.client.annotateImage(request)
    return this.parseResult(result)
  }

  private parseResult(result: any): OcrResult {
    const fullText = result?.fullTextAnnotation
    const text = fullText?.text || ''
    const confidence = fullText?.confidence ? Math.round(fullText.confidence * 100) : 85

    return {
      text,
      confidence,
      provider: this.name,
      raw: result,
    }
  }
}
