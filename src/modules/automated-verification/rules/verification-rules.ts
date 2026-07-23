export interface DocumentRule {
  keywords: string[]
  interinoKeywords: string[]
  adminKeywords: Record<string, string[]>
}

export interface VerificationResult {
  confidence: number
  status: 'verificado' | 'pendiente' | 'rechazado'
  details: {
    nameFound: boolean
    nameSimilarity: number
    documentTypeMatch: boolean
    documentTypeScore: number
    interinoFound: boolean
    interinoScore: number
    adminMatch: boolean
    adminScore: number
  }
  notes: string
}

export interface VerificationDetails {
  nombre: string
  tipoDocumento: string
  administracion: string
  urlDocumento: string
}

export const DOCUMENT_RULES: Record<string, DocumentRule> = {
  nomina: {
    keywords: [
      'nomina',
      'nómina',
      'recibo',
      'salarios',
      'haberes',
      'devengado',
      'deducciones',
      'bruto',
      'neto',
      'seguridad social',
      'irpf',
      'percepciones',
      'devengo',
      'liquidacion',
      'liquidación',
      'complemento de productividad',
      'trienios',
      'quinquenios',
      'pagas extraordinarias',
      'cotizacion',
      'cotización',
      'base de cotizacion',
      'retencion',
      'retención',
      'total a percibir',
      'bruto anual',
      'salario base',
      'plus de transporte',
      'complemento general',
      'dietas',
      'gastos de viaje',
      'antigüedad',
    ],
    interinoKeywords: [
      'interino',
      'interinidad',
      'interina',
      'interinas',
      'personal interino',
      'funcionario interino',
    ],
    adminKeywords: {
      educacion: [
        'educacion',
        'educación',
        'consejeria de educacion',
        'ministerio de educacion',
        'direccion general de personal',
        'centro docente',
        'profesorado',
        'docente',
        'generalitat',
        'xunta',
        'gobierno de aragon',
        'gobierno de canarias',
        'comunidad autonoma',
        'consejeria',
      ],
      sanidad: [
        'sanidad',
        'salud',
        'servicio andaluz de salud',
        'sas',
        'insalud',
        'ses',
        'servicio madrileño de salud',
        'sermas',
        'iscalud',
        'facultativo',
        'personal sanitario',
        'hospital',
        'osakidetza',
        'servicio gallego de salud',
        'servicio canario de salud',
      ],
      justicia: [
        'justicia',
        'ministerio de justicia',
        'administracion de justicia',
        'juzgado',
        'tribunal',
        'juez',
        'letrado',
        'secretario judicial',
      ],
      otros: ['administracion', 'organismo', 'entidad publica'],
    },
  },
  nombramiento: {
    keywords: [
      'nombramiento',
      'resuelto',
      'resolucion',
      'resolución',
      'designado',
      'adjudicacion',
      'puesto',
      'vacante',
      'comision de servicio',
      'comisión de servicio',
    ],
    interinoKeywords: [
      'interino',
      'interinidad',
      'interina',
      'nombramiento interino',
      'cargo interino',
    ],
    adminKeywords: {
      educacion: [
        'educacion',
        'educación',
        'consejeria de educacion',
        'centro docente',
        'profesorado',
        'docente',
        'centro educativo',
      ],
      sanidad: [
        'sanidad',
        'salud',
        'sas',
        'hospital',
        'centro sanitario',
        'area de gestion sanitaria',
      ],
      justicia: [
        'justicia',
        'juzgado',
        'tribunal',
        'juzgados',
        'administracion de justicia',
      ],
      otros: ['administracion', 'organismo publico'],
    },
  },
  credencial: {
    keywords: [
      'credencial',
      'acreditacion',
      'acreditación',
      'identificacion',
      'funcionario',
      'cuerpo',
      'escala',
      'categoria',
    ],
    interinoKeywords: ['interino', 'interinidad', 'interina', 'personal interino'],
    adminKeywords: {
      educacion: ['educacion', 'docente', 'profesorado', 'enseñanza', 'centro educativo'],
      sanidad: [
        'sanidad',
        'salud',
        'facultativo',
        'medico',
        'enfermeria',
        'personal sanitario',
      ],
      justicia: ['justicia', 'juez', 'magistrado', 'letrado', 'secretario judicial'],
      otros: ['administracion publica', 'funcionario'],
    },
  },
  contrato: {
    keywords: [
      'contrato',
      'trabajo',
      'empleo',
      'laboral',
      'jornada',
      'empleador',
      'trabajador',
      'clausula',
      'cláusula',
      'vigencia',
      'retribucion',
      'categoria profesional',
    ],
    interinoKeywords: [
      'interino',
      'interinidad',
      'interina',
      'contrato interino',
      'interinidad laboral',
    ],
    adminKeywords: {
      educacion: [
        'educacion',
        'docente',
        'profesor',
        'enseñanza',
        'centro escolar',
      ],
      sanidad: ['sanidad', 'salud', 'hospital', 'centro sanitario', 'facultativo'],
      justicia: ['justicia', 'administracion de justicia', 'juzgado'],
      otros: ['administracion publica', 'ente publico'],
    },
  },
  certificado_servicios: {
    keywords: [
      'certificado',
      'servicios prestados',
      'certifica',
      'duracion',
      'duración',
      'periodo',
      'centro',
      'destino',
      'puesto de trabajo',
      'servicio prestado',
    ],
    interinoKeywords: [
      'interino',
      'interinidad',
      'interina',
      'servicios como interino',
      'personal interino',
    ],
    adminKeywords: {
      educacion: [
        'educacion',
        'docente',
        'profesorado',
        'centro educativo',
        'enseñanza',
      ],
      sanidad: ['sanidad', 'salud', 'hospital', 'centro sanitario', 'facultativo'],
      justicia: [
        'justicia',
        'juzgado',
        'tribunal',
        'administracion de justicia',
      ],
      otros: ['administracion publica'],
    },
  },
  resolucion: {
    keywords: [
      'resuelto',
      'resolucion',
      'resolución',
      'lista de interinos',
      'baremo',
      'meritos',
      'méritos',
      'oposicion',
      'concurso',
      'convocatoria',
      'orden del dia',
      'boe',
      'boa',
      'bop',
      'boletin oficial',
    ],
    interinoKeywords: [
      'interino',
      'interinidad',
      'interina',
      'lista de interinos',
      'bolsa de interinos',
      'lista de espera',
    ],
    adminKeywords: {
      educacion: [
        'educacion',
        'docente',
        'profesorado',
        'enseñanza',
        'consejeria de educacion',
      ],
      sanidad: [
        'sanidad',
        'salud',
        'sas',
        'facultativo',
        'personal sanitario',
      ],
      justicia: [
        'justicia',
        'administracion de justicia',
        'ministerio de justicia',
      ],
      otros: ['administracion publica', 'boletin oficial'],
    },
  },
}

export const INTERINO_GENERAL_KEYWORDS = [
  'interino',
  'interinidad',
  'interina',
  'interinas',
  'personal interino',
  'funcionario interino',
  'contrato interino',
  'nombramiento interino',
  'bolsa de interinos',
  'lista de interinos',
]

export const NAME_SIMILARITY_THRESHOLD = 0.6

export const CONFIDENCE_AUTO_VERIFY = 80
export const CONFIDENCE_MANUAL_REVIEW = 50
