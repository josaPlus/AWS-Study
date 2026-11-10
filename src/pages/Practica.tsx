import { QuizSetup } from '../components/QuizSetup.tsx';
import { useContent } from '../lib/content.ts';

export default function Practica() {
  const { examQuestions } = useContent();
  return (
    <QuizSetup
      title="Práctica por tema"
      subtitle="Preguntas tipo examen con retroalimentación inmediata de cada opción."
      pool={examQuestions}
    />
  );
}
