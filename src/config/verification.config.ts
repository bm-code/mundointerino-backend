import { registerAs } from '@nestjs/config'

export default registerAs('verification', () => ({
  ocrProvider: process.env.OCR_PROVIDER || 'tesseract',
  ocrFallbackProvider: process.env.OCR_FALLBACK_PROVIDER || 'tesseract',
  confidenceThreshold: Number(process.env.VERIFICATION_CONFIDENCE_THRESHOLD) || 80,
  reviewThreshold: Number(process.env.VERIFICATION_REVIEW_THRESHOLD) || 50,
  minTextLength: Number(process.env.VERIFICATION_MIN_TEXT_LENGTH) || 50,
  maxRetries: Number(process.env.VERIFICATION_MAX_RETRIES) || 3,
  baseDelayMs: Number(process.env.VERIFICATION_BASE_DELAY_MS) || 5000,
  maxDelayMs: Number(process.env.VERIFICATION_MAX_DELAY_MS) || 120000,
  timeoutMs: Number(process.env.VERIFICATION_TIMEOUT_MS) || 60000,
  maxFileSize: Number(process.env.VERIFICATION_MAX_FILE_SIZE) || 10485760,
  allowedFormats: (process.env.VERIFICATION_ALLOWED_FORMATS || 'jpg,jpeg,png,pdf')
    .split(',')
    .map((f) => f.trim()),
  maxPdfPages: Number(process.env.VERIFICATION_MAX_PDF_PAGES) || 5,
  concurrency: Number(process.env.VERIFICATION_CONCURRENCY) || 2,
  manualReviewTo: process.env.MANUAL_REVIEW_TO || '',
}))