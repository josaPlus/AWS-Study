import { useEffect, useMemo, useRef, useState } from 'react';
import { useContent, shuffle } from '../lib/content.ts';
import { rateCard, useProgress, type Progress } from '../lib/progress.ts';
import { CARD_TYPES, DOMAINS, DOMAIN_IDS, SECTIONS } from '../data/meta.ts';
import type { Flashcard } from '../types.ts';
import { Badge, Button, Card, Note, PageHeader, ProgressBar, Select, cx } from '../components/ui.tsx';

type Mode = 'pendientes' | 'todas' | 'fallo';

const isDue = (p: Progress, id: string, now: number) => {
  const s = p.cards[id];
  return !s || s.due <= now;
};
const isFailing = (p: Progress, id: string) => {
  const s = p.cards[id];
  return !!s && (s.lastRating === 'no' || (s.lapses > 0 && s.box <= 2));
};

export default function Flashcards() {
  const { flashcards } = useContent();
  const progress = useProgress();
  const [domain, setDomain] = useState('');
  const [section, setSection] = useState('');
  const [type, setType] = useState('');
  const [mode, setMode] = useState<Mode>('pendientes');
  const [deck, setDeck] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ no: 0, duda: 0, si: 0 });

  const filtered = useMemo(
    () =>
      flashcards.filter(
        (c) => (!domain || c.domain === Number(domain)) && (!section || c.section === section) && (!type || c.type === type),
      ),
    [flashcards, domain, section, type],
  );
  const now = Date.now();
  const counts = {
    pendientes: filtered.filter((c) => isDue(progress, c.id, now)).length,
    todas: filtered.length,
    fallo: filtered.filter((c) => isFailing(progress, c.id)).length,
  };
  const boxes = [1, 2, 3, 4, 5].map((b) => filtered.filter((c) => (progress.cards[c.id]?.box ?? 0) === b).length);
  const unseen = filtered.filter((c) => !progress.cards[c.id]).length;

  const start = () => {
    let pick: Flashcard[];
    if (mode === 'pendientes') {
      const due = filtered.filter((c) => isDue(progress, c.id, now));
      const seen = shuffle(due.filter((c) => progress.cards[c.id])).sort((a, b) => progress.cards[a.id].box - progress.cards[b.id].box);
      const fresh = shuffle(due.filter((c) => !progress.cards[c.id]));
      pick = [...seen, ...fresh].slice(0, 30);
    } else if (mode === 'fallo') pick = shuffle(filtered.filter((c) => isFailing(progress, c.id)));
    else pick = shuffle(filtered);
    setDeck(pick.map((c) => c.id));
    setPos(0);
    setFlipped(false);
    setTally({ no: 0, duda: 0, si: 0 });
  };

  const sections = SECTIONS.filter((s) => flashcards.some((c) => c.section === s && (!domain || c.domain === Number(domain))));

  if (deck) {
    return (
      <Session
        deck={deck}
        setDeck={setDeck}
        pos={pos}
        setPos={setPos}
        flipped={flipped}
        setFlipped={setFlipped}
        tally={tally}
        setTally={setTally}
        cards={flashcards}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Flashcards" subtitle="Sistema Leitner de 5 cajas: lo que no sabes vuelve pronto; lo que dominas, cada vez más tarde." />
      <Card className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label="Dominio" value={domain} onChange={(e) => setDomain(e.target.value)}>
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
          <Select label="Tipo de tarjeta" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(CARD_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modo">
          {(
            [
              ['pendientes', 'Para hoy'],
              ['todas', 'Todas'],
              ['fallo', 'Solo las que fallo'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                'rounded-xl border-2 px-2 py-2 text-sm font-medium',
                mode === m ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700',
              )}
            >
              {label}
              <span className="block text-lg font-bold">{counts[m]}</span>
            </button>
          ))}
        </div>
        <Button variant="primary" className="w-full" disabled={counts[mode] === 0} onClick={start}>
          {counts[mode] === 0 ? (mode === 'fallo' ? 'No tienes tarjetas falladas 🎉' : 'Nada pendiente con estos filtros') : 'Empezar'}
        </Button>
      </Card>
      <Card>
        <p className="mb-3 text-sm font-semibold">Tus cajas ({filtered.length} tarjetas, {unseen} sin ver)</p>
        <div className="grid grid-cols-5 gap-2 text-center">
          {boxes.map((n, i) => (
            <div key={i} className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
              <p className="text-xs text-slate-500">Caja {i + 1}</p>
              <p className="text-lg font-bold">{n}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Caja 1: hoy · 2: 1 día · 3: 3 días · 4: 7 días · 5: 16 días. "No la sabía" la regresa a la caja 1; "Dudé" la mantiene en su caja
          y la repasa antes.
        </p>
      </Card>
    </div>
  );
}

function Session(props: {
  deck: string[];
  setDeck: (d: string[] | null) => void;
  pos: number;
  setPos: (n: number) => void;
  flipped: boolean;
  setFlipped: (f: boolean | ((f: boolean) => boolean)) => void;
  tally: { no: number; duda: number; si: number };
  setTally: (t: { no: number; duda: number; si: number }) => void;
  cards: Flashcard[];
}) {
  const { deck, setDeck, pos, setPos, flipped, setFlipped, tally, setTally, cards } = props;
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const progress = useProgress();
  const card = byId.get(deck[pos]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const rate = (r: 'no' | 'duda' | 'si') => {
    if (!card) return;
    rateCard(card.id, r);
    setTally({ ...tally, [r]: tally[r] + 1 });
    // "No la sabía" vuelve a aparecer al final de esta sesión.
    if (r === 'no' && deck.filter((x) => x === card.id).length < 2) setDeck([...deck, card.id]);
    setFlipped(false);
    setPos(pos + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && e.key === '1') rate('no');
      else if (flipped && e.key === '2') rate('duda');
      else if (flipped && e.key === '3') rate('si');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!card) {
    const total = tally.no + tally.duda + tally.si;
    return (
      <Card className="space-y-4 text-center">
        <p className="text-sm text-slate-500">Sesión terminada</p>
        <p className="text-3xl font-bold">{total} repasos</p>
        <div className="flex justify-center gap-2">
          <Badge tone="red">No la sabía: {tally.no}</Badge>
          <Badge tone="amber">Dudé: {tally.duda}</Badge>
          <Badge tone="green">La sabía: {tally.si}</Badge>
        </div>
        <Button variant="primary" className="w-full" onClick={() => setDeck(null)}>
          Volver
        </Button>
      </Card>
    );
  }

  const box = progress.cards[card.id]?.box;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <Button variant="ghost" onClick={() => setDeck(null)} className="px-2">
          ← Salir
        </Button>
        <ProgressBar value={(pos / deck.length) * 100} />
        <span className="shrink-0 font-semibold">
          {pos + 1}/{deck.length}
        </span>
      </div>
      <div
        className="flip-scene select-none"
        onClick={() => setFlipped((f) => !f)}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) setFlipped((f) => !f);
          touch.current = null;
        }}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Mostrar pregunta' : 'Mostrar respuesta'}
      >
        <div className={cx('flip-card relative grid min-h-72 cursor-pointer', flipped && 'flipped')}>
          <Face>
            <Meta card={card} box={box} />
            <p className="my-auto py-6 text-center text-lg font-semibold leading-relaxed whitespace-pre-line sm:text-xl">{card.front}</p>
            <p className="text-center text-xs text-slate-400">Toca, desliza o pulsa Espacio para voltear</p>
          </Face>
          <Face back>
            <Meta card={card} box={box} />
            <p className="my-auto py-6 text-center text-base leading-relaxed whitespace-pre-line sm:text-lg">{card.back}</p>
            {card.note && <Note>{card.note}</Note>}
          </Face>
        </div>
      </div>
      {flipped ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="danger" onClick={() => rate('no')}>
            No la sabía
          </Button>
          <Button variant="warning" onClick={() => rate('duda')}>
            Dudé
          </Button>
          <Button variant="success" onClick={() => rate('si')}>
            La sabía
          </Button>
        </div>
      ) : (
        <Button variant="primary" className="w-full" onClick={() => setFlipped(true)}>
          Ver respuesta
        </Button>
      )}
      <p className="hidden text-center text-xs text-slate-500 sm:block">Teclado: Espacio voltea · 1 No la sabía · 2 Dudé · 3 La sabía</p>
    </div>
  );
}

function Face({ back, children }: { back?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        'flip-face col-start-1 row-start-1 flex flex-col rounded-2xl border p-5 shadow-sm',
        back
          ? 'flip-back border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-slate-900'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      {children}
    </div>
  );
}

function Meta({ card, box }: { card: Flashcard; box?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone="blue">D{card.domain}</Badge>
      <Badge>{card.section}</Badge>
      <Badge tone="violet">{CARD_TYPES[card.type]}</Badge>
      {box && <Badge tone="amber">Caja {box}</Badge>}
    </div>
  );
}
