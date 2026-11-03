import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { PageLoader } from "../components/ui/Feedback.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { homePath } from "../lib/routes.js";
import { tomarDestino } from "../lib/authReturn.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const { restoreWithToken, initiateLogin } = useAuth();
  // La puerta vive fuera del panel, así que el idioma no llega por la URL: se
  // entra al panel en el idioma que la persona tenga elegido.
  const { language } = useLanguage();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      /* Solo se gasta el destino al VOLVER con token, nunca al salir hacia el
         IDP: leerlo en la ida lo borraría y al regresar no habría adónde
         volver, que es justo el fallo que este módulo arregla. */
      const destino = tomarDestino();
      const casa = destino || homePath(language);
      restoreWithToken(token)
        .then(() => navigate(casa, { replace: true }))
        .catch(() => navigate(homePath(language), { replace: true }));
      return;
    }

    if (params.has("error")) {
      navigate(homePath(language), { replace: true });
      return;
    }

    // Transición suave y transparente hacia el IDP
    initiateLogin();
  }, [navigate, restoreWithToken, initiateLogin, language]);

  return <PageLoader />;
}