// Uso: npm run merge:batch -- ruta/al/lote.json
// El lote es { "flashcards": [...], "questions": [...] }. Se agregan (o se reemplazan por id) en src/data.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Indica el archivo del lote: npm run merge:batch -- lote.json');
  process.exit(1);
}
const batch = JSON.parse(readFileSync(file, 'utf8'));
const targets = [
  ['flashcards', 'flashcards.json'],
  ['questions', 'questions.json'],
] as const;
for (const [key, name] of targets) {
  const items = batch[key];
  if (!Array.isArray(items) || !items.length) continue;
  const url = new URL(`../src/data/${name}`, import.meta.url);
  const current: any[] = JSON.parse(readFileSync(url, 'utf8'));
  const byId = new Map(current.map((x) => [x.id, x]));
  let added = 0;
  let replaced = 0;
  for (const it of items) {
    if (byId.has(it.id)) replaced++;
    else added++;
    byId.set(it.id, it);
  }
  writeFileSync(url, JSON.stringify([...byId.values()], null, 2) + '\n');
  console.log(`${name}: +${added} nuevas, ${replaced} reemplazadas (total ${byId.size})`);
}
