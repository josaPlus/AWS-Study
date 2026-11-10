import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../types.ts';
import { isAnswerCorrect, recordAnswer } from '../lib/progress.ts';
import { shuffle } from '../lib/content.ts';
import { Feedback } from './Feedback.tsx';
import { QuestionView } from './QuestionView.tsx';
import { Button, Card, ProgressBar } from './ui.tsx';

interface Props {
  questions: Question[];
  onExit: () => void;
  exitLabel?: string;
}

/** Corre una lista de preguntas con retroalimentación inmediata (Práctica, "¿Qué servicio es?", Mis errores). */
export function QuizRunner({ questions, onExit, exitLabel = 'Terminar' }: Props) {
  // Opciones barajadas una vez por sesión: así no memorizas la posición.
  const orders = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, shuffle(q.options.map((o) => o.id))])), [questions]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const q = questions[index];
  const done = index >= questions.length;

  const check = () => {
    if (!q || selected.length !== q.selectCount) return;
    const ok = isAnswerCorrect(q, selected);
    recordAnswer(q.id, ok);
    setResults((r) => [...r, ok]);
    setRevealed(true);
  };
  const next = () => {
    setIndex((i) => i + 1);
    setSelected([]);
    setRevealed(false);
  };

  useEffect(() => {
    if (revealed) feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [revealed]);
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [index]);

  // Atajos: 1-6 eligen opción, Enter comprueba / avanza.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealed) next();
        else check();
        return;
      }
      const n = Number(e.key);
      if (!revealed && n >= 1 && n <= orders[q.id].length) {
        const id = orders[q.id][n - 1];
        if (q.type === 'single') setSelected([id]);
        else
          setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : s.length >= q.selectCount ? [...s.slice(1), id] : [...s, id],
          );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    const ok = results.filter(Boolean).length;
    const pct = results.length ? Math.round((ok / results.length) * 100) : 0;
    return (
      <Card className="space-y-4 text-center">
        <p className="text-sm text-slate-500">Sesión terminada</p>
        <p className="text-4xl font-bold">{pct}%</p>
        <p>
          {ok} de {results.length} correctas
        </p>
        <ProgressBar value={pct} tone={pct >= 70 ? 'green' : 'red'} />
        <Button variant="primary" onClick={onExit} className="w-full">
          Volver
        </Button>
      </Card>
    );
  }

  const correctSoFar = results.filter(Boolean).length;
  return (
    <div ref={topRef} className="scroll-mt-20 space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="shrink-0 font-semibold">
          {index + 1}/{questions.length}
        </span>
        <ProgressBar value={(index / questions.length) * 100} />
        <span className="shrink-0 text-emerald-700 dark:text-emerald-400">✔ {correctSoFar}</span>
        <span className="shrink-0 text-rose-700 dark:text-rose-400">✘ {results.length - correctSoFar}</span>
      </div>
      <Card>
        <QuestionView question={q} order={orders[q.id]} selected={selected} onChange={setSelected} revealed={revealed} />
      </Card>
      {!revealed ? (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onExit}>
            {exitLabel}
          </Button>
          <Button variant="primary" className="flex-1" disabled={selected.length !== q.selectCount} onClick={check}>
            Comprobar
          </Button>
        </div>
      ) : (
        <>
          <div ref={feedbackRef} className="scroll-mt-20">
            <Card>
              <Feedback question={q} selected={selected} order={orders[q.id]} />
            </Card>
          </div>
          <div className="sticky bottom-3 flex gap-2">
            <Button variant="secondary" onClick={onExit}>
              {exitLabel}
            </Button>
            <Button variant="primary" className="flex-1 shadow-lg" onClick={next}>
              {index + 1 < questions.length ? 'Siguiente →' : 'Ver resultado'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
