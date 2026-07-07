import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, ILike } from 'typeorm'
import { CiudadEntity } from '../../database/entities/ciudad.entity'

@Injectable()
export class CiudadesService {
  constructor(
    @InjectRepository(CiudadEntity) private ciudadRepo: Repository<CiudadEntity>,
  ) {}

  async listarComunidades() {
    const rows = await this.ciudadRepo
      .createQueryBuilder('c')
      .select(['c.comunidadCodigoINE AS "codigoINE"', 'c.comunidadNombre AS "nombre"', 'c.comunidadSlug AS "slug"'])
      .distinct()
      .orderBy('c.comunidadNombre', 'ASC')
      .getRawMany()
    return rows
  }

  async listarProvincias(comunidadSlug?: string) {
    const qb = this.ciudadRepo
      .createQueryBuilder('c')
      .select([
        'c.provinciaCodigoINE AS "codigoINE"',
        'c.provinciaNombre AS "nombre"',
        'c.provinciaSlug AS "slug"',
        'c.comunidadSlug AS "comunidad"',
      ])
      .distinct()

    if (comunidadSlug) {
      qb.where('c.comunidadSlug = :slug', { slug: comunidadSlug })
    }

    return qb.orderBy('c.provinciaNombre', 'ASC').getRawMany()
  }

  async buscar(q?: string, comunidad?: string, provincia?: string, limit = 20) {
    const qb = this.ciudadRepo
      .createQueryBuilder('c')
      .select([
        'c.nombre AS "nombre"',
        'c.slug AS "slug"',
        'c.provinciaNombre AS "provinciaNombre"',
        'c.provinciaSlug AS "provinciaSlug"',
        'c.comunidadNombre AS "comunidadNombre"',
        'c.comunidadSlug AS "comunidadSlug"',
        'c.lat AS "lat"',
        'c.lng AS "lng"',
      ])
      .limit(limit)

    if (comunidad) qb.andWhere('c.comunidadSlug = :comunidad', { comunidad })
    if (provincia) qb.andWhere('c.provinciaSlug = :provincia', { provincia })

    if (q && q.trim().length > 0) {
      const trimmed = q.trim()
      if (trimmed.length >= 3) {
        qb.andWhere('c.nombre ILIKE :q', { q: `%${trimmed}%` })
        qb.orderBy(`CASE WHEN c.nombre ILIKE :exact THEN 0 ELSE 1 END`, 'ASC')
          .setParameter('exact', `${trimmed}%`)
      } else {
        qb.andWhere('c.nombre ILIKE :q', { q: `%${trimmed}%` })
      }
    } else {
      qb.orderBy('c.nombre', 'ASC')
    }

    return qb.getRawMany()
  }

  async porSlug(slug: string) {
    return this.ciudadRepo.findOne({ where: { slug } })
  }

  async existeCiudad(slug: string): Promise<boolean> {
    const count = await this.ciudadRepo.count({ where: { slug } })
    return count > 0
  }
}
