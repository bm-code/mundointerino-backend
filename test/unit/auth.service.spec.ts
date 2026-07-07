import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { AuthService } from '../../src/modules/auth/auth.service'
import { EmailService } from '../../src/modules/email/email.service'
import { UsuarioEntity } from '../../src/database/entities/usuario.entity'
import { RefreshTokenEntity } from '../../src/database/entities/refresh-token.entity'
import * as bcrypt from 'bcryptjs'
import { Response } from 'express'

describe('AuthService', () => {
  let service: AuthService
  const mockUsuarioRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
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
        { provide: getRepositoryToken(UsuarioEntity), useValue: mockUsuarioRepo },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('registro', () => {
    it('debe crear usuario y devolver { mensaje: email-enviado }', async () => {
      mockUsuarioRepo.findOneBy.mockResolvedValue(null)
      mockUsuarioRepo.create.mockReturnValue({
        id: 'user1',
        nombre: 'Test',
        email: 'test@test.com',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
        emailVerificado: false,
      })
      mockUsuarioRepo.save.mockResolvedValue({})

      const result = await service.registro({
        nombre: 'Test',
        email: 'TEST@TEST.COM',
        password: 'Test1234!',
        rol: 'docente',
      })

      expect(result.mensaje).toBe('email-enviado')
      expect(mockUsuarioRepo.findOneBy).toHaveBeenCalledWith({ email: 'test@test.com' })
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled()
    })

    it('debe lanzar ConflictException si email existe', async () => {
      mockUsuarioRepo.findOneBy.mockResolvedValue({ email: 'test@test.com' })
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
      mockUsuarioRepo.findOneBy.mockResolvedValue({
        id: 'user1',
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
      mockUsuarioRepo.findOneBy.mockResolvedValue({
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
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 'user1',
        nombre: 'Test',
        email: 'test@test.com',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
        emailVerificado: false,
      })
      mockUsuarioRepo.update.mockResolvedValue({})
      mockUsuarioRepo.findOneBy.mockResolvedValue({
        id: 'user1',
        nombre: 'Test',
        email: 'test@test.com',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
        emailVerificado: true,
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
