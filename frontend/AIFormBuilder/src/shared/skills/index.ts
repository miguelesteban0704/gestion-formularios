/**
 * Skills compartidos — capa `src/shared/skills`.
 *
 * Barrel de las piezas reutilizables TIPADAS del proyecto: hooks, helpers del
 * sistema de feedback, primitivas de overlay, formateadores, validadores y un
 * cliente HTTP genérico. No reimplementa nada: re-exporta lo que ya existe y
 * tipa la superficie común para que el código nuevo no tenga que recordar
 * rutas dispersas.
 *
 * Los módulos heredados sólo-JS que ya tienen un `.d.ts` hermano (api.js,
 * routes.js, roles.js, services/index.js) se re-exportan TAMBIÉN como tipos
 * (`export type`), para que el código nuevo consuma sus contratos desde un
 * único punto. Los módulos sin `.d.ts` (fieldTypes.js, themes.js, validate.js…)
 * siguen documentados en `./README.md` y se importan directo: el
 * `allowJs: false` del tsconfig no puede tipar sus miembros.
 */

/* ── Hooks y primitivas del sistema de feedback (tipados) ─────────────── */
export { useConfirm } from "@/hooks/useConfirm";
export { useDeleteConfirm } from "@/hooks/useDeleteConfirm";
export { useDialog } from "@/hooks/useDialog";
export { useModal } from "@/hooks/useModal";
export { useNotification } from "@/hooks/useNotification";

export type { AppNotification, ConfirmApi, ConfirmOptions, DeleteOptions, Tone } from "@/feedback/types";

/* ── Stores externos + overlays ───────────────────────────────────────── */
export * from "@/feedback/store";
export * from "@/feedback/overlay";

/* ── Variantes CVA del feedback ───────────────────────────────────────── */
export { alertTone, buttonVariant, dialogSize } from "@/feedback/variants";
export type { AlertTone, DialogSize, FeedbackButtonVariant } from "@/feedback/variants";

/* ── Formateadores y clases (fuente: lib/utils.js) ────────────────────── */
export { cn, timeAgo, formatDuration, formatDate, initials, hexToRgba, shade, downloadBlob } from "@/lib/utils";

/* ── Tipos de los módulos heredados (vía sus `.d.ts` hermanos) ─────────── */
export type { ApiClient } from "@/lib/api";
export type {
  PanelLanguage,
  RouteKey,
  RouteRow,
  ResolvedPanelRoute,
  PanelRelative,
  LegacyRoute,
} from "@/lib/routes";
export type { RoleName, SiteUser } from "@/lib/roles";
export type {
  AccessApi,
  AdminApi,
  AiApi,
  AuthApi,
  FormApi,
  GuestApi,
  InsightsApi,
  LocalAuthApi,
  NotificationApi,
  ResponseApi,
  SettingsApi,
  ApiValue,
  ApiParams,
} from "@/services/index";

/* ═══════════════════════════════════════════════════════════════════════
   Añadidos genéricos: lo que el proyecto necesitaba y no existía.
   ═══════════════════════════════════════════════════════════════════════ */

/** Moneda formateada según locale. El proyecto no tenía helper de moneda. */
export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/** Número con separadores de miles. */
export function formatNumber(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Porcentaje legible a partir de una fracción 0–1 (`0.42` → `42%`). */
export function formatPercent(fraction: number, locale = "en-US", digits = 0): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fraction);
}

/** Convierte un texto en un slug apto para URL. */
export function slugify(text: string, separator = "-"): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, "g"), "");
}

/* ── Validadores puros (booleanos; composables) ───────────────────────── */
export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isStrongPassword(value: string, min = 8): boolean {
  return value.length >= min && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

/** Colección de validadores para uso por nombre. */
export const validators = {
  isBlank,
  isEmail,
  isUrl,
  isStrongPassword,
} as const;

/* ── Cliente HTTP genérico (fetch tipado) ─────────────────────────────── */
export interface HttpOptions extends Omit<RequestInit, "body" | "headers"> {
  /** Cuerpo JSON serializado automáticamente. */
  json?: unknown;
  /** Token Bearer opcional. */
  token?: string;
  headers?: Record<string, string>;
}

export interface HttpError extends Error {
  status: number;
  body: unknown;
}

/**
 * Petición `fetch` tipada con JSON y errores legibles. El proyecto ya tiene
 * el cliente axios en `@/lib/api.js` para los servicios existentes; este es el
 * helper genérico, sin dependencias, para código nuevo en TS.
 */
export async function http<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
  const { json, token, headers, ...rest } = options;

  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : null,
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as HttpError;
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body as T;
}
