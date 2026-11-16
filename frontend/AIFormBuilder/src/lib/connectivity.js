import { useLanguage } from "../contexts/LanguageContext.jsx";

/**
 * Comprueba si hay conexión a internet y la API es accesible.
 * Usa navigator.onLine + un ping rápido al endpoint de salud de la API.
 *
 * @returns {Promise<{ online: boolean; message?: string }>}
 */
export async function checkConnectivity() {
  // Comprobación rápida del indicador del navegador
  if (!navigator.onLine) {
    return { online: false, message: "offline" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const apiBase = import.meta.env.VITE_API_URL || "/api";
    const healthUrl = `${apiBase}/health`;

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json" },
      // No usar credentials para que sea más rápido y no requiera cookies
      credentials: "omit",
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { online: true };
    }

    return { online: false, message: `api_error_${response.status}` };
  } catch (err) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return { online: false, message: "timeout" };
    }
    // Error de red (ECONNREFUSED, ENOTFOUND, etc.)
    return { online: false, message: "network_error" };
  }
}

/**
 * Hook para comprobar conectividad antes de acciones que envían correo.
 * Devuelve una función que muestra un modal de error si no hay conexión.
 */
export function useOfflineGuard() {
  const { language } = useLanguage();
  const isSpanish = language === "es";

  const getOfflineMessage = (context) => {
    const messages = {
      register: isSpanish
        ? "No hay conexión a internet. No se puede crear la cuenta ni enviar el correo de bienvenida. Inténtalo más tarde."
        : "No internet connection. Cannot create the account or send the welcome email. Please try again later.",
      forgot: isSpanish
        ? "No hay conexión a internet. No se puede enviar el código de recuperación. Inténtalo más tarde."
        : "No internet connection. Cannot send the recovery code. Please try again later.",
      resend: isSpanish
        ? "No hay conexión a internet. No se puede reenviar el correo. Inténtalo más tarde."
        : "No internet connection. Cannot resend the email. Please try again later.",
    };
    return messages[context];
  };

  const getOfflineTitle = (context) => {
    const titles = {
      register: isSpanish ? "Sin conexión" : "Offline",
      forgot: isSpanish ? "Sin conexión" : "Offline",
      resend: isSpanish ? "Sin conexión" : "Offline",
    };
    return titles[context];
  };

  /**
   * Verifica la conectividad y lanza un error si no hay conexión.
   * El error incluye el mensaje localizado para mostrar en un modal.
   */
  const guard = async (context) => {
    const { online, message: _message } = await checkConnectivity();
    if (!online) {
      const error = new Error(getOfflineMessage(context));
      // Adjuntar metadatos para que el componente sepa que es un error de conectividad
      error.offline = true;
      error.offlineContext = context;
      error.offlineTitle = getOfflineTitle(context);
      throw error;
    }
  };

  return { guard, checkConnectivity };
}

/**
 * Comprueba conectividad de forma síncrona (solo navigator.onLine)
 * para casos donde no se quiere hacer el ping a la API.
 */
export function isOnline() {
  return navigator.onLine;
}

export default { checkConnectivity, useOfflineGuard, isOnline };