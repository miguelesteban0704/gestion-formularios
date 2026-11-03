import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Building2, Hash, Layers, Pencil, Plus, Settings, Tag, Trash2 } from "lucide-react";
import { adminApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { Pill } from "../../components/admin/AdminTable.jsx";
import { CATEGORY_META } from "../../components/admin/EntitySelect.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FormModal } from "../../components/ui/Modal.tsx";
import { AppleSpotlight } from "../../components/ui/apple-spotlight";
import { FabSpeedDial } from "../../components/ui/FabSpeedDial";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { cn } from "../../lib/utils.js";
import {
  AdminFieldGroup,
  AdminInput,
  AdminSelect,
} from "../../components/admin/FormFields.jsx";
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
  ListSection,
  MetaDot,
  MetaLine,
  RowHeading,
  RowShell,
  SpotlightTrigger,
  SummaryBar,
  useSpotlightHotkey,
} from "../../components/admin/ListChrome.jsx";

// ─── Zod schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  code: z.string()
    .min(2, "Mínimo 2 caracteres")
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().min(2, "Mínimo 2 caracteres").max(160),
  // Opcional: siglas / apócope de la entidad (vacío = sin nombre corto).
  shortName: z.string().max(32, "Máximo 32 caracteres"),
  category: z.string().min(1),
});

// Rejilla de las 4 columnas (Nombre | Categoría | Estado | Acciones): la
// comparten la cabecera de la lista y cada fila, así si cambia un lado,
// cambian los dos y la alineación no se rompe. La última columna es `fr`
// (no `auto`) porque cabecera y filas son rejillas independientes: un track
// `auto` tomaría el ancho del contenido de cada una y desalinearía las
// columnas (ver Users.jsx).
const ENTITIES_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.65fr)_minmax(0,0.6fr)]";

const TRIGGER_ID = "adm-entities-spotlight-trigger";

/** CRUD de entidades: el catálogo sembrado más las altas manuales. */
export default function Entities() {
  const rt = useRoleT();
  const { language } = useLanguage();
  const { confirm } = useConfirm();
  const [entities, setEntities] = useState([]);
  const [category, setCategory] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [density, setDensity] = useState("a");
  const [sortBy, setSortBy] = useState("server");
  const [query, setQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  // react-hook-form: un único estado para el modal de alta/edición.
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", shortName: "", category: "organos_estatales" },
    mode: "onChange",
  });

  const load = () =>
    adminApi.entities({ category }).then((d) => setEntities(d.entities)).catch((e) => notifyError(e));

  // El texto ya no va al servidor: buscar es un salto con ⌘K / Ctrl K
  // sobre lo que está cargado, y el server solo decide la categoría.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const e of entities) map.set(e.category, (map.get(e.category) || 0) + 1);
    return map;
  }, [entities]);

  const inactive = useMemo(() => entities.filter((e) => e.isActive === false).length, [entities]);

  // El orden por defecto es el del servidor (categoría y nombre); el
  // resto son órdenes locales sobre el conjunto ya filtrado.
  const sortedEntities = useMemo(() => {
    const list = [...entities];
    if (sortBy === "name") list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
    else if (sortBy === "code") list.sort((a, b) => String(a.code || "").localeCompare(String(b.code || ""), "es"));
    else if (sortBy === "recent") list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [entities, sortBy]);

  const submit = async (values) => {
    setBusy(true);
    try {
      if (modal.mode === "create") await adminApi.createEntity(values);
      else await adminApi.updateEntity(modal.entity._id, {
        name: values.name,
        shortName: values.shortName,
        category: values.category,
      });
      notifySaved(modal.mode === "create" ? rt("newEntity") : "Entidad actualizada");
      setModal(null);
      load();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entity) => {
    const ok = await confirm({
      title: `Eliminar «${entity.name}»`,
      description: "La entidad desaparece del catálogo y sus formularios quedan sin asignar.",
      confirmText: "Eliminar entidad",
      detail: [
        "Sus URLs de acceso se borran con ella: los enlaces repartidos dejan de abrir el panel.",
        "Los formularios no se borran, pero pierden la entidad y salen de los filtros por entidad.",
      ],
      onConfirm: async () => {
        await adminApi.deleteEntity(entity._id);
        notifyDeleted("Entidad");
        load();
      },
    });
    if (!ok) return;
  };

  const isCreate = modal?.mode === "create";
  const categoryOptions = Object.entries(CATEGORY_META).map(([code, meta]) => ({
    value: code,
    label: meta[language] || code,
  }));
  const categoryLabel = (code) =>
    categoryOptions.find((o) => o.value === code)?.label || code;

  const openCreate = () => {
    reset({ code: "", name: "", shortName: "", category: "organos_estatales" });
    setModal({ mode: "create" });
  };

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById(TRIGGER_ID)?.focus());
  };

  // Resultados del overlay: nombre, código y categoría, en el mismo
  // orden que la lista. Al elegir uno se cierra y se hace scroll hasta
  // su fila (ancla `ent-<id>` en EntityRow).
  const spotlightResults = sortedEntities.map((x) => {
    const CatIcon = CATEGORY_META[x.category]?.icon || Building2;
    return {
      icon: <CatIcon />,
      label: x.name || "-",
      description: [x.code, categoryLabel(x.category), x.isActive === false ? "Inactiva" : "Activa"]
        .filter(Boolean)
        .join(" · ") || "-",
      link: `#ent-${x._id}`,
      keywords: [x._id, x.code, x.name, x.shortName, x.category, categoryLabel(x.category), x.isActive === false ? "inactiva" : "activa"].filter(Boolean),
    };
  });

  // La consulta del overlay filtra la tabla en vivo con su misma regla:
  // al escribir solo quedan las coincidencias, y al elegir una se cierra
  // el overlay con el filtro fijado (el chip lo muestra y lo quita).
  const activeQuery = query.trim();
  const filteredEntities = applySpotlightQuery(sortedEntities, spotlightResults, query, (x) => `#ent-${x._id}`);

  // Acciones rápidas del overlay: fijan el filtro de categoría y cierran.
  const spotlightShortcuts = [
    { label: "Todas las categorías", icon: <Layers />, onClick: () => { setCategory(""); closeSpotlight(); } },
    ...Object.entries(CATEGORY_META).map(([code, meta]) => ({
      label: meta[language] || code,
      icon: <meta.icon />,
      onClick: () => { setCategory(code); closeSpotlight(); },
    })),
  ];

  const SORTS = [
    { id: "server", label: "Por categoría" },
    { id: "name", label: "Nombre (A–Z)" },
    { id: "code", label: "Código (A–Z)" },
    { id: "recent", label: "Más recientes" },
  ];

  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <AdminHeader
          eyebrow={rt("entities")}
          title="Catálogo de entidades"
          description="Organos estatales, OACE, entidades rectoras y el poder popular. El catálogo se siembra al arrancar; aquí se amplía y se depura."
        >
          <Button size="md" onClick={openCreate}>
            <Building2 className="h-4 w-4" strokeWidth={1.7} />
            <Plus className="h-4 w-4" strokeWidth={1.7} /> {rt("newEntity")}
          </Button>
        </AdminHeader>

        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" aria-label="Resumen del catálogo">
          <StatTile icon={Building2} label="Entidades" value={entities.length} tone="accent" />
          <StatTile icon={Layers} label="Categorías en uso" value={byCategory.size} tone="info" />
          <StatTile icon={Building2} label="Inactivas" value={inactive} tone={inactive ? "warning" : "success"} />
        </section>

        <div className="relative z-30 mt-6">
          <AdminPanel className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.5fr)] sm:items-end">
              <SpotlightTrigger
                id={TRIGGER_ID}
                label="Buscar"
                placeholder={activeQuery || "Buscar por nombre, código o categoría…"}
                ariaLabel="Buscar entidades"
                onClick={() => setSpotlightOpen(true)}
              />
              <SelectField
                label="Categoría"
                value={category}
                onChange={setCategory}
                placeholder="Todas"
                listboxLabel="Filtrar por categoría"
                options={[{ value: "", label: "Todas las categorías" }, ...categoryOptions]}
              />
            </div>
          </AdminPanel>
        </div>

        <SummaryBar icon={Building2} tickKey={`${filteredEntities.length}-${category}-${activeQuery}`}>
          {activeQuery
            ? `${filteredEntities.length} coinciden con «${activeQuery}»`
            : category
              ? `${entities.length} entidades · ${categoryLabel(category)}`
              : `${entities.length} entidades en el catálogo`}
        </SummaryBar>

        <ListSection
          title="Entidades"
          countText={String(filteredEntities.length)}
          sorts={SORTS}
          sortBy={sortBy}
          onSort={setSortBy}
          density={density}
          onDensity={setDensity}
          chips={[
            ...(activeQuery ? [{ key: "search", label: `Búsqueda: «${activeQuery}»`, onClear: () => setQuery("") }] : []),
            ...(category ? [{ key: "category", label: categoryLabel(category), onClear: () => setCategory("") }] : []),
          ]}
          columns={[
            { icon: Building2, label: "Nombre" },
            { icon: Layers, label: "Categoría" },
            { icon: Activity, label: "Estado" },
            { icon: Settings, label: "Acciones" },
          ]}
          colsClass={ENTITIES_COLS}
          rows={filteredEntities}
          renderRow={(x, i, d) => (
            <EntityRow
              key={x._id || i}
              entity={x}
              index={i}
              density={d}
              language={language}
              onEdit={(e) => {
                reset({ code: e.code, name: e.name, shortName: e.shortName || "", category: e.category });
                setModal({ mode: "edit", entity: e });
              }}
              onDelete={remove}
            />
          )}
          empty={{
            icon: Building2,
            title: rt("noResults"),
            hint: activeQuery ? "Prueba con otro término o quita la búsqueda" : "Prueba con otra categoría de la lista",
          }}
        />

      {/* Overlay AppleSpotlight: buscador tipo Spotlight (⌘K / Ctrl K) con
          resultados locales sobre el catálogo y las categorías como
          acciones rápidas. Lo escrito filtra la tabla en vivo; al elegir
          uno se cierra con el filtro fijado y se hace scroll. */}
      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        shortcuts={spotlightShortcuts}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder="Buscar entidades…"
        ariaLabel="Buscar entidades"
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
        open={!!modal}
        onClose={() => (busy ? undefined : setModal(null))}
        title={isCreate ? rt("newEntity") : "Editar entidad"}
        description={isCreate ? "El código no se puede cambiar después: es la clave con la que se siembran y se cruzan los datos." : undefined}
        size="md"
        closeOnOverlay={!busy}
        closeOnEsc={!busy}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModal(null)} disabled={busy}>Cancelar</Button>
            <Button type="submit" form="admin-entity-form" loading={busy}>Guardar</Button>
          </>
        }
      >
        <form id="admin-entity-form" onSubmit={handleSubmit(submit)} className="space-y-4 pt-1" noValidate>
          {isCreate && (
            <AdminInput
              id="adm-entity-code"
              label="Código"
              icon={Hash}
              placeholder="minorias-comunes"
              autoComplete="off"
              spellCheck={false}
              className="adm-mono"
              control={control}
              name="code"
              error={errors.code?.message}
            />
          )}
          <AdminInput
            id="adm-entity-name"
            label="Nombre oficial"
            icon={Building2}
            placeholder="Nombre de la entidad"
            control={control}
            name="name"
            error={errors.name?.message}
          />
          <AdminInput
            id="adm-entity-shortname"
            label="Nombre corto"
            icon={Tag}
            placeholder="MINJUS"
            autoComplete="off"
            spellCheck={false}
            hint="Opcional · siglas o apócope de la entidad"
            control={control}
            name="shortName"
            error={errors.shortName?.message}
          />
          <AdminSelect
            id="adm-entity-category"
            label="Categoría"
            icon={Layers}
            control={control}
            name="category"
            error={errors.category?.message}
            options={categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          />
        </form>
      </FormModal>
    </div>
  );
}

/**
 * Fila-entidad en las dos densidades del design sheet: nombre oficial y
 * su meta (código y fecha de alta) como cabecera, y categoría, estado y
 * acciones alineados con la cabecera de la lista. Todo lo que no exista
 * cae a "-".
 */
function EntityRow({ entity, index, density, language, onEdit, onDelete }) {
  const created = (() => {
    const raw = entity.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  })();

  return (
    <RowShell id={`ent-${entity._id || index}`} index={index} density={density}>
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", ENTITIES_COLS)}>
        <div className="min-w-0 basis-full lg:basis-auto">
          <RowHeading>{entity.name || "-"}</RowHeading>
          <MetaLine>
            {entity.shortName && (
              <span className="adm-mono font-semibold text-ink">{entity.shortName}</span>
            )}
            {entity.shortName && <MetaDot />}
            <span className="adm-mono" aria-hidden="true">{entity.code || "-"}</span>
            {created && (
              <>
                <MetaDot />
                <span>Alta {created}</span>
              </>
            )}
          </MetaLine>
        </div>

        <div className="min-w-0">
          <Pill tone="gold">
            {CATEGORY_META[entity.category]?.[language] || entity.category || "-"}
          </Pill>
        </div>

        <div className="min-w-0">
          <Pill tone={entity.isActive === false ? "amber" : "green"} dot>
            {entity.isActive === false ? "Inactiva" : "Activa"}
          </Pill>
        </div>

        <div className="flex basis-full items-center justify-end gap-1 lg:basis-auto lg:justify-start">
          <FabSpeedDial
            label={`Acciones de ${entity.name || "la entidad"}`}
            actions={[
              {
                id: "edit",
                label: `Editar ${entity.name}`,
                icon: <Pencil className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: () => onEdit(entity),
              },
              {
                id: "delete",
                label: `Eliminar ${entity.name}`,
                icon: <Trash2 className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                danger: true,
                onClick: () => onDelete(entity),
              },
            ]}
          />
        </div>
      </div>
    </RowShell>
  );
}
