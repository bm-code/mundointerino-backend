import { registerAs } from '@nestjs/config'

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || '',
  enabled: !!process.env.REDIS_URL,
}))
