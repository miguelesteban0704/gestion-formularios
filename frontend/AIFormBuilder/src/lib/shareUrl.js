import api from "./api.js";

/**
 * URL local (según window.location.origin). Sirve si ya estás en la IP de la red.
 */
export function getLocalShareUrl(slug) {
  const publicUrl = import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, "");
  if (publicUrl) return `${publicUrl}/f/${slug}`;
  return `${window.location.origin}/f/${slug}`;
}

/**
 * Determina si el origin actual es localhost y necesita alternativa de red.
 */
export function isLocalhostOrigin() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * Pide al backend las IPs de la máquina para construir URLs de red.
 * Devuelve { ips: string[], networkUrls: string[] }
 */
export async function fetchNetworkInfo() {
  try {
    const { data } = await api.get("/meta/network");
    return data.data; // { ips, networkUrls, frontendPort }
  } catch {
    return { ips: [], networkUrls: [], frontendPort: "5173" };
  }
}

/**
 * Construye URL de red para un slug dado un networkOrigin (ej http://192.168.1.10:5173)
 */
export function buildNetworkShareUrl(slug, networkOrigin) {
  if (!networkOrigin) return null;
  return `${networkOrigin.replace(/\/$/, "")}/f/${slug}`;
}
