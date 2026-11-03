import { useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/clipboard.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  Copy,
  KeyRound,
  LayoutGrid,
  Link2,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  UserRound,
  UserShield,
} from "lucide-react";
import { adminApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { ROLE_LABEL } from "../../lib/roles.js";
import { Pill } from "../../components/admin/AdminTable.jsx";
import { MetricTile } from "../../components/admin/PublicFormCard.jsx";
import { EntitySelect } from "../../components/admin/EntitySelect.jsx";
import { EntitySelectField } from "../../components/admin/EntitySelectField.jsx";
import { AdminSelect } from "../../components/admin/FormFields.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FormModal } from "../../components/ui/Modal.tsx";
import { AppleSpotlight } from "../../components/ui/apple-spotlight";
import { FabSpeedDial } from "../../components/ui/FabSpeedDial";
import { cn } from "../../lib/utils.js";
import {
  AdminHeader,
  AdminPanel,
  SelectField,
  StatTile,
  useConfirm,
  notifySaved,
  notifyDeleted,
  notifyError,
} from "../../components/admin/AdminKit.jsx";
import {
  applySpotlightQuery,
  IconPill,
  ListSection,
  MetaLine,
  RowHeading,
  RowShell,
  Segmented,
  SpotlightTrigger,
  SummaryBar,
  useSpotlightHotkey,
} from "../../components/admin/ListChrome.jsx";

// ─── Zod schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  entityId: z.string().min(1, "La entidad es obligatoria"),
  role: z.enum(["entity_admin", "form_creator"]),
});

// Rejilla de las 5 columnas (Enlace | Rol | Estado | Uso | Acciones): la
// comparten la cabecera de la lista y cada fila, así si cambia un lado,
// cambian los dos y la alineación no se rompe. La entidad viaja en la
// meta del enlace, igual que el usuario publicador en PublicFormCard.
// La última columna es `fr` (no `auto`): cabecera y filas son rejillas
// independientes y un track `auto` se dimensiona por el contenido de cada
// una, desalineando las columnas (ver Users.jsx).
const URLS_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)_minmax(0,0.65fr)_minmax(0,0.95fr)_minmax(0,0.6fr)]";

const TRIGGER_ID = "adm-urls-spotlight-trigger";

function accessLink(url) {
  if (!url?.slug) return "";
  const ctx = url.context ? `?ctx=${encodeURIComponent(url.context)}` : "";
  return `${window.location.origin}/a/${url.slug}${ctx}`;
}

/** Cuenta(s) vinculada(s) a la URL (`users.access_url_id`), ya legible. */
function assignedText(url) {
  const list = Array.isArray(url?.assignedUsers) ? url.assignedUsers : [];
  return list.map((a) => a.name || a.email).filter(Boolean).join(", ");
}

/** CRUD de URLs de acceso por entidad y rol (slug aleatorio + contexto cifrado). */
export default function AccessUrls() {
  const rt = useRoleT();
  const { confirm } = useConfirm();
  const [urls, setUrls] = useState([]);
  const [entities, setEntities] = useState([]);
  const [entityId, setEntityId] = useState("");
  const [role, setRole] = useState("");
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null);
  const [density, setDensity] = useState("a");
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  // react-hook-form: un único estado para el modal de creación.
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { entityId: "", role: "entity_admin" },
    mode: "onChange",
  });

  const load = () =>
    adminApi.accessUrls({ entityId, role }).then((d) => setUrls(d.urls)).catch((e) => notifyError(e));

  useEffect(() => {
    adminApi.entities({}).then((d) => setEntities(d.entities)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [entityId, role]);

  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  // El orden por defecto es el del servidor (más recientes primero); el
  // resto son órdenes locales sobre el conjunto ya filtrado.
  const sortedUrls = useMemo(() => {
    const list = [...urls];
    if (sortBy === "uses") list.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
    else if (sortBy === "last") list.sort((a, b) => new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0));
    else if (sortBy === "entity") list.sort((a, b) => String(a.entityName || "").localeCompare(String(b.entityName || ""), "es"));
    return list;
  }, [urls, sortBy]);

  const stats = useMemo(() => {
    const active = urls.filter((u) => u.isActive).length;
    const uses = urls.reduce((s, u) => s + (u.useCount || 0), 0);
    const never = urls.filter((u) => !u.lastUsedAt).length;
    return { active, uses, never };
  }, [urls]);

  const create = async (values) => {
    if (!values.entityId) {
      notifyError(new Error(rt("entity")));
      return;
    }
    setBusy(true);
    try {
      await adminApi.createAccessUrl({ entityId: values.entityId, role: values.role });
      notifySaved("URL creada");
      setModal(false);
      reset({ entityId: "", role: "entity_admin" });
      load();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (u) => {
    try {
      await adminApi.toggleAccessUrl(u._id, !u.isActive);
      notifySaved(u.isActive ? "URL desactivada" : "URL activada");
      load();
    } catch (err) {
      notifyError(err);
    }
  };

  const regen = async (u) => {
    const ok = await confirm({
      title: "Regenerar el enlace",
      description: `Se emitirá un slug nuevo para ${u.entityName || "esta entidad"}.`,
      confirmText: "Regenerar",
      icon: RefreshCw,
      detail: ["El enlace anterior deja de funcionar de inmediato y no puede recuperarse."],
      onConfirm: async () => {
        await adminApi.regenerateAccessUrl(u._id);
        notifySaved("Slug regenerado");
        load();
      },
    });
    if (!ok) return;
  };

  const remove = async (u) => {
    const ok = await confirm({
      title: "Eliminar esta URL de acceso",
      description: `El enlace de ${u.entityName || "esta entidad"} dejará de abrir el panel.`,
      confirmText: "Eliminar URL",
      detail: ["Si la URL estaba repartida, quien la guarde verá un error al entrar."],
      onConfirm: async () => {
        await adminApi.deleteAccessUrl(u._id);
        notifyDeleted("URL de acceso");
        load();
      },
    });
    if (!ok) return;
  };

  const copy = async (u) => {
    try {
      const ok = await copyText(accessLink(u));
      if (ok) {
        setCopied(u._id);
        setTimeout(() => setCopied(null), 1600);
        notifySaved("URL copiada");
      } else {
        notifyError(new Error("No se pudo copiar"));
      }
    } catch {
      notifyError(new Error("No se pudo copiar"));
    }
  };

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById(TRIGGER_ID)?.focus());
  };

  // Resultados del overlay: enlace, entidad, rol y uso, en el mismo
  // orden que la lista. Al elegir uno se cierra y se hace scroll hasta
  // su fila (ancla `url-<id>` en AccessUrlRow).
  const spotlightResults = sortedUrls.map((u) => ({
    icon: <Link2 />,
    label: `/a/${u.slug || "-"}`,
    description: [u.entityName, ROLE_LABEL[u.role] || u.role, u.isActive ? "Activa" : "Inactiva"]
      .filter(Boolean)
      .join(" · ") || "-",
    link: `#url-${u._id}`,
    keywords: [
      u._id,
      u.slug,
      u.entityName,
      u.role,
      ROLE_LABEL[u.role],
      assignedText(u),
      String(u.useCount ?? 0),
      u.lastUsedAt,
    ].filter(Boolean),
  }));

  // La consulta del overlay filtra la tabla en vivo con su misma regla:
  // al escribir solo quedan las coincidencias, y al elegir una se cierra
  // el overlay con el filtro fijado (el chip lo muestra y lo quita).
  const activeQuery = query.trim();
  const filteredUrls = applySpotlightQuery(sortedUrls, spotlightResults, query, (u) => `#url-${u._id}`);

  // Acciones rápidas del overlay: fijan el filtro de rol (y limpian la
  // entidad en "Todos") y cierran.
  const spotlightShortcuts = [
    { label: "Todas las URLs", icon: <LayoutGrid />, onClick: () => { setEntityId(""); setRole(""); closeSpotlight(); } },
    { label: ROLE_LABEL.entity_admin, icon: <UserShield />, onClick: () => { setRole("entity_admin"); closeSpotlight(); } },
    { label: ROLE_LABEL.form_creator, icon: <ClipboardList />, onClick: () => { setRole("form_creator"); closeSpotlight(); } },
  ];

  const SORTS = [
    { id: "recent", label: "Más recientes" },
    { id: "uses", label: "Más usos" },
    { id: "last", label: "Último uso" },
    { id: "entity", label: "Entidad (A–Z)" },
  ];

  const activeEntity = entities.find((e) => e._id === entityId)?.name || null;
  const summaryFilters = [activeEntity, role ? ROLE_LABEL[role] || role : null].filter(Boolean).join(" · ");

  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <AdminHeader
          eyebrow={rt("accessUrls")}
          title="URLs de acceso"
          description="Una dirección por entidad y rol. El contexto va cifrado y atado al slug, así que un enlace no se puede traslado a otra entidad."
        >
          <Button size="md" onClick={() => setModal(true)}>
            <Link2 className="h-4 w-4" strokeWidth={1.7} /> {rt("newUrl")}
          </Button>
        </AdminHeader>

        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" aria-label="Resumen de URLs">
          <StatTile icon={Link2} label="URLs" value={urls.length} tone="accent" />
          <StatTile icon={Check} label="Activas" value={stats.active} tone="success" />
          <StatTile icon={RefreshCw} label="Accesos" value={stats.uses} tone="info" />
          <StatTile icon={Link2} label="Sin usar" value={stats.never} tone={stats.never ? "warning" : "success"} />
        </section>

        {/* z-30: eleva el stacking context para que el dropdown del
            EntitySelect pinte por encima de la tabla de resultados. */}
        <div className="relative z-30 mt-6">
          <AdminPanel className="p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)_minmax(0,auto)] lg:items-end">
              <SpotlightTrigger
                id={TRIGGER_ID}
                label="Buscar"
                placeholder={activeQuery || "Buscar por enlace, entidad o rol…"}
                ariaLabel="Buscar URLs de acceso"
                onClick={() => setSpotlightOpen(true)}
              />
              <div>
                <p className="adm-label">{rt("entity")}</p>
                <EntitySelect
                  entities={[{ _id: "", name: rt("allEntities"), category: "organos_estatales" }, ...entities]}
                  value={entityId}
                  onChange={(e) => setEntityId(e._id)}
                  ariaLabel={rt("entity")}
                />
              </div>
              <div>
                <p className="adm-label">{rt("role")}</p>
                <Segmented
                  ariaLabel="Filtrar por rol"
                  value={role}
                  onChange={setRole}
                  options={[
                    { id: "", label: "Todos los roles" },
                    { id: "entity_admin", label: ROLE_LABEL.entity_admin, icon: <UserShield className="h-3.5 w-3.5" aria-hidden="true" /> },
                    { id: "form_creator", label: ROLE_LABEL.form_creator, icon: <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> },
                  ]}
                />
              </div>
            </div>
          </AdminPanel>
        </div>

        <SummaryBar icon={Link2} tickKey={`${filteredUrls.length}-${entityId}-${role}-${activeQuery}`}>
          {activeQuery
            ? `${filteredUrls.length} coinciden con «${activeQuery}»`
            : summaryFilters
              ? `${urls.length} URLs · ${summaryFilters}`
              : `${urls.length} URLs de acceso`}
        </SummaryBar>

        <ListSection
          title="URLs de acceso"
          countText={String(filteredUrls.length)}
          sorts={SORTS}
          sortBy={sortBy}
          onSort={setSortBy}
          density={density}
          onDensity={setDensity}
          chips={[
            activeQuery && { key: "search", label: `Búsqueda: «${activeQuery}»`, onClear: () => setQuery("") },
            activeEntity && { key: "entity", label: activeEntity, onClear: () => setEntityId("") },
            role && { key: "role", label: ROLE_LABEL[role] || role, onClear: () => setRole("") },
          ].filter(Boolean)}
          columns={[
            { icon: Link2, label: "Enlace" },
            { icon: KeyRound, label: rt("role") },
            { icon: Activity, label: "Estado" },
            { icon: BarChart3, label: rt("uses") },
            { icon: Settings, label: "Acciones" },
          ]}
          colsClass={URLS_COLS}
          rows={filteredUrls}
          renderRow={(u, i, d) => (
            <AccessUrlRow
              key={u._id || i}
              url={u}
              index={i}
              density={d}
              activeLabel={rt("active")}
              inactiveLabel={rt("inactive")}
              usesLabel={rt("uses")}
              lastUsedLabel={rt("lastUsed")}
              assignedLabel={rt("assignedUser")}
              unassignedLabel={rt("unassignedUser")}
              actions={[
                {
                  id: "copy",
                  label: copied === u._id ? "Copiado" : "Copiar enlace",
                  icon: copied === u._id
                    ? <Check className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                    : <Copy className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                  onClick: () => copy(u),
                },
                {
                  id: "regen",
                  label: rt("regenerate"),
                  icon: <RefreshCw className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                  onClick: () => regen(u),
                },
                {
                  id: "toggle",
                  label: u.isActive ? rt("deactivate") : rt("activate"),
                  icon: u.isActive
                    ? <Check className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                    : <Plus className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                  onClick: () => toggle(u),
                },
                {
                  id: "delete",
                  label: "Eliminar URL",
                  icon: <Trash2 className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                  danger: true,
                  onClick: () => remove(u),
                },
              ]}
            />
          )}
          empty={{
            icon: Link2,
            title: rt("noResults"),
            hint: activeQuery ? "Prueba con otro término o quita la búsqueda" : "Prueba con otra entidad o rol de la lista",
          }}
        />

      {/* Overlay AppleSpotlight: buscador tipo Spotlight (⌘K / Ctrl K) con
          resultados locales sobre las URLs y acciones rápidas de rol. Lo
          escrito filtra la tabla en vivo; al elegir un resultado se cierra
          con el filtro fijado y se hace scroll a su fila. */}
      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        shortcuts={spotlightShortcuts}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder="Buscar URLs…"
        ariaLabel="Buscar URLs de acceso"
        emptyText="Sin coincidencias"
        emptySubText="Prueba con otro término de búsqueda"
        onSelect={(item) => {
          closeSpotlight();
          document
            .getElementById((item.link || "").replace(/^#/, ""))
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

<FormModal
        open={modal}
        onClose={() => (busy ? undefined : setModal(false))}
        title={rt("newUrl")}
        description="El slug se genera al azar y el contexto se cifra con el secreto del sitio. No se pueden escribir a mano."
        size="md"
        closeOnOverlay={!busy}
        closeOnEsc={!busy}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModal(false)} disabled={busy}>{rt("cancel")}</Button>
            <Button type="submit" form="admin-url-form" loading={busy}>{rt("createUrl")}</Button>
          </>
        }
      >
        <form id="admin-url-form" onSubmit={handleSubmit(create)} className="space-y-4 pt-1" noValidate>
          <EntitySelectField
            control={control}
            name="entityId"
            entities={entities}
            label={rt("entity")}
            error={errors.entityId?.message}
          />
          <AdminSelect
            id="admin-url-role"
            label={rt("role")}
            icon={KeyRound}
            control={control}
            name="role"
            error={errors.role?.message}
            options={[
              <option key="entity_admin" value="entity_admin">{ROLE_LABEL.entity_admin}</option>,
              <option key="form_creator" value="form_creator">{ROLE_LABEL.form_creator}</option>,
            ]}
          />
        </form>
      </FormModal>
    </div>
  );
}

/**
 * Fila-URL en las dos densidades del design sheet: el enlace `/a/slug`
 * como cabecera con la entidad en su meta, y rol, estado, uso (con el
 * último acceso debajo) y acciones alineados con la cabecera de la lista.
 */
function AccessUrlRow({
  url,
  index,
  density,
  activeLabel,
  inactiveLabel,
  usesLabel,
  lastUsedLabel,
  assignedLabel,
  unassignedLabel,
  actions,
}) {
  const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "-");
  const assigned = assignedText(url);

  return (
    <RowShell id={`url-${url._id || index}`} index={index} density={density}>
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", URLS_COLS)}>
        <div className="min-w-0 basis-full lg:basis-auto">
          <RowHeading>
            <span className="adm-mono">/a/{url.slug || "-"}</span>
          </RowHeading>
          <MetaLine>
            <IconPill icon={Building2} title="Entidad">
              {url.entityName || "-"}
            </IconPill>
            <IconPill icon={UserRound} title={assignedLabel}>
              {assigned || <span className="text-muted">{unassignedLabel}</span>}
            </IconPill>
          </MetaLine>
        </div>

        <div className="min-w-0">
          <Pill tone="brand">{ROLE_LABEL[url.role] || url.role || "-"}</Pill>
        </div>

        <div className="min-w-0">
          <Pill tone={url.isActive ? "green" : "muted"} dot>
            {url.isActive ? activeLabel : inactiveLabel}
          </Pill>
        </div>

        <div className="min-w-0">
          <MetricTile
            icon={Link2}
            label={usesLabel}
            value={url.useCount ?? 0}
            tint="var(--color-brand-600)"
          />
          <MetaLine>
            <span>{lastUsedLabel}: {fmtDate(url.lastUsedAt)}</span>
          </MetaLine>
        </div>

        <div className="flex basis-full items-center justify-end gap-1 lg:basis-auto lg:justify-start">
          <FabSpeedDial label={`Acciones de ${url.entityName || "la URL"}`} actions={actions} />
        </div>
      </div>
    </RowShell>
  );
}
