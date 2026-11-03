import { ShieldCheck, KeyRound } from "lucide-react";
import { SplashScreen } from "../ui/Splash.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

/**
 * Traspaso con el proveedor de identidad (SSO handoff).
 * El diseño vive en <SplashScreen/>; aquí solo se aporta el contenido
 * del flujo (login vs. logout) en el idioma activo.
 */
export function AuthTransition({ active, type = "login" }) {
  const { t } = useLanguage();
  const isLogout = type === "logout";

  return (
    <SplashScreen
      open={!!active}
      eyebrow={isLogout ? t("authLogoutEyebrow") : t("authRedirectEyebrow")}
      title={isLogout ? t("authLogoutTitle") : t("authRedirectTitle")}
      description={isLogout ? t("authLogoutDescription") : t("authRedirectDescription")}
      chips={[
        // El primer chip es la marca (token, no hex) y el segundo es el IdP
        // (información): son dos cosas distintas y por eso dos colores.
        { icon: ShieldCheck, label: t("authRedirectEncrypted"), tint: "var(--color-brand-500)" },
        { icon: KeyRound, label: t("authRedirectIdp"), tint: "var(--color-info)" },
      ]}
      label={isLogout ? t("authLogoutTitle") : t("authRedirectTitle")}
    />
  );
}

export default AuthTransition;
