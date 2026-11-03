import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useRoleT } from "../lib/roleI18n.js";
import { ACTIVATION_PATH, SUPER_ADMIN_LOGIN_PATH } from "../lib/routes.js";
import { SuperAdminStage } from "../components/auth/SuperAdminStage.jsx";
import SetPasswordForm from "../components/auth/SetPasswordForm.jsx";

/**
 * Activación de cuenta: `/activar?token=…`.
 *
 * Esta es la página a la que apunta el botón «Establecer mi contraseña» del correo
 * de alta. La ruta es **estable** a propósito (no lleva el slug de la puerta):
 * el slug es el secreto de `/a/<slug>` y «Regenerar» existe para invalidar un
 * enlace filtrado, así que si el correo lo llevara, rotar una puerta mataría los
 * correos de activación ya enviados. La seguridad la da el token, que es de un
 * solo uso y tiene caducidad.
 *
 * Al terminar, `localReset` devuelve la puerta **vigente** del usuario y esta
 * página lo lleva allí a iniciar sesión, de modo que un correo antiguo también
 * acaba en la puerta correcta. La ruta se compone sin dominio, así que el mismo
 * enlace vale en cualquier entorno.
 */
export default function Activar() {
  const navigate = useNavigate();
  const rt = useRoleT();
  const { language } = useLanguage();
  const es = language === "es";
  /* Se lee en el render, como en `LocalLogin`: la URL no cambia bajo los pies
     de esta página, así que no hace falta un efecto para guardarlo en estado. */
  const token = new URLSearchParams(window.location.search).get("token") || "";

  /* Sin token no hay nada que activar. Es un enlace de un solo uso: si llega
     vacío, la página avisa en vez de enseñar un formulario que no puede funcionar. */
  if (!token) {
    return (
      <SuperAdminStage
        eyebrow={es ? "Acceso" : "Access"}
        title={es ? "Enlace no válido" : "Invalid link"}
        subtitle={
          es
            ? "Este enlace de activación no tiene código. Pide a tu administrador que te lo reenvíe."
            : "This activation link has no code. Ask your administrator to resend it."
        }
        footer={
          <Link to={SUPER_ADMIN_LOGIN_PATH} className="transition hover:text-fg">
            {rt("backToSite")}
          </Link>
        }
      >
        <div />
      </SuperAdminStage>
    );
  }

  return (
    <SuperAdminStage
      eyebrow={es ? "Acceso" : "Access"}
      title={es ? "Establecer contraseña" : "Set password"}
      subtitle={
        es
          ? "Elige una contraseña nueva para tu cuenta."
          : "Choose a new password for your account."
      }
    >
      <SetPasswordForm
        token={token}
        onSuccess={(data) => {
          const door = data?.door || SUPER_ADMIN_LOGIN_PATH;
          navigate(door, { replace: true });
        }}
        fallbackLabel={(
          <>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            {es ? "Volver al acceso" : "Back to access"}
          </>
        )}
        fallbackAction={() => navigate("/", { replace: true })}
      />
    </SuperAdminStage>
  );
}

export { ACTIVATION_PATH };