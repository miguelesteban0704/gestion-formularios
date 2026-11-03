import { useNavigate } from "react-router-dom";
import { UserRound, Mail, Building2, Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "./Insights.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { RoleBadge } from "../components/auth/RoleBadge.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { settingsPath } from "../lib/routes.js";
import { isGuest, isSuper } from "../lib/roles.js";

/**
 * «Mi perfil»: la identidad del usuario autenticado tal como la ve el panel.
 *
 * Es de SOLO LECTURA a propósito: la edición real (nombre, foto, acento,
 * idioma) vive en Configuración; aquí se muestra quién es y se ofrece el atajo.
 * La fuente de identidad es el realm activo (`user` de `useAuth`), nunca un
 * token suelto.
 */
export default function Profile() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const guest = isGuest(user);
  const name = isSuper(user) ? t("appName") : user?.name || user?.email || "";
  const rows = [
    { icon: Mail, label: t("profileEmail"), value: user?.email || "—" },
    ...(user?.entity?.name ? [{ icon: Building2, label: t("profileEntity"), value: user.entity.name }] : []),
  ];

  return (
    <div className="animate-page-enter mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PageHeader icon={UserRound} title={t("myProfile")} subtitle={t("profileSubtitle")} />

      <Card className="mt-8 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name || user?.email} avatarUrl={user?.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink">{name}</p>
            <div className="mt-1.5">
              <RoleBadge role={user?.role} isGuest={guest} />
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <dl className="mt-6 space-y-1.5">
            {rows.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-surface-2/40 px-4 py-3"
              >
                <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="truncate text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-line/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">{t("profileManageHint")}</p>
          <Button size="sm" onClick={() => navigate(settingsPath(language, user?.entity?.code))}>
            <SettingsIcon className="h-4 w-4" /> {t("openSettings")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
