import { ShieldCheck } from "lucide-react";
import { PageHeader } from "./Insights.jsx";
import SessionsPanel from "../components/settings/SessionsPanel.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

/**
 * Seguridad de la cuenta. Hoy reúne el historial de dispositivos con sesión
 * abierta (el mismo panel que la pestaña «Dispositivos» de Configuración), para
 * que la entrada del menú de identidad tenga una página propia donde revisar y
 * cerrar sesiones.
 */
export default function Security() {
  const { t } = useLanguage();

  return (
    <div className="animate-page-enter mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PageHeader icon={ShieldCheck} title={t("security")} subtitle={t("securitySubtitle")} />
      <div className="mt-8">
        <SessionsPanel />
      </div>
    </div>
  );
}
