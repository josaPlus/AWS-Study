import type { Flashcard, Question } from '../types.ts';
import type { Progress } from './progress.ts';

export interface Mastery {
  cards: number;
  cardsSeen: number;
  cardScore: number; // 0..100 (caja media / 5)
  questions: number;
  answered: number;
  attempts: number;
  correct: number;
  accuracy: number; // 0..100
  mastery: number; // 0..100 combinado
}

/** Dominio combinado: 50 % flashcards (caja Leitner) + 50 % aciertos en preguntas, ponderado por cobertura. */
export function mastery(cards: Flashcard[], questions: Question[], p: Progress): Mastery {
  const seen = cards.filter((c) => p.cards[c.id]);
  const boxSum = cards.reduce((s, c) => s + (p.cards[c.id]?.box ?? 0), 0);
  const cardScore = cards.length ? (boxSum / (cards.length * 5)) * 100 : 0;
  let attempts = 0;
  let correct = 0;
  let answered = 0;
  for (const q of questions) {
    const st = p.questions[q.id];
    if (!st) continue;
    answered++;
    attempts += st.attempts;
    correct += st.correct;
  }
  const accuracy = attempts ? (correct / attempts) * 100 : 0;
  const coverage = questions.length ? answered / questions.length : 0;
  const qScore = accuracy * coverage;
  const parts = [cards.length ? cardScore : null, questions.length ? qScore : null].filter((x): x is number => x !== null);
  return {
    cards: cards.length,
    cardsSeen: seen.length,
    cardScore: Math.round(cardScore),
    questions: questions.length,
    answered,
    attempts,
    correct,
    accuracy: Math.round(accuracy),
    mastery: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0,
  };
}
