export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text: string
  meta?: Record<string, unknown>
}

export interface EmailSendResult {
  messageId: string | null
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<EmailSendResult>
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER')
