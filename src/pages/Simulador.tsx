import { useEffect, useMemo, useState } from 'react';
import { Feedback } from '../components/Feedback.tsx';
import { QuestionView } from '../components/QuestionView.tsx';
import { Badge, Button, Card, PageHeader, ProgressBar, cx } from '../components/ui.tsx';
import { DOMAINS, DOMAIN_IDS, EXAM } from '../data/meta.ts';
import { shuffle, useContent } from '../lib/content.ts';
import { getProgress, isAnswerCorrect, recordAnswer, update, useProgress, type ExamResult, type ExamSession } from '../lib/progress.ts';
import type { Domain, Question } from '../types.ts';

/** Puntaje estimado: escala lineal 100–1000 (AWS usa una escala propia; esto es solo una aproximación). */
export const estimateScore = (correct: number, total: number) => (total ? Math.round(100 + (900 * correct) / total) : 100);

function buildExam(pool: Question[]): ExamSession {
  const p = getProgress();
  const used = new Set<string>();
  const pick: Question[] = [];
  const lessSeenFirst = (qs: Question[]) =>
    shuffle(qs).sort((a, b) => (p.questions[a.id]?.attempts ?? 0) - (p.questions[b.id]?.attempts ?? 0));
  for (const d of DOMAIN_IDS) {
    const take = lessSeenFirst(pool.filter((q) => q.domain === d)).slice(0, EXAM.perDomain[d]);
    take.forEach((q) => used.add(q.id));
    pick.push(...take);
  }
  // Si algún dominio no tiene suficientes preguntas, se completa con otras.
  if (pick.length < EXAM.total) pick.push(...lessSeenFirst(pool.filter((q) => !used.has(q.id))).slice(0, EXAM.total - pick.length));
  const qs = shuffle(pick);
  const now = Date.now();
  return {
    questionIds: qs.map((q) => q.id),
    optionOrder: Object.fromEntries(qs.map((q) => [q.id, shuffle(q.options.map((o) => o.id))])),
    answers: {},
    flagged: [],
    current: 0,
    startedAt: now,
    endsAt: now + EXAM.minutes * 60_000,
  };
}

function setExam(fn: (e: ExamSession) => ExamSession) {
  update((p) => (p.exam ? { ...p, exam: fn(p.exam) } : p));
}

function finishExam(questionById: Map<string, Question>) {
  const p = getProgress();
  const exam = p.exam;
  if (!exam || exam.finishedAt) return;
  const byDomain: ExamResult['byDomain'] = {};
  let correct = 0;
  const qs = exam.questionIds.map((id) => questionById.get(id)).filter(Boolean) as Question[];
  for (const q of qs) {
    const ok = isAnswerCorrect(q, exam.answers[q.id] ?? []);
    recordAnswer(q.id, ok);
    if (ok) correct++;
    const d = (byDomain[q.domain] ??= { correct: 0, total: 0 });
    d.total++;
    if (ok) d.correct++;
  }
  const now = Date.now();
  const result: ExamResult = {
    date: now,
    correct,
    total: qs.length,
    score: estimateScore(correct, qs.length),
    byDomain,
    seconds: Math.round((Math.min(now, exam.endsAt) - exam.startedAt) / 1000),
  };
  update((pp) => ({ ...pp, exams: [...pp.exams, result], exam: pp.exam && { ...pp.exam, finishedAt: now } }));
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Simulador() {
  const { examQuestions, questionById } = useContent();
  const { exam, exams } = useProgress();

  if (exam && !exam.finishedAt) return <ExamRunner exam={exam} questionById={questionById} />;
  if (exam?.finishedAt) return <ExamReview exam={exam} questionById={questionById} result={exams[exams.length - 1]} />;

  const total = Math.min(EXAM.total, examQuestions.length);
  return (
    <div className="space-y-4">
      <PageHeader title="Simulador de examen" subtitle="Igual que el real: 65 preguntas, 90 minutos, se aprueba con 700/1000." />
      <Card className="space-y-3">
        <ul className="space-y-1 text-sm">
          {DOMAIN_IDS.map((d) => (
            <li key={d} className="flex justify-between gap-2">
              <span>
                {d}. {DOMAINS[d].name} ({Math.round(DOMAINS[d].weight * 100)}%)
              </span>
              <span className="font-semibold">{EXAM.perDomain[d]} preg.</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cada intento arma un examen distinto: prioriza las preguntas que has visto menos y baraja las opciones. Puedes marcar preguntas
          para revisar y moverte libremente. La retroalimentación se muestra al final.
        </p>
        {examQuestions.length < EXAM.total && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Por ahora hay {examQuestions.length} preguntas de examen; el simulador usará {total}.
          </p>
        )}
        <Button
          variant="primary"
          className="w-full"
          disabled={!examQuestions.length}
          onClick={() => update((p) => ({ ...p, exam: buildExam(examQuestions) }))}
        >
          Empezar examen
        </Button>
      </Card>
      {exams.length > 0 && (
        <Card>
          <p className="mb-2 font-semibold">Intentos anteriores</p>
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {[...exams].reverse().slice(0, 10).map((r) => (
              <li key={r.date} className="flex items-center justify-between py-2">
                <span>{new Date(r.date).toLocaleString('es')}</span>
                <span className="flex items-center gap-2">
                  {r.correct}/{r.total}
                  <Badge tone={r.score >= EXAM.pass ? 'green' : 'red'}>{r.score}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ExamRunner({ exam, questionById }: { exam: ExamSession; questionById: Map<string, Question> }) {
  const [now, setNow] = useState(Date.now());
  const [showNav, setShowNav] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, (exam.endsAt - now) / 1000);
  useEffect(() => {
    if (left <= 0) finishExam(questionById);
  }, [left, questionById]);

  const ids = exam.questionIds;
  const q = questionById.get(ids[exam.current]);
  const answered = ids.filter((id) => (exam.answers[id]?.length ?? 0) > 0).length;
  const flagged = exam.flagged.includes(ids[exam.current]);
  const go = (i: number) => {
    setExam((e) => ({ ...e, current: Math.max(0, Math.min(ids.length - 1, i)) }));
    setShowNav(false);
    window.scrollTo({ top: 0 });
  };

  if (!q) {
    return (
      <Card className="space-y-3">
        <p>No se encontró una pregunta de este examen (quizá se borró contenido importado).</p>
        <Button onClick={() => update((p) => ({ ...p, exam: undefined }))}>Descartar examen</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 -mx-4 flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <span className={cx('rounded-lg px-2 py-1 font-mono text-sm font-bold', left < 600 ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800')}>
          ⏱ {fmt(left)}
        </span>
        <span className="text-sm">
          {exam.current + 1}/{ids.length}
        </span>
        <span className="hidden text-xs text-slate-500 sm:inline">· {answered} respondidas</span>
        <div className="flex-1" />
        <Button variant="secondary" className="px-3 py-1.5" onClick={() => setShowNav((s) => !s)}>
          Navegador
        </Button>
        <Button variant="primary" className="px-3 py-1.5" onClick={() => setConfirm(true)}>
          Terminar
        </Button>
      </div>

      {showNav && (
        <Card>
          <div className="mb-2 flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-amber-500" /> Respondida</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded border-2 border-violet-500" /> Marcada</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" /> Sin responder</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-13">
            {ids.map((id, i) => {
              const a = (exam.answers[id]?.length ?? 0) > 0;
              const f = exam.flagged.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => go(i)}
                  className={cx(
                    'relative h-9 rounded-lg text-xs font-semibold',
                    a ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700',
                    f && 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-slate-900',
                    i === exam.current && 'outline-2 outline-sky-500',
                  )}
                  aria-label={`Pregunta ${i + 1}${a ? ', respondida' : ''}${f ? ', marcada' : ''}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <QuestionView
          question={q}
          order={exam.optionOrder[q.id]}
          selected={exam.answers[q.id] ?? []}
          onChange={(sel) => setExam((e) => ({ ...e, answers: { ...e.answers, [q.id]: sel } }))}
          showMeta={false}
        />
        {q.type === 'multiple' && <p className="mt-3 text-xs text-slate-500">Esta pregunta pide {q.selectCount} respuestas.</p>}
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => go(exam.current - 1)} disabled={exam.current === 0}>
          ←
        </Button>
        <Button
          variant={flagged ? 'warning' : 'secondary'}
          className="flex-1"
          onClick={() =>
            setExam((e) => ({
              ...e,
              flagged: flagged ? e.flagged.filter((x) => x !== q.id) : [...e.flagged, q.id],
            }))
          }
        >
          {flagged ? '🚩 Marcada para revisar' : '🏳️ Marcar para revisar'}
        </Button>
        <Button variant="primary" onClick={() => go(exam.current + 1)} disabled={exam.current === ids.length - 1}>
          →
        </Button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md space-y-3">
            <p className="text-lg font-bold">¿Terminar el examen?</p>
            <p className="text-sm">
              Respondiste {answered} de {ids.length}.{' '}
              {ids.length - answered > 0 && <strong>{ids.length - answered} sin responder contarán como incorrectas. </strong>}
              {exam.flagged.length > 0 && <>Tienes {exam.flagged.length} marcadas para revisar.</>}
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setConfirm(false)}>
                Seguir
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => finishExam(questionById)}>
                Terminar y calificar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ExamReview({ exam, questionById, result }: { exam: ExamSession; questionById: Map<string, Question>; result?: ExamResult }) {
  const [filter, setFilter] = useState<'todas' | 'falladas' | 'marcadas'>('falladas');
  const qs = useMemo(() => exam.questionIds.map((id) => questionById.get(id)).filter(Boolean) as Question[], [exam, questionById]);
  const wrong = qs.filter((q) => !isAnswerCorrect(q, exam.answers[q.id] ?? []));
  const list = filter === 'todas' ? qs : filter === 'falladas' ? wrong : qs.filter((q) => exam.flagged.includes(q.id));
  const score = result?.score ?? estimateScore(qs.length - wrong.length, qs.length);
  const pass = score >= EXAM.pass;

  return (
    <div className="space-y-4">
      <PageHeader title="Resultado del simulador" />
      <Card className={cx('space-y-2 text-center', pass ? 'border-emerald-400' : 'border-rose-400')}>
        <p className="text-sm text-slate-500">Puntaje estimado</p>
        <p className={cx('text-5xl font-black', pass ? 'text-emerald-600' : 'text-rose-600')}>{score}</p>
        <p className="font-semibold">{pass ? '✔ Aprobado' : '✘ No aprobado'} (mínimo 700)</p>
        <p className="text-sm">
          {qs.length - wrong.length} de {qs.length} correctas
          {result && <> · {fmt(result.seconds)} min</>}
        </p>
        <p className="text-xs text-slate-500">AWS usa una escala propia; este puntaje es una estimación lineal (100–1000).</p>
      </Card>
      <Card className="space-y-3">
        <p className="font-semibold">Resultado por dominio</p>
        {DOMAIN_IDS.map((d: Domain) => {
          const qd = qs.filter((q) => q.domain === d);
          if (!qd.length) return null;
          const ok = qd.filter((q) => isAnswerCorrect(q, exam.answers[q.id] ?? [])).length;
          const pct = Math.round((ok / qd.length) * 100);
          return (
            <div key={d}>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {d}. {DOMAINS[d].name}
                </span>
                <span className="font-semibold">
                  {ok}/{qd.length} ({pct}%)
                </span>
              </div>
              <ProgressBar value={pct} tone={pct >= 70 ? 'green' : pct >= 50 ? 'amber' : 'red'} />
            </div>
          );
        })}
      </Card>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['falladas', `Falladas (${wrong.length})`],
            ['marcadas', `Marcadas (${exam.flagged.length})`],
            ['todas', `Todas (${qs.length})`],
          ] as const
        ).map(([k, label]) => (
          <Button key={k} variant={filter === k ? 'primary' : 'secondary'} onClick={() => setFilter(k)} className="py-1.5">
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((q) => {
          const i = exam.questionIds.indexOf(q.id);
          const sel = exam.answers[q.id] ?? [];
          const ok = isAnswerCorrect(q, sel);
          return (
            <details key={q.id} className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex items-start gap-3 p-4">
                <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', ok ? 'bg-emerald-600' : 'bg-rose-600')}>
                  {ok ? '✔' : '✘'}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">#{i + 1}</span> {q.stem}
                </span>
                <span className="text-slate-400 transition group-open:rotate-180">▾</span>
              </summary>
              <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800">
                <QuestionView question={q} order={exam.optionOrder[q.id]} selected={sel} revealed />
                <Feedback question={q} selected={sel} order={exam.optionOrder[q.id]} />
              </div>
            </details>
          );
        })}
        {!list.length && <p className="text-sm text-slate-500">No hay preguntas en este filtro.</p>}
      </div>

      <Button variant="primary" className="w-full" onClick={() => update((p) => ({ ...p, exam: undefined }))}>
        Cerrar revisión
      </Button>
    </div>
  );
}
