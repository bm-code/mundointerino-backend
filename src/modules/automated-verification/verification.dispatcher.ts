import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema'
import { AutomatedVerificationService } from './automated-verification.service'
import { EmailService } from '../email/email.service'

@Injectable()
export class VerificationDispatcher {
  private readonly logger = new Logger(VerificationDispatcher.name)
  private readonly maxRetries: number
  private readonly baseDelayMs: number
  private readonly maxDelayMs: number

  constructor(
    @InjectModel('Usuario') private usuarioModel: Model<UsuarioDocument>,
    private readonly verificationService: AutomatedVerificationService,
    private readonly emailService: EmailService,
  ) {
    this.maxRetries = Number(process.env.VERIFICATION_MAX_RETRIES) || 3
    this.baseDelayMs = Number(process.env.VERIFICATION_BASE_DELAY_MS) || 5000
    this.maxDelayMs = Number(process.env.VERIFICATION_MAX_DELAY_MS) || 120000
  }

  enqueue(
    userId: string,
    documentUrl: string,
    tipoDocumento: string,
    administracion: string,
    userName: string,
  ): void {
    this.usuarioModel
      .findByIdAndUpdate(userId, {
        verificacionEstado: 'procesando',
        verificationAttempts: 0,
        verificationLastError: '',
      })
      .exec()
      .catch((err) => this.logger.error(`Error marcando procesando: ${err.message}`))

    this.processWithRetries(userId, documentUrl, tipoDocumento, administracion, userName, 0)
  }

  private processWithRetries(
    userId: string,
    documentUrl: string,
    tipoDocumento: string,
    administracion: string,
    userName: string,
    attempt: number,
  ): void {
    this.verificationService
      .verifyDocument(documentUrl, tipoDocumento, administracion, userName)
      .then(async (result) => {
        await this.verificationService.applyVerificationResult(userId, result, attempt)

        if (result.status === 'pendiente' && attempt < this.maxRetries) {
          const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs)
          this.logger.log(`Reintentando OCR para ${userId} en ${delay}ms (intento ${attempt + 1}/${this.maxRetries})`)
          await this.usuarioModel
            .findByIdAndUpdate(userId, { verificationAttempts: attempt + 1 })
            .exec()
            .catch(() => {})
          setTimeout(
            () => this.processWithRetries(userId, documentUrl, tipoDocumento, administracion, userName, attempt + 1),
            delay,
          )
        } else if (result.status === 'pendiente') {
          await this.markPendingReviewManual(userId, result)
        }
      })
      .catch(async (error) => {
        this.logger.error(`OCR falló intento ${attempt + 1}/${this.maxRetries} para ${userId}: ${error.message}`)
        await this.usuarioModel
          .findByIdAndUpdate(userId, { verificationLastError: error.message })
          .exec()
          .catch(() => {})

        if (attempt < this.maxRetries) {
          const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs)
          this.logger.log(`Reintentando OCR para ${userId} en ${delay}ms (intento ${attempt + 1}/${this.maxRetries})`)
          setTimeout(
            () => this.processWithRetries(userId, documentUrl, tipoDocumento, administracion, userName, attempt + 1),
            delay,
          )
        } else {
          await this.markPendingReviewManual(userId, {
            confidence: 0,
            status: 'pendiente',
            details: { nameFound: false, nameSimilarity: 0, documentTypeMatch: false, documentTypeScore: 0, interinoFound: false, interinoScore: 0, adminMatch: false, adminScore: 0 },
            notes: 'No se ha podido extraer texto del documento tras varios intentos. Se requiere revisión manual.',
          })
        }
      })
  }

  private async markPendingReviewManual(userId: string, result: any): Promise<void> {
    await this.usuarioModel
      .findByIdAndUpdate(userId, {
        verificacionEstado: 'pendiente-revision-manual',
        verificationConfidence: result.confidence,
        verificationNotes: result.notes,
        verificationDate: new Date(),
        verificationType: 'automatic',
      })
      .exec()
      .catch((err) => this.logger.error(`Error marcando revisión manual: ${err.message}`))

    try {
      const admins = await this.usuarioModel
        .find({ rol: 'admin' })
        .select('email')
        .lean()
      const adminEmails = admins.map((a: any) => a.email).filter(Boolean)

      if (adminEmails.length > 0) {
        await this.emailService.sendManualReviewNotification(adminEmails, {
          userName: '',
          userId,
          documentType: '',
          administration: '',
          confidence: result.confidence || 0,
        })
      }
    } catch (err) {
      this.logger.error(`Error enviando email de revisión manual: ${(err as Error).message}`)
    }
  }
}
