import 'dotenv/config'
import { DataSource } from 'typeorm'
import { CiudadEntity } from '../src/database/entities/ciudad.entity'
import * as fs from 'fs'
import * as path from 'path'
import * as iconv from 'iconv-lite'

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

interface Comunidad {
  id: number
  nombre: string
  slug: string
  codigoINE: string
}

interface Provincia {
  id: number
  comunidadId: number
  nombre: string
  slug: string
  codigoINE: string
}

interface Municipio {
  id: number
  provinciaId: number
  codMunicipio: number
  nombre: string
}

function parseCCAA(content: string): Comunidad[] {
  const comunidades: Comunidad[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^\s*\((\d+),\s*'([^']+)'\)/)
    if (match) {
      const id = Number(match[1])
      const nombre = match[2]
      const codigoINE = String(id).padStart(2, '0')
      comunidades.push({ id, nombre, slug: slugify(nombre), codigoINE })
    }
  }
  return comunidades
}

function parseProvincias(content: string): Provincia[] {
  const provincias: Provincia[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^\s*\((\d+),\s*(\d+),\s*'([^']+)'\)/)
    if (match) {
      const id = Number(match[1])
      const comunidadId = Number(match[2])
      const nombre = match[3]
      const codigoINE = String(id).padStart(2, '0')
      provincias.push({ id, comunidadId, nombre, slug: slugify(nombre), codigoINE })
    }
  }
  return provincias
}

function parseMunicipios(content: string): Municipio[] {
  const municipios: Municipio[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^\s*\((\d+),\s*(\d+),\s*\d+,\s*'([^']+)'\)/)
    if (match) {
      const provinciaId = Number(match[1])
      const codMunicipio = Number(match[2])
      const nombre = match[3]
      municipios.push({ id: municipios.length + 1, provinciaId, codMunicipio, nombre })
    }
  }
  return municipios
}

async function loadGeoNamesCoords(): Promise<Map<string, { lat: number; lng: number }>> {
  const coordsMap = new Map<string, { lat: number; lng: number }>()
  const geoNamesPath = path.join(__dirname, 'ES.txt')

  if (!fs.existsSync(geoNamesPath)) {
    console.log('ES.txt de GeoNames no encontrado, coords serán null')
    return coordsMap
  }

  const content = fs.readFileSync(geoNamesPath, 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 8) continue

    const name = parts[1]
    const lat = parseFloat(parts[4])
    const lng = parseFloat(parts[5])
    const featureClass = parts[6]
    const featureCode = parts[7]

    if (featureClass === 'P' && ['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLC', 'PPLG'].includes(featureCode)) {
      const slug = slugify(name)
      if (!coordsMap.has(slug)) {
        coordsMap.set(slug, { lat, lng })
      }
    }
  }

  console.log(`GeoNames: ${coordsMap.size} coordenadas cargadas`)
  return coordsMap
}

async function seedCiudades() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL no configurada')
    process.exit(1)
  }

  const scriptsDir = __dirname
  const ccaaPath = path.join(scriptsDir, 'lista_CCAA.sql')
  const provinciasPath = path.join(scriptsDir, 'lista_provincias.sql')
  const municipiosPath = path.join(scriptsDir, 'lista_municipios.sql')

  if (!fs.existsSync(ccaaPath) || !fs.existsSync(provinciasPath) || !fs.existsSync(municipiosPath)) {
    console.log('Archivos SQL del INE no encontrados, descargando...')
    const baseUrl = 'https://raw.githubusercontent.com/oscarnovasf/ccaa-provincias-municipios/master/sql'
    const files = [
      { url: `${baseUrl}/lista_CCAA.sql`, dest: ccaaPath },
      { url: `${baseUrl}/lista_provincias.sql`, dest: provinciasPath },
      { url: `${baseUrl}/lista_municipios.sql`, dest: municipiosPath },
    ]
    for (const f of files) {
      if (!fs.existsSync(f.dest)) {
        const res = await fetch(f.url)
        if (!res.ok) throw new Error(`Error descargando ${f.url}: ${res.status}`)
        fs.writeFileSync(f.dest, await res.text())
        console.log(`  ✓ ${path.basename(f.dest)}`)
      }
    }
  }

  console.log('=== Cargando datos del INE ===')

  const ccaaContent = fs.readFileSync(ccaaPath, 'utf-8')
  const provinciasContent = fs.readFileSync(provinciasPath, 'utf-8')
  const municipiosContent = fs.readFileSync(municipiosPath, 'utf-8')

  const comunidades = parseCCAA(ccaaContent)
  const provincias = parseProvincias(provinciasContent)
  const municipios = parseMunicipios(municipiosContent)

  console.log(`CCAA: ${comunidades.length}, Provincias: ${provincias.length}, Municipios: ${municipios.length}`)

  console.log('=== Cargando coordenadas de GeoNames ===')
  const coordsMap = await loadGeoNamesCoords()

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [CiudadEntity],
    synchronize: true,
  })

  await dataSource.initialize()
  const repo = dataSource.getRepository(CiudadEntity)

  const count = await repo.count()
  if (count > 1000) {
    console.log(`Ya hay ${count} municipios en la BD, saltando seed`)
    await dataSource.destroy()
    return
  }

  console.log('=== Insertando municipios en Postgres ===')

  const provinciasById = new Map(provincias.map((p) => [p.id, p]))
  const comunidadesById = new Map(comunidades.map((c) => [c.id, c]))

  let inserted = 0
  let updated = 0
  let withCoords = 0
  const slugsVistos = new Set<string>()

  for (const municipio of municipios) {
    const provincia = provinciasById.get(municipio.provinciaId)
    if (!provincia) {
      console.warn(`Provincia no encontrada para municipio ${municipio.nombre} (provinciaId=${municipio.provinciaId})`)
      continue
    }

    const comunidad = comunidadesById.get(provincia.comunidadId)
    if (!comunidad) {
      console.warn(`Comunidad no encontrada para provincia ${provincia.nombre} (comunidadId=${provincia.comunidadId})`)
      continue
    }

    const codigoINE = `${provincia.codigoINE}${String(municipio.codMunicipio).padStart(3, '0')}`

    let slug = slugify(municipio.nombre)
    if (slugsVistos.has(slug)) {
      slug = `${slug}-${provincia.slug}`
    }
    slugsVistos.add(slug)

    const coords = coordsMap.get(slug) || coordsMap.get(slugify(municipio.nombre))
    if (coords) withCoords++

    const record: Partial<CiudadEntity> = {
      nombre: municipio.nombre.trim(),
      slug,
      provinciaNombre: provincia.nombre,
      provinciaSlug: provincia.slug,
      provinciaCodigoINE: provincia.codigoINE,
      comunidadNombre: comunidad.nombre,
      comunidadSlug: comunidad.slug,
      comunidadCodigoINE: comunidad.codigoINE,
      codigoINE,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    }

    const existing = await repo.findOne({ where: { codigoINE } })
    if (existing) {
      await repo.update({ id: existing.id }, record)
      updated++
    } else {
      await repo.save(record)
      inserted++
    }
  }

  console.log(`\n=== Resultado ===`)
  console.log(`Insertados: ${inserted}`)
  console.log(`Actualizados: ${updated}`)
  console.log(`Con coordenadas: ${withCoords}/${municipios.length}`)
  console.log(`Sin coordenadas: ${municipios.length - withCoords} (lat/lng = null)`)

  await dataSource.destroy()
  console.log('Seed completado')
}

seedCiudades().catch((err) => {
  console.error('Error en seed:', err)
  process.exit(1)
})
