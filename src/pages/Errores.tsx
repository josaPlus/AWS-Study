import { useMemo, useState } from 'react';
import { QuizRunner } from '../components/QuizRunner.tsx';
import { Badge, Button, Card, Empty, PageHeader } from '../components/ui.tsx';
import { shuffle, useContent } from '../lib/content.ts';
import { useProgress } from '../lib/progress.ts';
import type { Question } from '../types.ts';

export default function Errores() {
  const { questions } = useContent();
  const progress = useProgress();
  const [session, setSession] = useState<Question[] | null>(null);

  const mistakes = useMemo(
    () => questions.filter((q) => progress.questions[q.id]?.inMistakes),
    // Solo se recalcula al entrar o salir de una sesión, para que la lista no cambie a mitad de ronda.
    [questions, session === null],
  );

  if (session) return <QuizRunner questions={session} onExit={() => setSession(null)} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mis errores"
        subtitle="Todas las preguntas que fallaste en cualquier modo. Una pregunta sale de la lista cuando la aciertas 2 veces seguidas."
      />
      {mistakes.length === 0 ? (
        <Empty title="No tienes errores pendientes 🎉">Cuando falles una pregunta en cualquier modo aparecerá aquí.</Empty>
      ) : (
        <>
          <Button variant="primary" className="w-full" onClick={() => setSession(shuffle(mistakes))}>
            Repasar {mistakes.length} pregunta{mistakes.length === 1 ? '' : 's'}
          </Button>
          <div className="space-y-2">
            {mistakes.map((q) => {
              const st = progress.questions[q.id];
              return (
                <Card key={q.id} className="p-3">
                  <p className="line-clamp-2 text-sm">{q.stem}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{q.section}</Badge>
                    <Badge tone={q.mode === 'servicio' ? 'violet' : 'blue'}>{q.mode === 'servicio' ? '¿Qué servicio es?' : 'Examen'}</Badge>
                    <Badge tone="red">Fallos: {st.wrong}</Badge>
                    <Badge tone="green">Racha: {st.streak}/2</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
