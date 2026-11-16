import { useEffect, useRef, useCallback } from "react";
import { getToken, getResolvedApiBase } from "../lib/api.js";

/**
 * Hook para suscribirse a eventos SSE de actualización de estadísticas en tiempo real.
 *
 * @param {Object} options
 * @param {string} [options.formId] - ID del formulario (para stats de formulario específico)
 * @param {string} [options.entityId] - ID de la entidad (para stats de entidad)
 * @param {boolean} [options.general=true] - Si escuchar stats generales (super_admin)
 * @param {Function} [options.onStatsUpdated] - Callback al recibir evento stats_updated
 * @param {Function} [options.onError] - Callback en caso de error de conexión
 *
 * El hook se conecta a `/api/events/stats` con token por query param.
 * Filtra eventos entrantes según formId/entityId si se proporcionan.
 */
export function useRealtimeStats({
  formId,
  entityId,
  general = true,
  onStatsUpdated,
  onError,
} = {}) {
  const onStatsUpdatedRef = useRef(onStatsUpdated);
  const onErrorRef = useRef(onError);
  onStatsUpdatedRef.current = onStatsUpdated;
  onErrorRef.current = onError;

  const shouldListenToEvent = useCallback(
    (eventData) => {
      // Si no hay filtro, escuchar todos
      if (!formId && !entityId) return true;

      // Si estamos en un formulario específico, filtrar por formId
      if (formId && eventData.formId === formId) return true;

      // Si estamos en una entidad, filtrar por entityId
      if (entityId && eventData.entityId === entityId) return true;

      return false;
    },
    [formId, entityId]
  );

  useEffect(() => {
    // No conectar si no hay token (usuario no autenticado)
    const token = getToken();
    if (!token) return;

    let es = null;
    let pollId = null;
    let closed = false;
    let retryMs = 1500;

    const base = getResolvedApiBase();
    const url = `${base}/events/stats?token=${encodeURIComponent(token)}`;

    const startPollingFallback = () => {
      if (pollId) clearInterval(pollId);
      pollId = setInterval(() => {
        onStatsUpdatedRef.current?.({ _fallbackPoll: true });
      }, 5000);
    };

    const connect = () => {
      if (closed) return;
      try {
        es = new EventSource(url);
      } catch (err) {
        onErrorRef.current?.(err);
        startPollingFallback();
        return;
      }

      es.addEventListener("stats_updated", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (shouldListenToEvent(data)) {
            onStatsUpdatedRef.current?.(data);
          }
        } catch (err) {
          onErrorRef.current?.(err);
        }
        retryMs = 1500;
      });

      es.onerror = (err) => {
        try {
          es.close();
        } catch {}
        es = null;
        if (closed) return;
        // Fallback a polling mientras reconecta
        startPollingFallback();
        onErrorRef.current?.(err);
        setTimeout(() => {
          if (closed) return;
          clearInterval(pollId);
          pollId = null;
          connect();
          retryMs = Math.min(retryMs * 1.8, 15000);
        }, retryMs);
      };

      es.onopen = () => {
        retryMs = 1500;
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (es) {
        try {
          es.close();
        } catch {}
      }
      if (pollId) clearInterval(pollId);
    };
  }, [formId, entityId, general, shouldListenToEvent]);
}