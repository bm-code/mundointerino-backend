import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../../src/modules/auth/auth.service'
import * as bcrypt from 'bcryptjs'

describe('AuthService', () => {
  let service: AuthService
  const mockUsuarioModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  }
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken('Usuario'), useValue: mockUsuarioModel },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('registro', () => {
    it('debe crear usuario y devolver token', async () => {
      mockUsuarioModel.findOne.mockResolvedValue(null)
      mockUsuarioModel.create.mockResolvedValue({
        _id: 'user1',
        nombre: 'Test',
        email: 'test@test.com',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
      })

      const result = await service.registro({
        nombre: 'Test',
        email: 'TEST@TEST.COM',
        password: '123456',
        rol: 'docente',
      })

      expect(result.token).toBe('test-token')
      expect(result.usuario.email).toBe('test@test.com')
      expect(mockUsuarioModel.findOne).toHaveBeenCalledWith({ email: 'test@test.com' })
    })

    it('debe lanzar ConflictException si email existe', async () => {
      mockUsuarioModel.findOne.mockResolvedValue({ email: 'test@test.com' })
      await expect(
        service.registro({
          nombre: 'Test',
          email: 'test@test.com',
          password: '123456',
          rol: 'docente',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('login', () => {
    it('debe devolver token con credenciales válidas', async () => {
      const passwordHash = await bcrypt.hash('123456', 10)
      mockUsuarioModel.findOne.mockResolvedValue({
        _id: 'user1',
        email: 'test@test.com',
        password: passwordHash,
        nombre: 'Test',
        rol: 'docente',
        telefono: '',
        verificacionEstado: 'pendiente',
        administracion: null,
      })

      const result = await service.login({ email: 'test@test.com', password: '123456' })
      expect(result.token).toBe('test-token')
    })

    it('debe lanzar UnauthorizedException con password incorrecto', async () => {
      mockUsuarioModel.findOne.mockResolvedValue({
        email: 'test@test.com',
        password: await bcrypt.hash('wrongpass', 10),
      })

      await expect(
        service.login({ email: 'test@test.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException)
    })
  })
})
