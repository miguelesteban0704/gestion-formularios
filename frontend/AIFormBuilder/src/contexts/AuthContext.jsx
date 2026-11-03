import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi, localAuthApi, guestApi, accessApi } from "../services/index.js";
import {
  TOKEN_KEY,
  REALMS,
  getRealmToken,
  setRealmToken,
  setActiveRealm,
  listRealms,
  dropRealm,
  clearToken,
  getResolvedApiBase,
  marcarTraspaso,
} from "../lib/api.js";
import { isSuper, isEntityAdmin, isCreator, isGuest, homePathForRole } from "../lib/roles.js";
import { SUPER_ADMIN_LOGIN_PATH } from "../lib/routes.js";
import { accessDoorFor } from "../lib/accessDoor.js";
import { AuthTransition } from "../components/auth/AuthTransition.jsx";

export const AuthContext = createContext(null);

/**
 * Reino (ranura de sesión) al que pertenece un usuario. El backend ya aísla las
 * sesiones por `jti`; esto es la mitad del navegador: cada rol guarda su token
 * aparte para que entrar o salir de uno no toque a los demás.
 */
function realmForUser(user) {
  if (!user) return null;
  if (isGuest(user)) return REALMS.GUEST;
  if (isSuper(user)) return REALMS.SUPER;
  if (isEntityAdmin(user)) return REALMS.ENTITY;
  if (isCreator(user)) return REALMS.CREATOR;
  return REALMS.ACCOUNT;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transition, setTransition] = useState({ active: false, type: null });

  /* Un token recién llegado (login local o retorno del IDP) no dice su rol
     todavía: se guarda en una ranura temporal, se pregunta a /me y el token
     pasa a la ranura de su rol. Así `loginLocal` y el callback del IDP
     comparten un único camino. */
  const restoreWithToken = useCallback(async (token) => {
    setRealmToken(REALMS.PENDING, token);
    try {
      const { user: current } = await authApi.me();
      const realm = realmForUser(current) || REALMS.ACCOUNT;
      setRealmToken(realm, token);
      dropRealm(REALMS.PENDING);
      setUser(current);
      return current;
    } catch (error) {
      dropRealm(REALMS.PENDING);
      throw error;
    }
  }, []);

  // Restaura la sesión guardada en la primera carga.
  useEffect(() => {
    localStorage.removeItem("token");
    (async () => {
      const saved = listRealms();

      // Ranura única de versiones anteriores: se migra una sola vez.
      const legacy = localStorage.getItem(TOKEN_KEY);
      if (!saved.length && legacy) {
        try {
          await restoreWithToken(legacy);
        } catch {
          localStorage.removeItem(TOKEN_KEY);
        }
        setLoading(false);
        return;
      }

      /* Se prueban las sesiones guardadas de la más reciente a la más antigua.
         Una caducada o revocada se descarta y se cede el turno a la siguiente;
         solo si no queda ninguna se abre la aplicación sin sesión. */
      for (let i = saved.length - 1; i >= 0; i--) {
        const realm = saved[i];
        const token = getRealmToken(realm);
        if (!token) continue;
        setActiveRealm(realm);
        try {
          const { user: current } = await authApi.me();
          setRealmToken(realm, token); // confirma la sesión y la sube al frente
          setUser(current);
          setLoading(false);
          return;
        } catch {
          dropRealm(realm);
        }
      }
      setLoading(false);
    })();
  }, [restoreWithToken]);

  const startTransition = useCallback((type) => {
    setTransition({ active: true, type });
  }, []);

  const logout = useCallback(async () => {
    startTransition("logout");
    /* Se enciende ANTES de la llamada, no después: el token se borra más abajo,
       así que mientras dura la petición el interceptor de 401 todavía lo ve y
       ante un 401 recargaba la página a `/login`, compitiendo con el
       `location.assign` de este mismo logout. Con el traspaso marcado, ese
       camino se aparta y la única navegación es la de salida. */
    marcarTraspaso(true);

    const realm = realmForUser(user);

    /* El administrador de entidad y el creador entraron por SU puerta `/a/<slug>`
       (credenciales locales, sin sesión en el proveedor de identidad): al cerrar
       sesión se les devuelve a esa misma puerta, no al cierre del IDP. */
    const door = isEntityAdmin(user) || isCreator(user) ? accessDoorFor(user.role) : null;

    /* El super_admin entra por el portal oculto con login LOCAL: no tiene
       sesión en el IDP, así que mandarle al cierre del IDP lo devolvía a
       `/` (la portada de invitados) en vez de a su puerta. Revoca por el
       cierre local —que además audita `auth.local.logout`— y vuelve a
       `/formularios-con-ia-loginadmin`. El resto de la aplicación sigue el
       flujo del proveedor de identidad, que es el suyo. */
    try {
      if (isSuper(user)) await localAuthApi.logout();
      else await authApi.logoutSession();
    } catch {}

    /* Solo se cae la ranura de ESTE rol. La sesión de invitado es anónima y la
       crea el propio sitio al pasar por la portada: NO es un relevo, así que se
       descarta también para que cerrar una cuenta real no devuelva al usuario a
       la página de invitado. Si queda otra sesión REAL (p. ej. el super_admin
       que seguía dentro), se reactiva: es un relevo, no una expulsión. */
    dropRealm(realm);
    dropRealm(REALMS.GUEST);
    const remaining = listRealms(); // del más antiguo al más reciente
    const nextRealm = remaining.length ? remaining[remaining.length - 1] : null;
    setUser(null);

    if (nextRealm) {
      setActiveRealm(nextRealm);
      try {
        const { user: nextUser } = await authApi.me();
        setTransition({ active: false, type: null });
        const language = localStorage.getItem("formly_language") || "en";
        window.location.assign(homePathForRole(nextUser, language));
        return;
      } catch {
        dropRealm(nextRealm);
      }
    }

    const wasSuper = isSuper(user);
    setTimeout(async () => {
      if (wasSuper) {
        // Super admin siempre va a su portal fijo, nunca a una URL dinámica
        window.location.assign(SUPER_ADMIN_LOGIN_PATH);
        return;
      }
      /* Vuelta a la puerta del rol gestionado (su `/a/<slug>`), si se recuerda. */
      if (door) {
        window.location.assign(door);
        return;
      }
      const apiUrl = getResolvedApiBase();
      const postLogout = encodeURIComponent(`${window.location.origin}/`);
      window.location.assign(`${apiUrl}/auth/logout?post_logout_redirect_uri=${postLogout}`);
    }, 380);
  }, [startTransition, user]);

  const initiateLogin = useCallback(() => {
    startTransition("login");
    setTimeout(() => {
      const apiUrl = getResolvedApiBase();
      window.location.assign(`${apiUrl}/auth/login`);
    }, 320);
  }, [startTransition]);

  const updateUser = useCallback((patch) => setUser((u) => ({ ...u, ...patch })), []);

  /* Auth local paralela (panel por rol): credenciales propias, misma sesión
     JWT. Sin traspaso al IDP: el logout solo revoca el jti. `door` (`/a/:slug`)
     ata el login a la entidad y el rol de esa URL de acceso; sin él, el login
     es el del portal del super_admin. */
  const loginLocal = useCallback(async (identifier, password, door) => {
    const { token } = await localAuthApi.login(identifier, password, door);
    return restoreWithToken(token);
  }, [restoreWithToken]);

  const logoutLocal = useCallback(async () => {
    try {
      await localAuthApi.logout();
    } catch {}
    clearToken();
    setUser(null);
  }, []);

  /* Sesión anónima de invitado: dueño propio para constructor, IA y
     plantillas, sin estadísticas de nada privado (lo veta el backend).
     La portada la pide sola al abrirse, así que el promise en vuelo se
     comparte: React monta los efectos dos veces en desarrollo (StrictMode)
     y sin esta guarda se habrían creado DOS invitados —dos filas de
     usuario— en la misma visita. Si falla, quien llama decide si reintenta. */
  const guestInFlight = useRef(null);
  const loginAsGuest = useCallback(() => {
    if (!guestInFlight.current) {
      guestInFlight.current = guestApi
        .session()
        .then(({ token }) => restoreWithToken(token))
        .finally(() => {
          guestInFlight.current = null;
        });
    }
    return guestInFlight.current;
  }, [restoreWithToken]);

  /* El `value` también se memoriza, por el mismo motivo que en `ThemeContext` y
     ahora en `LanguageContext`: con un objeto literal, todos los consumidores de
     `useAuth()` se re-renderizan en cada render del provider aunque no haya
     cambiado nada. En el logout eso se nota especialmente, porque `logout()`
     provoca dos renders seguidos —el del overlay del IDP y el de limpiar
     `user`— y cada uno arrastraba a la aplicación entera. */
  /* ── Vigilancia de sessión (idle + vida absoluta) ────────────────────────
     El frontend mide la INACTIVIDAD REAL: solo los eventos del usuario
     (ratón/teclado/scroll) cuentan, no los sondeos de React Query ni el SSE.
     El heartbeat (POST /api/auth/activity) se envía con un tope de 60 s.
     Cuando se agota la inactividad o la vida absoluta, se cierra la sessión
     automáticamente, sin aviso ni reautenticación. */
  const [sessionPolicy, setSessionPolicy] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const lastActivityRef = useRef(null);
  const lastHeartbeatRef = useRef(null);
  const policyRef = useRef(null);
  const absoluteRef = useRef(null);
  const logoutRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setSessionPolicy(null);
      setSessionInfo(null);
      lastActivityRef.current = null;
      lastHeartbeatRef.current = null;
      return;
    }
    const now = Date.now();
    lastActivityRef.current = now;
    lastHeartbeatRef.current = now;
    authApi
      .currentSession()
      .then((data) => {
        setSessionPolicy(data?.policy || null);
        setSessionInfo(data?.session || null);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => { policyRef.current = sessionPolicy; }, [sessionPolicy]);
  useEffect(() => {
    absoluteRef.current = sessionInfo?.absoluteExpiresAt
      ? new Date(sessionInfo.absoluteExpiresAt).getTime()
      : null;
  }, [sessionInfo]);
  useEffect(() => { logoutRef.current = logout; });

  useEffect(() => {
    if (!user) return;
    const onActivity = () => {
      lastActivityRef.current = Date.now();
      if (Date.now() - lastHeartbeatRef.current > 60_000) {
        lastHeartbeatRef.current = Date.now();
        authApi.activity().catch(() => {});
      }
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, onActivity));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      const now = Date.now();
      const policy = policyRef.current;
      const absolute = absoluteRef.current;
      const logoutFn = logoutRef.current;
      if (!policy || !lastActivityRef.current) return;
      const idleRemaining = policy.idleMs - (now - lastActivityRef.current);
      const absoluteRemaining = absolute ? absolute - now : policy.absoluteMs;
      if (idleRemaining <= 0 || absoluteRemaining <= 0) {
        if (logoutFn) logoutFn();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      logout,
      initiateLogin,
      updateUser,
      restoreWithToken,
      loginLocal,
      logoutLocal,
      loginAsGuest,
      transition,
      startTransition,
    }),
    [user, loading, logout, initiateLogin, updateUser, restoreWithToken, loginLocal, logoutLocal, loginAsGuest, transition, startTransition]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthTransition active={transition.active} type={transition.type} />
    </AuthContext.Provider>
  );
}
