/* Declaraciones de tipos para src/contexts/LanguageContext.jsx.
   Mismo patrón que lib/utils.d.ts: un .d.ts hermano para que los ficheros
   TS/TSX del sistema de feedback tipen sin migrar el JS heredado. */
import type { Context, ReactNode } from "react";

export interface LanguageContextValue {
  language: string;
  changeLanguage: (next: string) => void;
  t: (key: string) => string;
}

export const LanguageContext: Context<LanguageContextValue | null>;

export const STORAGE_KEY: string;
export const DEFAULT_LANGUAGE: string;

export function LanguageProvider(props: { children: ReactNode }): ReactNode;
export function useLanguage(): LanguageContextValue;