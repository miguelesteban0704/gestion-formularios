import { LifeBuoy, Rocket, Lock, BarChart3, ShieldCheck } from "lucide-react";
import { PageHeader } from "./Insights.jsx";
import { Card } from "../components/ui/Card.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

/**
 * Centro de ayuda. Contenido de orientación (no depende de datos): enlaza los
 * conceptos clave del panel para que nadie tenga que adivinar por dónde
 * empezar.
 */
export default function Help() {
  const { t } = useLanguage();

  const topics = [
    { icon: Rocket, title: t("helpStartTitle"), body: t("helpStartBody") },
    { icon: Lock, title: t("helpPrivateTitle"), body: t("helpPrivateBody") },
    { icon: BarChart3, title: t("helpStatsTitle"), body: t("helpStatsBody") },
    { icon: ShieldCheck, title: t("helpSecurityTitle"), body: t("helpSecurityBody") },
  ];

  return (
    <div className="animate-page-enter mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PageHeader icon={LifeBuoy} title={t("helpCenter")} subtitle={t("helpSubtitle")} />

      <div className="mt-8 space-y-4">
        {topics.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
