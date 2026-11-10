export type Domain = 1 | 2 | 3 | 4;
export type CardType = 'concepto' | 'comparacion' | 'caso-de-uso' | 'dato-clave';

export interface Flashcard {
  id: string;
  domain: Domain;
  section: string;
  type: CardType;
  front: string;
  back: string;
  tags: string[];
  difficulty: 1 | 2 | 3;
  /** Aviso opcional, p. ej. servicio retirado o cerrado a clientes nuevos. */
  note?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  explanation: string;
}

export interface Question {
  id: string;
  domain: Domain;
  section: string;
  mode: 'examen' | 'servicio';
  type: 'single' | 'multiple';
  selectCount: number;
  stem: string;
  options: QuestionOption[];
  correct: string[];
  summary: string;
  refs: string[];
  source: string;
  note?: string;
}
