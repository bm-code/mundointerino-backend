import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { RefreshTokenEntity } from './entities/refresh-token.entity'
import { ImpersonationAuditEntity } from './entities/impersonation-audit.entity'
import { CiudadEntity } from './entities/ciudad.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [RefreshTokenEntity, ImpersonationAuditEntity, CiudadEntity],
        synchronize: true,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([RefreshTokenEntity, ImpersonationAuditEntity, CiudadEntity]),
  ],
  exports: [TypeOrmModule],
})
export class PostgresDatabaseModule {}
