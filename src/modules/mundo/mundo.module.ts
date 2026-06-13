import { Module } from '@nestjs/common'
import { MundoController } from './mundo.controller'

@Module({
  controllers: [MundoController],
})
export class MundoModule {}
