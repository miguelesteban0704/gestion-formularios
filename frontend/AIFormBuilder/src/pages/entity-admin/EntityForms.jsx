import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  LayoutGrid,
  Link2,
  Lock,
  Inbox,
  PenLine,
  Type,
  UserRound,
  ClipboardList,
  Settings,
} from "lucide-react";
import { entityAdminApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { analyticsPath, publicFormPath } from "../../lib/routes.js";
import { Pill } from "../../components/admin/AdminTable.jsx";
import { CategoryBadge, DoorOpenIcon, VisibilityIcon } from "../../components/ui/CategoryBadge.jsx";
import { MetricTile } from "../../components/admin/PublicFormCard.jsx";
import { AppleSpotlight } from "../../components/ui/apple-spotlight";
import { FabSpeedDial } from "../../components/ui/FabSpeedDial";
import { cn } from "../../lib/utils.js";
import { copyText } from "../../lib/clipboard.js";
import {
  AdminHeader,
  AdminPanel,
  StatTile,
  notifySaved,
  notifyError,
} from "../../components/admin/AdminKit.jsx";
import {
  applySpotlightQuery,
  IconPill,
  ListSection,
  MetaDot,
  MetaLine,
  RowHeading,
  RowShell,
  Segmented,
  SpotlightTrigger,
  SummaryBar,
  useSpotlightHotkey,
} from "../../components/admin/ListChrome.jsx";
import { formatNumber, timeAgo } from "@/shared/skills";

/**
 * Formularios de la entidad del `entity_admin`: solo lectura. Cada fila trae un
 * FAB con las acciones rápidas —Ver y Responder (la página pública del
 * formulario, en pestaña nueva) y Estadística (la analítica de ese formulario,
 * dentro del panel). El backend ya acota la lista a `req.user.entityId`.
 *
 * Los filtros de estado y visibilidad son locales sobre lo ya cargado (igual
 * que el resto del panel); el buscador es el overlay ⌘K/Ctrl K.
 */

const ENTITY_FORMS_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(0,0.7fr)]";

const TRIGGER_ID = "adm-entity-forms-spotlight-trigger";

export default function EntityForms() {
  const rt = useRoleT();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const entitySlug = user?.entity?.code || "";
  const isSpanish = language === "es";

  const [forms, setForms] = useState([]);
  const [status, setStatus] = useState("");
  const [visibility, setVisibility] = useState("");
  const [density, setDensity] = useState("a");
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  useEffect(() => {
    entityAdminApi
      .forms({})
      .then((d) => setForms(d.forms))
      .catch((e) => notifyError(e));
  }, []);

  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  const counts = useMemo(() => {
    let publics = 0;
    let unlisted = 0;
    let responses = 0;
    for (const f of forms) {
      if (f.visibility === "unlisted") unlisted += 1;
      else if (f.visibility !== "private") publics += 1;
      responses += Number(f.responseCount || 0);
    }
    return { total: forms.length, publics, unlisted, privates: forms.length - publics - unlisted, responses };
  }, [forms]);

  // Estado y visibilidad se filtran sobre lo cargado (sin ir al servidor).
  const filtered = useMemo(() => {
    return forms.filter((f) => {
      if (status && f.status !== status) return false;
      if (visibility && f.visibility !== visibility) return false;
      return true;
    });
  }, [forms, status, visibility]);

  const sortedForms = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "recent") list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    else if (sortBy === "title") list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), language));
    else if (sortBy === "responses") list.sort((a, b) => Number(b.responseCount || 0) - Number(a.responseCount || 0));
    return list;
  }, [filtered, sortBy, language]);

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById(TRIGGER_ID)?.focus());
  };

  const spotlightResults = sortedForms.map((f) => ({
    icon: <VisibilityIcon type={f.visibility} />,
    label: f.title || "-",
    description: [f.ownerName, f.slug].filter(Boolean).join(" · ") || "-",
    link: `#efm-${f._id}`,
    keywords: [f._id, f.slug, f.description, f.status, f.visibility, f.ownerName, f.updatedByName, String(f.responseCount || 0), String(f.views || 0)].filter(Boolean),
  }));

  const activeQuery = query.trim();
  const cardForms = applySpotlightQuery(sortedForms, spotlightResults, query, (f) => `#efm-${f._id}`);

  const openPublic = (slug) => {
    if (!slug) return;
    window.open(publicFormPath(slug), "_blank", "noopener");
  };

  const SORTS = [
    { id: "recent", label: isSpanish ? "Más recientes" : "Most recent" },
    { id: "title", label: isSpanish ? "Título (A–Z)" : "Title (A–Z)" },
    { id: "responses", label: isSpanish ? "Más respuestas" : "Most responses" },
  ];

  const STATUS_OPTIONS = [
    { id: "", label: rt("allStatuses"), icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: "draft", label: rt("statusDraft") },
    { id: "published", label: rt("statusPublished") },
    { id: "archived", label: rt("statusArchived") },
  ];

  const VIS_OPTIONS = [
    { id: "", label: rt("visibilityAll") },
    { id: "public", label: rt("visibilityPublic"), icon: <DoorOpenIcon className="h-3.5 w-3.5" /> },
    { id: "unlisted", label: rt("linkOnlyOne"), icon: <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: "private", label: rt("visibilityPrivate"), icon: <Lock className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <AdminHeader
        eyebrow={rt("roleEntity")}
        title={rt("entityForms")}
        description={rt("entityFormsDesc")}
      />

      <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5" aria-label={rt("entityForms")}>
        <StatTile icon={FolderOpen} label={rt("entityForms")} value={formatNumber(counts.total)} hint={user?.entity?.name} tone="accent" />
        <StatTile icon={DoorOpenIcon} label={rt("visibilityPublic")} value={formatNumber(counts.publics)} tone="success" />
        <StatTile icon={Link2} label={rt("linkOnlyOne")} value={formatNumber(counts.unlisted)} tone="info" />
        <StatTile icon={Lock} label={rt("visibilityPrivate")} value={formatNumber(counts.privates)} tone="warning" />
        <StatTile icon={Inbox} label={rt("totalResponses")} value={formatNumber(counts.responses)} tone="info" />
      </section>

      {/* z-30: eleva el stacking context del panel para que sus controles
          pinten por encima de la lista (que va después en el DOM). */}
      <div className="relative z-30 mt-6">
        <AdminPanel className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)] lg:items-end">
            <SpotlightTrigger
              id={TRIGGER_ID}
              label={rt("entityForms")}
              placeholder={activeQuery || `${rt("entityForms")}…`}
              ariaLabel={rt("entityForms")}
              onClick={() => setSpotlightOpen(true)}
            />
            <div>
              <p className="adm-label">Estado</p>
              <Segmented value={status} onChange={setStatus} ariaLabel="Filtrar por estado" options={STATUS_OPTIONS} />
            </div>
            <div>
              <p className="adm-label">{isSpanish ? "Visibilidad" : "Visibility"}</p>
              <Segmented value={visibility} onChange={setVisibility} ariaLabel="Filtrar por visibilidad" options={VIS_OPTIONS} />
            </div>
          </div>
        </AdminPanel>
      </div>

      <SummaryBar icon={FileText} tickKey={`${cardForms.length}-${status}-${visibility}-${activeQuery}`}>
        {activeQuery
          ? (isSpanish
            ? `${formatNumber(cardForms.length)} coinciden con «${activeQuery}»`
            : `${formatNumber(cardForms.length)} match "${activeQuery}"`)
          : `${formatNumber(cardForms.length)} · ${user?.entity?.name || ""}`}
      </SummaryBar>

      <ListSection
        title={rt("entityForms")}
        countText={formatNumber(cardForms.length)}
        sorts={SORTS}
        sortBy={sortBy}
        onSort={setSortBy}
        density={density}
        onDensity={setDensity}
        chips={[
          ...(activeQuery ? [{ key: "search", label: `«${activeQuery}»`, onClear: () => setQuery("") }] : []),
          ...(status ? [{ key: "status", label: statusLabel(rt, status), onClear: () => setStatus("") }] : []),
          ...(visibility ? [{ key: "visibility", label: visibility === "private" ? rt("visibilityPrivate") : visibility === "unlisted" ? rt("linkOnlyOne") : rt("visibilityPublic"), onClear: () => setVisibility("") }] : []),
        ]}
        columns={[
          { icon: Type, label: isSpanish ? "Título" : "Title" },
          { icon: UserRound, label: isSpanish ? "Autor" : "Author" },
          { icon: Activity, label: "Estado" },
          { icon: visibility === "private" ? Lock : visibility === "unlisted" ? Link2 : DoorOpenIcon, label: isSpanish ? "Visibilidad" : "Visibility" },
          { icon: BarChart3, label: isSpanish ? "Rendimiento" : "Performance" },
          { icon: Settings, label: "Acciones" },
        ]}
        colsClass={ENTITY_FORMS_COLS}
        rows={cardForms}
        renderRow={(f, i, d) => (
          <EntityFormRow
            key={f._id || i}
            form={f}
            index={i}
            density={d}
            router={navigate}
            entitySlug={entitySlug}
            language={language}
            rt={rt}
            onOpen={() => openPublic(f.slug)}
            onAnswer={() => openPublic(f.slug)}
          />
        )}
        empty={{
          icon: FolderOpen,
          title: rt("noResults"),
          hint: activeQuery ? (isSpanish ? "Prueba con otro término o quita la búsqueda" : "Try another term or clear the search") : rt("entityFormsDesc"),
        }}
      />

      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder={`${rt("entityForms")}…`}
        ariaLabel={rt("entityForms")}
        emptyText={rt("noResults")}
        emptySubText={isSpanish ? "Prueba con otro término de búsqueda" : "Try another search term"}
        onSelect={(item) => {
          closeSpotlight();
          document
            .getElementById((item.link || "").replace(/^#/, ""))
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </div>
  );
}

function statusLabel(rt, status) {
  if (status === "draft") return rt("statusDraft");
  if (status === "published") return rt("statusPublished");
  if (status === "archived") return rt("statusArchived");
  return status;
}

function statusTone(status) {
  if (status === "published") return "green";
  if (status === "archived") return "muted";
  return "amber";
}

function EntityFormRow({ form, index, density, router, entitySlug, language, rt, onOpen, onAnswer }) {
  const shortId = `#${String(form._id || "").slice(0, 6).toUpperCase()}`;
  const createdDate = (() => {
    if (!form.createdAt) return "—";
    const d = new Date(form.createdAt);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(language === "es" ? "es" : "en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
      .format(d)
      .replace(/\./g, "");
  })();

  return (
    <RowShell id={`efm-${form._id || index}`} index={index} density={density}>
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", ENTITY_FORMS_COLS)}>
        <div className="min-w-0 basis-full lg:basis-auto">
          <RowHeading>{form.title || "-"}</RowHeading>
          <MetaLine>
            <span className="adm-mono" aria-hidden="true">{shortId}</span>
            {form.slug && (
              <>
                <MetaDot />
                <span className="adm-mono">{form.slug}</span>
              </>
            )}
          </MetaLine>
          <MetaLine>
            <span>
              {language === "es" ? "Creado" : "Created"} {createdDate}
            </span>
            {form.ownerName && (
              <>
                <MetaDot />
                <span className="truncate" title={form.ownerName}>{form.ownerName}</span>
              </>
            )}
          </MetaLine>
          <MetaLine>
            <span>
              {language === "es" ? "Modificado" : "Updated"} {timeAgo(form.updatedAt, language)}
            </span>
            {form.updatedByName && (
              <>
                <MetaDot />
                <span className="truncate" title={form.updatedByName}>{form.updatedByName}</span>
              </>
            )}
          </MetaLine>
        </div>

        <div className="min-w-0">
          <IconPill icon={ClipboardList} title={rt("roleCreator")}>{form.ownerName || "-"}</IconPill>
        </div>

        <div className="min-w-0">
          <Pill tone={statusTone(form.status)} dot>{statusLabel(rt, form.status)}</Pill>
        </div>

        <div className="min-w-0 self-center">
          <CategoryBadge type={form.visibility} className="shrink-0" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MetricTile icon={Inbox} label={rt("totalResponses")} value={formatNumber(Number(form.responseCount || 0))} tint="var(--color-brand-600)" />
          <MetricTile icon={Eye} label={rt("totalViews")} value={formatNumber(Number(form.views || 0))} tint="var(--color-warning)" />
        </div>

        <div className="flex basis-full items-center justify-end gap-1 lg:basis-auto lg:justify-start">
          <FabSpeedDial
            label={`Acciones de ${form.title || "el formulario"}`}
            actions={[
              {
                id: "view",
                label: rt("viewForm"),
                icon: <Eye className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: onOpen,
              },
              {
                id: "answer",
                label: rt("answer"),
                icon: <PenLine className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: onAnswer,
              },
              {
                id: "stats",
                label: rt("viewStats"),
                icon: <BarChart3 className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: () => router(analyticsPath(language, String(form._id), entitySlug)),
              },
              {
                id: "copy",
                label: rt("accessUrl"),
                icon: <Copy className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: async () => {
                  if (!form.slug) return;
                  const ok = await copyText(`${window.location.origin}${publicFormPath(form.slug)}`);
                  if (ok) {
                    notifySaved(rt("linkCopied"));
                  } else {
                    notifyError(new Error("No se pudo copiar"));
                  }
                },
              },
            ]}
          />
        </div>
      </div>
    </RowShell>
  );
}
