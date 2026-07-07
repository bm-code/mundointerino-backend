import 'dotenv/config'
import mongoose from 'mongoose'
import { DataSource } from 'typeorm'
import { CiudadEntity } from '../src/database/entities/ciudad.entity'
import { PisoSchema } from '../src/modules/pisos/schemas/piso.schema'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function backfillPisos() {
  const mongoUri = process.env.MONGO_URI
  const databaseUrl = process.env.DATABASE_URL
  if (!mongoUri || !databaseUrl) {
    console.error('MONGO_URI y DATABASE_URL deben estar configuradas')
    process.exit(1)
  }

  const pgSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [CiudadEntity],
    synchronize: false,
  })
  await pgSource.initialize()
  const ciudadRepo = pgSource.getRepository(CiudadEntity)

  await mongoose.connect(mongoUri)
  const Piso = mongoose.model('Piso', PisoSchema)

  const totalCiudades = await ciudadRepo.count()
  if (totalCiudades === 0) {
    console.error('No hay ciudades en el catálogo. Ejecuta seed-ciudades.ts primero.')
    process.exit(1)
  }

  console.log(`Catálogo: ${totalCiudades} ciudades. Iniciando backfill de pisos...`)

  const pisos = await Piso.find({}).lean()
  console.log(`Total pisos a procesar: ${pisos.length}`)

  let mapeados = 0
  let noMapeados = 0
  const noMapeadosList: { id: string; ciudad: string }[] = []

  for (const piso of pisos) {
    const ciudadSlug = slugify(piso.ciudad)

    let ciudad = await ciudadRepo.findOne({ where: { slug: ciudadSlug } })

    if (!ciudad) {
      ciudad = await ciudadRepo
        .createQueryBuilder('c')
        .where('c.nombre ILIKE :nombre', { nombre: `%${piso.ciudad}%` })
        .getOne()
    }

    if (ciudad) {
      await Piso.updateOne(
        { _id: piso._id },
        {
          $set: {
            ciudadSlug: ciudad.slug,
            comunidad: ciudad.comunidadNombre,
            provincia: ciudad.provinciaNombre,
          },
        },
      )
      mapeados++
    } else {
      noMapeados++
      noMapeadosList.push({ id: piso._id.toString(), ciudad: piso.ciudad })
    }
  }

  console.log('\n--- Resultado del backfill ---')
  console.log(`Mapeados: ${mapeados}`)
  console.log(`No mapeados: ${noMapeados}`)

  if (noMapeadosList.length > 0) {
    console.log('\nCiudades no mapeadas (requieren mapeo manual):')
    const uniqueCiudades = [...new Set(noMapeadosList.map((n) => n.ciudad))]
    uniqueCiudades.forEach((c) => console.log(`  - ${c}`))
  }

  await mongoose.disconnect()
  await pgSource.destroy()
}

backfillPisos().catch((err) => {
  console.error('Error en backfill:', err)
  process.exit(1)
})
