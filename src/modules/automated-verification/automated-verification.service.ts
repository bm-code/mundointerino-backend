import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UsuarioEntity } from '../../database/entities/usuario.entity'
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
    @InjectRepository(UsuarioEntity) private usuarioRepo: Repository<UsuarioEntity>,
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

    await this.usuarioRepo.update(userId, {
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
        const usuario = await this.usuarioRepo.findOne({ where: { id: userId }, select: { nombre: true, email: true, tipoDocumento: true, administracion: true } })
        const admins = await this.usuarioRepo.find({ where: { rol: 'admin' }, select: { email: true } })
        const adminEmails = admins.map((a) => a.email).filter(Boolean)

        if (usuario) {
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

    // Solo necesitamos transformar si es PDF (raw upload o image upload almacenado como pdf)
    const esPdf = url.toLowerCase().endsWith('.pdf')
  const esRaw = url.includes('/raw/upload/')
    if (!esPdf && !esRaw) return url

    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME')
    if (url.includes('cloudinary.com') && cloudName) {
      let result = url
      // /raw/upload/<version>/<file>.pdf → /image/upload/pg_1/<version>/<file>.png
      if (result.includes('/raw/upload/')) {
        result = result.replace('/raw/upload/', '/image/upload/pg_1/')
      } else if (result.includes('/image/upload/')) {
        // /image/upload/<version>/<file>.pdf → /image/upload/pg_1/<version>/<file>.png
        // (Cloudinary acepta transformaciones justo después de /image/upload/)
        result = result.replace('/image/upload/', '/image/upload/pg_1/')
      }
      // Cambiar extensión final .pdf → .png
      if (result.toLowerCase().endsWith('.pdf')) {
        result = result.replace(/\.pdf$/i, '.png')
      }
      // Asegurar extensión de imagen (Cloudinary la necesita para aplicar la transformación)
      if (!/\.(png|jpg|jpeg|webp|gif|bmp)(\?|$)/i.test(result)) {
        result += '.png'
      }
      return result
    }

    // Fuera de Cloudinary no podemos convertir, devolvemos la URL original
    // y dejamos que el provider intente (Google Vision asyncBatch o Tesseract)
    // o falle con un mensaje claro.
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
    const interinoResult = this.checkInterinoKeywords(text, rules.interinoKeywords)
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

  private checkInterinoKeywords(
    text: string,
    docTypeKeywords: string[] = [],
  ): { found: boolean; score: number } {
    // Combinar keywords generales + específicas del tipo documental.
    const allKeywords = Array.from(new Set([...INTERINO_GENERAL_KEYWORDS, ...docTypeKeywords]))
    const normalizedKeywords = allKeywords.map((k) => this.normalizeText(k))
    const matches = normalizedKeywords.filter((kw) => text.includes(kw))
    if (matches.length === 0) {
      return { found: false, score: 0 }
    }
    // Crédito proporcional en vez de all-or-nothing:
    // 1 coincidencia = 10 pts (suficiente para llegar a 80 con name+docType+admin),
    // 2 = 20, 3+ = 25. Esto permite auto-verificar nóminas que contengan
    // "personal interino" o "funcionario interino" una sola vez.
    const score = Math.min(matches.length * 10, 25)
    return { found: true, score }
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
