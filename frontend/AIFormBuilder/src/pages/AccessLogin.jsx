import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound, UserRound, UserPlus, AlertCircle, UserCheck, ArrowLeft } from "lucide-react";
import { accessApi, localAuthApi } from "../services/index.js";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useRoleT } from "../lib/roleI18n.js";
import { homePathForRole } from "../lib/roles.js";
import { rememberAccessDoor } from "../lib/accessDoor.js";
import { AuthCard, AuthField } from "../components/auth/AuthCard.jsx";
import { Button } from "../components/ui/Button.jsx";
import { notifyAuthAlert } from "../components/admin/AdminKit.jsx";
import RecoveryModal from "../components/auth/RecoveryModal.jsx";
import SetPasswordForm from "../components/auth/SetPasswordForm.jsx";
import { ACCESS_LOGIN_BASE, accessLoginPath } from "../lib/routes.js";

/** Loader de respaldo por si falla PageLoader. */
function FallbackLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-24"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
      <p className="text-sm text-muted">Cargando…</p>
    </div>
  );
}

/**
 * Puerta de administración por entidad y rol: `/a/:slug?ctx=...`.
 * Resuelve el contexto (entidad + rol precargados) y pide credenciales
 * locales. El slug aleatorio + el sello cifrado ya se validaron en el backend.
 */
export default function AccessLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const rt = useRoleT();
  const { language } = useLanguage();
  const { loginLocal, restoreWithToken } = useAuth();
  const [ctx, setCtx] = useState(null);
  const [status, setStatus] = useState("loading");
  const resetToken = new URLSearchParams(window.location.search).get("token");
  const ctxParam = new URLSearchParams(window.location.search).get("ctx");
  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState({ name: "", email: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [doorError, setDoorError] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const isSpanish = language === "es";
  const registrationAvailable = ctx?.registrationAvailable;
  // Estado para el email esperado del usuario asociado a esta URL de acceso
  const [expectedRecoveryEmail, setExpectedRecoveryEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let mounted = true;
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn("[AccessLogin] Timeout resolviendo la puerta de acceso", { slug });
        setStatus(resetToken ? "ready" : "invalid");
      }
    }, 15000);

    accessApi.resolve(slug, params.get("ctx"))
      .then((data) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        if (!data) {
          setStatus(resetToken ? "ready" : "invalid");
          return;
        }
        setCtx(data);
        // Guardar el email real del usuario asociado a esta puerta de acceso
        // para validar que el correo escrito en el RecoveryModal sea exactamente ese
        if (data?.user?.email) {
          setExpectedRecoveryEmail(data.user.email);
        }
        if (!resetToken) {
          setMode(data.registrationAvailable && data.role === "entity_admin" ? "register" : "login");
        }
        setStatus("ready");
      })
      .catch((err) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        console.error("[AccessLogin] Error resolviendo puerta de acceso", { slug, err });
        setStatus(resetToken ? "ready" : "invalid");
      });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [slug, resetToken]);

  useEffect(() => {
    if (doorError) {
      toast.error(
        {
          title: isSpanish ? "Acceso restringido" : "Restricted access",
          badge: isSpanish ? "RESTRINGIDO" : "RESTRICTED",
        },
        {
          description: isSpanish
            ? "La autenticación se ha completado correctamente, pero este enlace de acceso no corresponde a tu entidad ni a tu rol asignado. Utiliza el enlace facilitado por tu administrador para iniciar sesión."
            : "Authentication was successful, but this access link does not match your entity or assigned role. Use the link provided by your administrator to sign in.",
          duration: 10000,
        }
      );
      setDoorError(false);
    }
  }, [doorError, isSpanish]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setDoorError(false);
    try {
      const user = await loginLocal(identifier, password, { slug, ctx: ctxParam });
      rememberAccessDoor(user?.role, slug);
      notifyAuthAlert({
        name: user?.name,
        role: user?.role,
        entityName: user?.entity?.name || ctx?.entity?.name,
        method: "local",
      });
      const entitySlug = ctx?.entity?.code;
      navigate(homePathForRole(user, language, entitySlug), { replace: true });
    } catch (err) {
      if (err?.details?.code === "wrong_door") {
        setDoorError(true);
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitRegistration = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const account = await localAuthApi.registerByAccess(slug, {
        name: registration.name,
        email: registration.email,
        username: registration.username || undefined,
        password: registration.password,
      });
      const user = await restoreWithToken(account.token);
      rememberAccessDoor((user || account.user)?.role, slug);
      toast.success(isSpanish ? "Cuenta creada" : "Account created");
      const entitySlug = ctx?.entity?.code;
      navigate(homePathForRole(user || account.user, language, entitySlug), { replace: true });
    } catch (err) {
      toast.error(err.message);
      setRegistration((current) => ({ ...current, password: "" }));
    } finally {
      setBusy(false);
    }
  };

  const submitSetPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await localAuthApi.reset(resetToken, password);
      toast.success(
        isSpanish
          ? "Contraseña actualizada. Ya puedes iniciar sesión."
          : "Password updated. You can sign in now.",
      );
      setPassword("");
      setMode("login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === "Home" || event.key === "ArrowLeft" ? "login" : "register";
    setMode(nextMode);
    document.getElementById(nextMode === "login" ? "entity-login-tab" : "entity-register-tab")?.focus();
  };

  if (status === "loading") return <FallbackLoader />;
  if (status === "invalid") {
    return (
      <AuthCard
        eyebrow={language === "es" ? "Acceso" : "Access"}
        title="URL de acceso no válida"
        subtitle="Pide a tu administrador un enlace vigente."
        footer={<Link to="/" className="transition hover:text-fg">{rt("backToSite")}</Link>}
      >
        <div />
      </AuthCard>
    );
  }
  if (status !== "ready") {
    return (
      <AuthCard
        eyebrow={language === "es" ? "Acceso" : "Access"}
        title="Error inesperado"
        subtitle="No se pudo cargar la página de acceso. Recarga o contacta al administrador."
        footer={<Link to="/" className="transition hover:text-fg">{rt("backToSite")}</Link>}
      >
        <div className="flex items-center gap-2 text-sm text-warning" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Estado: {status}
        </div>
      </AuthCard>
    );
  }

  /* Restablecimiento por token: el enlace del correo de recuperación trae
     el token, así que esta pantalla pide la contraseña nueva y su repetición.
     Al guardar, localReset devuelve la puerta vigente del usuario y lo lleva
     allí a iniciar sesión. */
  if (mode === "reset" && resetToken) {
    return (
      <AuthCard
        eyebrow={isSpanish ? "Acceso" : "Access"}
        title={isSpanish ? "Establecer contraseña" : "Set password"}
        subtitle={
          isSpanish
            ? "Elige una contraseña nueva para tu cuenta."
            : "Choose a new password for your account."
        }
        entity={ctx?.entity}
        role={ctx?.role}
        footer={
          <div className="flex items-center justify-between">
            <Link to="/" className="transition hover:text-fg">{rt("backToSite")}</Link>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted transition hover:text-fg"
            >
              {isSpanish ? "Volver al login" : "Back to sign in"}
            </button>
          </div>
        }
      >
        <SetPasswordForm
          token={resetToken}
          onSuccess={(data) => {
            const door = data?.door || accessLoginPath(slug || "");
            navigate(door, { replace: true });
          }}
          fallbackLabel={(
            <>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              {isSpanish ? "Volver al acceso" : "Back to access"}
            </>
          )}
          fallbackAction={() => {
            setMode("login");
          }}
        />
      </AuthCard>
    );
  }

  return (
    <>
    <AuthCard
      eyebrow={language === "es" ? "Acceso" : "Access"}
      title={mode === "register" ? (isSpanish ? "Crear cuenta" : "Create account") : rt("loginWithAccount")}
      subtitle={mode === "register"
        ? (isSpanish ? "Tu entidad y tu rol quedan asociados a este enlace." : "Your entity and role are bound to this link.")
        : undefined}
      entity={ctx?.entity}
      role={ctx?.role}
      footer={<Link to="/" className="transition hover:text-fg">{rt("backToSite")}</Link>}
    >
      {!registrationAvailable && mode === "login" && ctx?.role === "super_admin" && (
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="flex items-center gap-2 rounded-xl bg-brand-500/10 px-3 py-2 border border-brand-500/20">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/20">
              <UserCheck className="h-4.5 w-4.5 text-brand-500" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
                {isSpanish ? "Rol" : "Role"}
              </span>
              <span className="text-sm font-semibold text-fg tracking-tight">
                {isSpanish ? "Super Admin" : "Super Admin"}
              </span>
            </div>
          </div>
        </div>
      )}
      {registrationAvailable && mode !== "reset" && (
        <div role="tablist" aria-label={isSpanish ? "Acceso a la entidad" : "Entity access"} className="mb-5 grid grid-cols-2 rounded-xl border border-[var(--border)] bg-surface-2/70 p-1">
          <button
            type="button"
            role="tab"
            id="entity-login-tab"
            aria-selected={mode === "login"}
            aria-controls="entity-access-panel"
            tabIndex={mode === "login" ? 0 : -1}
            onClick={() => setMode("login")}
            onKeyDown={handleTabKeyDown}
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${mode === "login" ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"}`}
          >
            {isSpanish ? "Iniciar sesión" : "Sign in"}
          </button>
          <button
            type="button"
            role="tab"
            id="entity-register-tab"
            aria-selected={mode === "register"}
            aria-controls="entity-access-panel"
            tabIndex={mode === "register" ? 0 : -1}
            onClick={() => setMode("register")}
            onKeyDown={handleTabKeyDown}
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${mode === "register" ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"}`}
          >
            {isSpanish ? "Registrarse" : "Register"}
          </button>
        </div>
      )}
      <div
        id="entity-access-panel"
        role={registrationAvailable ? "tabpanel" : undefined}
        aria-labelledby={registrationAvailable ? (mode === "register" ? "entity-register-tab" : "entity-login-tab") : undefined}
      >
        {mode === "register" && registrationAvailable ? (
          <form onSubmit={submitRegistration} className="space-y-3">
            <AuthField
              label={isSpanish ? "Nombre completo" : "Full name"}
              icon={UserRound}
              value={registration.name}
              onChange={(event) => setRegistration({ ...registration, name: event.target.value })}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              placeholder="Juan Pérez"
            />
            <AuthField
              label={isSpanish ? "Correo electrónico" : "Email address"}
              icon={Mail}
              type="email"
              value={registration.email}
              onChange={(event) => setRegistration({ ...registration, email: event.target.value })}
              required
              maxLength={160}
              autoComplete="email"
              placeholder="correo@ejemplo.com"
            />
            <AuthField
              label={isSpanish ? "Usuario (opcional)" : "Username (optional)"}
              icon={UserPlus}
              value={registration.username}
              onChange={(event) => setRegistration({ ...registration, username: event.target.value.toLowerCase() })}
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9._\\-]+"
              autoComplete="username"
              placeholder="juanperez"
            />
            <AuthField
              label={rt("password")}
              icon={KeyRound}
              type="password"
              value={registration.password}
              onChange={(event) => setRegistration({ ...registration, password: event.target.value })}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <Button type="submit" loading={busy} className="w-full justify-center">
              <UserPlus className="h-4 w-4" strokeWidth={1.5} />
              {isSpanish ? "Crear cuenta" : "Create account"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <AuthField label={rt("emailOrUser")} icon={Mail} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" placeholder="correo@ejemplo.com" />
            <AuthField label={rt("password")} icon={KeyRound} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
            <Button type="submit" loading={busy} className="w-full justify-center">
              <KeyRound className="h-4 w-4" strokeWidth={1.5} /> {rt("signIn")}
            </Button>
            <p className="mt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setRecoveryOpen(true);
                }}
                className="text-sm text-muted transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2"
              >
                {rt("forgotPassword")}
              </button>
            </p>
          </form>
        )}
      </div>
    </AuthCard>

    <RecoveryModal
      open={recoveryOpen}
      onClose={() => setRecoveryOpen(false)}
      onBack={() => setRecoveryOpen(false)}
      expectedEmail={expectedRecoveryEmail}
    />
    </>
  );
}