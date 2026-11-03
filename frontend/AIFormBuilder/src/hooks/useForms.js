import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formApi, guestApi } from "../services/index.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "./useAuth.js";

/** Loads and mutates the current user's forms with optimistic UI helpers. */
/** Solo carga cuando el usuario está autenticado: sin sesión todo permanece vacío. */
/* guestMode: escaparate de invitados (publicados de todos, sin sesión). */
export function useForms({ search = "", filter = "all", publicOnly = false, guestMode = false } = {}) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const load = useCallback(async () => {
    // Escaparate: publicados de todos sin necesidad de sesión. El filtrado
    // por pestaña y buscador lo hace FilteredFormsList en cliente.
    if (guestMode) {
      setLoading(true);
      try {
        const data = await guestApi.listForms({});
        setForms(data.forms || data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    // Requisito: sin autenticación no se carga ningún formulario, todo vacío.
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setForms([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = publicOnly
        ? await formApi.listPublic({ search })
        : await formApi.list({ search, filter });
      setForms(data);
      setError(null);
    } catch (err) {
      // Si el backend responde 401, reseteamos a vacío en lugar de mostrar datos residuales
      if (err?.response?.status === 401 || err?.status === 401) {
        setForms([]);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filter, publicOnly, guestMode, isAuthenticated, authLoading]);

  useEffect(() => {
    load();
  }, [load]);

  // Limpieza inmediata al cerrar sesión: evita mostrar datos residuales
  useEffect(() => {
    if (guestMode) return;
    if (!authLoading && !isAuthenticated) {
      setForms([]);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, authLoading, guestMode]);

  const remove = useCallback(async (id) => {
    if (!isAuthenticated || guestMode) return;
    setForms((prev) => prev.filter((f) => f._id !== id));
    try {
      await formApi.remove(id);
      toast.success(t("formDeleted"));
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }, [load, isAuthenticated, guestMode, t]);

  const duplicate = useCallback(async (id) => {
    if (!isAuthenticated || guestMode) return;
    try {
      const copy = await formApi.duplicate(id);
      setForms((prev) => [copy, ...prev]);
      toast.success(t("formDuplicated"));
    } catch (err) {
      toast.error(err.message);
    }
  }, [isAuthenticated, guestMode, t]);

  const patch = useCallback(async (id, updates) => {
    if (!isAuthenticated || guestMode) return;
    setForms((prev) => prev.map((f) => (f._id === id ? { ...f, ...updates } : f)));
    try {
      await formApi.update(id, updates);
    } catch (err) {
      toast.error(err.message);
      load();
    }
  }, [load, isAuthenticated, guestMode, t]);

  return { forms, loading, error, reload: load, remove, duplicate, patch, setForms };
}
