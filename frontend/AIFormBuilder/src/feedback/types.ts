import type { ComponentType } from "react";

/* Tipos públicos del sistema de feedback.
   `Tone` es el tono del PROPIO sistema (paleta unificada). Los iconos que
   morphan (toast/status) siguen usando el Tone de state-morph — la misma
   unión literal, pero es una decisión de dibujo separada. */

export type Tone = "success" | "error" | "warning" | "info" | "loading";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  detail?: string[];
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: Tone;
  onConfirm?: () => Promise<void> | void;
}

export interface ConfirmApi {
  confirm: (opts?: ConfirmOptions) => Promise<boolean>;
  busy: boolean;
}

/** Aviso PERSISTENTE (duration: 0): no se auto-cierra, vive en la capa del
 *  Toaster y se lee por campana/layout. `read` lo gestiona markAllRead. */
export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  tone?: Tone;
  read?: boolean;
  action?: { label: string; onClick: () => void };
}

/** Opciones del borrado con confirmación escrita (DeleteDialog, T8).
 *  `word` es la palabra exacta a teclear (defecto "ELIMINAR");
 *  `onDeleted` se dispara al confirmar. */
export interface DeleteOptions extends ConfirmOptions {
  word?: string;
  requireWord?: boolean;
  caseSensitive?: boolean;
  onDeleted?: () => void;
}