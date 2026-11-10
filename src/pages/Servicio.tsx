import { QuizSetup } from '../components/QuizSetup.tsx';
import { useContent } from '../lib/content.ts';

export default function Servicio() {
  const { serviceQuestions } = useContent();
  return (
    <QuizSetup
      title="¿Qué servicio es?"
      subtitle="Lee el caso de uso y elige el servicio de AWS. Las explicaciones te enseñan a distinguir los servicios parecidos."
      pool={serviceQuestions}
    />
  );
}
