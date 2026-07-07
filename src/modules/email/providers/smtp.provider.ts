import { Injectable, Logger } from '@nestjs/common'
import { EmailProvider, EmailMessage, EmailSendResult } from '../interfaces/email-provider.interface'

@Injectable()
export class SmtpProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpProvider.name)
  private transporter: any = null

  constructor(private readonly config: {
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    smtpSecure?: boolean
    from?: string
  }) {
    if (config.smtpHost) {
      try {
        const nodemailer = require('nodemailer')
        this.transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort || 587,
          secure: config.smtpSecure || false,
          auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
        })
      } catch {
        this.logger.warn('nodemailer no disponible o mal configurado')
      }
    }
  }

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    if (!this.transporter) {
      this.logger.warn(`SMTP no configurado, email a ${msg.to} no enviado`)
      return { messageId: null }
    }
    const info = await this.transporter.sendMail({
      from: this.config.from || 'no-reply@mundointerino.com',
      to: Array.isArray(msg.to) ? msg.to.join(',') : msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    return { messageId: info.messageId || null }
  }
}
