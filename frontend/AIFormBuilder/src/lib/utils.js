import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Human-friendly relative time, e.g. "3 hours ago". */
export function timeAgo(date, language = "en") {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [name, secs] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) {
      if (language === "es") {
        const names = { year: "año", month: "mes", week: "semana", day: "día", hour: "hora", minute: "minuto" };
        return `hace ${value} ${names[name]}${value > 1 ? "s" : ""}`;
      }
      return `${value} ${name}${value > 1 ? "s" : ""} ago`;
    }
  }
  return language === "es" ? "ahora mismo" : "just now";
}

/** Format seconds as "1m 30s". */
export function formatDuration(seconds = 0) {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const HEX_ONLY = /^#?[0-9a-f]{3,8}$/i;

/**
 * Aplica transparencia a un color.
 *
 * Acepta cualquier color CSS, no solo hex. Los hex siguen la vía rápida
 * exacta de siempre; para el resto (var(--color-brand-600), rgb(), nombres)
 * se resuelve con color-mix. Antes caía todo lo no-hex en un índigo de
 * reserva, que con un token se veía como un color equivocado en lugar de como
 * un error: el tinte de marca se habría pintado de azul sin decir nada.
 */
export function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== "string" || !hex.trim()) return `rgba(99,102,241,${alpha})`;
  if (!HEX_ONLY.test(hex.trim())) {
    return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, transparent)`;
  }
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return `rgba(99,102,241,${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten (positive) or darken (negative) a hex color by a percentage. */
export function shade(hex, percent = -15) {
  if (typeof hex !== "string") return hex;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 255) + amt);
  const g = clamp(((num >> 8) & 255) + amt);
  const b = clamp((num & 255) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Trigger a browser download for a text blob. */
export function downloadBlob(content, filename, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
