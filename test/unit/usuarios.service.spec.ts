import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { UsuariosService } from '../../src/modules/usuarios/usuarios.service'
import { UsuarioEntity } from '../../src/database/entities/usuario.entity'
import { AutomatedVerificationService } from '../../src/modules/automated-verification/automated-verification.service'
import { VerificationDispatcher } from '../../src/modules/automated-verification/verification.dispatcher'
import { UploadService } from '../../src/modules/cloudinary/cloudinary.service'
import * as bcrypt from 'bcryptjs'

describe('UsuariosService', () => {
  let service: UsuariosService
  const mockUsuarioRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  }
  const mockAutomatedVerificationService = {
    verifyDocument: jest.fn(),
    applyVerificationResult: jest.fn(),
  }
  const mockVerificationDispatcher = {
    enqueue: jest.fn(),
  }
  const mockUploadService = {
    uploadImages: jest.fn(),
    uploadDocument: jest.fn(),
    deleteImages: jest.fn(),
    deleteByUrl: jest.fn().mockResolvedValue(true),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(UsuarioEntity), useValue: mockUsuarioRepo },
        {
          provide: AutomatedVerificationService,
          useValue: mockAutomatedVerificationService,
        },
        {
          provide: VerificationDispatcher,
          useValue: mockVerificationDispatcher,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile()

    service = module.get<UsuariosService>(UsuariosService)
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('debe devolver usuario sin password', async () => {
      const mockUser = { id: 'user1', nombre: 'Test', password: 'hash' }
      mockUsuarioRepo.findOneBy.mockResolvedValue(mockUser)

      const result = await service.getProfile('user1')
      expect(result).toEqual({ id: 'user1', nombre: 'Test' })
    })

    it('debe lanzar NotFoundException si no existe', async () => {
      mockUsuarioRepo.findOneBy.mockResolvedValue(null)

      await expect(service.getProfile('noexists')).rejects.toThrow(NotFoundException)
    })
  })

  describe('changePassword', () => {
    it('debe actualizar password si actual es correcta', async () => {
      const passwordHash = await bcrypt.hash('oldpass', 10)
      const mockUser = {
        id: 'user1',
        password: passwordHash,
      }
      mockUsuarioRepo.findOneBy.mockResolvedValue(mockUser)
      mockUsuarioRepo.save.mockResolvedValue({})

      const result = await service.changePassword('user1', {
        passwordActual: 'oldpass',
        passwordNueva: 'newpass',
      })

      expect(result.mensaje).toBe('Contraseña actualizada correctamente')
      expect(mockUsuarioRepo.save).toHaveBeenCalled()
    })
  })
})
