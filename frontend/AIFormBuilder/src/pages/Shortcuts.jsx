import { Keyboard } from "lucide-react";
import { PageHeader } from "./Insights.jsx";
import { Card } from "../components/ui/Card.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

function Keys({ combo }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {combo.map((key) => (
        <kbd key={key} className="kbd">{key}</kbd>
      ))}
    </span>
  );
}

/**
 * Atajos de teclado del panel. Refleja lo que ya está implementado: la paleta
 * de comandos (`⌘/Ctrl + K`, en `DashboardLayout`) y la navegación de los menús
 * del `Dropdown` compartido (flechas, Inicio/Fin, typeahead y cierre/confirmación).
 */
export default function Shortcuts() {
  const { t } = useLanguage();

  const shortcuts = [
    { label: t("scOpenPalette"), combo: ["Ctrl/⌘", "K"] },
    { label: t("scNavigate"), combo: ["↑", "↓"] },
    { label: t("scJump"), combo: ["Home", "End"] },
    { label: t("scTypeahead"), combo: ["A — Z"] },
    { label: t("scClose"), combo: ["Esc"] },
    { label: t("scConfirm"), combo: ["Enter"] },
  ];

  return (
    <div className="animate-page-enter mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PageHeader icon={Keyboard} title={t("keyboardShortcuts")} subtitle={t("shortcutsSubtitle")} />

      <Card className="mt-8 divide-y divide-line/60 p-0">
        {shortcuts.map(({ label, combo }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="text-sm font-medium text-ink">{label}</span>
            <Keys combo={combo} />
          </div>
        ))}
      </Card>
    </div>
  );
}
