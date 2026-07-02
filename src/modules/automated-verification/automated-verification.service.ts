import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as Tesseract from 'tesseract.js'
import { Usuario, UsuarioDocument } from '../usuarios/schemas/usuario.schema'
import {
  DOCUMENT_RULES,
  INTERINO_GENERAL_KEYWORDS,
  NAME_SIMILARITY_THRESHOLD,
  CONFIDENCE_AUTO_VERIFY,
  CONFIDENCE_MANUAL_REVIEW,
  VerificationResult,
} from './rules/verification-rules'

@Injectable()
export class AutomatedVerificationService {
  private readonly logger = new Logger(AutomatedVerificationService.name)
  private readonly confidenceThreshold: number
  private readonly reviewThreshold: number

  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    private configService: ConfigService,
  ) {
    this.confidenceThreshold =
      Number(configService.get('VERIFICATION_CONFIDENCE_THRESHOLD')) ||
      CONFIDENCE_AUTO_VERIFY
    this.reviewThreshold =
      Number(configService.get('VERIFICATION_REVIEW_THRESHOLD')) ||
      CONFIDENCE_MANUAL_REVIEW
  }

  async verifyDocument(
    documentUrl: string,
    documentType: string,
    administration: string,
    userName: string,
  ): Promise<VerificationResult> {
    this.logger.log(
      `Starting verification: type=${documentType}, admin=${administration}, name=${userName}, url=${documentUrl}`,
    )

    if (!documentUrl || typeof documentUrl !== 'string') {
      return {
        confidence: 0,
        status: 'pendiente',
        details: {
          nameFound: false,
          nameSimilarity: 0,
          documentTypeMatch: false,
          documentTypeScore: 0,
          interinoFound: false,
          interinoScore: 0,
          adminMatch: false,
          adminScore: 0,
        },
        notes: 'No document URL provided, manual review required',
      }
    }

    const imageUrl = this.convertToImageUrl(documentUrl)

    let text: string
    try {
      text = await this.extractText(imageUrl)
      this.logger.log(
        `OCR extracted ${text.length} characters (first 200): ${text.substring(0, 200)}`,
      )
    } catch (error) {
      this.logger.error(`OCR failed: ${error.message}`)
      return {
        confidence: 0,
        status: 'pendiente',
        details: {
          nameFound: false,
          nameSimilarity: 0,
          documentTypeMatch: false,
          documentTypeScore: 0,
          interinoFound: false,
          interinoScore: 0,
          adminMatch: false,
          adminScore: 0,
        },
        notes: 'OCR extraction failed, manual review required',
      }
    }

    if (!text || text.trim().length < 50) {
      return {
        confidence: 0,
        status: 'pendiente',
        details: {
          nameFound: false,
          nameSimilarity: 0,
          documentTypeMatch: false,
          documentTypeScore: 0,
          interinoFound: false,
          interinoScore: 0,
          adminMatch: false,
          adminScore: 0,
        },
        notes: 'Insufficient text extracted from document, manual review required',
      }
    }

    return this.applyRules(text, documentType, administration, userName)
  }

  async applyVerificationResult(
    userId: string,
    result: VerificationResult,
  ): Promise<void> {
    let estado: string
    let motivoRechazo = ''

    if (result.confidence >= this.confidenceThreshold) {
      estado = 'verificado'
    } else if (result.confidence >= this.reviewThreshold) {
      estado = 'pendiente'
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
    })

    this.logger.log(
      `User ${userId} verification result: status=${estado}, confidence=${result.confidence}`,
    )
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

  private async extractText(imageUrl: string): Promise<string> {
    this.logger.log(`Running OCR on: ${imageUrl}`)

    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    const ocrPromise = Tesseract.recognize(imageBuffer, 'spa', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OCR timeout after 30 seconds')), 30000),
    )

    const {
      data: { text },
    } = await Promise.race([ocrPromise, timeoutPromise])

    return text
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
        details: {
          nameFound: false,
          nameSimilarity: 0,
          documentTypeMatch: false,
          documentTypeScore: 0,
          interinoFound: false,
          interinoScore: 0,
          adminMatch: false,
          adminScore: 0,
        },
        notes: `Unknown or unsupported document type: ${documentType}`,
      }
    }

    const nameResult = this.checkName(text, normalizedName)
    const docTypeResult = this.checkDocumentType(text, rules)
    const interinoResult = this.checkInterinoKeywords(text)
    const adminResult = this.checkAdminKeywords(text, administration, rules)

    const confidence =
      Math.round((nameResult.score + docTypeResult.score + interinoResult.score + adminResult.score) * 10) / 10

    const notes = this.buildNotes(
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

  private checkName(
    text: string,
    normalizedName: string,
  ): { found: boolean; similarity: number; score: number } {
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

  private checkDocumentType(
    text: string,
    rules: { keywords: string[] },
  ): { found: boolean; score: number } {
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

  private checkInterinoKeywords(text: string): {
    found: boolean
    score: number
  } {
    const normalizedKeywords = INTERINO_GENERAL_KEYWORDS.map((k) =>
      this.normalizeText(k),
    )
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

  private buildNotes(
    nameResult: { found: boolean; similarity: number },
    docTypeResult: { found: boolean; score: number },
    interinoResult: { found: boolean; score: number },
    adminResult: { found: boolean; score: number },
    documentType: string,
    administration: string,
  ): string {
    const notes: string[] = []

    if (nameResult.found) {
      notes.push(
        `Name match found (similarity: ${Math.round(nameResult.similarity * 100)}%)`,
      )
    } else {
      notes.push('Name not found or low similarity in document')
    }

    if (docTypeResult.found) {
      notes.push(
        `Document type '${documentType}' keywords matched (score: ${docTypeResult.score}/25)`,
      )
    } else {
      notes.push(
        `Document type '${documentType}' keywords not sufficiently matched (score: ${docTypeResult.score}/25)`,
      )
    }

    if (interinoResult.found) {
      notes.push('Interino/interinidad keywords found')
    } else {
      notes.push('No interino/interinidad keywords found')
    }

    if (adminResult.found) {
      notes.push(
        `Administration '${administration}' keywords matched (score: ${adminResult.score}/20)`,
      )
    } else {
      notes.push(
        `Administration '${administration}' keywords not sufficiently matched (score: ${adminResult.score}/20)`,
      )
    }

    return notes.join('. ') + '.'
  }
}
