import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Files,
  Globe,
  LayoutGrid,
  Link2,
  LogIn,
  ScrollText,
  ShieldAlert,
  Terminal,
  UserRound,
  Users as UsersIcon,
} from "lucide-react";
import { adminApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { Pill } from "../../components/admin/AdminTable.jsx";
import { AppleSpotlight } from "../../components/ui/apple-spotlight";
import { cn } from "../../lib/utils.js";
import {
  AdminHeader,
  AdminPanel,
  StatTile,
  notifyError,
} from "../../components/admin/AdminKit.jsx";
import {
  applySpotlightQuery,
  ListSection,
  MetaDot,
  MetaLine,
  RowShell,
  Segmented,
  SpotlightTrigger,
  SummaryBar,
  useSpotlightHotkey,
} from "../../components/admin/ListChrome.jsx";

/* Los Prefijos agrupan la bitácora en cuatro lecturas y no son un adorno:
   "auth." son accesos, "user." altas y cambios de cuentas, "entity." el
   catálogo, "access_url." los enlaces. Lo que no entra aquí queda como
   "otros" para que nada desaparezca de la vista. */
const GROUPS = [
  { key: "auth", label: "Accesos", hint: "auth.local.login, auth.local.logout…" },
  { key: "user", label: "Cuentas", hint: "user.create, user.update, user.delete" },
  { key: "entity", label: "Entidades", hint: "entity.create, entity.update…" },
  { key: "access_url", label: "URLs de acceso", hint: "access_url.create, access_url.regenerate…" },
];

// Rejilla de las 4 columnas (Acción | Actor | IP | Detalle): la comparten
// la cabecera de la lista y cada fila, así si cambia un lado, cambian los
// dos y la alineación no se rompe. La fecha viaja en la meta de la acción,
// igual que las fechas en PublicFormCard.
const AUDIT_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,0.7fr)_minmax(0,1.3fr)]";

const TRIGGER_ID = "adm-audit-spotlight-trigger";

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const detailText = (log) => {
  const details = log.details || {};
  return Object.keys(details).length ? JSON.stringify(details) : "-";
};

/** Auditoría de accesos y acciones administrativas (solo lectura). */
export default function Audit() {
  const rt = useRoleT();
  const [logs, setLogs] = useState([]);
  const [group, setGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState("a");
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  /* El grupo decide el alcance de la consulta (va al servidor, con
     prefijo): recorta el conjunto en el origen en vez de traer 200
     registros para descartar 190 en el navegador. El texto ya no filtra
     la lista: buscar es un salto con ⌘K / Ctrl K sobre lo cargado. */
  const load = () => {
    setLoading(true);
    adminApi
      .audit({ action: group ? `${group}.` : "", limit: 200 })
      .then((d) => setLogs(d.logs))
      .catch((e) => notifyError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  const stats = useMemo(() => {
    const logins = logs.filter((l) => String(l.action).startsWith("auth.local.login")).length;
    const failures = logs.filter(
      (l) => String(l.action).includes("fail") || String(l.action).includes("denied")
    ).length;
    return { logins, failures };
  }, [logs]);

  // El orden por defecto es el del servidor (más recientes primero); el
  // resto son órdenes locales sobre el conjunto ya filtrado por grupo.
  const sortedLogs = useMemo(() => {
    const list = [...logs];
    if (sortBy === "actor") list.sort((a, b) => String(a.actorName || "").localeCompare(String(b.actorName || ""), "es"));
    else if (sortBy === "action") list.sort((a, b) => String(a.action || "").localeCompare(String(b.action || ""), "es"));
    return list;
  }, [logs, sortBy]);

  const groupLabel = GROUPS.find((g) => g.key === group)?.label || null;

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById(TRIGGER_ID)?.focus());
  };

  // Resultados del overlay: acción, actor, fecha e IP, en el mismo orden
  // que la lista. Al elegir uno se cierra y se hace scroll hasta su fila
  // (ancla `log-<id>` en AuditRow).
  const spotlightResults = sortedLogs.map((l, i) => {
    const a = String(l.action || "");
    const Icon = a.startsWith("auth.")
      ? LogIn
      : a.startsWith("user.")
        ? UserRound
        : a.startsWith("entity.")
          ? Building2
          : a.startsWith("access_url.")
            ? Link2
            : ScrollText;
    return {
      icon: <Icon />,
      label: a || "-",
      description: [l.actorName, fmtDate(l.createdAt), l.ip].filter(Boolean).join(" · ") || "-",
      link: `#log-${l._id ?? i}`,
      keywords: [l._id, a, l.actorName, l.actorEmail, l.actorRole, l.ip, detailText(l), l.createdAt]
        .filter((v) => v !== undefined && v !== null && v !== "")
        .map(String),
    };
  });

  // La consulta del overlay filtra la tabla en vivo con su misma regla:
  // al escribir solo quedan las coincidencias, y al elegir una se cierra
  // el overlay con el filtro fijado (el chip lo muestra y lo quita).
  const activeQuery = query.trim();
  const filteredLogs = applySpotlightQuery(sortedLogs, spotlightResults, query, (l) => `#log-${l._id}`);

  // Acciones rápidas del overlay: fijan el filtro de grupo y cierran.
  const spotlightShortcuts = [
    { label: "Todo", icon: <LayoutGrid />, onClick: () => { setGroup(""); closeSpotlight(); } },
    { label: "Accesos", icon: <LogIn />, onClick: () => { setGroup("auth"); closeSpotlight(); } },
    { label: "Cuentas", icon: <UsersIcon />, onClick: () => { setGroup("user"); closeSpotlight(); } },
    { label: "Entidades", icon: <Building2 />, onClick: () => { setGroup("entity"); closeSpotlight(); } },
    { label: "URLs de acceso", icon: <Link2 />, onClick: () => { setGroup("access_url"); closeSpotlight(); } },
  ];

  const SORTS = [
    { id: "recent", label: "Más recientes" },
    { id: "actor", label: "Actor (A–Z)" },
    { id: "action", label: "Acción (A–Z)" },
  ];

  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <AdminHeader
          eyebrow={rt("audit")}
          title="Bitácora del sistema"
          description="Accesos y decisiones administrativas. El registro es de sólo lectura: nada de lo que hay aquí se puede editar ni borrar desde el panel."
        />

        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" aria-label="Resumen de la bitácora">
          <StatTile icon={ScrollText} label="Registros" value={logs.length} tone="accent" />
          <StatTile icon={LogIn} label="Accesos locales" value={stats.logins} tone="success" />
          <StatTile
            icon={ShieldAlert}
            label="Fallos y denegaciones"
            value={stats.failures}
            tone={stats.failures ? "warning" : "success"}
          />
        </section>

        <div className="relative z-30 mt-6">
          <AdminPanel className="p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] lg:items-end">
              <SpotlightTrigger
                id={TRIGGER_ID}
                label="Buscar"
                placeholder={activeQuery || "Buscar por acción, actor o IP…"}
                ariaLabel="Buscar en la bitácora"
                onClick={() => setSpotlightOpen(true)}
              />
              <div>
                <p className="adm-label">Grupo</p>
                <Segmented
                  ariaLabel="Filtrar por grupo"
                  value={group}
                  onChange={(v) => setGroup(group === v ? "" : v)}
                  options={[
                    { id: "", label: "Todo" },
                    ...GROUPS.map((g) => ({
                      id: g.key,
                      label: g.label,
                      hint: g.hint,
                      icon: g.key === "auth"
                        ? <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                        : g.key === "user"
                          ? <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                          : g.key === "entity"
                            ? <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                            : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />,
                    })),
                  ]}
                />
              </div>
            </div>
          </AdminPanel>
        </div>

        <SummaryBar icon={ScrollText} tickKey={`${filteredLogs.length}-${group}-${activeQuery}`}>
          {activeQuery
            ? `${filteredLogs.length} coinciden con «${activeQuery}»`
            : groupLabel
              ? `${logs.length} registros · ${groupLabel}`
              : `${logs.length} registros en la bitácora`}
        </SummaryBar>

        <ListSection
          title="Bitácora"
          countText={String(filteredLogs.length)}
          sorts={SORTS}
          sortBy={sortBy}
          onSort={setSortBy}
          density={density}
          onDensity={setDensity}
          chips={[
            ...(activeQuery ? [{ key: "search", label: `Búsqueda: «${activeQuery}»`, onClear: () => setQuery("") }] : []),
            ...(groupLabel ? [{ key: "group", label: groupLabel, onClear: () => setGroup("") }] : []),
          ]}
          columns={[
            { icon: Terminal, label: "Acción" },
            { icon: UserRound, label: "Actor" },
            { icon: Globe, label: "IP" },
            { icon: Files, label: "Detalle" },
          ]}
          colsClass={AUDIT_COLS}
          rows={filteredLogs}
          renderRow={(l, i, d) => (
            <AuditRow key={l._id ?? i} log={l} index={i} density={d} />
          )}
          empty={{
            icon: ScrollText,
            title: loading ? "Cargando registros…" : rt("noResults"),
            hint: activeQuery ? "Prueba con otro término o quita la búsqueda" : "Prueba con otro grupo de la lista",
          }}
        />

      {/* Overlay AppleSpotlight: buscador tipo Spotlight (⌘K / Ctrl K) con
          resultados locales sobre la bitácora y los grupos como acciones
          rápidas. Lo escrito filtra la tabla en vivo; al elegir uno se
          cierra con el filtro fijado y se hace scroll a su fila. */}
      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        shortcuts={spotlightShortcuts}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder="Buscar en la bitácora…"
        ariaLabel="Buscar en la bitácora"
        emptyText="Sin coincidencias"
        emptySubText="Prueba con otro término de búsqueda"
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

/**
 * Fila-registro en las dos densidades del design sheet: la acción (con
 * su tono por prefijo) como cabecera con el ID y la fecha en su meta,
 * y actor, IP y detalle alineados con la cabecera de la lista. Todo lo
 * que no exista cae a "-".
 */
function AuditRow({ log, index, density }) {
  const shortId = `#${String(log._id ?? index).slice(0, 6).toUpperCase()}`;
  const detail = detailText(log);

  return (
    <RowShell id={`log-${log._id ?? index}`} index={index} density={density}>
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", AUDIT_COLS)}>
        <div className="min-w-0 basis-full lg:basis-auto">
          <div className="min-w-0">
            <ActionBadge action={log.action} />
          </div>
          <MetaLine>
            <span className="adm-mono" aria-hidden="true">{shortId}</span>
            <MetaDot />
            <span>{fmtDate(log.createdAt)}</span>
          </MetaLine>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{log.actorName || "-"}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{log.actorRole || log.actorEmail || "-"}</p>
        </div>

        <div className="min-w-0">
          <p className="adm-mono truncate text-sm text-muted">{log.ip || "-"}</p>
        </div>

        <div className="min-w-0">
          <p className="adm-mono truncate text-xs text-muted" title={detail}>
            {detail}
          </p>
        </div>
      </div>
    </RowShell>
  );
}

/* El prefijo decide el color, y el tono va acompañado del texto completo:
   el color nunca es el único indicador. */
function ActionBadge({ action }) {
  const a = String(action || "");
  const tone = a.startsWith("auth") ? "brand" : a.includes("delete") ? "rose" : a.includes("create") ? "green" : "muted";
  return (
    <Pill tone={tone}>
      <span className="adm-mono">{a || "-"}</span>
    </Pill>
  );
}
