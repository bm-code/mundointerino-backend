export const VERIFICATION_MESSAGES_ES: Record<string, string> = {
  'name.found': 'Nombre encontrado en el documento',
  'name.not_found': 'No se ha encontrado el nombre del docente en el documento',
  'name.low_similarity': 'Coincidencia de nombre baja en el documento',
  'doc.type_matched': 'Palabras clave del tipo de documento coinciden',
  'doc.type_not_matched': 'Las palabras clave del tipo de documento no coinciden suficientemente',
  'interino.found': 'Se han encontrado palabras clave de interino/interinidad',
  'interino.not_found': 'No se han encontrado palabras clave de interino/interinidad',
  'admin.matched': 'Palabras clave de la administración coinciden',
  'admin.not_matched': 'Las palabras clave de la administración no coinciden suficientemente',
  'ocr.failed': 'No se ha podido extraer texto del documento',
  'ocr.insufficient_text': 'El texto extraído es insuficiente para validar el documento',
  'ocr.no_url': 'No se ha proporcionado URL de documento, se requiere revisión manual',
  'doc.unknown_type': 'Tipo de documento desconocido o no soportado',
  'doc.timeout': 'El OCR ha superado el tiempo máximo de procesamiento',
  'doc.format_unsupported': 'Formato de documento no soportado',
  'doc.too_large': 'El documento supera el tamaño máximo permitido',
}

export function translateNote(code: string, params?: Record<string, string | number>): string {
  let msg = VERIFICATION_MESSAGES_ES[code] || code
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      msg = msg.replace(`{${key}}`, String(value))
    }
  }
  return msg
}

export function buildNotesES(
  nameResult: { found: boolean; similarity: number },
  docTypeResult: { found: boolean; score: number },
  interinoResult: { found: boolean; score: number },
  adminResult: { found: boolean; score: number },
  documentType: string,
  administration: string,
): string {
  const notes: string[] = []

  if (nameResult.found) {
    notes.push(`${translateNote('name.found')} (similitud: ${Math.round(nameResult.similarity * 100)}%)`)
  } else {
    notes.push(translateNote('name.not_found'))
  }

  if (docTypeResult.found) {
    notes.push(`${translateNote('doc.type_matched')} (puntuación: ${docTypeResult.score}/25)`)
  } else {
    notes.push(`${translateNote('doc.type_not_matched')} (puntuación: ${docTypeResult.score}/25)`)
  }

  if (interinoResult.found) {
    notes.push(translateNote('interino.found'))
  } else {
    notes.push(translateNote('interino.not_found'))
  }

  if (adminResult.found) {
    notes.push(`${translateNote('admin.matched')} (puntuación: ${adminResult.score}/20)`)
  } else {
    notes.push(`${translateNote('admin.not_matched')} (puntuación: ${adminResult.score}/20)`)
  }

  return notes.join('. ') + '.'
}
