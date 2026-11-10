import { useRef, useState } from 'react';
import { Button, Card, PageHeader } from '../components/ui.tsx';
import { builtinIds, useContent } from '../lib/content.ts';
import { downloadFile, exportProgress, importProgress, resetProgress, update, useProgress } from '../lib/progress.ts';
import { validateFlashcards, validateQuestions } from '../lib/validate.ts';
import type { Flashcard, Question } from '../types.ts';

const EXAMPLE = `{
  "flashcards": [
    { "id": "mio-001", "domain": 3, "section": "Amazon S3", "type": "concepto",
      "front": "¿Qué es S3 Versioning?", "back": "Guarda versiones anteriores de cada objeto...",
      "tags": ["s3"], "difficulty": 1 }
  ],
  "questions": [
    { "id": "q-mio-001", "domain": 3, "section": "Amazon S3", "mode": "examen",
      "type": "single", "selectCount": 1,
      "stem": "Una empresa necesita...",
      "options": [
        { "id": "a", "text": "...", "explanation": "Por qué es correcta o incorrecta (mínimo 40 caracteres)" },
        { "id": "b", "text": "...", "explanation": "..." }
      ],
      "correct": ["a"], "summary": "Idea clave", "refs": [], "source": "original" }
  ]
}`;

interface Parsed {
  flashcards: Flashcard[];
  questions: Question[];
  errors: string[];
  warnings: string[];
}

function parse(text: string, existing: { cards: Set<string>; questions: Set<string> }): Parsed {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { flashcards: [], questions: [], errors: ['JSON inválido: ' + (e as Error).message], warnings: [] };
  }
  let flashcards: any[] = [];
  let questions: any[] = [];
  if (Array.isArray(data)) {
    // Un arreglo suelto: se detecta si son preguntas (stem) o tarjetas (front).
    flashcards = data.filter((x) => x && 'front' in x);
    questions = data.filter((x) => x && 'stem' in x);
    if (flashcards.length + questions.length !== data.length) {
      return { flashcards: [], questions: [], errors: ['Hay elementos que no son ni flashcards (front) ni preguntas (stem).'], warnings: [] };
    }
  } else if (data && typeof data === 'object') {
    flashcards = data.flashcards ?? [];
    questions = data.questions ?? [];
  }
  if (!flashcards.length && !questions.length) {
    return { flashcards: [], questions: [], errors: ['No se encontraron "flashcards" ni "questions".'], warnings: [] };
  }
  const a = validateFlashcards(flashcards, existing.cards);
  const b = validateQuestions(questions, existing.questions);
  return { flashcards, questions, errors: [...a.errors, ...b.errors], warnings: [...a.warnings, ...b.warnings] };
}

export default function Importar() {
  const p = useProgress();
  const { flashcards, questions } = useContent();
  const [text, setText] = useState('');
  const [result, setResult] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState('');
  const fileContent = useRef<HTMLInputElement>(null);
  const fileProgress = useRef<HTMLInputElement>(null);

  const existing = {
    cards: new Set([...builtinIds.flashcards, ...p.custom.flashcards.map((c) => c.id)]),
    questions: new Set([...builtinIds.questions, ...p.custom.questions.map((q) => q.id)]),
  };

  const check = (t = text) => {
    setMsg('');
    setResult(parse(t, existing));
  };

  const save = () => {
    if (!result || result.errors.length) return;
    update((pp) => {
      const fc = new Map(pp.custom.flashcards.map((c) => [c.id, c]));
      result.flashcards.forEach((c) => fc.set(c.id, c));
      const qs = new Map(pp.custom.questions.map((q) => [q.id, q]));
      result.questions.forEach((q) => qs.set(q.id, q));
      return { ...pp, custom: { flashcards: [...fc.values()], questions: [...qs.values()] } };
    });
    setMsg(`✔ Guardado: ${result.flashcards.length} flashcards y ${result.questions.length} preguntas.`);
    setText('');
    setResult(null);
  };

  const readFile = (f: File | undefined, cb: (t: string) => void) => {
    if (!f) return;
    f.text().then(cb);
  };

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <PageHeader title="Importar y respaldo" subtitle="Agrega contenido propio y guarda una copia de tu progreso." />

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">💾 Respaldo de tu progreso</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tu progreso vive solo en este navegador. Descárgalo para pasarlo a otro dispositivo o por si borras los datos del navegador.
          Incluye el contenido que hayas importado.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="primary" onClick={() => downloadFile(`progreso-clf-c02-${stamp}.json`, exportProgress())}>
            Exportar progreso
          </Button>
          <Button onClick={() => fileProgress.current?.click()}>Importar progreso</Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('¿Borrar todo tu progreso (tarjetas, preguntas, simulacros)? El contenido importado se conserva. No se puede deshacer.')) {
                resetProgress(true);
                setMsg('Progreso reiniciado.');
              }
            }}
          >
            Reiniciar progreso
          </Button>
        </div>
        <input
          ref={fileProgress}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) =>
            readFile(e.target.files?.[0], (t) => {
              if (!confirm('Esto reemplaza tu progreso actual por el del archivo. ¿Continuar?')) return;
              const r = importProgress(t);
              setMsg(r.ok ? '✔ Progreso importado.' : '✘ ' + r.error);
              e.target.value = '';
            })
          }
        />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">➕ Importar contenido</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Pega un JSON con <code>flashcards</code> y/o <code>questions</code> (o un arreglo de cualquiera de los dos). Se valida con las
          mismas reglas que el repo: cada opción necesita una explicación de al menos 40 caracteres y cada pregunta su "summary". Si un id
          ya existe, se reemplaza.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={EXAMPLE}
          rows={12}
          spellCheck={false}
          className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => check()} disabled={!text.trim()}>
            Validar
          </Button>
          <Button onClick={() => fileContent.current?.click()}>Cargar archivo…</Button>
          <Button variant="primary" onClick={save} disabled={!result || result.errors.length > 0}>
            Guardar en este navegador
          </Button>
        </div>
        <input
          ref={fileContent}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) =>
            readFile(e.target.files?.[0], (t) => {
              setText(t);
              check(t);
              e.target.value = '';
            })
          }
        />
        {result && (
          <div className="space-y-2 text-sm">
            {result.errors.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                ✔ Formato válido: {result.flashcards.length} flashcards y {result.questions.length} preguntas listas para guardar.
              </p>
            ) : (
              <div className="rounded-xl bg-rose-50 p-3 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <p className="font-semibold">✘ {result.errors.length} error(es):</p>
                <ul className="mt-1 max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-amber-800 dark:text-amber-300">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {msg && <p className="text-sm font-medium">{msg}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">📦 Contenido importado</h2>
        <p className="text-sm">
          {p.custom.flashcards.length} flashcards y {p.custom.questions.length} preguntas propias (total en la app: {flashcards.length}{' '}
          flashcards, {questions.length} preguntas).
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Para compartirlo con tus compañeros, expórtalo y agrégalo al repo con <code>npm run merge:batch -- archivo.json</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!p.custom.flashcards.length && !p.custom.questions.length}
            onClick={() => downloadFile(`contenido-propio-${stamp}.json`, JSON.stringify(p.custom, null, 2))}
          >
            Exportar contenido importado
          </Button>
          <Button
            variant="ghost"
            disabled={!p.custom.flashcards.length && !p.custom.questions.length}
            onClick={() => {
              if (confirm('¿Eliminar todo el contenido importado de este navegador?')) update((pp) => ({ ...pp, custom: { flashcards: [], questions: [] } }));
            }}
          >
            Eliminar contenido importado
          </Button>
        </div>
      </Card>
    </div>
  );
}
