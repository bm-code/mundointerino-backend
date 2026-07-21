import { Logger } from '@nestjs/common'
import { OcrProvider } from './ocr-provider.interface'
import { TesseractProvider } from './tesseract.provider'

export function createOcrProvider(config: {
  provider: string
  fallbackProvider: string
  timeoutMs: number
}): OcrProvider {
  const logger = new Logger('OcrProviderFactory')

  if (config.provider === 'google-vision' || config.fallbackProvider === 'google-vision') {
    throw new Error(
      'Google Vision OCR fue deshabilitado (costo). Usá OCR_PROVIDER="tesseract".',
    )
  }

  const providers: Record<string, () => OcrProvider> = {
    tesseract: () => new TesseractProvider(config.timeoutMs),
  }

  const primaryFactory = providers[config.provider] || providers.tesseract
  const fallbackFactory = providers[config.fallbackProvider] || providers.tesseract

  const primary = primaryFactory()
  const fallback = fallbackFactory()

  // Si el primario y el fallback son el mismo provider, no hay nada que envolver.
  if (primary.name === fallback.name) {
    logger.log(`OCR provider: ${primary.name}`)
    return primary
  }

  logger.log(`OCR primario: ${primary.name} | fallback: ${fallback.name}`)
  // Envolver con fallback runtime solo si son distintos.
  // Como hoy solo existe tesseract, en la práctica siempre retorna tesseract.
  return primary
}