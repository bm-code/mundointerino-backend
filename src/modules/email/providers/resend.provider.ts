import { Injectable, Logger } from '@nestjs/common'
import { EmailProvider, EmailMessage, EmailSendResult } from '../interfaces/email-provider.interface'

@Injectable()
export class ResendProvider implements EmailProvider {
  private readonly logger = new Logger(ResendProvider.name)
  private resend: any = null

  constructor(private readonly config: { resendApiKey?: string; from?: string }) {
    if (config.resendApiKey) {
      try {
        const Resend = require('resend').Resend
        this.resend = new Resend(config.resendApiKey)
      } catch {
        this.logger.warn('resend no instalado o API key no configurada')
      }
    }
  }

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    if (!this.resend) {
      this.logger.warn(`Resend no configurado, email a ${msg.to} no enviado (subject: ${msg.subject})`)
      return { messageId: null }
    }
    const { data, error } = await this.resend.emails.send({
      from: this.config.from || 'no-reply@mundointerino.com',
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    if (error) {
      this.logger.error(`Resend error: ${JSON.stringify(error)}`)
      throw new Error(`Resend: ${error.message || JSON.stringify(error)}`)
    }
    return { messageId: data?.id || null }
  }
}
