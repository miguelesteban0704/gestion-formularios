import { alertAPI } from "./alertStore";

function classifyLog(message: string): "success" | "error" | "info" {
  if (/🚨 ERROR CRÍTICO AL ENVIAR CORREO/.test(message)) return "error";
  if (/✅ APIMailer respondió con éxito/.test(message)) return "success";
  return "info";
}

/**
 * Muestra cada mensaje de diagnóstico del envío de correo como una alerta
 * de diálogo, exactamente como viaja desde el backend (sin reinterpretar ni
 * traducir). Se conecta al interceptor de respuesta de `lib/api.js` para que
 * cualquier endpoint de correo (alta, reenvío, recuperación) dispare sus
 * alertas automáticamente.
 */
export function showMailDialogs(logs: string[]): void {
  for (const message of logs) {
    alertAPI[classifyLog(message)](message);
  }
}
