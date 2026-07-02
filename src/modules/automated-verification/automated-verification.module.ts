import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AutomatedVerificationService } from './automated-verification.service'
import { UsuarioSchema } from '../usuarios/schemas/usuario.schema'

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: 'Usuario', schema: UsuarioSchema }]),
  ],
  providers: [AutomatedVerificationService],
  exports: [AutomatedVerificationService],
})
export class AutomatedVerificationModule {}
