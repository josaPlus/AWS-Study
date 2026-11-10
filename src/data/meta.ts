import type { Domain } from '../types.ts';

export const DOMAINS: Record<Domain, { name: string; short: string; weight: number }> = {
  1: { name: 'Conceptos de la nube', short: 'Conceptos', weight: 0.24 },
  2: { name: 'Seguridad y cumplimiento', short: 'Seguridad', weight: 0.3 },
  3: { name: 'Tecnología y servicios de la nube', short: 'Tecnología', weight: 0.34 },
  4: { name: 'Facturación, precios y soporte', short: 'Facturación', weight: 0.12 },
};

export const DOMAIN_IDS: Domain[] = [1, 2, 3, 4];

/** Secciones del curso, en orden. Los JSON deben usar exactamente estos nombres. */
export const SECTIONS = [
  'Cloud Computing',
  'IAM',
  'Amazon EC2',
  'Almacenamiento EC2',
  'ELB y Auto Scaling',
  'Amazon S3',
  'Bases de datos y análisis',
  'Otros servicios de cómputo',
  'Despliegue e IaC',
  'Infraestructura global',
  'Integración',
  'Monitoreo',
  'VPC y redes',
  'Seguridad y cumplimiento',
  'Machine Learning',
  'Cuentas, facturación y soporte',
  'Identidad avanzada',
  'Otros servicios y migración',
  'Arquitectura y ecosistema',
] as const;

export const CARD_TYPES = {
  concepto: 'Concepto',
  comparacion: 'Comparación',
  'caso-de-uso': 'Caso de uso',
  'dato-clave': 'Dato clave',
} as const;

/** Reparto del simulador: 65 preguntas según los pesos oficiales. */
export const EXAM = { total: 65, minutes: 90, pass: 700, perDomain: { 1: 16, 2: 19, 3: 22, 4: 8 } as Record<Domain, number> };
