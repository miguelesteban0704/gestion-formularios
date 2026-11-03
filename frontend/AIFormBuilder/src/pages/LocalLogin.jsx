import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound, ArrowLeft, Send } from "lucide-react";
import { accessApi, localAuthApi } from "../services/index.js";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useRoleT } from "../lib/roleI18n.js";
import { homePathForRole } from "../lib/roles.js";
import { LOGIN_PORTAL_SLUG } from "../lib/routes.js";
import { SuperAdminStage, SaField } from "../components/auth/SuperAdminStage.jsx";
import SetPasswordForm from "../components/auth/SetPasswordForm.jsx";
import { Button } from "../components/ui/Button.jsx";
import { notifyAuthAlert } from "../components/admin/AdminKit.jsx";
import NotFound from "./NotFound.jsx";

/**
 * Portal oculto del super_admin: URL fija, el nombre del sitio en español
 * ("Formularios con IA") + la marca `loginadmin`. No se enlaza desde ningún
 * sitio; el backend valida el slug y un fallo cae al 404 como cualquier
 * página que no existe.
 *
 * El slug se declara en `lib/routes.js`, que es la única fuente: quien lo
 * necesita además de esta página es `AuthContext` (vuelve a esta puerta al
 * cerrar la sesión del super_admin) y el contexto no puede importar ESTA
 * página sin crear un ciclo. El espejo del servidor es `LOGIN_PORTAL_SLUG`
 * de `utils/bootstrap.js`.
 */
export { LOGIN_PORTAL_SLUG };

const BTN_PREMIUM =
  "w-full justify-center shadow-glow transform-gpu transition-transform hover:scale-[1.02] active:scale-[0.98]";

export default function LocalLogin() {
  const navigate = useNavigate();
  const rt = useRoleT();
  const { language } = useLanguage();
  const { loginLocal } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("token");
  const ctxParam = params.get("ctx");

  const [portalOk, setPortalOk] = useState(false);
  const [checking, setChecking] = useState(true);

  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [mailed, setMailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doorError, setDoorError] = useState(false);
  const isSpanish = language === "es";

  /* El portal solo existe si el backend reconoce el slug fijo.
   *
   * CON un token de activación el sondeo NO se hace: esta página es la puerta
   * de «establecer contraseña» que llega por correo, y el token ya identifica la
   * cuenta. Si el sondeo se usara como puerta, un fallo puntual —backend caído,
   * red, TLS, CORS— le enseñaría al usuario un «página no encontrada» sin salida
   * ni reintento, justo cuando acaba de hacer clic en su correo. El token
   * caducado o inválido lo rechaza el envío, con un mensaje claro.
   *
   * SIN token el sondeo sí manda: es lo que mantiene oculta la puerta del
   * super_admin, así que un fallo de red no puede revelarla. Se reintenta una
   * vez para que un blip aislado no le oculte la puerta a quien sí la conoce. */
  useEffect(() => {
    if (resetToken) {
      setPortalOk(true);
      setChecking(false);
      return;
    }
    let cancelado = false;
    setChecking(true);

/* El portal del super_admin es FIJO. El login va a /formularios-con-ia-loginadmin,
     * nunca a una URL dinámica generada por azar. La página LocalLogin ya no
     * redirige; solo verifica y muestra el formulario. */
    accessApi
      .getLoginPortalSlug()
      .then((slugFromServer) => {
        if (cancelado) return;
        // Portal fijo: siempre debe coincidir con LOGIN_PORTAL_SLUG
        if (slugFromServer === LOGIN_PORTAL_SLUG) {
          setPortalOk(true);
          setChecking(false);
        } else {
          // Si no coincide, algo está mal con el backend: mostrar error
          // pero NO redirigir a URL dinámica (el usuario pidió fijo).
          console.error("Portal slug mismatch:", slugFromServer, "expected:", LOGIN_PORTAL_SLUG);
          setPortalOk(false);
          setChecking(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          console.error("Portal check failed:", err);
          // Si el backend está caído, asumimos que el portal está bien
          // porque es fijo: mostramos la página (no redirigimos a /a/*).
          setPortalOk(true);
          setChecking(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [resetToken]);

  /* El aviso de puerta equivocada aparece como alerta en esquina superior derecha.
     Cuando un usuario que no es super admin intenta loguearse en esta puerta. */
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

  /* Los errores de submit solo se muestran como toast (alerta de dialogo),
     nunca como banner dentro de la tarjeta de autenticación. */

  const goMode = (next) => {
    setMode(next);
  };

  if (checking) {
    return (
      <SuperAdminStage
        eyebrow={language === "es" ? "Acceso" : "Access"}
        title={rt("loginWithAccount")}
        role="Super Admin"
        verifying
      />
    );
  }
  if (!portalOk) return <NotFound />;

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await loginLocal(identifier, password, { slug: LOGIN_PORTAL_SLUG, ctx: ctxParam });
      /* El acceso se avisa con la insignia del rol: es el evento más raro y
         de más consecuencia del sitio —habilita gestión de cuentas,
         entidades, URLs y formularios— así que lleva su propio icono, la
         etiqueta del rol y dice por dónde entró. Vale para los tres roles
         de gestión; el resto (legacy) conserva el toast de siempre. */
      if (user?.role) {
        notifyAuthAlert({
          name: user?.name,
          role: user?.role,
          entityName: user?.entity?.name,
          method: "local",
        });
      } else {
        toast.success(rt("signIn"));
      }
      navigate(homePathForRole(user, language, undefined), { replace: true });
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

  const submitForgot = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await localAuthApi.forgot(email);
      // En dev el backend devuelve el código (y `mailed` si hubo envío real);
      // en producción nunca lo trae: el usuario lo recibe por correo.
      const sent = data?.code || null;
      setDevCode(sent);
      setMailed(Boolean(data?.mailed));
      /* En dev el código se rellena solo; el formulario compartido lo recibe como
         `initialCode` cuando se monta. */
      setMode("reset");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (mode === "reset") {
    return (
      <SuperAdminStage
        eyebrow={language === "es" ? "Acceso" : "Access"}
        title={
          resetToken
            ? language === "es"
              ? "Establecer contraseña"
              : "Set password"
            : language === "es"
              ? "Restablecer contraseña"
              : "Reset password"
        }
        subtitle={
          resetToken
            ? language === "es"
              ? "Elige una contraseña nueva para tu cuenta."
              : "Choose a new password for your account."
            : language === "es"
              ? "Introduce el código que recibiste y elige una contraseña nueva."
              : "Enter the code you received and choose a new password."
        }
      >
        {devCode && (
          <p className="sa-chip mb-3 self-start text-xs">
            {mailed
              ? language === "es"
                ? "Dev: el correo se envió de verdad; el código se rellena aquí para no depender de la bandeja."
                : "Dev: the email was really sent; the code is pre-filled here so you don't need the inbox."
              : language === "es"
                ? "Demo sin correo: el código se generó aquí y ya está rellenado."
                : "Demo without email: the code was generated here and pre-filled."}
          </p>
        )}
        {/* El formulario es el compartido con `/activar` y `/a/:slug`. */}
        <SetPasswordForm
          token={resetToken}
          requireCode={!resetToken}
          initialCode={resetToken ? "" : devCode || ""}
          onSuccess={() => {
            setMode("login");
            setDevCode(null);
            setMailed(false);
            setEmail("");
          }}
          fallbackLabel={(
            <>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              {language === "es" ? "Volver al login" : "Back to login"}
            </>
          )}
          fallbackAction={() => goMode("login")}
        />
      </SuperAdminStage>
    );
  }

  if (mode === "forgot") {
    return (
      <SuperAdminStage
        eyebrow={language === "es" ? "Acceso" : "Access"}
        title="Recuperar acceso"
        subtitle={
          language === "es"
            ? "Te enviamos un código de recuperación a tu correo."
            : "We sent a recovery code to your email."
        }
      >
        <form onSubmit={submitForgot} className="space-y-3">
          <SaField label={rt("emailOrUser")} icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="correo@ejemplo.com" />
          <Button type="submit" loading={busy} className={BTN_PREMIUM}>
            <Send className="h-4 w-4" strokeWidth={1.5} /> {language === "es" ? "Enviar código" : "Send code"}
          </Button>
          <button type="button" onClick={() => goMode("login")} className="flex w-full items-center justify-center gap-1.5 text-sm text-muted transition hover:text-fg">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> {rt("signIn")}
          </button>
        </form>
      </SuperAdminStage>
    );
  }

  return (
    <SuperAdminStage
      eyebrow={language === "es" ? "Acceso" : "Access"}
      title={rt("loginWithAccount")}
      role="Super Admin"
      footer={
        <>
          <button type="button" onClick={() => goMode("forgot")} className="transition hover:text-fg">{rt("forgotPassword")}</button>
          {" · "}
          <Link to="/" className="transition hover:text-fg">{rt("backToSite")}</Link>
        </>
      }
    >
      <form onSubmit={submitLogin} className="space-y-3">
        <SaField label={rt("emailOrUser")} icon={Mail} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" placeholder="correo@ejemplo.com" />
        <SaField label={rt("password")} icon={KeyRound} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
        <Button type="submit" loading={busy} className={BTN_PREMIUM}>
          <KeyRound className="h-4 w-4" strokeWidth={1.5} /> {rt("signIn")}
        </Button>
      </form>
    </SuperAdminStage>
  );
}
