import { Logger } from '@nestjs/common'
import { OcrProvider } from './ocr-provider.interface'
import { GoogleVisionProvider } from './google-vision.provider'
import { TesseractProvider } from './tesseract.provider'

export function createOcrProvider(config: {
  provider: string
  fallbackProvider: string
  googleCredentials: string
  timeoutMs: number
}): OcrProvider {
  const logger = new Logger('OcrProviderFactory')

  const providers: Record<string, () => OcrProvider> = {
    'google-vision': () => new GoogleVisionProvider(config.googleCredentials),
    tesseract: () => new TesseractProvider(config.timeoutMs),
  }

  const primaryFactory = providers[config.provider]
  const fallbackFactory = providers[config.fallbackProvider] || providers.tesseract

  if (primaryFactory) {
    const provider = primaryFactory()
    if (provider instanceof GoogleVisionProvider && !provider.isConfigured()) {
      logger.warn('Google Vision no configurado, usando fallback Tesseract')
      return fallbackFactory()
    }
    return provider
  }

  logger.warn(`Provider OCR '${config.provider}' no reconocido, usando Tesseract`)
  return fallbackFactory()
}
