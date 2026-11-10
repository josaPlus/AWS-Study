// Uso: npm run validate:data  — termina con código 1 si el contenido tiene errores.
import { readFileSync } from 'node:fs';
import { validateFlashcards, validateQuestions } from '../src/lib/validate.ts';

const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const cards: any[] = load('../src/data/flashcards.json');
const questions: any[] = load('../src/data/questions.json');

const a = validateFlashcards(cards);
const b = validateQuestions(questions);
const errors = [...a.errors, ...b.errors];
const warnings = [...a.warnings, ...b.warnings];

const count = (arr: any[], key: string) =>
  arr.reduce<Record<string, number>>((acc, x) => {
    acc[x[key]] = (acc[x[key]] ?? 0) + 1;
    return acc;
  }, {});
const exam = questions.filter((q) => q.mode === 'examen');
const serv = questions.filter((q) => q.mode === 'servicio');
console.log(`Flashcards: ${cards.length} | Preguntas de examen: ${exam.length} | "¿Qué servicio es?": ${serv.length}`);
console.log('Examen por dominio:', count(exam, 'domain'), '| de respuesta múltiple:', exam.filter((q) => q.type === 'multiple').length);
console.log('Flashcards por dominio:', count(cards, 'domain'));

for (const w of warnings) console.warn('AVISO:', w);
if (errors.length) {
  for (const e of errors) console.error('ERROR:', e);
  console.error(`\n✖ ${errors.length} error(es) de validación`);
  process.exit(1);
}
console.log('✔ Contenido válido');
