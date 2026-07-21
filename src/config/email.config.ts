import { registerAs } from '@nestjs/config'

export default registerAs('email', () => ({
  provider: process.env.EMAIL_PROVIDER || 'resend',
  from: process.env.EMAIL_FROM || 'Mundointerino <no-reply@mundointerino.com>',
  resendApiKey: process.env.RESEND_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  manualReviewTo: process.env.MANUAL_REVIEW_TO || '',
}))
