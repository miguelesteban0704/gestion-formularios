import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce.js";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Eye,
  FolderOpen,
  LayoutGrid,
  Link2,
  Lock,
  MessageCircle,
  Type,
  UserRound,
} from "lucide-react";
import { adminApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { AppleSpotlight } from "../../components/ui/apple-spotlight";
import { EntitySelect } from "../../components/admin/EntitySelect.jsx";
import { PublicFormCard, PUBLISHED_COLS } from "../../components/admin/PublicFormCard.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { DoorOpenIcon, VisibilityIcon } from "../../components/ui/CategoryBadge.jsx";
import {
  AdminHeader,
  AdminPanel,
  StatTile,
  notifyError,
} from "../../components/admin/AdminKit.jsx";
import {
  applySpotlightQuery,
  ListSection,
  Segmented,
  SpotlightTrigger,
  SummaryBar,
  useSpotlightHotkey,
} from "../../components/admin/ListChrome.jsx";
import { PremiumSearchBar } from "../../components/admin/PremiumSearchBar.jsx";
import { formatNumber } from "@/shared/skills";

/**
 * Formularios publicados en solo lectura, SOLO estadísticas: overlay
 * `AppleSpotlight` (⌘K/Ctrl K) que busca en toda la información de la
 * tabla —título, usuario, entidad, estado, ID y métricas— y al elegir
 * una tarjeta hace scroll hasta ella; filtro por entidad y filtro de
 * visibilidad (Todos / Público / Privado).
 * No hay descargar, copiar enlace, responder, editar ni abrir el formulario:
 * la única acción de cada fila (solo en lo público) es abrir sus estadísticas.
 *
 * La lista tabular pasó a ser un sistema de tarjetas apiladas (ver el design
 * sheet `docs/design/2026-10-06-published-forms-cards.html`): densidad
 * Espaciado/Denso, orden desde el toolbar y chips que muestran los filtros
 * activos y los limpian. Cada tarjeta muestra la entidad y el usuario que
 * publicó (con "-" si no están relacionados).
 *
 * El `z-30` del panel de filtros no es decorativo: `card-surface` usa
 * `isolation: isolate` y crea un stacking context propio. Sin elevar el
 * panel, el dropdown del EntitySelect queda atrapado dentro de su contexto
 * y la sección de la lista (que va después en el DOM) lo pinta por encima.
 */
export default function PublicStats() {
  const rt = useRoleT();
  const { language, t } = useLanguage();
  const isSpanish = language === "es";
  const [entities, setEntities] = useState([]);
  const [entityId, setEntityId] = useState("");
  const [visibility, setVisibility] = useState(""); // "" = todos, "public" | "unlisted" | "private"
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [result, setResult] = useState({ forms: [], count: 0, summary: "", entity: null });
  const [stats, setStats] = useState({ totals: { forms: 0, publicForms: 0, privateForms: 0, responses: 0, views: 0 }, perForm: [] });
  const [density, setDensity] = useState("a");
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isFirstMount = useRef(true);

  const runSearch = (ent, vis) => {
    if (!isFirstMount.current) setIsLoading(true);
    setHasError(false);
    const entName = ent ? entities.find((e) => e._id === ent)?.name || null : null;
    Promise.all([
      adminApi.publicForms({ entityId: ent, visibility: vis }),
      adminApi.publicStats({ entityId: ent, visibility: vis }),
    ])
      .then(([list, agg]) => {
        setResult({ ...list, entity: entName });
        setStats(agg);
      })
      .catch((e) => {
        notifyError(e);
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
        isFirstMount.current = false;
      });
  };

  useEffect(() => {
    adminApi.entities({}).then((d) => setEntities(d.entities)).catch(() => {});
  }, []);

  // Carga automática: al montar carga todo; después, cada cambio de
  // entidad o visibilidad re-ejecuta la consulta. La búsqueda es local
  // (AppleSpotlight filtra sobre `cardForms`), así que no va al servidor.
  useEffect(() => {
    if (isFirstMount.current) {
      runSearch("", "");
      return;
    }
    runSearch(entityId, visibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, visibility]);

  // ⌘K / Ctrl K abre (o cierra) el overlay: la lógica vive en ListChrome.
  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  const onEntityChange = (entity) => {
    setEntityId(entity._id);
  };

  const selectedEntity = entities.find((entity) => entity._id === entityId)?.name || rt("allEntities");

  // Métricas en bruto por formulario (vienen aparte en `/public-stats`).
  const rawResponses = (f) => stats.perForm.find((s) => s._id === f._id)?.responses ?? f.responseCount ?? 0;
  const rawViews = (f) => stats.perForm.find((s) => s._id === f._id)?.views ?? f.views ?? 0;

  // "Más recientes" ordena por la ÚLTIMA MODIFICACIÓN (updatedAt), no por la
  // fecha de creación: el autor espera que el formulario que acaba de editar
  // suba al principio. createdAt queda como respaldo si el backend no lo trae.
  const sortedForms = useMemo(() => {
    const list = [...result.forms];
    if (sortBy === "recent") list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    else if (sortBy === "title") list.sort((a, b) => a.title.localeCompare(b.title, language));
    else if (sortBy === "responses") list.sort((a, b) => rawResponses(b) - rawResponses(a));
    else if (sortBy === "views") list.sort((a, b) => rawViews(b) - rawViews(a));
    return list;
  }, [result.forms, stats.perForm, sortBy, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tarjetas: métricas ya formateadas; el orden de `sortedForms` se respeta.
  const cardForms = sortedForms.map((f) => ({
    ...f,
    responses: formatNumber(rawResponses(f), isSpanish ? "es" : "en"),
    views: formatNumber(rawViews(f), isSpanish ? "es" : "en"),
  }));

  // Resultados del overlay: toda la información de la tabla (título,
  // usuario, entidad, estado, ID, slug y métricas crudas y formateadas),
  // en el mismo orden que la lista. Al elegir uno se cierra y se hace
  // scroll hasta su tarjeta (ancla `pub-form-<id>` en PublicFormCard).
  const spotlightResults = cardForms.map((f) => ({
    icon: <VisibilityIcon type={f.visibility} />,
    label: f.title || "-",
    description: [f.entityName, f.ownerName].filter(Boolean).join(" · ") || "-",
    link: `#pub-form-${f._id}`,
    keywords: [
      f._id,
      f.slug,
      f.description,
      f.status,
      f.visibility,
      f.category,
      f.ownerName,
      f.updatedByName,
      String(rawResponses(f)),
      String(rawViews(f)),
      f.responses,
      f.views,
      f.publishedAt,
      f.updatedAt,
    ].filter(Boolean),
  }));

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById("adm-pub-spotlight-trigger")?.focus());
  };

  // La consulta del overlay filtra la tabla en vivo con su misma regla:
  // al escribir solo quedan las coincidencias, y al elegir una se cierra
  // el overlay con el filtro fijado (el chip lo muestra y lo quita).
  const activeQuery = query.trim();
  const filteredForms = applySpotlightQuery(cardForms, spotlightResults, query, (f) => `#pub-form-${f._id}`);

  // Acciones rápidas del overlay (solo aparecen con el campo vacío y al
  // pasar el ratón): fijan el filtro de visibilidad y cierran.
  const spotlightShortcuts = [
    { label: rt("visibilityPublic"), icon: <DoorOpenIcon />, onClick: () => { setVisibility("public"); closeSpotlight(); } },
    { label: rt("linkOnlyOne"), icon: <VisibilityIcon type="unlisted" />, onClick: () => { setVisibility("unlisted"); closeSpotlight(); } },
    { label: rt("visibilityPrivate"), icon: <Lock />, onClick: () => { setVisibility("private"); closeSpotlight(); } },
    { label: rt("visibilityAll"), icon: <LayoutGrid />, onClick: () => { setVisibility(""); closeSpotlight(); } },
  ];

  const safeTotals = stats.totals || { forms: 0, publicForms: 0, privateForms: 0, responses: 0, views: 0 };
  const activeEntity = entities.find((e) => e._id === entityId)?.name || null;

  const VIS_OPTIONS = [
    { id: "", label: rt("visibilityAll") },
    { id: "public", label: rt("visibilityPublic") },
    { id: "unlisted", label: rt("linkOnlyOne") },
    { id: "private", label: rt("visibilityPrivate") },
  ];

  const SORTS = [
    { id: "recent", label: isSpanish ? "Más recientes" : "Most recent" },
    { id: "title", label: isSpanish ? "Título (A–Z)" : "Title (A–Z)" },
    { id: "responses", label: isSpanish ? "Más respuestas" : "Most responses" },
    { id: "views", label: isSpanish ? "Más vistas" : "Most views" },
  ];

  // Early return for error state
  if (hasError) {
    return (
      <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-3 text-danger" role="alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">{isSpanish ? "Error al cargar los datos" : "Failed to load data"}</p>
            <p className="text-sm opacity-80">{isSpanish ? "Intenta recargar la página o contacta al administrador" : "Try reloading the page or contact the administrator"}</p>
          </div>
          <button onClick={() => runSearch(entityId, visibility)} className="ml-auto px-3 py-1.5 text-sm font-medium rounded-lg bg-danger/20 hover:bg-danger/30 transition">
            {isSpanish ? "Reintentar" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" aria-live="polite" aria-label={isSpanish ? "Cargando estadísticas" : "Loading statistics"}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="skeleton-shimmer animate-shimmer rounded-xl h-24" />
          ))}
        </div>
      </div>
    );
  }

  // Main render - only reached when !isLoading && !hasError
  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <AdminHeader
        eyebrow={isSpanish ? "Centro de control" : "Control center"}
        title={rt("publicForms")}
        description={isSpanish ? "Supervisa formularios publicados, respuestas y alcance por entidad." : "Monitor published forms, responses, and reach by entity."}
      />

      <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" aria-label={isSpanish ? "Resumen de actividad de formularios" : "Forms activity overview"}>
        <StatTile
          icon={DoorOpenIcon}
          label={rt("publicForms")}
          value={formatNumber(safeTotals.publicForms ?? safeTotals.forms)}
          hint={selectedEntity}
          tone="accent"
        />
        <StatTile
          icon={Lock}
          label={rt("privateFormsLabel")}
          value={formatNumber(safeTotals.privateForms ?? 0)}
          hint={selectedEntity}
          tone="warning"
        />
        <StatTile
          icon={MessageCircle}
          label={rt("totalResponses")}
          value={formatNumber(safeTotals.responses)}
          tone="success"
        />
        <StatTile
          icon={Eye}
          label={rt("totalViews")}
          value={formatNumber(safeTotals.views)}
          tone="info"
        />
      </section>

      {/* z-30: eleva el stacking context del panel de filtros para que el
          dropdown del EntitySelect pinte por encima de la sección de la
          lista (que va después en el DOM). */}
      <div className="relative z-30 mt-6">
        <AdminPanel className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)_minmax(0,auto)] lg:items-end">
            {/* Disparador del overlay AppleSpotlight (chrome compartido):
                el atajo ⌘K / Ctrl K vive en un tooltip de sistema. */}
            <SpotlightTrigger
              id="adm-pub-spotlight-trigger"
              label={t("searchForms")}
              placeholder={activeQuery || (isSpanish ? "Buscar por título, entidad, usuario o ID…" : "Search by title, entity, user or ID…")}
              ariaLabel={isSpanish ? "Buscar formularios" : "Search forms"}
              onClick={() => setSpotlightOpen(true)}
            />
            <div>
              <p className="adm-label">{rt("entity")}</p>
              <EntitySelect
                entities={[{ _id: "", name: rt("allEntities"), category: "organos_estatales" }, ...entities]}
                value={entityId}
                onChange={onEntityChange}
                ariaLabel={rt("entity")}
              />
            </div>
            {/* Filtro de visibilidad: segmented control en la misma voz del
                toggle de densidad (mismo grosor de celda, `shadow-soft` en la
                activa). El backend devuelve públicos, privados (unlisted) y
                restringidos; "Todos" es el valor por defecto (sin parámetro). */}
            <div>
              <p className="adm-label">{isSpanish ? "Visibilidad" : "Visibility"}</p>
              <Segmented
                value={visibility}
                onChange={setVisibility}
                ariaLabel={isSpanish ? "Filtrar por visibilidad" : "Filter by visibility"}
                options={VIS_OPTIONS.map((opt) => ({
                  ...opt,
                  icon:
                    opt.id === "private" ? (
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : opt.id === "unlisted" ? (
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : opt.id === "public" ? (
                      <DoorOpenIcon className="h-3.5 w-3.5" />
                    ) : null,
                }))}
              />
            </div>
          </div>
        </AdminPanel>
      </div>

      <SummaryBar icon={BarChart3} tickKey={`${filteredForms.length}-${result.entity || ""}-${activeQuery}`}>
        {activeQuery
          ? (isSpanish
            ? `${formatNumber(filteredForms.length)} coinciden con «${activeQuery}»`
            : `${formatNumber(filteredForms.length)} match "${activeQuery}"`)
          : (result.summary || rt("foundForms", result.count, result.entity))}
      </SummaryBar>

      <ListSection
        title={isSpanish ? "Formularios publicados" : "Published forms"}
        titleId="public-forms-list-title"
        countText={formatNumber(filteredForms.length)}
        sorts={SORTS}
        sortBy={sortBy}
        onSort={setSortBy}
        density={density}
        onDensity={setDensity}
        sortAriaLabel={isSpanish ? "Ordenar resultados" : "Sort results"}
        densityAriaLabel={isSpanish ? "Densidad de la lista" : "List density"}
        densityATitle={isSpanish ? "Vista espaciada" : "Spaced view"}
        densityBTitle={isSpanish ? "Vista densa" : "Compact view"}
        clearAllLabel={isSpanish ? "Limpiar todo" : "Clear all"}
        chips={[
          activeQuery && {
            key: "search",
            label: isSpanish ? `Búsqueda: «${activeQuery}»` : `Search: "${activeQuery}"`,
            onClear: () => setQuery(""),
          },
          visibility && {
            key: "visibility",
            label: visibility === "private" ? rt("visibilityPrivate") : visibility === "unlisted" ? rt("linkOnlyOne") : rt("visibilityPublic"),
            onClear: () => setVisibility(""),
          },
          activeEntity && { key: "entity", label: activeEntity, onClear: () => setEntityId("") },
        ].filter(Boolean)}
        columns={[
          { icon: Type, label: t("title") },
          { icon: UserRound, label: t("user") },
          { icon: Building2, label: t("entity") },
          /* Icono de Estado dinámico: candado cuando el filtro activo es
             "Restringido", eslabón para "Privado" y puerta abierta para
             "Público" y "Todos". */
          { icon: visibility === "private" ? Lock : visibility === "unlisted" ? Link2 : DoorOpenIcon, label: t("status") },
          { icon: BarChart3, label: t("performance") },
          /* Acciones: de momento una sola, abrir las estadísticas del
             formulario, y solo en las filas públicas (la celda de un
             privado sale vacía: `canSeeStats` veta al super_admin). */
          { icon: Activity, label: t("actions") },
        ]}
        colsClass={PUBLISHED_COLS}
        rows={filteredForms}
        renderRow={(f, i, d) => (
          <PublicFormCard
            key={f._id}
            form={f}
            responses={f.responses}
            views={f.views}
            density={d}
            index={i}
          />
        )}
        empty={{
          icon: FolderOpen,
          title: rt("noResults"),
          hint: activeQuery
            ? (isSpanish ? "Prueba con otro término o quita la búsqueda" : "Try another term or clear the search")
            : (isSpanish ? "Prueba con otro filtro de la lista" : "Try another list filter"),
        }}
      />

      {/* Overlay AppleSpotlight: buscador tipo Spotlight (⌘K / Ctrl K) con
          resultados locales sobre la tabla y acciones rápidas de visibilidad.
          Lo escrito filtra la tabla en vivo; al elegir un resultado se
          cierra con el filtro fijado y se hace scroll a su tarjeta. */}
      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        shortcuts={spotlightShortcuts}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder={isSpanish ? "Buscar formularios…" : "Search forms…"}
        ariaLabel={t("searchForms")}
        emptyText={isSpanish ? "Sin coincidencias" : "No matches"}
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