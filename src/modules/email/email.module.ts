import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EmailService } from './email.service'
import { EmailProvider, EMAIL_PROVIDER } from './interfaces/email-provider.interface'
import { ResendProvider } from './providers/resend.provider'
import { SmtpProvider } from './providers/smtp.provider'
import emailConfig from '../../config/email.config'

@Module({
  imports: [ConfigModule.forFeature(emailConfig)],
  controllers: [],
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: any): EmailProvider => {
        const provider = config.provider || 'resend'
        if (provider === 'smtp') {
          return new SmtpProvider(config)
        }
        return new ResendProvider(config)
      },
      inject: [emailConfig.KEY],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
