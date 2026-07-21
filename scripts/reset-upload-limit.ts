import 'dotenv/config'
import { DataSource } from 'typeorm'
import { UsuarioEntity } from '../src/database/entities/usuario.entity'
import { PisoEntity } from '../src/database/entities/piso.entity'

/**
 * Resetea el estado de verificación de un usuario en Postgres.
 *
 * Por defecto limpia:
 *   - ultimaSubidaDocumento  → null  (elimina el cooldown de 24h)
 *   - verificacionEstado     → 'pendiente'
 *   - verificationAttempts   → 0
 *   - verificationLastError  → ''
 *   - verificationNotes      → ''
 *   - verificationConfidence → null
 *   - verificationDate       → null
 *   - verificationType       → null
 *
 * Con --clear-doc también borra el documento subido:
 *   - urlDocumento, tipoDocumento, administracion → null
 *
 * Uso:
 *   npx ts-node scripts/reset-upload-limit.ts <USER_ID> [--clear-doc]
 */
async function main() {
  const userId = process.argv[2]
  const clearDoc = process.argv.includes('--clear-doc')

  if (!userId) {
    console.error('Uso: npx ts-node scripts/reset-upload-limit.ts <USER_ID> [--clear-doc]')
    process.exit(1)
  }

  const pgUrl = process.env.DATABASE_URL
  if (!pgUrl) {
    console.error('Falta DATABASE_URL en el entorno')
    process.exit(1)
  }

  const pg = new DataSource({
    type: 'postgres',
    url: pgUrl,
    entities: [UsuarioEntity, PisoEntity],
    synchronize: false,
  })

  await pg.initialize()
  const repo = pg.getRepository(UsuarioEntity)
  const usuario = await repo.findOneBy({ id: userId })

  if (!usuario) {
    console.error(`Usuario ${userId} no encontrado en Postgres.`)
    await pg.destroy()
    process.exit(1)
  }

  console.log(`Estado actual de ${usuario.email}:`)
  console.log({
    verificacionEstado: usuario.verificacionEstado,
    verificationAttempts: usuario.verificationAttempts,
    ultimaSubidaDocumento: usuario.ultimaSubidaDocumento,
    verificationLastError: usuario.verificationLastError,
    verificationNotes: usuario.verificationNotes,
    verificationConfidence: usuario.verificationConfidence,
    urlDocumento: usuario.urlDocumento ? '(subido)' : '(ninguno)',
  })

  usuario.ultimaSubidaDocumento = null as any
  usuario.verificacionEstado = 'pendiente'
  usuario.verificationAttempts = 0
  usuario.verificationLastError = ''
  usuario.verificationNotes = ''
  usuario.verificationConfidence = null as any
  usuario.verificationDate = null as any
  usuario.verificationType = null as any

  if (clearDoc) {
    usuario.urlDocumento = null as any
    usuario.tipoDocumento = null as any
    usuario.administracion = null as any
  }

  await repo.save(usuario)
  console.log(`\n✅ Verificación reseteada para ${usuario.email} (${userId}).`)
  if (clearDoc) {
    console.log('   También se eliminó la referencia al documento subido.')
  }

  await pg.destroy()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})