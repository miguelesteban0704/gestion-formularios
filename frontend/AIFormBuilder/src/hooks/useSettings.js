import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../services/index.js";
import { toast } from "sonner";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export const SETTINGS_KEY = ["settings"];

/** Patrón "un solo toast": nace en carga (spinner) y se actualiza en el
 *  mismo sitio al resolver → success, sin parpadeo ni duplicados.
 *  Cada llamada tiene su propio id: dos guardados simultáneos no se pisan.
 *  Los mensajes son claves i18n (ES/EN): el hook los resuelve al vuelo. */
const tracked = (fn, t, pendingKey, doneKey, failKey) => (...args) => {
  const id = toast.loading(t(pendingKey));
  return fn(...args).then(
    (res) => {
      toast.update(id, { title: t(doneKey), type: "success", duration: 3200 });
      return res;
    },
    (err) => {
      toast.update(id, {
        title: (failKey && t(failKey)) || err?.response?.data?.message || err?.message || t("errorSaving"),
        type: "error",
        duration: 5200,
      });
      throw err;
    }
  );
};

// ─── Fetch principal ──────────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: settingsApi.get,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

// ─── Perfil ───────────────────────────────────────────────────────────────────
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.updateProfile, t, "savingProfile", "profileSaved", "errorSaving"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.uploadAvatar, t, "uploadingAvatar", "avatarUploaded", "errorSaving"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.deleteAvatar, t, "removingAvatar", "avatarRemoved", "errorSaving"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

// ─── Notificaciones ───────────────────────────────────────────────────────────
export function useUpdateNotifications() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.updateNotifications, t, "savingPreferences", "preferencesSaved", "errorSaving"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

// ─── Apariencia ───────────────────────────────────────────────────────────────
export function useUpdateAppearance() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.updateAppearance, t, "savingAppearance", "appearanceSaved", "errorSaving"),
    onSuccess: (data, vars) => {
      // Refleja lo persistido antes de invalidar: la barra de "cambios sin
      // guardar" se apaga en el mismo instante, sin esperar al refetch.
      if (vars) qc.setQueryData(SETTINGS_KEY, (old) => ({ ...(old || {}), ...vars, ...(data || {}) }));
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────
export function useSessions() {
  return useQuery({
    queryKey: ["settings", "sessions"],
    queryFn: settingsApi.getSessions,
    staleTime: 1000 * 30,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.revokeSession, t, "closingSession", "sessionClosed", "errorSaving"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "sessions"] });
    },
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(
      settingsApi.revokeOtherSessions,
      t,
      "closingOtherSessions",
      "otherSessionsClosed",
      "errorSaving"
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "sessions"] });
    },
  });
}

// ─── Cuenta ───────────────────────────────────────────────────────────────────
export function useDeactivateAccount() {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.deactivateAccount, t, "deactivatingAccount", "deactivatedToast", "errorSaving"),
  });
}

export function useDeleteAccount() {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: tracked(settingsApi.deleteAccount, t, "deletingAccount", "accountDeleted", "errorSaving"),
  });
}
