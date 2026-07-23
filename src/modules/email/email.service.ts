import { Injectable, Inject, Logger } from '@nestjs/common'
import { EmailProvider, EmailMessage, EMAIL_PROVIDER } from './interfaces/email-provider.interface'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly frontendUrl: string
  private readonly manualReviewTo: string[]

  constructor(
    @Inject(EMAIL_PROVIDER) private provider: EmailProvider,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'
    // Destinatarios hardcoded garantizados (además de los admins registrados en DB).
    // CSV: MANUAL_REVIEW_TO="a@b.com,c@d.com"
    const raw = this.configService.get<string>('MANUAL_REVIEW_TO') || process.env.MANUAL_REVIEW_TO || ''
    this.manualReviewTo = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async sendWithRetry(msg: EmailMessage, opts?: { maxAttempts?: number; swallow?: boolean }): Promise<void> {
    const maxAttempts = opts?.maxAttempts ?? 3
    const swallow = opts?.swallow ?? true
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.provider.send(msg)
        this.logger.log(`Email enviado a ${msg.to} (intento ${attempt}/${maxAttempts})`)
        return
      } catch (error) {
        lastError = error as Error
        this.logger.error(`Email falló intento ${attempt}/${maxAttempts}: ${lastError.message}`)
        if (attempt < maxAttempts) {
          const delay = Math.min(500 * Math.pow(2, attempt - 1), 8000)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }

    if (!swallow && lastError) throw lastError
    this.logger.error(`Email NO enviado tras ${maxAttempts} intentos: ${lastError?.message}`)
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verificar-email?token=${token}`
    const html = this.verificarEmailHtml(link)
    const text = this.verificarEmailText(link)
    await this.sendWithRetry({
      to,
      subject: 'Verifica tu correo en Mundointerino',
      html,
      text,
      meta: { type: 'email-verification' },
    })
  }

  /**
   * Combina admins registrados con destinatarios hardcoded via MANUAL_REVIEW_TO.
   * Deduplica por email (case-insensitive). Si no hay ningún destinatario,
   * loggea warn pero no lanza (swallow true).
   */
  resolveManualReviewRecipients(adminEmails: string[]): string[] {
    const seen = new Set<string>()
    const all: string[] = []
    for (const e of [...adminEmails, ...this.manualReviewTo]) {
      const lower = (e || '').trim().toLowerCase()
      if (!lower || seen.has(lower)) continue
      seen.add(lower)
      all.push(e)
    }
    if (!all.length) {
      this.logger.warn(
        'No hay destinatarios para revisión manual (admins DB vacío + MANUAL_REVIEW_TO vacío)',
      )
    }
    return all
  }

  async sendManualReviewNotification(
    adminEmails: string[],
    payload: { userName: string; userId: string; documentType: string; administration: string; confidence: number },
  ): Promise<void> {
    const recipients = this.resolveManualReviewRecipients(adminEmails)
    if (!recipients.length) return
    const link = `${this.frontendUrl}/admin?usuario=${payload.userId}&estado=pendiente-revision-manual`
    const html = this.revisionManualHtml(payload, link)
    const text = this.revisionManualText(payload, link)
    await this.sendWithRetry({
      to: recipients,
      subject: `Revisión manual requerida: ${payload.userName}`,
      html,
      text,
      meta: { type: 'manual-review', userId: payload.userId },
    })
  }

  async sendVerificationStatusNotification(
    to: string,
    payload: { userName: string; estado: string; motivoRechazo?: string },
  ): Promise<void> {
    const html = this.verificacionEstadoHtml(payload)
    const text = this.verificacionEstadoText(payload)
    const subject = payload.estado === 'verificado'
      ? '¡Tu cuenta ha sido verificada! - Mundointerino'
      : 'Actualización sobre tu verificación - Mundointerino'
    await this.sendWithRetry({
      to,
      subject,
      html,
      text,
      meta: { type: 'verification-status', estado: payload.estado },
    })
  }

  private verificarEmailHtml(link: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#2563eb">Verifica tu correo en Mundointerino</h2>
  <p>Hola,</p>
  <p>Para completar tu registro, verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
  <p style="margin:30px 0">
    <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Verificar correo</a>
  </p>
  <p>Si el botón no funciona, copia y pega este enlace: ${link}</p>
  <p style="color:#6b7280;font-size:14px">El enlace expira en 24 horas. Si no creaste una cuenta, ignora este correo.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">Mundointerino — Plataforma de interinos</p>
</body>
</html>`
  }

  private verificarEmailText(link: string): string {
    return `Verifica tu correo en Mundointerino

Para completar tu registro, visita el siguiente enlace:
${link}

El enlace expira en 24 horas. Si no creaste una cuenta, ignora este correo.

Mundointerino — Plataforma de interinos`
  }

  private revisionManualHtml(
    p: { userName: string; documentType: string; administration: string; confidence: number },
    link: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#dc2626">Revisión manual requerida</h2>
  <p>Un documento requiere revisión manual por parte del equipo de administración.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0">
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">Usuario</td><td style="padding:8px;border:1px solid #e5e7eb">${p.userName}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">Tipo documento</td><td style="padding:8px;border:1px solid #e5e7eb">${p.documentType}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">Administración</td><td style="padding:8px;border:1px solid #e5e7eb">${p.administration}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">Confianza OCR</td><td style="padding:8px;border:1px solid #e5e7eb">${p.confidence}%</td></tr>
  </table>
  <p><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Revisar documento</a></p>
  <p style="color:#6b7280;font-size:14px">Si el botón no funciona: ${link}</p>
</body>
</html>`
  }

  private revisionManualText(
    p: { userName: string; documentType: string; administration: string; confidence: number },
    link: string,
  ): string {
    return `Revisión manual requerida

Usuario: ${p.userName}
Tipo documento: ${p.documentType}
Administración: ${p.administration}
Confianza OCR: ${p.confidence}%

Revisa el documento en: ${link}`
  }

  private verificacionEstadoHtml(p: { userName: string; estado: string; motivoRechazo?: string }): string {
    const esVerificado = p.estado === 'verificado'
    const titulo = esVerificado ? '¡Cuenta verificada!' : 'Actualización de verificación'
    const color = esVerificado ? '#16a34a' : '#dc2626'
    const mensaje = esVerificado
      ? 'Tu cuenta ha sido verificada correctamente. Ya puedes acceder a todas las funciones de Mundointerino.'
      : `Tu verificación no ha sido aprobada.${p.motivoRechazo ? ` Motivo: ${p.motivoRechazo}` : ''}`

    return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:${color}">${titulo}</h2>
  <p>Hola, ${p.userName}:</p>
  <p>${mensaje}</p>
  <p style="margin:30px 0">
    <a href="${this.frontendUrl}/perfil" style="background:${color};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Ver mi perfil</a>
  </p>
  <p style="color:#6b7280;font-size:14px">Si tienes dudas, contacta con nosotros respondiendo a este correo.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">Mundointerino — Plataforma de interinos</p>
</body>
</html>`
  }

  private verificacionEstadoText(p: { userName: string; estado: string; motivoRechazo?: string }): string {
    const esVerificado = p.estado === 'verificado'
    const mensaje = esVerificado
      ? 'Tu cuenta ha sido verificada correctamente. Ya puedes acceder a todas las funciones de Mundointerino.'
      : `Tu verificación no ha sido aprobada.${p.motivoRechazo ? ` Motivo: ${p.motivoRechazo}` : ''}`
    return `${esVerificado ? 'Cuenta verificada' : 'Actualización de verificación'}

Hola, ${p.userName}:

${mensaje}

Visita tu perfil: ${this.frontendUrl}/perfil

Mundointerino — Plataforma de interinos`
  }
}