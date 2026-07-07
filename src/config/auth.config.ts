import { registerAs } from '@nestjs/config'

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '1h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') || 'lax',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  emailVerificationTtlHours: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS) || 24,
  emailReenvioCooldownSeg: Number(process.env.EMAIL_REENVIO_COOLDOWN_SEG) || 60,
  emailReenvioMaxIntentos: Number(process.env.EMAIL_REENVIO_MAX_INTENTOS) || 5,
}))
