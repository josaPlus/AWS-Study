import { Link } from 'react-router-dom';
import { NAV } from '../components/Layout.tsx';
import { Card, ProgressBar } from '../components/ui.tsx';
import { useContent } from '../lib/content.ts';
import { dayStreak, useProgress } from '../lib/progress.ts';
import { mastery } from '../lib/stats.ts';

export default function Home() {
  const { flashcards, questions, examQuestions, serviceQuestions } = useContent();
  const p = useProgress();
  const now = Date.now();
  const due = flashcards.filter((c) => !p.cards[c.id] || p.cards[c.id].due <= now).length;
  const mistakes = questions.filter((q) => p.questions[q.id]?.inMistakes).length;
  const m = mastery(flashcards, questions, p);
  const streak = dayStreak(p.activityDays);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AWS Certified Cloud Practitioner</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Examen CLF-C02 · 65 preguntas · 90 minutos · aprobado con 700/1000
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tu dominio global</p>
            <p className="text-3xl font-bold">{m.mastery}%</p>
          </div>
          <div className="text-right text-sm">
            <p>
              <span className="font-bold">{streak}</span> 🔥 {streak === 1 ? 'día' : 'días'} de racha
            </p>
          </div>
        </div>
        <ProgressBar value={m.mastery} />
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Link to="/flashcards" className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
            <span className="block text-xl font-bold">{due}</span>tarjetas para hoy
          </Link>
          <Link to="/errores" className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
            <span className="block text-xl font-bold">{mistakes}</span>errores por repasar
          </Link>
          <Link to="/simulador" className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
            <span className="block text-xl font-bold">{p.exams.length}</span>simulacros
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NAV.slice(1).map((n) => (
          <Link key={n.to} to={n.to}>
            <Card className="flex h-full items-center gap-3 transition hover:border-amber-400 dark:hover:border-amber-500">
              <span className="text-2xl" aria-hidden>
                {n.icon}
              </span>
              <span>
                <span className="block font-semibold">{n.label}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">{n.desc}</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Banco actual: {flashcards.length} flashcards · {examQuestions.length} preguntas de examen · {serviceQuestions.length} de "¿Qué
        servicio es?". Tu progreso se guarda solo en este navegador: respáldalo en "Importar y respaldo".
      </p>
    </div>
  );
}
