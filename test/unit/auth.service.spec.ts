import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { AuthService } from '../../src/modules/auth/auth.service'
import { EmailService } from '../../src/modules/email/email.service'
import { RefreshTokenEntity } from '../../src/database/entities/refresh-token.entity'
import * as bcrypt from 'bcryptjs'
import { Response } from 'express'

describe('AuthService', () => {
  let service: AuthService
  const mockUsuarioModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  }
  const mockRefreshTokenRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  }
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
    verifyAsync: jest.fn(),
  }
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES: '1h',
        JWT_REFRESH_EXPIRES: '7d',
        COOKIE_DOMAIN: '',
        COOKIE_SECURE: 'false',
        COOKIE_SAMESITE: 'lax',
        FRONTEND_URL: 'http://localhost:5173',
        EMAIL_VERIFICATION_TTL_HOURS: '24',
        EMAIL_REENVIO_COOLDOWN_SEG: '60',
        EMAIL_REENVIO_MAX_INTENTOS: '5',
      }
      return config[key]
    }),
  }
  const mockEmailService = {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendManualReviewNotification: jest.fn().mockResolvedValue(undefined),
  }
  const mockRes = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken('Usuario'), useValue: mockUsuarioModel },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('registro', () => {
    it('debe crear usuario y devolver { mensaje: email-enviado }', async () => {
      mockUsuarioModel.findOne.mockResolvedValue(null)
      mockUsuarioModel.create.mockResolvedValue({
        _id: 'user1',
        nombre: 'Test',
        email: 'test@test.com',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
        emailVerificado: false,
      })
      mockUsuarioModel.updateOne.mockResolvedValue({})

      const result = await service.registro({
        nombre: 'Test',
        email: 'TEST@TEST.COM',
        password: 'Test1234!',
        rol: 'docente',
      })

      expect(result.mensaje).toBe('email-enviado')
      expect(mockUsuarioModel.findOne).toHaveBeenCalledWith({ email: 'test@test.com' })
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled()
    })

    it('debe lanzar ConflictException si email existe', async () => {
      mockUsuarioModel.findOne.mockResolvedValue({ email: 'test@test.com' })
      await expect(
        service.registro({
          nombre: 'Test',
          email: 'test@test.com',
          password: 'Test1234!',
          rol: 'docente',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('login', () => {
    it('debe devolver { usuario } y setear cookies con credenciales válidas', async () => {
      const passwordHash = await bcrypt.hash('Test1234!', 10)
      mockUsuarioModel.findOne.mockResolvedValue({
        _id: 'user1',
        email: 'test@test.com',
        password: passwordHash,
        nombre: 'Test',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
        emailVerificado: false,
      })
      mockRefreshTokenRepo.save.mockResolvedValue({})

      const result = await service.login({ email: 'test@test.com', password: 'Test1234!' }, mockRes)

      expect(result.usuario.email).toBe('test@test.com')
      expect(result.usuario.rol).toBe('docente')
      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.objectContaining({
        httpOnly: true,
        path: '/',
      }))
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.objectContaining({
        httpOnly: true,
        path: '/auth/refresh',
      }))
    })

    it('debe lanzar UnauthorizedException con password incorrecto', async () => {
      mockUsuarioModel.findOne.mockResolvedValue({
        email: 'test@test.com',
        password: await bcrypt.hash('wrongpass', 10),
      })

      await expect(
        service.login({ email: 'test@test.com', password: 'Test1234!' }, mockRes),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('verificarEmail', () => {
    it('debe marcar emailVerificado=true y setear cookies con token válido', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user1', tipo: 'email-verify' })
      mockUsuarioModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'user1',
            nombre: 'Test',
            email: 'test@test.com',
            rol: 'docente',
            telefono: '',
            verificacionEstado: 'pendiente',
            administracion: null,
            emailVerificado: false,
          }),
        }),
      })
      mockUsuarioModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'user1',
            nombre: 'Test',
            email: 'test@test.com',
            rol: 'docente',
            telefono: '',
            verificacionEstado: 'pendiente',
            administracion: null,
            emailVerificado: true,
          }),
        }),
      })
      mockRefreshTokenRepo.save.mockResolvedValue({})

      const result = await service.verificarEmail('valid-token', mockRes)

      expect(result.usuario.emailVerificado).toBe(true)
      expect(mockRes.cookie).toHaveBeenCalled()
    })

    it('debe lanzar BadRequestException con token inválido', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid token'))

      await expect(
        service.verificarEmail('invalid-token', mockRes),
      ).rejects.toThrow(BadRequestException)
    })
  })
})
