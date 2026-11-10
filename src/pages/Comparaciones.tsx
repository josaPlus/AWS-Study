import { useState } from 'react';
import { COMPARISONS } from '../data/comparisons.ts';
import { DOMAINS } from '../data/meta.ts';
import { Badge, Card, Note, PageHeader, cx } from '../components/ui.tsx';

export default function Comparaciones() {
  const [active, setActive] = useState(COMPARISONS[0].id);
  const c = COMPARISONS.find((x) => x.id === active) ?? COMPARISONS[0];

  return (
    <div className="space-y-4">
      <PageHeader title="Comparaciones clave" subtitle="Servicios y conceptos que el examen mezcla a propósito, lado a lado." />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {COMPARISONS.map((x) => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap',
              x.id === active
                ? 'border-amber-500 bg-amber-100 font-semibold text-amber-950 dark:bg-amber-500/20 dark:text-amber-200'
                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
            )}
          >
            {x.title}
          </button>
        ))}
      </div>

      <Card className="space-y-3">
        <div>
          <Badge tone="blue">
            D{c.domain} · {DOMAINS[c.domain].short}
          </Badge>
          <h2 className="mt-2 text-xl font-bold">{c.title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.intro}</p>
        </div>

        {/* Escritorio: tabla. Móvil: tarjetas por fila para no forzar scroll horizontal. */}
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                {c.columns.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {c.rows.map((r, i) => (
                <tr key={i} className="align-top">
                  {r.map((cell, j) => (
                    <td key={j} className={cx('px-3 py-2', j === 0 && 'font-semibold')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 md:hidden">
          {c.rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="font-semibold">{r[0]}</p>
              <dl className="mt-1 space-y-1 text-sm">
                {r.slice(1).map((cell, j) => (
                  <div key={j}>
                    <dt className="inline font-medium text-slate-500 dark:text-slate-400">{c.columns[j + 1] || '—'}: </dt>
                    <dd className="inline">{cell}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">🎯 Truco de examen</p>
          <p className="mt-1">{c.tip}</p>
        </div>
        {c.note && <Note>{c.note}</Note>}
      </Card>
    </div>
  );
}
