import type { Question, QuestionOption } from '../types.ts';
import { isAnswerCorrect } from '../lib/progress.ts';
import { cx } from './ui.tsx';

type Tone = 'green' | 'red' | 'amber' | 'neutral';

const toneBox: Record<Tone, string> = {
  green: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  red: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
  amber: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
  neutral: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
};
const toneIcon: Record<Tone, string> = { green: '✔', red: '✘', amber: '!', neutral: '✘' };
const toneIconColor: Record<Tone, string> = {
  green: 'bg-emerald-600 text-white',
  red: 'bg-rose-600 text-white',
  amber: 'bg-amber-500 text-slate-950',
  neutral: 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

function OptionExplanation({ option, tone, label }: { option: QuestionOption; tone: Tone; label: string }) {
  return (
    <div className={cx('rounded-xl border p-3', toneBox[tone])}>
      <div className="flex gap-2">
        <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold', toneIconColor[tone])}>
          {toneIcon[tone]}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            <span className="mr-1 text-slate-500 dark:text-slate-400">{label}</span>
            {option.text}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{option.explanation}</p>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function Others({ options, labels, open, title }: { options: QuestionOption[]; labels: Map<string, string>; open?: boolean; title: string }) {
  if (!options.length) return null;
  const list = (
    <div className="space-y-2">
      {options.map((o) => (
        <OptionExplanation key={o.id} option={o} tone="neutral" label={labels.get(o.id) ?? ''} />
      ))}
    </div>
  );
  if (open) return <Group title={title}>{list}</Group>;
  return (
    <details className="group rounded-xl border border-slate-200 dark:border-slate-700">
      <summary className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
        {title} ({options.length})
        <span className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="px-3 pb-3">{list}</div>
    </details>
  );
}

/**
 * Retroalimentación completa de una pregunta.
 * `order` es el orden en que se mostraron las opciones (para etiquetarlas A, B, C...).
 */
export function Feedback({ question, selected, order }: { question: Question; selected: string[]; order?: string[] }) {
  const ids = order ?? question.options.map((o) => o.id);
  const labels = new Map(ids.map((id, i) => [id, String.fromCharCode(65 + i) + '.']));
  const byId = new Map(question.options.map((o) => [o.id, o]));
  const ordered = ids.map((id) => byId.get(id)!).filter(Boolean);
  const ok = isAnswerCorrect(question, selected);
  const isCorrect = (o: QuestionOption) => question.correct.includes(o.id);
  const isSel = (o: QuestionOption) => selected.includes(o.id);

  const hits = ordered.filter((o) => isCorrect(o) && isSel(o));
  const missed = ordered.filter((o) => isCorrect(o) && !isSel(o));
  const extra = ordered.filter((o) => !isCorrect(o) && isSel(o));
  const rest = ordered.filter((o) => !isCorrect(o) && !isSel(o));
  const multiple = question.type === 'multiple';
  const unanswered = selected.length === 0;

  let banner: { tone: 'green' | 'red' | 'amber'; title: string; text: string };
  if (ok) banner = { tone: 'green', title: '¡Correcto!', text: multiple ? 'Elegiste todas las opciones correctas.' : 'Tu respuesta es la correcta.' };
  else if (unanswered) banner = { tone: 'red', title: 'Sin responder', text: 'No elegiste ninguna opción. Revisa la respuesta correcta.' };
  else if (multiple && hits.length > 0)
    banner = {
      tone: 'amber',
      title: 'Parcialmente correcto (cuenta como fallo)',
      text: `Acertaste ${hits.length} de ${question.correct.length}. En el examen real hay que acertar todas para sumar el punto.`,
    };
  else banner = { tone: 'red', title: 'Incorrecto', text: 'Mira por qué tu opción no aplica en este escenario y cuál sí.' };

  const bannerCls = {
    green: 'border-emerald-500 bg-emerald-600 text-white',
    red: 'border-rose-500 bg-rose-600 text-white',
    amber: 'border-amber-400 bg-amber-400 text-slate-950',
  }[banner.tone];

  return (
    <div className="space-y-4" aria-live="polite">
      <div className={cx('rounded-xl border px-4 py-3', bannerCls)}>
        <p className="font-bold">{banner.title}</p>
        <p className="text-sm opacity-95">{banner.text}</p>
      </div>

      {ok && !multiple && (
        <>
          <Group title="Por qué es la correcta">
            {hits.map((o) => (
              <OptionExplanation key={o.id} option={o} tone="green" label={labels.get(o.id)!} />
            ))}
          </Group>
          <Others options={rest} labels={labels} open title="Por qué las demás no" />
        </>
      )}

      {!ok && !multiple && (
        <>
          {extra.length > 0 && (
            <Group title="Tu respuesta">
              {extra.map((o) => (
                <OptionExplanation key={o.id} option={o} tone="red" label={labels.get(o.id)!} />
              ))}
            </Group>
          )}
          <Group title="Respuesta correcta">
            {missed.map((o) => (
              <OptionExplanation key={o.id} option={o} tone="green" label={labels.get(o.id)!} />
            ))}
          </Group>
          <Others options={rest} labels={labels} title="Ver las demás opciones" />
        </>
      )}

      {multiple && (
        <>
          {hits.length > 0 && (
            <Group title={`Acertaste (${hits.length})`}>
              {hits.map((o) => (
                <OptionExplanation key={o.id} option={o} tone="green" label={labels.get(o.id)!} />
              ))}
            </Group>
          )}
          {extra.length > 0 && (
            <Group title={`Elegiste de más (${extra.length})`}>
              {extra.map((o) => (
                <OptionExplanation key={o.id} option={o} tone="red" label={labels.get(o.id)!} />
              ))}
            </Group>
          )}
          {missed.length > 0 && (
            <Group title={`Te faltaron (${missed.length})`}>
              {missed.map((o) => (
                <OptionExplanation key={o.id} option={o} tone="amber" label={labels.get(o.id)!} />
              ))}
            </Group>
          )}
          <Others options={rest} labels={labels} open={ok} title={ok ? 'Por qué las demás no' : 'Ver las demás opciones'} />
        </>
      )}

      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">💡 Idea clave</p>
        <p className="mt-1 text-sm leading-relaxed">{question.summary}</p>
      </div>

      {question.refs.length > 0 && (
        <div className="text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Para profundizar</p>
          <ul className="mt-1 space-y-1">
            {question.refs.map((r) => (
              <li key={r} className="truncate">
                <a href={r} target="_blank" rel="noreferrer" className="text-sky-700 underline decoration-sky-300 hover:text-sky-600 dark:text-sky-400">
                  {r.replace(/^https?:\/\//, '')}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
