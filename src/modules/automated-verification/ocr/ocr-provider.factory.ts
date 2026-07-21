import { Logger } from '@nestjs/common'
import { OcrProvider } from './ocr-provider.interface'
import { TesseractProvider } from './tesseract.provider'

export function createOcrProvider(config: {
  provider: string
  fallbackProvider: string
  timeoutMs: number
}): OcrProvider {
  const logger = new Logger('OcrProviderFactory')

  const requested = [config.provider, config.fallbackProvider]
  if (requested.some((p) => p === 'google-vision')) {
    logger.warn(
      'Google Vision OCR fue deshabilitado (costo). Cayendo a Tesseract automáticamente. ' +
        'Seteá OCR_PROVIDER="tesseract" para eliminar este warning.',
    )
  }

  const providers: Record<string, () => OcrProvider> = {
    tesseract: () => new TesseractProvider(config.timeoutMs),
  }

  const primaryFactory = providers.tesseract
  const fallbackFactory = providers.tesseract

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