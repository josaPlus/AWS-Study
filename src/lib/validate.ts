// Validación compartida entre el script `npm run validate:data` y la página de importación.
import { SECTIONS, CARD_TYPES } from '../data/meta.ts';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export const MIN_EXPLANATION = 40;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function validateFlashcards(cards: unknown, existingIds: Set<string> = new Set()): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!Array.isArray(cards)) return { errors: ['Las flashcards deben ser un arreglo'], warnings };
  const ids = new Set<string>();
  cards.forEach((c: any, i) => {
    const where = `flashcard[${i}]${c?.id ? ` (${c.id})` : ''}`;
    if (!c || typeof c !== 'object') {
      errors.push(`${where}: no es un objeto`);
      return;
    }
    for (const f of ['id', 'section', 'type', 'front', 'back']) if (!isStr(c[f])) errors.push(`${where}: falta "${f}"`);
    if (!Array.isArray(c.tags)) errors.push(`${where}: "tags" debe ser un arreglo`);
    if (![1, 2, 3, 4].includes(c.domain)) errors.push(`${where}: dominio inválido (${c.domain}), debe estar entre 1 y 4`);
    if (![1, 2, 3].includes(c.difficulty)) errors.push(`${where}: "difficulty" debe ser 1, 2 o 3`);
    if (isStr(c.type) && !(c.type in CARD_TYPES)) errors.push(`${where}: tipo "${c.type}" no válido`);
    if (isStr(c.section) && !(SECTIONS as readonly string[]).includes(c.section))
      warnings.push(`${where}: sección "${c.section}" no está en la lista oficial`);
    if (isStr(c.id)) {
      if (ids.has(c.id)) errors.push(`${where}: ID repetido "${c.id}"`);
      else if (existingIds.has(c.id)) warnings.push(`${where}: el ID "${c.id}" ya existe y será reemplazado`);
      ids.add(c.id);
    }
  });
  return { errors, warnings };
}

export function validateQuestions(qs: unknown, existingIds: Set<string> = new Set()): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!Array.isArray(qs)) return { errors: ['Las preguntas deben ser un arreglo'], warnings };
  const ids = new Set<string>();
  qs.forEach((q: any, i) => {
    const where = `pregunta[${i}]${q?.id ? ` (${q.id})` : ''}`;
    if (!q || typeof q !== 'object') {
      errors.push(`${where}: no es un objeto`);
      return;
    }
    for (const f of ['id', 'section', 'stem', 'source']) if (!isStr(q[f])) errors.push(`${where}: falta "${f}"`);
    if (!isStr(q.summary)) errors.push(`${where}: falta "summary"`);
    if (![1, 2, 3, 4].includes(q.domain)) errors.push(`${where}: dominio inválido (${q.domain}), debe estar entre 1 y 4`);
    if (!['examen', 'servicio'].includes(q.mode)) errors.push(`${where}: "mode" debe ser "examen" o "servicio"`);
    if (!['single', 'multiple'].includes(q.type)) errors.push(`${where}: "type" debe ser "single" o "multiple"`);
    if (!Array.isArray(q.refs)) errors.push(`${where}: "refs" debe ser un arreglo`);
    if (isStr(q.section) && !(SECTIONS as readonly string[]).includes(q.section))
      warnings.push(`${where}: sección "${q.section}" no está en la lista oficial`);
    if (isStr(q.id)) {
      if (ids.has(q.id)) errors.push(`${where}: ID repetido "${q.id}"`);
      else if (existingIds.has(q.id)) warnings.push(`${where}: el ID "${q.id}" ya existe y será reemplazado`);
      ids.add(q.id);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${where}: necesita al menos 2 opciones`);
      return;
    }
    const optIds = new Set<string>();
    q.options.forEach((o: any, j: number) => {
      const ow = `${where} opción ${o?.id ?? j}`;
      if (!isStr(o?.id)) errors.push(`${ow}: falta "id"`);
      else if (optIds.has(o.id)) errors.push(`${ow}: id de opción repetido`);
      else optIds.add(o.id);
      if (!isStr(o?.text)) errors.push(`${ow}: falta "text"`);
      if (!isStr(o?.explanation)) errors.push(`${ow}: falta "explanation"`);
      else if (o.explanation.trim().length < MIN_EXPLANATION)
        errors.push(`${ow}: "explanation" demasiado corta (${o.explanation.trim().length} < ${MIN_EXPLANATION} caracteres)`);
    });
    if (!Array.isArray(q.correct) || q.correct.length === 0) {
      errors.push(`${where}: "correct" vacío`);
      return;
    }
    for (const c of q.correct) if (!optIds.has(c)) errors.push(`${where}: la respuesta correcta "${c}" no existe en las opciones`);
    if (new Set(q.correct).size !== q.correct.length) errors.push(`${where}: "correct" tiene valores repetidos`);
    if (q.selectCount !== q.correct.length)
      errors.push(`${where}: selectCount (${q.selectCount}) no coincide con el número de respuestas correctas (${q.correct.length})`);
    if (q.type === 'single' && q.correct.length !== 1) errors.push(`${where}: tipo "single" debe tener exactamente 1 respuesta correcta`);
    if (q.type === 'multiple' && q.correct.length < 2) errors.push(`${where}: tipo "multiple" debe tener 2 o más respuestas correctas`);
    if (q.options.length <= q.correct.length) errors.push(`${where}: debe haber más opciones que respuestas correctas`);
  });
  return { errors, warnings };
}
