import { useNavigate } from "react-router-dom";
import { BarChart3, Building2, Inbox, Eye, UserRound } from "lucide-react";
import { Card } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { CategoryBadge } from "../ui/CategoryBadge.jsx";
import { cn, timeAgo } from "@/shared/skills";
import { accents } from "@/shared/styles/tokens";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { analyticsPath } from "../../lib/routes.js";
import "./admin.css";

// Rejilla de las 6 columnas (Título | Usuario | Entidad | Estado |
// Rendimiento | Acciones). Es una sola constante porque la comparten la
// cabecera de PublicStats y cada fila: si cambia un lado, cambian los dos y
// la alineación no se rompe.
export const PUBLISHED_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.90fr)_minmax(0,0.90fr)_minmax(0,0.60fr)_minmax(0,0.95fr)_minmax(0,0.65fr)]";

// Paleta de acentos alternada por posición, la misma del FormCard: la rejilla
// gana ritmo visual sin que cada formulario tenga que traer su propio color.
// Los colores que coinciden con la paleta de tarjeta del bento vienen de
// `@/shared/styles/tokens` (var(--accent-*)); el resto son tonos propios de
// la rejilla de formularios (no del sitio) y se dejan como están.
const STRIP = [
  { color: "var(--color-brand-600)" },
  { color: "#4f7cc0" },
  { color: accents.purple },
  { color: "#c79235" },
  { color: accents.coral },
  { color: accents.teal },
  { color: "#5e7fb8" },
  { color: "#b06ca0" },
];

export function MetricTile({ icon: Icon, label, value, tint }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-[var(--border)] bg-surface-2/70 px-2.5 py-1.5 transition-colors duration-200 group-hover/card:bg-surface"
      title={label}
    >
      <span
        aria-hidden="true"
        className="grid h-6 w-6 place-items-center rounded-lg"
        style={{
          background: `color-mix(in srgb, ${tint} 14%, transparent)`,
          color: `color-mix(in srgb, ${tint} 80%, var(--fg))`,
        }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-bold leading-none text-ink tabular-nums">{value}</span>
        <span className="mt-1 text-[9px] font-extrabold uppercase leading-none tracking-[0.09em] text-ink-muted">
          {label}
        </span>
      </span>
    </span>
  );
}

const DOT = <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--border)]" />;

function OwnerPill({ name, isSpanish }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface-2 px-2 py-[3px] text-xs font-semibold text-ink-muted"
      title={isSpanish ? "Publicado por" : "Published by"}
    >
      <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300" />
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * Tarjeta de estadística de un formulario público del panel del super_admin
 * (solo lectura y solo datos): no hay descargar, copiar enlace, responder,
 * editar ni abrir el formulario. Solo las cifras, quién lo publicó y —en lo
 * público— el acceso a su página de estadísticas (esa es la única acción, y
 * también de solo lectura).
 *
 * La superficie la decide `density`, igual que el design sheet del rediseño:
 *  - "a" (Espaciado): cada tarjeta es una `Card` independiente con su acento.
 *  - "b" (Denso): una fila sin marco, pensada para montarse dentro de un único
 *    panel conectado con `divide-y` (lo hace `PublicStats`).
 *
 * La entidad y el usuario publicador se muestran con "-" cuando no están
 * relacionados (el owner siempre existe; el nombre cae a "-" sin username).
 */
export function PublicFormCard({
  form,
  responses = "—",
  views = "—",
  density = "a",
  index = 0,
}) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isSpanish = language === "es";
  const accent = STRIP[index % STRIP.length].color;

  const shortId = `#${String(form._id || "").slice(0, 6).toUpperCase()}`;
  const createdDate = (() => {
    const raw = form.createdAt;
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(isSpanish ? "es" : "en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
      .format(d)
      .replace(/\./g, "");
  })();

  const ownerName = form.ownerName || "-";
  const entityName = form.entityName || "-";
  // Ancla para el scroll del panel de resultados de PremiumSearchBar.
  const anchorId = `pub-form-${form._id || ""}`;

  const inner = (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", PUBLISHED_COLS)}>
      {/* Columna 1: título, id y fechas */}
      <div className="min-w-0 basis-full lg:basis-auto">
        <h3 className="truncate text-[16px] font-semibold tracking-[-0.012em] text-ink">
          {form.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-ink-muted">
          <span className="adm-mono" aria-hidden="true">{shortId}</span>
          {DOT}
          <span>
            {isSpanish ? "Creado" : "Created"} {createdDate}
          </span>
          {form.ownerName && (
            <>
              {DOT}
              <span className="truncate" title={form.ownerName}>{form.ownerName}</span>
            </>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-ink-muted">
          <span>
            {isSpanish ? "Modificado" : "Updated"} {timeAgo(form.updatedAt, language)}
          </span>
          {form.updatedByName && (
            <>
              {DOT}
              <span className="truncate" title={form.updatedByName}>{form.updatedByName}</span>
            </>
          )}
        </div>
      </div>

      {/* Columna 2: usuario que publicó */}
      <div className="min-w-0">
        <OwnerPill name={ownerName} isSpanish={isSpanish} />
      </div>

      {/* Columna 3: entidad relacionada */}
      <div className="min-w-0">
        <span
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface-2 px-2 py-[3px] text-xs font-semibold text-ink-muted"
          title={isSpanish ? "Entidad" : "Entity"}
        >
          <Building2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300" />
          <span className="truncate">{entityName}</span>
        </span>
      </div>

      {/* Columna 4: estado (público / privado / restringido) */}
      <div className="self-center">
        <CategoryBadge type={form.visibility} className="shrink-0" />
      </div>

      {/* Columna 5: rendimiento (respuestas y vistas) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <MetricTile icon={Inbox} label={t("responses")} value={responses} tint="var(--color-brand-600)" />
        <MetricTile icon={Eye} label={t("views")} value={views} tint="var(--color-warning)" />
      </div>

      {/* Columna 6: acceso a las estadísticas del formulario. Solo lo público:
          el backend le veta las de un privado al super_admin (`canSeeStats`),
          así que la celda de un privado se queda vacía en vez de prometer un
          rebote. */}
      <div className="flex items-center">
        {form.visibility !== "private" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(analyticsPath(language, String(form._id)))}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {t("insights")}
          </Button>
        )}
      </div>
    </div>
  );

  // Densidad "b": fila conectada dentro del panel único que monta PublicStats
  // (separadores `divide-y`, hover de fila y esquinas redondeadas en los extremos).
  if (density === "b") {
    return (
      <li
        id={anchorId}
        className="group/card relative scroll-mt-24 px-4 py-3.5 transition-colors duration-200 hover:bg-surface-2 sm:px-5 first:rounded-t-[var(--card-radius)] last:rounded-b-[var(--card-radius)]"
      >
        {inner}
      </li>
    );
  }

  return (
    <Card
      hover
      id={anchorId}
      className="group/card relative scroll-mt-24 overflow-visible"
      style={{ "--card-accent": accent }}
    >
      <div className="p-4 sm:p-5">{inner}</div>
    </Card>
  );
}