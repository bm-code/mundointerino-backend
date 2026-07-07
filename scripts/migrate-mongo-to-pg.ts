import 'dotenv/config'
import mongoose from 'mongoose'
import { DataSource } from 'typeorm'
import { UsuarioEntity } from '../src/database/entities/usuario.entity'
import { PisoEntity } from '../src/database/entities/piso.entity'
import { AnuncioEntity } from '../src/database/entities/anuncio.entity'

async function migrate() {
  const mongoUri = process.env.MONGO_URI
  const pgUrl = process.env.DATABASE_URL

  if (!mongoUri || !pgUrl) {
    console.error('Faltan MONGO_URI o DATABASE_URL')
    process.exit(1)
  }

  const pg = new DataSource({
    type: 'postgres',
    url: pgUrl,
    entities: [UsuarioEntity, PisoEntity, AnuncioEntity],
    synchronize: false,
  })

  await pg.initialize()
  await mongoose.connect(mongoUri)

  const pgUsuarioRepo = pg.getRepository(UsuarioEntity)
  const pgPisoRepo = pg.getRepository(PisoEntity)
  const pgAnuncioRepo = pg.getRepository(AnuncioEntity)

  const db = mongoose.connection.db
  if (!db) {
    console.error('No se pudo conectar a MongoDB')
    process.exit(1)
  }

  // Migrate usuarios
  console.log('=== Migrando usuarios ===')
  const usuarios = await db.collection('usuarios').find({}).toArray()
  let uInserted = 0
  for (const u of usuarios) {
    const id = u._id.toString()
    const exists = await pgUsuarioRepo.findOneBy({ id })
    if (exists) continue
    await pgUsuarioRepo.save({
      id,
      nombre: u.nombre || '',
      email: u.email || '',
      password: u.password || '',
      rol: u.rol || 'docente',
      telefono: u.telefono || '',
      verificacionEstado: u.verificacionEstado || 'pendiente',
      motivoRechazo: u.motivoRechazo || '',
      tipoDocumento: u.tipoDocumento || null,
      administracion: u.administracion || null,
      urlDocumento: u.urlDocumento || null,
      verificationConfidence: u.verificationConfidence ?? null,
      verificationNotes: u.verificationNotes || '',
      verificationDate: u.verificationDate || null,
      verificationType: u.verificationType || null,
      ultimaSubidaDocumento: u.ultimaSubidaDocumento || null,
      emailVerificado: u.emailVerificado || false,
      emailVerificacionEstado: u.emailVerificacionEstado || 'pendiente',
      emailVerificacionTokenHash: u.emailVerificacionTokenHash || null,
      emailVerificacionExpira: u.emailVerificacionExpira || null,
      emailVerificacionIntentos: u.emailVerificacionIntentos || 0,
      ultimoReenvioVerificacion: u.ultimoReenvioVerificacion || null,
      emailVerificadoEn: u.emailVerificadoEn || null,
      verificationAttempts: u.verificationAttempts ?? null,
      verificationLastError: u.verificationLastError || '',
      verificationProvider: u.verificationProvider || null,
      verificationJobId: u.verificationJobId || null,
    } as any)
    uInserted++
  }
  console.log(`Usuarios migrados: ${uInserted}`)

  // Migrate pisos
  console.log('=== Migrando pisos ===')
  const pisos = await db.collection('pisos').find({}).toArray()
  let pInserted = 0
  for (const p of pisos) {
    const id = p._id.toString()
    const exists = await pgPisoRepo.findOneBy({ id })
    if (exists) continue
    await pgPisoRepo.save({
      id,
      titulo: p.titulo || '',
      descripcion: p.descripcion || '',
      ciudad: p.ciudad || '',
      ciudadSlug: p.ciudadSlug || null,
      barrio: p.barrio || '',
      contacto: p.contacto || '',
      precio: p.precio || 0,
      precioDia: p.precioDia ?? null,
      fianza: p.fianza || 0,
      habitaciones: p.habitaciones || 1,
      banos: p.banos ?? null,
      metros: p.metros ?? null,
      planta: p.planta || '',
      tipoEstancia: p.tipoEstancia || 'larga',
      disponible: p.disponible || null,
      servicios: p.servicios || [],
      fotos: p.fotos || [],
      activo: p.activo !== false,
      comunidad: p.comunidad || '',
      provincia: p.provincia || '',
      propietarioId: p.propietario?.toString() || '',
    } as any)
    pInserted++
  }
  console.log(`Pisos migrados: ${pInserted}`)

  // Migrate anuncios
  console.log('=== Migrando anuncios ===')
  const anuncios = await db.collection('anuncios').find({}).toArray()
  let aInserted = 0
  for (const a of anuncios) {
    const id = a._id.toString()
    const exists = await pgAnuncioRepo.findOneBy({ id })
    if (exists) continue
    await pgAnuncioRepo.save({
      id,
      titulo: a.titulo || '',
      descripcion: a.descripcion || '',
      administracion: a.administracion || 'otros',
      tipo: a.tipo || 'anuncio',
      url: a.url || null,
      activo: a.activo !== false,
      destacado: a.destacado || false,
      fechaExpiracion: a.fechaExpiracion || null,
    } as any)
    aInserted++
  }
  console.log(`Anuncios migrados: ${aInserted}`)

  await pg.destroy()
  await mongoose.disconnect()

  console.log('Migración completada')
}

migrate().catch((err) => {
  console.error('Error en migración:', err)
  process.exit(1)
})
