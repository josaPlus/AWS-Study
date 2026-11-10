import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { Layout } from './components/Layout.tsx';
import Home from './pages/Home.tsx';
import Flashcards from './pages/Flashcards.tsx';
import Servicio from './pages/Servicio.tsx';
import Practica from './pages/Practica.tsx';
import Simulador from './pages/Simulador.tsx';
import Errores from './pages/Errores.tsx';
import Comparaciones from './pages/Comparaciones.tsx';
import Estadisticas from './pages/Estadisticas.tsx';
import Importar from './pages/Importar.tsx';

// HashRouter: las rutas viven después del "#", así recargar nunca da 404 en hosting estático.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="servicio" element={<Servicio />} />
          <Route path="practica" element={<Practica />} />
          <Route path="simulador" element={<Simulador />} />
          <Route path="errores" element={<Errores />} />
          <Route path="comparaciones" element={<Comparaciones />} />
          <Route path="estadisticas" element={<Estadisticas />} />
          <Route path="importar" element={<Importar />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
