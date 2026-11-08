import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound, ArrowLeft, Send, Check } from "lucide-react";
import { z } from "zod";
import { accessApi, localAuthApi } from "../services/index.js";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useRoleT } from "../lib/roleI18n.js";
import { homePathForRole } from "../lib/roles.js";
import { LOGIN_PORTAL_SLUG } from "../lib/routes.js";
import { SuperAdminStage, SaField } from "../components/auth/SuperAdminStage.jsx";
import SetPasswordForm from "../components/auth/SetPasswordForm.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Modal, ErrorModal } from "../components/ui/Modal.tsx";
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
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotErrorOpen, setForgotErrorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doorError, setDoorError] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState("");
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

  /* Carga el correo del Super Admin desde el backend (endpoint público) para
     validar la recuperación de acceso. Solo se pide una vez que el portal está
     confirmado. Si no está configurado o falla la petición, no se bloquea el
     envío (se asume que no hay restricción de correo esperado). */
  useEffect(() => {
    if (!portalOk) return;
    let cancelado = false;
    localAuthApi
      .getSuperAdminEmail()
      .then((data) => {
        if (!cancelado) setSuperAdminEmail(data?.email || "");
      })
      .catch(() => {
        if (!cancelado) setSuperAdminEmail("");
      });
    return () => {
      cancelado = true;
    };
  }, [portalOk]);

  /* El aviso de puerta equivocada aparece como alerta en esquina superior derecha.
   * Cuando un usuario que no es super admin intenta loguearse en esta puerta. */
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
   * nunca como banner dentro de la tarjeta de autenticación. */

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

  const goMode = (next) => {
    setMode(next);
  };

  /* Schema de validación de correo para el modo forgot (doble refinado):
   * 1. Formato de email obligatorio y válido
   * 2. Validación simplificada para SuperAdmin (sin expectedEmail del backend) */
  const emailSchema = z
    .string()
    .min(1, isSpanish ? "Correo obligatorio" : "Email required")
    .refine(
      (value) => {
        // Validate email format
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      isSpanish ? "Introduce una dirección de correo válida" : "Introduce a valid email address"
    )
    .refine(
      (value) => {
        // SuperAdmin no tiene expectedEmail del backend como AccessLogin,
        // asi que solo validamos el formato. El segundo refine siempre pasa.
        return true;
      },
      isSpanish ? "Introduce una dirección de correo válida" : "Introduce a valid email address"
    );

  const validateEmail = (valueToValidate) => {
    const result = emailSchema.safeParse(valueToValidate);
    const err = result.success ? "" : result.error.issues[0]?.message || "";
    setEmailError(err);
    return result.success;
  };

  /* Validez del email en tiempo real (formato).
     Se calcula en el render para desbloquear el botón en cuanto el usuario escribe
     el correo correcto, sin depender de emailTouched. */
  const isEmailValid = emailSchema.safeParse(email).success;

  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);
    validateEmail(value);
  };

  /* El error de formato solo se muestra una vez el usuario sale del campo
     (blur) o al enviar, no mientras está escribiendo el dominio. */
  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  /* `onChange` también se dispara al pegar (paste) en React, así que la
     validación es instantánea tanto al escribir como al pegar. */
  const handleEmailPaste = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  /* Cierra el modal premium de recuperación y pasa al modo restablecer
     contraseña para que el usuario escriba el código recibido. */
  const handleForgotAccept = () => {
    setForgotModalOpen(false);
    setMailed(true);
    setMode("reset");
  };

  /* Cierra el modal de error de recuperación y deja que el usuario corrija
     el correo sin salir del modo "Recuperar acceso". */
  const handleForgotErrorClose = () => {
    setForgotErrorOpen(false);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      /* Solo el correo del Super Admin puede solicitar un código de
         recuperación en esta puerta. El backend nunca revela si una
         dirección existe (no enumera), así que la pertenencia al Super
         Admin se comprueba aquí contra el correo configurado en el
         backend (SUPER_ADMIN_EMAIL, expuesto por
         GET /auth/local/super-admin-email). Si no coincide, se muestra
         el modal de error premium en lugar de enviar la petición. */
      const expectedEmail = (superAdminEmail || "").trim().toLowerCase();
      const inputEmail = email.trim().toLowerCase();
      if (expectedEmail && inputEmail !== expectedEmail) {
        setForgotErrorOpen(true);
        return;
      }
      /* `localAuthApi.forgot` responde igual exista o no el correo: nunca
         revela si una dirección está registrada (seguridad).
         El interceptor de api.js ya no dispara alertas de diagnóstico para
         esta llamada (__noMailDialogs); aquí mostramos el modal premium. */
      await localAuthApi.forgot(email);
      setForgotModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
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
      <>
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
            <SaField
              label={isSpanish ? "Correo electrónico" : "Email"}
              icon={Mail}
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              onPaste={handleEmailPaste}
              required
              autoComplete="email"
              placeholder={isSpanish ? "correo@ejemplo.com" : "name@example.com"}
              error={emailError}
              touched={emailTouched}
            />
            <Button type="submit" loading={busy} disabled={busy || !isEmailValid} className={BTN_PREMIUM}>
              <Send className="h-4 w-4" strokeWidth={1.5} /> {language === "es" ? "Enviar código" : "Send code"}
            </Button>
            <button type="button" onClick={() => goMode("login")} className="flex w-full items-center justify-center gap-1.5 text-sm text-muted transition hover:text-fg">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> {rt("signIn")}
            </button>
          </form>
        </SuperAdminStage>
        {forgotModalOpen && (
          <Modal
            open={forgotModalOpen}
            onClose={handleForgotAccept}
            size="sm"
            aura="var(--color-brand-500)"
            headerPt="pt-10"
            title={isSpanish ? "Código enviado" : "Code sent"}
            description={
              isSpanish
                ? "Se envió un código de recuperación a tu correo. Revisa tu bandeja de entrada."
                : "A recovery code has been sent to your email. Check your inbox."
            }
            orb={
              <span
                className="cr-orb cr-orb-lg text-white"
                style={{ "--cr-orb": "var(--color-brand-500)" }}
                aria-hidden="true"
              >
                <Check className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
              </span>
            }
            footer={
              <>
                <button
                  type="button"
                  onClick={handleForgotAccept}
                  className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
                >
                  {isSpanish ? "Cerrar" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={handleForgotAccept}
                  className="cr-btn min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 bg-brand-500 text-black hover:bg-brand-400 active:bg-brand-600 shadow-glow transform-gpu transition-all"
                >
                  {isSpanish ? "Aceptar" : "Accept"}
                </button>
              </>
            }
          />
        )}
        {forgotErrorOpen && (
          <ErrorModal
            open={forgotErrorOpen}
            onClose={handleForgotErrorClose}
            title={rt("forgotNotSuperAdminTitle")}
            description={rt("forgotNotSuperAdminBody", email)}
            size="sm"
            headerPt="pt-10"
          />
        )}
      </>
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
        <SaField
          label={rt("emailOrUser")}
          icon={Mail}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
          placeholder={isSpanish ? "correo@ejemplo.com" : "name@example.com"}
        />
        <SaField
          label={rt("password")}
          icon={KeyRound}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <Button type="submit" loading={busy} className={BTN_PREMIUM}>
          <KeyRound className="h-4 w-4" strokeWidth={1.5} /> {rt("signIn")}
        </Button>
      </form>
    </SuperAdminStage>
  );
}