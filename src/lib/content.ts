import { useMemo } from 'react';
import builtinCards from '../data/flashcards.json';
import builtinQuestions from '../data/questions.json';
import type { Flashcard, Question } from '../types.ts';
import { useProgress } from './progress.ts';

const BASE_CARDS = builtinCards as Flashcard[];
const BASE_QUESTIONS = builtinQuestions as Question[];

function merge<T extends { id: string }>(base: T[], extra: T[]): T[] {
  if (!extra.length) return base;
  const map = new Map(base.map((x) => [x.id, x]));
  for (const x of extra) map.set(x.id, x);
  return [...map.values()];
}

/** Contenido del repo + contenido importado localmente (el importado reemplaza por id). */
export function useContent() {
  const { custom } = useProgress();
  return useMemo(() => {
    const flashcards = merge(BASE_CARDS, custom.flashcards);
    const questions = merge(BASE_QUESTIONS, custom.questions);
    const byId = new Map(questions.map((q) => [q.id, q]));
    return {
      flashcards,
      questions,
      examQuestions: questions.filter((q) => q.mode === 'examen'),
      serviceQuestions: questions.filter((q) => q.mode === 'servicio'),
      questionById: byId,
    };
  }, [custom]);
}

export const builtinIds = {
  flashcards: new Set(BASE_CARDS.map((c) => c.id)),
  questions: new Set(BASE_QUESTIONS.map((q) => q.id)),
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
