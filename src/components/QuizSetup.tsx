import { useMemo, useState } from 'react';
import type { Question } from '../types.ts';
import { DOMAINS, DOMAIN_IDS, SECTIONS } from '../data/meta.ts';
import { shuffle } from '../lib/content.ts';
import { useProgress } from '../lib/progress.ts';
import { QuizRunner } from './QuizRunner.tsx';
import { Button, Card, Empty, PageHeader, Select } from './ui.tsx';

interface Props {
  title: string;
  subtitle: string;
  pool: Question[];
}

/** Pantalla de filtros + sesión de preguntas con retroalimentación inmediata. */
export function QuizSetup({ title, subtitle, pool }: Props) {
  const progress = useProgress();
  const [domain, setDomain] = useState('');
  const [section, setSection] = useState('');
  const [which, setWhich] = useState<'todas' | 'nuevas' | 'falladas'>('todas');
  const [count, setCount] = useState(10);
  const [session, setSession] = useState<Question[] | null>(null);

  const filtered = useMemo(
    () =>
      pool.filter((q) => {
        if (domain && q.domain !== Number(domain)) return false;
        if (section && q.section !== section) return false;
        const st = progress.questions[q.id];
        if (which === 'nuevas' && st) return false;
        if (which === 'falladas' && !(st && st.wrong > 0)) return false;
        return true;
      }),
    [pool, domain, section, which, progress.questions],
  );
  const sections = SECTIONS.filter((s) => pool.some((q) => q.section === s && (!domain || q.domain === Number(domain))));

  if (session) return <QuizRunner questions={session} onExit={() => setSession(null)} />;

  const start = () => {
    // Prioriza preguntas menos vistas para que no se repitan siempre las mismas.
    const sorted = shuffle(filtered).sort((a, b) => (progress.questions[a.id]?.attempts ?? 0) - (progress.questions[b.id]?.attempts ?? 0));
    setSession(shuffle(sorted.slice(0, count)));
  };

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} />
      {pool.length === 0 ? (
        <Empty title="Aún no hay preguntas en este modo" />
      ) : (
        <Card className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Dominio"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setSection('');
              }}
            >
              <option value="">Todos</option>
              {DOMAIN_IDS.map((d) => (
                <option key={d} value={d}>
                  {d}. {DOMAINS[d].name}
                </option>
              ))}
            </Select>
            <Select label="Sección del curso" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">Todas</option>
              {sections.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select label="Preguntas" value={which} onChange={(e) => setWhich(e.target.value as typeof which)}>
              <option value="todas">Todas</option>
              <option value="nuevas">Solo las que no he respondido</option>
              <option value="falladas">Solo las que he fallado alguna vez</option>
            </Select>
            <Select label="Cantidad" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 20, 30, 50, 1000].map((n) => (
                <option key={n} value={n}>
                  {n === 1000 ? 'Todas' : n}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{filtered.length} preguntas disponibles con estos filtros.</p>
          <Button variant="primary" className="w-full" disabled={!filtered.length} onClick={start}>
            Empezar ({Math.min(count, filtered.length)})
          </Button>
        </Card>
      )}
    </div>
  );
}
