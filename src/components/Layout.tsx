import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cx } from './ui.tsx';

export const NAV = [
  { to: '/', label: 'Inicio', icon: '🏠', desc: 'Resumen de tu avance' },
  { to: '/flashcards', label: 'Flashcards', icon: '🃏', desc: 'Repetición espaciada (Leitner)' },
  { to: '/servicio', label: '¿Qué servicio es?', icon: '🧩', desc: 'Adivina el servicio por su caso de uso' },
  { to: '/practica', label: 'Práctica por tema', icon: '🎯', desc: 'Preguntas tipo examen con feedback' },
  { to: '/simulador', label: 'Simulador', icon: '⏱️', desc: '65 preguntas en 90 minutos' },
  { to: '/errores', label: 'Mis errores', icon: '🔁', desc: 'Repasa lo que fallaste' },
  { to: '/comparaciones', label: 'Comparaciones', icon: '⚖️', desc: 'Las trampas típicas del examen' },
  { to: '/estadisticas', label: 'Estadísticas', icon: '📊', desc: 'Dominio por sección y racha' },
  { to: '/importar', label: 'Importar y respaldo', icon: '💾', desc: 'Contenido nuevo y copia de tu progreso' },
];

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('clf-theme', dark ? 'dark' : 'light');
    } catch {
      /* sin almacenamiento */
    }
  }, [dark]);
  return [dark, setDark] as const;
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useTheme();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
          <NavLink to="/" className="flex items-center gap-2 font-bold">
            <span className="rounded-lg bg-slate-900 px-1.5 py-0.5 text-sm text-amber-400 dark:bg-amber-500 dark:text-slate-950">CLF-C02</span>
            <span className="hidden sm:inline">Estudio Cloud Practitioner</span>
          </NavLink>
          <div className="flex-1" />
          <button
            onClick={() => setDark((d) => !d)}
            className="rounded-lg p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-6 px-4">
        <nav
          className={cx(
            'fixed inset-x-0 top-14 bottom-0 z-20 overflow-y-auto bg-white p-4 dark:bg-slate-950 lg:static lg:block lg:w-56 lg:shrink-0 lg:bg-transparent lg:p-0 lg:pt-6 dark:lg:bg-transparent',
            open ? 'block' : 'hidden',
          )}
        >
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900',
                    )
                  }
                >
                  <span aria-hidden>{n.icon}</span>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 py-6 pb-24">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
