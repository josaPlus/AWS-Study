import { Badge, Card, Empty, PageHeader, ProgressBar } from '../components/ui.tsx';
import { DOMAINS, DOMAIN_IDS, EXAM, SECTIONS } from '../data/meta.ts';
import { useContent } from '../lib/content.ts';
import { dayStreak, useProgress } from '../lib/progress.ts';
import { mastery, type Mastery } from '../lib/stats.ts';

function Row({ label, m }: { label: string; m: Mastery }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-semibold">{m.mastery}%</span>
      </div>
      <ProgressBar value={m.mastery} tone={m.mastery >= 70 ? 'green' : m.mastery >= 40 ? 'amber' : 'red'} />
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Tarjetas {m.cardsSeen}/{m.cards} · Preguntas {m.answered}/{m.questions} · Aciertos {m.accuracy}%
      </p>
    </div>
  );
}

export default function Estadisticas() {
  const { flashcards, questions } = useContent();
  const p = useProgress();
  const streak = dayStreak(p.activityDays);
  const total = mastery(flashcards, questions, p);
  const lastExam = p.exams[p.exams.length - 1];
  const bestExam = p.exams.reduce((b, e) => Math.max(b, e.score), 0);

  const mostFailed = questions
    .filter((q) => (p.questions[q.id]?.wrong ?? 0) > 0)
    .sort((a, b) => p.questions[b.id].wrong - p.questions[a.id].wrong || p.questions[a.id].correct - p.questions[b.id].correct)
    .slice(0, 10);

  // Últimos 28 días de actividad.
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, on: p.activityDays.includes(key) };
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Estadísticas" subtitle="El dominio combina tus cajas Leitner y tus aciertos en preguntas." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Racha" value={`${streak} 🔥`} hint={streak === 1 ? 'día' : 'días'} />
        <Stat label="Dominio global" value={`${total.mastery}%`} />
        <Stat label="Respuestas" value={String(total.attempts)} hint={`${total.accuracy}% aciertos`} />
        <Stat label="Mejor simulador" value={bestExam ? String(bestExam) : '—'} hint={lastExam ? `último: ${lastExam.score}` : 'sin intentos'} />
      </div>

      <Card>
        <p className="mb-2 text-sm font-semibold">Actividad (últimos 28 días)</p>
        <div className="grid grid-cols-14 gap-1">
          {days.map((d) => (
            <div
              key={d.key}
              title={d.key}
              className={`aspect-square rounded ${d.on ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="font-semibold">Por dominio del examen</p>
        {DOMAIN_IDS.map((d) => (
          <Row
            key={d}
            label={`${d}. ${DOMAINS[d].name} (${Math.round(DOMAINS[d].weight * 100)}%)`}
            m={mastery(
              flashcards.filter((c) => c.domain === d),
              questions.filter((q) => q.domain === d),
              p,
            )}
          />
        ))}
      </Card>

      <Card className="space-y-4">
        <p className="font-semibold">Por sección del curso</p>
        {SECTIONS.map((s) => {
          const fc = flashcards.filter((c) => c.section === s);
          const qs = questions.filter((q) => q.section === s);
          if (!fc.length && !qs.length) return null;
          return <Row key={s} label={s} m={mastery(fc, qs, p)} />;
        })}
      </Card>

      <div>
        <p className="mb-2 font-semibold">Preguntas más falladas</p>
        {mostFailed.length === 0 ? (
          <Empty title="Aún no has fallado ninguna pregunta" />
        ) : (
          <div className="space-y-2">
            {mostFailed.map((q) => {
              const st = p.questions[q.id];
              return (
                <Card key={q.id} className="p-3">
                  <p className="line-clamp-2 text-sm">{q.stem}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{q.section}</Badge>
                    <Badge tone="red">✘ {st.wrong}</Badge>
                    <Badge tone="green">✔ {st.correct}</Badge>
                    {st.inMistakes && <Badge tone="amber">En "Mis errores"</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Puntaje para aprobar el examen real: {EXAM.pass}/1000.</p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}
