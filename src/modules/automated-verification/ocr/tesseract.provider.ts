import { Injectable, Logger } from '@nestjs/common'
import { OcrProvider, OcrResult } from './ocr-provider.interface'

@Injectable()
export class TesseractProvider implements OcrProvider {
  readonly name = 'tesseract'
  private readonly logger = new Logger(TesseractProvider.name)
  private readonly timeoutMs: number

  constructor(timeoutMs = 60000) {
    this.timeoutMs = timeoutMs
  }

  async recognize(input: Buffer | string, _mime?: string): Promise<OcrResult> {
    const Tesseract = require('tesseract.js')

    let imageBuffer: Buffer
    if (typeof input === 'string') {
      this.logger.log(`Descargando imagen para OCR: ${input.substring(0, 80)}...`)
      const response = await fetch(input)
      if (!response.ok) {
        throw new Error(`Error descargando imagen: ${response.status} ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      imageBuffer = input
    }

    const ocrPromise = Tesseract.recognize(imageBuffer, 'spa', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          this.logger.debug(`OCR progreso: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`OCR timeout tras ${this.timeoutMs / 1000} segundos`)),
        this.timeoutMs,
      ),
    )

    const {
      data: { text, confidence },
    } = await Promise.race([ocrPromise, timeoutPromise])

    return {
      text: text || '',
      confidence: confidence || 0,
      provider: this.name,
    }
  }
}
