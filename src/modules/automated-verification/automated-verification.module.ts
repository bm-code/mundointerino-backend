import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AutomatedVerificationService } from './automated-verification.service'
import { VerificationDispatcher } from './verification.dispatcher'
import { UsuarioEntity } from '../../database/entities/usuario.entity'
import { EmailModule } from '../email/email.module'
import { OcrProvider, OCR_PROVIDER } from './ocr/ocr-provider.interface'
import { createOcrProvider } from './ocr/ocr-provider.factory'
import verificationConfig from '../../config/verification.config'

@Module({
  imports: [
    ConfigModule.forFeature(verificationConfig),
    TypeOrmModule.forFeature([UsuarioEntity]),
    EmailModule,
  ],
  providers: [
    AutomatedVerificationService,
    VerificationDispatcher,
    {
      provide: OCR_PROVIDER,
      useFactory: (configService: ConfigService): OcrProvider => {
        return createOcrProvider({
          provider: configService.get<string>('OCR_PROVIDER') || 'tesseract',
          fallbackProvider: configService.get<string>('OCR_FALLBACK_PROVIDER') || 'tesseract',
          googleCredentials: configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS') || '',
          timeoutMs: Number(configService.get<number>('VERIFICATION_TIMEOUT_MS')) || 60000,
        })
      },
      inject: [ConfigService],
    },
  ],
  exports: [AutomatedVerificationService, VerificationDispatcher],
})
export class AutomatedVerificationModule {}
