import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { RefreshTokenEntity } from './entities/refresh-token.entity'
import { ImpersonationAuditEntity } from './entities/impersonation-audit.entity'
import { CiudadEntity } from './entities/ciudad.entity'
import { UsuarioEntity } from './entities/usuario.entity'
import { PisoEntity } from './entities/piso.entity'
import { AnuncioEntity } from './entities/anuncio.entity'

const entities = [
  RefreshTokenEntity,
  ImpersonationAuditEntity,
  CiudadEntity,
  UsuarioEntity,
  PisoEntity,
  AnuncioEntity,
]

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities,
        synchronize: true,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class PostgresDatabaseModule {}
