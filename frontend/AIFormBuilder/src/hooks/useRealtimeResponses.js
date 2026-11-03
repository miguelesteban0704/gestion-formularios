import { useEffect, useRef } from "react";
import { getToken, getResolvedApiBase } from "../lib/api.js";

/**
 * Suscripción SSE a respuestas de un formulario en tiempo real con exactitud.
 * - Usa EventSource con token por query (EventSource no soporta headers)
 * - Reconexión automática con backoff
 * - Fallback a polling cada 5s si SSE falla
 */
export function useRealtimeResponses(formId, { onCreated, onDeleted } = {}) {
  const onCreatedRef = useRef(onCreated);
  const onDeletedRef = useRef(onDeleted);
  onCreatedRef.current = onCreated;
  onDeletedRef.current = onDeleted;

  useEffect(() => {
    if (!formId) return;
    let es = null;
    let pollId = null;
    let closed = false;
    let retryMs = 1500;

    const token = getToken();
    if (!token) return;

    const base = getResolvedApiBase();
    const url = `${base}/forms/${formId}/responses/stream?token=${encodeURIComponent(token)}`;

    const startPollingFallback = () => {
      if (pollId) clearInterval(pollId);
      pollId = setInterval(() => {
        // Dispara un refetch suave via onCreated sin payload (el caller hace fetch)
        onCreatedRef.current?.({ _fallbackPoll: true });
      }, 5000);
    };

    const connect = () => {
      if (closed) return;
      try {
        es = new EventSource(url);
      } catch {
        startPollingFallback();
        return;
      }

      es.addEventListener("response_created", (e) => {
        try {
          const data = JSON.parse(e.data);
          onCreatedRef.current?.(data);
        } catch {}
        retryMs = 1500;
      });

      es.addEventListener("response_deleted", (e) => {
        try {
          const data = JSON.parse(e.data);
          onDeletedRef.current?.(data);
        } catch {}
      });

      es.onerror = () => {
        try { es.close(); } catch {}
        es = null;
        if (closed) return;
        // Fallback a polling mientras reconecta
        startPollingFallback();
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
        if (pollId) { clearInterval(pollId); pollId = null; }
      };
    };

    connect();

    return () => {
      closed = true;
      if (es) try { es.close(); } catch {}
      if (pollId) clearInterval(pollId);
    };
  }, [formId]);
}
