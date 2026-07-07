import { Response } from 'express'

export interface CookieConfig {
  domain: string
  secure: boolean
  sameSite: 'lax' | 'none' | 'strict'
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: CookieConfig,
): void {
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/',
    maxAge: 60 * 60 * 1000,
    domain: config.domain || undefined,
  })

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: config.domain || undefined,
  })
}

export function clearAuthCookies(res: Response, config: CookieConfig): void {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/',
    domain: config.domain || undefined,
  })

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/auth/refresh',
    domain: config.domain || undefined,
  })
}

export function getCookieConfig(env: {
  cookieDomain?: string
  cookieSecure?: string
  cookieSameSite?: string
}): CookieConfig {
  return {
    domain: env.cookieDomain || '',
    secure: env.cookieSecure === 'true',
    sameSite: (env.cookieSameSite as 'lax' | 'none' | 'strict') || 'lax',
  }
}
