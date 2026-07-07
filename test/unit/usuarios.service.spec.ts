import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { NotFoundException } from '@nestjs/common'
import { UsuariosService } from '../../src/modules/usuarios/usuarios.service'
import { AutomatedVerificationService } from '../../src/modules/automated-verification/automated-verification.service'
import { VerificationDispatcher } from '../../src/modules/automated-verification/verification.dispatcher'
import * as bcrypt from 'bcryptjs'

describe('UsuariosService', () => {
  let service: UsuariosService
  const mockUsuarioModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
  }
  const mockAutomatedVerificationService = {
    verifyDocument: jest.fn(),
    applyVerificationResult: jest.fn(),
  }
  const mockVerificationDispatcher = {
    enqueue: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getModelToken('Usuario'), useValue: mockUsuarioModel },
        {
          provide: AutomatedVerificationService,
          useValue: mockAutomatedVerificationService,
        },
        {
          provide: VerificationDispatcher,
          useValue: mockVerificationDispatcher,
        },
      ],
    }).compile()

    service = module.get<UsuariosService>(UsuariosService)
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('debe devolver usuario sin password', async () => {
      const mockUser = { _id: 'user1', nombre: 'Test', password: 'hash' }
      mockUsuarioModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      })

      const result = await service.getProfile('user1')
      expect(result).toEqual(mockUser)
    })

    it('debe lanzar NotFoundException si no existe', async () => {
      mockUsuarioModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      })

      await expect(service.getProfile('noexists')).rejects.toThrow(NotFoundException)
    })
  })

  describe('changePassword', () => {
    it('debe actualizar password si actual es correcta', async () => {
      const passwordHash = await bcrypt.hash('oldpass', 10)
      const mockUser = {
        _id: 'user1',
        password: passwordHash,
        save: jest.fn(),
      }
      mockUsuarioModel.findById.mockResolvedValue(mockUser)

      const result = await service.changePassword('user1', {
        passwordActual: 'oldpass',
        passwordNueva: 'newpass',
      })

      expect(result.mensaje).toBe('Contraseña actualizada correctamente')
      expect(mockUser.save).toHaveBeenCalled()
    })
  })
})
