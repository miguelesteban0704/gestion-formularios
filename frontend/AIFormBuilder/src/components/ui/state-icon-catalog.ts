/**
 * Catálogo de los iconos de estado animado.
 *
 * Vive aparte de los componentes a propósito: un fichero que exporta
 * componentes y además constantes rompe el fast refresh de Vite, que
 * solo funciona si el módulo exporta componentes y nada más.
 */

import type { ComponentType } from "react";
import {
  SuccessIcon,
  MenuCloseIcon,
  PlayPauseIcon,
  LockUnlockIcon,
  CopiedIcon,
  NotificationIcon,
  HeartIcon,
  DownloadDoneIcon,
  SendIcon,
  ToggleIcon,
  EyeToggleIcon,
  VolumeIcon,
  type StateIconProps,
} from "./animated-state-icons";

export interface StateIconEntry {
  /** Nombre legible. */
  name: string;
  /** Prop con el nombre propio del estado, para leer el código en claro. */
  alias: string;
  /** Qué significa cada extremo de la transformación. */
  states: string;
  /** Tinte del marco en el catálogo. Sale de la paleta del proyecto. */
  tint: string;
  Component: ComponentType<StateIconProps>;
}

export const STATE_ICONS: readonly StateIconEntry[] = [
  { name: "Success",      Component: SuccessIcon,      alias: "done",     states: "cargando → éxito",     tint: "var(--color-success)" },
  { name: "Menu",         Component: MenuCloseIcon,    alias: "open",     states: "menú → aspa",         tint: "var(--color-ink)" },
  { name: "Play/Pause",   Component: PlayPauseIcon,    alias: "playing",  states: "reproducir → pausa",  tint: "var(--color-info)" },
  { name: "Lock",         Component: LockUnlockIcon,   alias: "unlocked", states: "bloqueado → abierto", tint: "var(--color-warning)" },
  { name: "Copied",       Component: CopiedIcon,       alias: "copied",   states: "copiar → copiado",    tint: "var(--color-success)" },
  { name: "Notification", Component: NotificationIcon, alias: "active",   states: "reposo → aviso",      tint: "var(--color-danger)" },
  { name: "Heart",        Component: HeartIcon,        alias: "active",   states: "vacío → lleno",       tint: "var(--color-danger)" },
  { name: "Download",     Component: DownloadDoneIcon, alias: "done",     states: "descargando → listo", tint: "var(--color-info)" },
  { name: "Send",         Component: SendIcon,         alias: "sent",     states: "en espera → enviado", tint: "var(--color-success)" },
  { name: "Toggle",       Component: ToggleIcon,       alias: "active",   states: "apagado → encendido", tint: "var(--color-brand-500)" },
  { name: "Eye",          Component: EyeToggleIcon,    alias: "hidden",   states: "visible → oculto",    tint: "var(--color-ink-muted)" },
  { name: "Volume",       Component: VolumeIcon,       alias: "muted",    states: "sonando → silencio",  tint: "var(--color-ink)" },
];
