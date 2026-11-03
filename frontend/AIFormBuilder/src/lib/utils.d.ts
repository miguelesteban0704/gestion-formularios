/**
 * Declaración de tipos para `src/lib/utils.js`.
 *
 * El proyecto es JavaScript: esto NO reimplementa nada, solo le dice al
 * comprobador qué forma tiene lo que ya existe. Sin este archivo, `tsc`
 * no puede tipar un `.tsx` que importe `cn` y el chequeo de tipos
 * arrastraría a todo el proyecto.
 */

import type { ClassValue } from "clsx";

/** Une clases condicionales resolviendo conflictos de Tailwind. */
export declare function cn(...inputs: ClassValue[]): string;

/** Tiempo relativo legible, p. ej. "hace 3 horas". */
export declare function timeAgo(date: string | number | Date, language?: "es" | "en"): string;

/** Formatea segundos como "1m 30s". */
export declare function formatDuration(seconds?: number): string;

export declare function formatDate(date: string | number | Date): string;

export declare function initials(name?: string): string;

/** Convierte un hex (`#rrggbb` o `#rgb`) a `rgba(...)`. */
export declare function hexToRgba(hex: string, alpha?: number): string;

/** Aclara (`percent` negativo) u oscurece (`positivo`) un color hex. */
export declare function shade(hex: string, percent?: number): string;

/** Fuerza la descarga de un texto como fichero. */
export declare function downloadBlob(content: BlobPart, filename: string, type?: string): void;
