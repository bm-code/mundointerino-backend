export interface OcrResult {
  text: string
  confidence: number
  provider: string
  raw?: unknown
}

export interface OcrProvider {
  readonly name: string
  recognize(input: Buffer | string, mime?: string): Promise<OcrResult>
}

export const OCR_PROVIDER = Symbol('OCR_PROVIDER')
export const OCR_PROVIDER_GOOGLE = Symbol('OCR_PROVIDER_GOOGLE')
export const OCR_PROVIDER_TESSERACT = Symbol('OCR_PROVIDER_TESSERACT')
