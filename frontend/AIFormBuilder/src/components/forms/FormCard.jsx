import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MoreVertical,
  Star,
  Pencil,
  Copy,
  BarChart3,
  Inbox,
  Eye,
  Link2,
  Archive,
  ArchiveRestore,
  Trash2,
  Globe,
  CircleDashed,
  ArrowUpRight,
  Reply,
} from "lucide-react";
import { CategoryBadge } from "../ui/CategoryBadge.jsx";
import { getResolvedApiBase } from "../../lib/api.js";
import { Card } from "../ui/Card.jsx";
import { Badge } from "../ui/Feedback.jsx";
import { Dropdown, MenuItem, MenuDivider } from "../ui/Dropdown.jsx";
import { cn, timeAgo, hexToRgba } from "@/shared/skills";
import { accents } from "@/shared/styles/tokens";
import { CardDecor } from "../dashboard/CardDecor.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { canSeeStatsPage } from "../../lib/roles.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { getLocalShareUrl, isLocalhostOrigin, fetchNetworkInfo, buildNetworkShareUrl } from "../../lib/shareUrl.js";
import { copyText } from "../../lib/clipboard.js";
import { analyticsPath, builderPath, publicFormPath, responsesPath } from "../../lib/routes.js";

// Curated, muted palette + motif — alternated by card position so the grid
// has visual rhythm even when many forms share the same brand color.
// The first slot is the brand itself: every eighth card lands on it, so the
// accent shows up in the grid on its own terms instead of being overwritten.
// Los colores que coinciden con la paleta de tarjeta del bento vienen de
// `@/shared/styles/tokens` (var(--accent-*)); el resto son tonos propios de
// la tarjeta de formulario (no del sitio) y se dejan como están.
const STRIP = [
  { color: "var(--color-brand-600)", decor: "e" },
  { color: "#4f7cc0", decor: "b" },
  { color: accents.purple, decor: "a" },
  { color: "#c79235", decor: "c" },
  { color: accents.coral, decor: "d" },
  { color: accents.teal, decor: "a" },
  { color: "#5e7fb8", decor: "c" },
  { color: "#b06ca0", decor: "b" },
];

export function FormCard({ form, index = 0, publicOnly = false, guestMode = false, onDuplicate, onDelete, onPatch }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const strip = STRIP[index % STRIP.length];
  const accent = strip.color;
  const published = form.status === "published";
  // Modo lectura (público o invitado): sin estrella, sin kebab, sin botón de panel.
  const ro = publicOnly || guestMode;
  const isPrivate = form.visibility === "private";

  /* El creador navega su panel bajo el slug de su entidad (igual que el resto
     de sus enlaces); y no ve estadísticas, así que sus accesos a respuestas y
     analíticas se ocultan en vez de rebotar. */
  const { user } = useAuth();
  const entityCode = user?.entity?.code;
  const puedeStats = canSeeStatsPage(user, "analytics");

  // Responder: directo en lo público; por el IDP en lo privado (vuelve con el nombre).
  const goAnswer = () => {
    if (!isPrivate) {
      navigate(publicFormPath(form.slug));
      return;
    }
    const apiUrl = getResolvedApiBase();
    window.location.assign(`${apiUrl}/auth/login?return=${encodeURIComponent(`/f/${form.slug}`)}`);
  };

  // Eleva la tarjeta mientras el menú está abierto para que el dropdown
  // siempre se dibuje POR ENCIMA de la tarjeta que queda debajo en la grilla.
  const [menuOpen, setMenuOpen] = useState(false);

  const copyLink = async () => {
    let url = getLocalShareUrl(form.slug);
    // Si estás en localhost, intenta usar la IP de red para que funcione en otra máquina de la misma subred
    if (isLocalhostOrigin()) {
      try {
        const { networkUrls } = await fetchNetworkInfo();
        if (networkUrls[0]) url = buildNetworkShareUrl(form.slug, networkUrls[0]);
      } catch {}
    }
    if (!(await copyText(url))) {
      toast.error(t("copyFailed"));
      return;
    }
    toast.success(t("publicLinkCopied"));
  };

  return (
    <Card
      hover
      data-testid="form-card"
      /* El acento vive en la tarjeta, no en cada capa: el mesh, el filo y el
         glow del hover salen de aquí. Es lo que hace que estas tarjetas y las
         seis del panel se comporten igual sin código repetido. */
      style={{ "--card-accent": accent }}
      className={cn(
        "group relative flex flex-col overflow-visible",
        menuOpen && "z-30"
      )}
    >
      {/* Hairline de acento que "se enciende" al hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accent} 50%, transparent)` }}
      />

      {/* Cabecera — hero con degradado + mesh + grano + motivo */}
      <div className="relative h-28 w-full overflow-hidden rounded-t-[var(--card-radius)]">
        {/* degradado base */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(accent, 0.17)} 0%, ${hexToRgba(accent, 0.05)} 55%, transparent 100%)`,
          }}
        />
        {/* Mesh repartido por toda la cabecera. Sustituye al glow radial que
            estaba clavado en la esquina superior derecha: un foco en un punto
            se lee como mancha, tres focos repartidos se leen como luz. Mismas
            utilidades y mismo acento que el panel. */}
        <div aria-hidden className="card-mesh pointer-events-none absolute inset-0" />
        <div aria-hidden className="card-grain pointer-events-none absolute inset-0" />
        {/* El motivo "respira" al hover de la tarjeta */}
        <div className="pointer-events-none absolute -bottom-3 right-1 opacity-60 transition-all duration-700 ease-out group-hover:-rotate-6 group-hover:scale-110 group-hover:opacity-90">
          <CardDecor variant={strip.decor} color={accent} className="h-32 w-32 drop-shadow-[0_2px_10px_rgba(16,24,40,0.10)]" />
        </div>
        {/* línea divisoria con degradado de acento */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px opacity-30"
          style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, 0.55)} 50%, transparent)` }}
        />

        <div className="absolute left-3 top-3">
          <Badge
            variant={published ? "green" : "gray"}
            className="backdrop-blur-md [&>svg]:h-3 [&>svg]:w-3"
          >
            {published ? <Globe className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
            {published ? t("published") : t("drafts")}
          </Badge>
        </div>

        {/* Visibilidad al otro extremo: puerta abierta / candado. */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <CategoryBadge type={form.visibility} />
          {!ro && (
            <button
              onClick={() => onPatch(form._id, { isFavorite: !form.isFavorite })}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-xl border backdrop-blur transition-all duration-300 active:scale-90",
                form.isFavorite
                  ? "border-amber-200/60 bg-white/90 text-amber-500 dark:border-amber-500/30 dark:bg-slate-950/60 dark:text-amber-400"
                  : "border-white/30 bg-black/15 text-white hover:bg-black/30"
              )}
              aria-label={t("favorite")}
              aria-pressed={form.isFavorite}
            >
              <Star className={cn("h-4 w-4 transition-transform duration-300", form.isFavorite && "scale-110 fill-current")} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          {/*
            Título sin line-clamp: se muestra entero, por larga que sea la cadena.
            min-w-0 + break-words dejan que envuelva y que una palabra suelta
            (un id, una URL) no desborde ni empuje el kebab fuera de la tarjeta.
          */}
          <button
            onClick={() => navigate(ro ? publicFormPath(form.slug) : builderPath(language, form._id, {}, entityCode))}
            className="min-w-0 break-words text-left text-[15px] font-bold tracking-tight text-ink transition-colors hover:text-brand-600 dark:hover:text-brand-300"
          >
            {form.title}
          </button>

          {/*
            Kebab accesible:
            - Móvil (táctil): siempre visible (no hay hover).
            - Desktop: aparece al hover del grupo O al navegar con teclado
              (focus-within), nunca queda atrapado invisible.
          */}
          {!ro && (
            <Dropdown
              open={menuOpen}
              onOpenChange={setMenuOpen}
              trigger={
                <button
                  className={cn(
                    "rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-2 hover:text-ink",
                    "max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  )}
                  aria-label={t("moreOptions") ?? "More options"}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              }
            >
              <MenuItem icon={Pencil} onClick={() => navigate(builderPath(language, form._id, {}, entityCode))}>
                {t("edit")}
              </MenuItem>
              {puedeStats && (
                <>
                  <MenuItem icon={BarChart3} onClick={() => navigate(analyticsPath(language, form._id, entityCode))}>
                    {t("insights")}
                  </MenuItem>
                  <MenuItem icon={Inbox} onClick={() => navigate(responsesPath(language, form._id, entityCode))}>
                    {t("responses")}
                  </MenuItem>
                </>
              )}
              <MenuItem icon={Copy} onClick={() => onDuplicate(form._id)}>
                {t("duplicate")}
              </MenuItem>
              {published && (
                <MenuItem icon={Link2} onClick={copyLink}>
                  {t("copyLink")}
                </MenuItem>
              )}
              <MenuDivider />
              <MenuItem
                icon={form.isArchived ? ArchiveRestore : Archive}
                onClick={() => onPatch(form._id, { isArchived: !form.isArchived })}
              >
                {form.isArchived ? t("unarchive") : t("archive")}
              </MenuItem>
              <MenuItem icon={Trash2} danger onClick={() => onDelete(form)}>
                {t("delete")}
              </MenuItem>
            </Dropdown>
          )}
        </div>

        {/* Descripción entera: sin line-clamp ni alto mínimo. */}
        <p className="mt-1.5 break-words text-sm leading-relaxed text-ink-muted">
          {form.description || t("noDescription")}
        </p>

        {/*
          Métricas compactas. mt-auto (en vez de mt-3) pega este bloque al
          fondo: al ya no estar recortada la descripción, dos tarjetas de la
          misma fila miden distinto y sin esto el botón de estadísticas
          quedaría a distinta altura en cada una.
        */}
        <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-ink-muted">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 font-medium transition-colors group-hover:bg-surface dark:bg-slate-800/70"
            title={t("responses")}
          >
            <Inbox className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" aria-hidden="true" />
            <span aria-label={`${form.responseCount || 0} ${t("responses")}`}>{form.responseCount || 0}</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 font-medium transition-colors group-hover:bg-surface dark:bg-slate-800/70"
            title={t("views") ?? "Views"}
          >
            <Eye className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <span aria-label={`${form.views || 0} ${t("views") ?? "views"}`}>{form.views || 0}</span>
          </span>
          <span className="ml-auto truncate text-ink-muted">{timeAgo(form.updatedAt, language)}</span>
        </div>

        {/* Botón de estadísticas — pie de la tarjeta */}
        {!ro && puedeStats && (
          <button
            onClick={() => navigate(analyticsPath(language, form._id, entityCode))}
            className="group/btn mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-2/70 py-2 text-xs font-semibold text-ink transition-all duration-300 hover:border-brand-600/50 hover:bg-brand-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:bg-slate-800/60"
            aria-label={t("insights")}
          >
            <BarChart3 className="h-4 w-4" />
            {t("insights")}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>
        )}

        {/*
          Pie de invitado: solo Responder — en lo privado pasa por el IDP y
          vuelve con el nombre del encuestado. Sin botón de estadísticas: un
          usuario sin cuenta no ve las estadísticas de ningún formulario.
        */}
        {guestMode && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={goAnswer}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-gradient py-2 text-xs font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <Reply className="h-4 w-4" />
              {rt("answerNow")}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}