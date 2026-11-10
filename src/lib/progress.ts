// Progreso del usuario guardado en localStorage. Sin backend.
import { useSyncExternalStore } from 'react';
import type { Flashcard, Question } from '../types.ts';

export const STORAGE_KEY = 'clf-progress-v1';
const SCHEMA = 1;

export interface CardState {
  box: number; // 1..5 (Leitner)
  due: number; // timestamp en ms
  lapses: number; // veces marcada como "No la sabía"
  lastRating?: 'no' | 'duda' | 'si';
  seen: number;
}

export interface QuestionState {
  attempts: number;
  correct: number;
  wrong: number;
  streak: number; // aciertos consecutivos
  inMistakes: boolean;
  lastAt: number;
}

export interface ExamResult {
  date: number;
  score: number;
  correct: number;
  total: number;
  byDomain: Record<string, { correct: number; total: number }>;
  seconds: number;
}

export interface ExamSession {
  questionIds: string[];
  /** Orden barajado de opciones por pregunta. */
  optionOrder: Record<string, string[]>;
  answers: Record<string, string[]>;
  flagged: string[];
  current: number;
  startedAt: number;
  endsAt: number;
  finishedAt?: number;
}

export interface Progress {
  schema: number;
  cards: Record<string, CardState>;
  questions: Record<string, QuestionState>;
  activityDays: string[]; // YYYY-MM-DD
  exams: ExamResult[];
  exam?: ExamSession;
  custom: { flashcards: Flashcard[]; questions: Question[] };
}

const empty = (): Progress => ({
  schema: SCHEMA,
  cards: {},
  questions: {},
  activityDays: [],
  exams: [],
  custom: { flashcards: [], questions: [] },
});

function normalize(raw: any): Progress {
  const base = empty();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    schema: SCHEMA,
    cards: raw.cards ?? {},
    questions: raw.questions ?? {},
    activityDays: Array.isArray(raw.activityDays) ? raw.activityDays : [],
    exams: Array.isArray(raw.exams) ? raw.exams : [],
    custom: {
      flashcards: Array.isArray(raw.custom?.flashcards) ? raw.custom.flashcards : [],
      questions: Array.isArray(raw.custom?.questions) ? raw.custom.questions : [],
    },
  };
}

function load(): Progress {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? normalize(JSON.parse(s)) : empty();
  } catch {
    return empty();
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento lleno o bloqueado: seguimos en memoria */
  }
  listeners.forEach((l) => l());
}

export function update(fn: (draft: Progress) => Progress) {
  commit(fn(state));
}

export function getProgress() {
  return state;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// Sincroniza entre pestañas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function withActivity(p: Progress): Progress {
  const t = today();
  return p.activityDays.includes(t) ? p : { ...p, activityDays: [...p.activityDays, t] };
}

// ---------- Leitner ----------
const DAY = 86_400_000;
/** Intervalo (días) tras subir a cada caja. Caja 1 = hoy mismo. */
const INTERVALS = [0, 0, 1, 3, 7, 16];

export function rateCard(id: string, rating: 'no' | 'duda' | 'si') {
  update((p) => {
    const prev = p.cards[id] ?? { box: 1, due: 0, lapses: 0, seen: 0 };
    let box = prev.box;
    if (rating === 'no') box = 1;
    else if (rating === 'si') box = Math.min(5, box + 1);
    const now = Date.now();
    const days = rating === 'duda' ? Math.max(0, INTERVALS[box] / 2) : INTERVALS[box];
    const due = rating === 'no' ? now : now + days * DAY;
    const card: CardState = {
      box,
      due,
      lapses: prev.lapses + (rating === 'no' ? 1 : 0),
      lastRating: rating,
      seen: prev.seen + 1,
    };
    return withActivity({ ...p, cards: { ...p.cards, [id]: card } });
  });
}

// ---------- Preguntas ----------
export function recordAnswer(id: string, isCorrect: boolean) {
  update((p) => {
    const prev = p.questions[id] ?? { attempts: 0, correct: 0, wrong: 0, streak: 0, inMistakes: false, lastAt: 0 };
    const next: QuestionState = { ...prev, attempts: prev.attempts + 1, lastAt: Date.now() };
    if (isCorrect) {
      next.correct++;
      next.streak++;
      // Sale de "Mis errores" tras 2 aciertos seguidos.
      if (next.inMistakes && next.streak >= 2) next.inMistakes = false;
    } else {
      next.wrong++;
      next.streak = 0;
      next.inMistakes = true;
    }
    return withActivity({ ...p, questions: { ...p.questions, [id]: next } });
  });
}

export function recordMany(results: { id: string; correct: boolean }[]) {
  for (const r of results) recordAnswer(r.id, r.correct);
}

export function isAnswerCorrect(q: Question, selected: string[]) {
  return selected.length === q.correct.length && q.correct.every((c) => selected.includes(c));
}

// ---------- Rachas ----------
export function dayStreak(days: string[]): number {
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1); // la racha sigue viva si estudiaste ayer
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ---------- Exportar / importar ----------
export function exportProgress(): string {
  return JSON.stringify({ app: 'aws-clf-c02-estudio', exportedAt: new Date().toISOString(), progress: state }, null, 2);
}

export function importProgress(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const data = JSON.parse(json);
    const raw = data?.progress ?? data;
    if (!raw || typeof raw !== 'object' || (!raw.cards && !raw.questions)) {
      return { ok: false, error: 'El archivo no parece un respaldo de progreso de esta app.' };
    }
    commit(normalize(raw));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'JSON inválido: ' + (e as Error).message };
  }
}

export function resetProgress(keepCustom = true) {
  const custom = state.custom;
  commit(keepCustom ? { ...empty(), custom } : empty());
}

export function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
