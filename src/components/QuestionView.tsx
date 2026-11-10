import type { Question } from '../types.ts';
import { DOMAINS } from '../data/meta.ts';
import { Badge, Note, cx } from './ui.tsx';

interface Props {
  question: Question;
  order: string[];
  selected: string[];
  onChange?: (sel: string[]) => void;
  revealed?: boolean;
  showMeta?: boolean;
}

/** Enunciado + opciones. Al revelar, colorea las opciones correctas e incorrectas. */
export function QuestionView({ question, order, selected, onChange, revealed, showMeta = true }: Props) {
  const byId = new Map(question.options.map((o) => [o.id, o]));
  const multiple = question.type === 'multiple';

  const toggle = (id: string) => {
    if (revealed || !onChange) return;
    if (!multiple) return onChange([id]);
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id));
    if (selected.length >= question.selectCount) return onChange([...selected.slice(1), id]);
    onChange([...selected, id]);
  };

  return (
    <div className="space-y-4">
      {showMeta && (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="blue">D{question.domain} · {DOMAINS[question.domain].short}</Badge>
          <Badge>{question.section}</Badge>
          {multiple && <Badge tone="violet">Elige {question.selectCount}</Badge>}
        </div>
      )}
      {question.note && <Note>{question.note}</Note>}
      <p className="text-base leading-relaxed font-medium whitespace-pre-line sm:text-lg">{question.stem}</p>
      {multiple && !revealed && (
        <p className="text-sm text-violet-700 dark:text-violet-300">
          Selecciona {question.selectCount} opciones ({selected.length}/{question.selectCount})
        </p>
      )}
      <div className="space-y-2" role={multiple ? 'group' : 'radiogroup'}>
        {order.map((id, i) => {
          const o = byId.get(id);
          if (!o) return null;
          const sel = selected.includes(id);
          const correct = question.correct.includes(id);
          let state = 'border-slate-300 bg-white hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-500';
          if (!revealed && sel) state = 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/50 dark:bg-amber-950/30';
          if (revealed) {
            if (correct) state = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
            else if (sel) state = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40';
            else state = 'border-slate-200 bg-white opacity-70 dark:border-slate-800 dark:bg-slate-900';
          }
          return (
            <button
              key={id}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={sel}
              disabled={revealed}
              onClick={() => toggle(id)}
              className={cx('flex w-full items-start gap-3 rounded-xl border-2 px-3 py-3 text-left text-sm transition sm:text-base', state)}
            >
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold',
                  multiple ? 'rounded-md' : 'rounded-full',
                  sel ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                  revealed && correct && 'bg-emerald-600 text-white',
                  revealed && sel && !correct && 'bg-rose-600 text-white',
                )}
              >
                {revealed ? (correct ? '✔' : sel ? '✘' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">
                {o.text}
                {revealed && sel && <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">(tu elección)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
