import { useEffect, useState } from "react";
import { guestApi } from "../services/index.js";
import { subscribeToPublicStatsUpdates } from "./publicStatsUpdates.js";

/**
 * Hook para obtener estadísticas globales públicas (guestApi.insights)
 * Devuelve los mismos datos agregados que el panel pero solo para formularios publicados públicos.
 */
export function usePublicInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    const load = async (isPoll = false) => {
      try {
        if (!isPoll) setLoading(true);
        const result = await guestApi.insights();
        if (mounted) {
          setData(result);
          setError(null);
          retryCount = 0;
        }
      } catch (err) {
        if (mounted && !isPoll && retryCount < maxRetries) {
          retryCount++;
          // Reintento con backoff exponencial (solo carga inicial)
          setTimeout(() => load(false), 1000 * retryCount);
        } else if (mounted && !isPoll) {
          setError(err.message);
        }
      } finally {
        if (mounted && !isPoll) setLoading(false);
      }
    };

    load();

    const unsubscribe = subscribeToPublicStatsUpdates(() => load(true));

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { data, loading, error };
}

/**
 * Hook para obtener insights de una entidad específica (para entity_admin)
 */
export function useEntityInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        // Usamos entityAdminApi.entityStats que llama a /admin/entity-stats
        const { entityAdminApi } = await import("../services/index.js");
        const result = await entityAdminApi.entityStats();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}

/**
 * Hook para obtener stats públicas del super_admin
 */
export function usePublicStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const { adminApi } = await import("../services/index.js");
        const result = await adminApi.publicStats({});
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}