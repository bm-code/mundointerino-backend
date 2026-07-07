import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema'
import {
  DOCUMENT_RULES,
  INTERINO_GENERAL_KEYWORDS,
  NAME_SIMILARITY_THRESHOLD,
  CONFIDENCE_AUTO_VERIFY,
  CONFIDENCE_MANUAL_REVIEW,
  VerificationResult,
} from './rules/verification-rules'
import { OcrProvider, OCR_PROVIDER } from './ocr/ocr-provider.interface'
import { buildNotesES, translateNote } from './translation'
import { EmailService } from '../email/email.service'

@Injectable()
export class AutomatedVerificationService {
  private readonly logger = new Logger(AutomatedVerificationService.name)
  private readonly confidenceThreshold: number
  private readonly reviewThreshold: number
  private readonly minTextLength: number

  constructor(
    @InjectModel('Usuario') private usuarioModel: Model<UsuarioDocument>,
    private configService: ConfigService,
    @Inject(OCR_PROVIDER) private ocrProvider: OcrProvider,
    private emailService: EmailService,
  ) {
    this.confidenceThreshold =
      Number(configService.get('VERIFICATION_CONFIDENCE_THRESHOLD')) || CONFIDENCE_AUTO_VERIFY
    this.reviewThreshold =
      Number(configService.get('VERIFICATION_REVIEW_THRESHOLD')) || CONFIDENCE_MANUAL_REVIEW
    this.minTextLength =
      Number(configService.get('VERIFICATION_MIN_TEXT_LENGTH')) || 50
  }

  async verifyDocument(
    documentUrl: string,
    documentType: string,
    administration: string,
    userName: string,
  ): Promise<VerificationResult> {
    this.logger.log(
      `Iniciando verificación: type=${documentType}, admin=${administration}, name=${userName}, provider=${this.ocrProvider.name}`,
    )

    if (!documentUrl || typeof documentUrl !== 'string') {
      return {
        confidence: 0,
        status: 'pendiente',
        details: this.emptyDetails(),
        notes: translateNote('ocr.no_url'),
      }
    }

    const imageUrl = this.convertToImageUrl(documentUrl)

    let text: string
    try {
      const ocrResult = await this.ocrProvider.recognize(imageUrl)
      text = ocrResult.text
      this.logger.log(
        `OCR extrajo ${text.length} caracteres con ${ocrResult.confidence}% confianza (provider: ${ocrResult.provider})`,
      )
    } catch (error) {
      this.logger.error(`OCR falló: ${(error as Error).message}`)
      return {
        confidence: 0,
        status: 'pendiente',
        details: this.emptyDetails(),
        notes: translateNote('ocr.failed'),
      }
    }

    if (!text || text.trim().length < this.minTextLength) {
      return {
        confidence: 0,
        status: 'pendiente',
        details: this.emptyDetails(),
        notes: translateNote('ocr.insufficient_text'),
      }
    }

    return this.applyRules(text, documentType, administration, userName)
  }

  async applyVerificationResult(userId: string, result: VerificationResult, attempt = 0): Promise<void> {
    let estado: string
    let motivoRechazo = ''

    if (result.confidence >= this.confidenceThreshold) {
      estado = 'verificado'
    } else if (result.confidence >= this.reviewThreshold) {
      estado = 'pendiente-revision-manual'
    } else {
      estado = 'rechazado'
      motivoRechazo = result.notes
    }

    await this.usuarioModel.findByIdAndUpdate(userId, {
      verificacionEstado: estado,
      verificationConfidence: result.confidence,
      verificationNotes: result.notes,
      verificationDate: new Date(),
      verificationType: 'automatic',
      motivoRechazo: estado === 'rechazado' ? motivoRechazo : '',
      verificationProvider: this.ocrProvider.name,
      verificationAttempts: attempt,
    })

    this.logger.log(
      `Usuario ${userId} verificación: estado=${estado}, confianza=${result.confidence}, intento=${attempt}`,
    )

    if (estado === 'pendiente-revision-manual') {
      try {
        const usuario = await this.usuarioModel.findById(userId).select('nombre email tipoDocumento administracion').lean()
        const admins = await this.usuarioModel.find({ rol: 'admin' }).select('email').lean()
        const adminEmails = admins.map((a: any) => a.email).filter(Boolean)

        if (adminEmails.length > 0 && usuario) {
          await this.emailService.sendManualReviewNotification(adminEmails, {
            userName: usuario.nombre,
            userId,
            documentType: usuario.tipoDocumento || '',
            administration: usuario.administracion || '',
            confidence: result.confidence,
          })
        }
      } catch (err) {
        this.logger.error(`Error enviando notificación de revisión manual: ${(err as Error).message}`)
      }
    }
  }

  private emptyDetails() {
    return {
      nameFound: false,
      nameSimilarity: 0,
      documentTypeMatch: false,
      documentTypeScore: 0,
      interinoFound: false,
      interinoScore: 0,
      adminMatch: false,
      adminScore: 0,
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private convertToImageUrl(url: string): string {
    if (!url) return ''

    if (url.endsWith('.pdf') || url.includes('/raw/upload/')) {
      const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME')

      if (url.includes('cloudinary.com') && cloudName) {
        let result = url
          .replace(`/raw/upload/`, '/image/upload/pg_1/')
          .replace('.pdf', '.png')

        if (!/\.(png|jpg|jpeg|webp|gif|bmp)(\?|$)/i.test(result)) {
          result += '.png'
        }

        return result
      }

      if (url.endsWith('.pdf')) {
        return url.replace('.pdf', '.png')
      }
    }

    return url
  }

  private applyRules(
    rawText: string,
    documentType: string,
    administration: string,
    userName: string,
  ): VerificationResult {
    const text = this.normalizeText(rawText)
    const normalizedName = this.normalizeText(userName)
    const rules = DOCUMENT_RULES[documentType]

    if (!rules) {
      return {
        confidence: 50,
        status: 'pendiente',
        details: this.emptyDetails(),
        notes: translateNote('doc.unknown_type', { type: documentType }),
      }
    }

    const nameResult = this.checkName(text, normalizedName)
    const docTypeResult = this.checkDocumentType(text, rules)
    const interinoResult = this.checkInterinoKeywords(text)
    const adminResult = this.checkAdminKeywords(text, administration, rules)

    const confidence =
      Math.round((nameResult.score + docTypeResult.score + interinoResult.score + adminResult.score) * 10) / 10

    const notes = buildNotesES(
      nameResult,
      docTypeResult,
      interinoResult,
      adminResult,
      documentType,
      administration,
    )

    let status: 'verificado' | 'pendiente' | 'rechazado'
    if (confidence >= this.confidenceThreshold) {
      status = 'verificado'
    } else if (confidence >= this.reviewThreshold) {
      status = 'pendiente'
    } else {
      status = 'rechazado'
    }

    return {
      confidence,
      status,
      details: {
        nameFound: nameResult.found,
        nameSimilarity: nameResult.similarity,
        documentTypeMatch: docTypeResult.found,
        documentTypeScore: docTypeResult.score,
        interinoFound: interinoResult.found,
        interinoScore: interinoResult.score,
        adminMatch: adminResult.found,
        adminScore: adminResult.score,
      },
      notes,
    }
  }

  private checkName(text: string, normalizedName: string): { found: boolean; similarity: number; score: number } {
    if (!normalizedName || normalizedName.length < 2) {
      return { found: false, similarity: 0, score: 0 }
    }
    const nameParts = normalizedName.split(' ').filter((p) => p.length > 1)
    const foundParts = nameParts.filter((part) => text.includes(part))
    const similarity = nameParts.length > 0 ? foundParts.length / nameParts.length : 0
    const found = similarity >= NAME_SIMILARITY_THRESHOLD
    const score = found ? 30 : Math.round(similarity * 30)
    return { found, similarity, score }
  }

  private checkDocumentType(text: string, rules: { keywords: string[] }): { found: boolean; score: number } {
    if (!rules.keywords || rules.keywords.length === 0) {
      return { found: false, score: 0 }
    }
    const normalizedKeywords = rules.keywords.map((k) => this.normalizeText(k))
    const matches = normalizedKeywords.filter((kw) => text.includes(kw))
    const ratio = matches.length / normalizedKeywords.length
    const found = ratio >= 0.15
    const score = found ? 25 : Math.round(ratio * 25)
    return { found, score }
  }

  private checkInterinoKeywords(text: string): { found: boolean; score: number } {
    const normalizedKeywords = INTERINO_GENERAL_KEYWORDS.map((k) => this.normalizeText(k))
    const matches = normalizedKeywords.filter((kw) => text.includes(kw))
    const found = matches.length > 0
    const score = found ? 25 : 0
    return { found, score }
  }

  private checkAdminKeywords(
    text: string,
    administration: string,
    rules: { adminKeywords: Record<string, string[]> },
  ): { found: boolean; score: number } {
    if (!rules.adminKeywords) {
      return { found: false, score: 0 }
    }
    const adminKeywords = rules.adminKeywords[administration]
    if (!adminKeywords || adminKeywords.length === 0) {
      return { found: true, score: 10 }
    }
    const normalizedKeywords = adminKeywords.map((k) => this.normalizeText(k))
    const matches = normalizedKeywords.filter((kw) => text.includes(kw))
    const ratio = matches.length / normalizedKeywords.length
    const found = ratio >= 0.1
    const score = found ? 20 : Math.round(ratio * 20)
    return { found, score }
  }
}
