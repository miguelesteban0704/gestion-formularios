import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  AtSign,
  Building2,
  ClipboardList,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  Pencil,
  Power,
  PowerOff,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  UserShield,
  Users as UsersIcon,
} from "lucide-react";
import { adminApi, localAuthApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { ROLE_LABEL } from "../../lib/roles.js";
import { Pill } from "../../components/admin/AdminTable.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FormModal, SuccessModal, InfoModal } from "../../components/ui/Modal.tsx";
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
  AdminFieldGroup,
  AdminInput,
  AdminOptionGroup,
} from "../../components/admin/FormFields.jsx";
import { EntitySelectField } from "../../components/admin/EntitySelectField.jsx";
import { AccessUrlField } from "../../components/admin/AccessUrlField.jsx";
import { PasswordToggle } from "../../components/ui/PasswordToggle.jsx";
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
import { useLanguage } from "../../contexts/LanguageContext.jsx";

// ─── Zod schemas: una fuente de verdad para validación y tipos ──────────────
// Los campos del backend y del cliente coinciden aquí.
const baseFields = {
  name: z.string().min(2, "Mínimo 2 caracteres").max(120),
  email: z.string().email("Correo inválido").max(254),
  username: z.string()
    .regex(/^[a-z0-9_.-]{3,32}$/, "Solo minúsculas, números, puntos y guiones (3-32)")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128).optional().or(z.literal("")),
};

// Cuenta gestionada (gestor de entidad / de formularios): rol, entidad y URL de
// acceso forman parte de su identidad, así que se exigen.
const managedSchema = z.object({
  ...baseFields,
  role: z.enum(["form_creator", "entity_admin"]),
  entityId: z.string().min(1, "La entidad es obligatoria"),
  accessUrlId: z.string().optional().or(z.literal("")),
});

// Super administrador: su rol es único (no se elige), no pertenece a ninguna
// entidad ni lleva URL de acceso. Esos campos NO se validan ni se envían; solo
// se edita el nombre (el correo se muestra deshabilitado).
const superSchema = z.object({
  ...baseFields,
  role: z.string().optional().or(z.literal("")),
  entityId: z.string().optional().or(z.literal("")),
  accessUrlId: z.string().optional().or(z.literal("")),
});

// Rejilla de las 6 columnas (Nombre | Correo | Rol | Entidad | Estado |
// Acciones). Igual que en Formularios publicados, vive en una sola
// constante: la comparten la cabecera de la lista y cada fila, así si
// cambia un lado, cambian los dos y la alineación no se rompe.
//
// La última columna es `fr` y NO `auto`: la cabecera y las filas son dos
// rejillas independientes, y un track `auto` toma el ancho del contenido de
// cada una (rótulo "Acciones" en la cabecera vs. el botón de acciones en la
// fila), lo que reparte distinto el espacio de los `fr` y desalinea las
// columnas. Con `fr` los tracks dependen solo del contenedor y coinciden.
const USERS_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_minmax(0,0.65fr)_minmax(0,0.6fr)]";

const TRIGGER_ID = "adm-users-spotlight-trigger";

/** Gestión de usuarios: alta, edición de rol/entidad y baja protegida. */
export default function Users() {
  const rt = useRoleT();
  const { language } = useLanguage();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [accessUrls, setAccessUrls] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null); // {mode:'create'} | {mode:'edit', user}
  const [created, setCreated] = useState(null); // {user, mail} · diálogo de credenciales
  const [busy, setBusy] = useState(false);
  const [density, setDensity] = useState("a");
  const [sortBy, setSortBy] = useState("recent");
  const [query, setQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // react-hook-form: un solo estado para todos los campos del modal.
  // Al editar el super_admin se cambia al `superSchema` (sin rol/entidad/URL).
  const editingSuper = modal?.mode === "edit" && modal.user?.role === "super_admin";
  const schema = useMemo(() => (editingSuper ? superSchema : managedSchema), [editingSuper]);
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", username: "", password: "", role: "form_creator", entityId: "", accessUrlId: "" },
    mode: "onChange",
  });

  // Entidad y rol elegidos en el modal deciden qué URL de acceso se ofrece.
  const roleValue = watch("role");
  const entityValue = watch("entityId");
  const accessUrlValue = watch("accessUrlId");

  const load = () =>
    adminApi.users({ role }).then((d) => setUsers(d.users)).catch((e) => notifyError(e));

  useEffect(() => {
    adminApi.entities({}).then((d) => setEntities(d.entities)).catch(() => {});
    adminApi.accessUrls({}).then((d) => setAccessUrls(d.urls)).catch(() => {});
  }, []);

  // Si la URL elegida deja de corresponder a la entidad/rol actuales, se
  // limpia para no enviar una correlación incoherente.
  useEffect(() => {
    if (!accessUrlValue) return;
    const stillMatches = accessUrls.some(
      (u) => u._id === accessUrlValue && u.role === roleValue && (u.entityId || null) === (entityValue || ""),
    );
    if (!stillMatches) setValue("accessUrlId", "", { shouldValidate: true });
  }, [accessUrlValue, roleValue, entityValue, accessUrls, setValue]);

  // El texto ya no va al servidor: buscar es un salto con ⌘K / Ctrl K
  // sobre lo que está cargado, y el servidor solo decide el rol.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  const counts = useMemo(() => {
    const by = { super_admin: 0, entity_admin: 0, form_creator: 0, none: 0 };
    for (const u of users) {
      if (!u.role) by.none += 1;
      else if (by[u.role] !== undefined) by[u.role] += 1;
    }
    return by;
  }, [users]);

  // El estado de la cuenta es un filtro local sobre lo ya cargado (mismo
  // criterio que la columna Estado de la tabla): el servidor solo decide el
  // rol, así que aquí no se vuelve a pedir la lista.
  const statusFiltered = useMemo(() => {
    if (!status) return users;
    return users.filter((u) => (u.isActive !== false ? "active" : "inactive") === status);
  }, [users, status]);

  // El orden por defecto es el del servidor (más recientes primero); el
  // resto son órdenes locales sobre el conjunto ya filtrado por rol y estado.
  const sortedUsers = useMemo(() => {
    const list = [...statusFiltered];
    if (sortBy === "name") list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
    else if (sortBy === "email") list.sort((a, b) => String(a.email || "").localeCompare(String(b.email || ""), "es"));
    return list;
  }, [statusFiltered, sortBy]);

  const openCreate = () => {
    reset({ name: "", email: "", username: "", password: "", role: "form_creator", entityId: "", accessUrlId: "" });
    setModal({ mode: "create" });
  };
  const openEdit = (user) => {
    reset({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      password: "",
      role: user.role || "form_creator",
      entityId: user.entityId || "",
      accessUrlId: user.accessUrlId || "",
    });
    setModal({ mode: "edit", user });
  };

  const submit = async (values) => {
    // Sin URL de acceso para la entidad y el rol elegidos no hay alta: la
    // selección es obligatoria al crear (el backend también la exige).
    if (modal.mode === "create" && !values.accessUrlId) {
      notifyError(new Error("Selecciona la URL de acceso de la entidad y el rol"));
      return;
    }
    setBusy(true);
    try {
      if (modal.mode === "create") {
        const { user: createdUser, mail } = await localAuthApi.register({
          name: values.name,
          email: values.email,
          username: values.username || undefined,
          role: values.role,
          entityId: values.entityId,
          accessUrlId: values.accessUrlId,
        });
        notifySaved(rt("newUser"));
        setModal(null);
        load();
        // Diálogo con el resultado del envío de credenciales por correo.
        setCreated({ user: createdUser, mail });
        return;
      } else if (editingSuper) {
        // El super_admin no lleva rol, entidad ni URL: solo se envía el nombre
        // (enviar `role` haría que el backend lo leyera como una degradación).
        await adminApi.updateUser(modal.user._id, { name: values.name });
        notifySaved("Usuario actualizado");
      } else {
        await adminApi.updateUser(modal.user._id, {
          name: values.name,
          role: values.role,
          entityId: values.entityId || null,
          accessUrlId: values.accessUrlId || null,
        });
        notifySaved("Usuario actualizado");
      }
      setModal(null);
      load();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (user) => {
    const ok = await confirm({
      title: `Eliminar a ${user.name}`,
      description: "La cuenta y sus sesiones quedan invalidadas. Esta acción no se puede deshacer.",
      confirmText: "Eliminar usuario",
      onConfirm: async () => {
        await adminApi.deleteUser(user._id);
        notifyDeleted("Usuario");
        load();
      },
    });
    if (!ok) return;
  };

  // Activa o desactiva la cuenta. Al desactivarla el backend revoca sus
  // sesiones (no puede volver a entrar hasta reactivarla). El único
  // super_admin está protegido: el backend responde 403.
  const toggleActive = async (user) => {
    const nextActive = user.isActive === false;
    try {
      await adminApi.updateUser(user._id, { isActive: nextActive });
      notifySaved(nextActive ? "Usuario activado" : "Usuario desactivado");
      load();
    } catch (err) {
      notifyError(err);
    }
  };

  // Reenvía el correo de bienvenida/activación. La contraseña original no se
  // puede reenviar (está hasheada): el backend firma un token nuevo (variante
  // A) o genera una contraseña temporal nueva (variante B). El envío es
  // best-effort, así que se distinguen éxito y no-entrega.
  const resend = async (user) => {
    try {
      const { mail } = await adminApi.resendWelcome(user._id, { language });
      if (mail?.sent) notifySaved(rt("resendSent", user.email));
      else notifyError(new Error(rt("resendFailed", user.email)));
    } catch (err) {
      notifyError(err);
    }
  };

  const entityName = (id) => entities.find((e) => e._id === id)?.name || "-";
  const isCreate = modal?.mode === "create";
  // La URL de acceso es obligatoria al crear y cuando cambian rol o entidad
  // (el vínculo anterior deja de corresponder). Editando solo el nombre, se
  // conserva el vínculo existente aunque su URL esté inactiva.
  const original = modal?.mode === "edit" ? modal.user : null;
  const accessUrlRequired =
    isCreate ||
    !original ||
    roleValue !== (original.role || "") ||
    (entityValue || "") !== (original.entityId || "");

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById(TRIGGER_ID)?.focus());
  };

  // Resultados del overlay: nombre, correo, rol y entidad, en el mismo
  // orden que la lista. Al elegir uno se cierra y se hace scroll hasta
  // su fila (ancla `usr-<id>` en UserRow).
  const spotlightResults = sortedUsers.map((u) => ({
    icon: u.role === "super_admin" ? <ShieldCheck /> : u.role === "entity_admin" ? <UserShield /> : <ClipboardList />,
    label: u.name || "-",
    description:
      [u.email, ROLE_LABEL[u.role] || "Legacy", u.entityName || entityName(u.entityId)]
        .filter((v) => v && v !== "-")
        .join(" · ") || "-",
    link: `#usr-${u._id}`,
    keywords: [
      u._id,
      u.email,
      u.username,
      u.role,
      ROLE_LABEL[u.role],
      u.entityName,
      entityName(u.entityId),
      u.accessUrlSlug,
      u.isActive === false ? "inactivo" : "activo",
    ].filter(Boolean),
  }));

  // La consulta del overlay filtra la tabla en vivo con su misma regla:
  // al escribir solo quedan las coincidencias, y al elegir una se cierra
  // el overlay con el filtro fijado (el chip lo muestra y lo quita).
  const activeQuery = query.trim();
  const filteredUsers = applySpotlightQuery(sortedUsers, spotlightResults, query, (u) => `#usr-${u._id}`);

  // Acciones rápidas del overlay: fijan el filtro de rol y cierran.
  const spotlightShortcuts = [
    { label: "Todos los roles", icon: <LayoutGrid />, onClick: () => { setRole(""); closeSpotlight(); } },
    { label: ROLE_LABEL.super_admin, icon: <ShieldCheck />, onClick: () => { setRole("super_admin"); closeSpotlight(); } },
    { label: ROLE_LABEL.entity_admin, icon: <UserShield />, onClick: () => { setRole("entity_admin"); closeSpotlight(); } },
    { label: ROLE_LABEL.form_creator, icon: <ClipboardList />, onClick: () => { setRole("form_creator"); closeSpotlight(); } },
  ];

  const STATUS_OPTIONS = [
    { id: "", label: rt("allStatuses"), icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: "active", label: rt("active"), icon: <Activity className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: "inactive", label: rt("inactive"), icon: <PowerOff className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  // Rótulos de los filtros fijados (resumen + chip), de las mismas opciones
  // que pinta el Segmented para que no haya dos fuentes de verdad.
  const statusLabelOf = (s) => STATUS_OPTIONS.find((o) => o.id === s)?.label || "";
  const filterLabels = [
    ...(role ? [ROLE_LABEL[role] || role] : []),
    ...(status ? [statusLabelOf(status)] : []),
  ];

  const SORTS = [
    { id: "recent", label: "Más recientes" },
    { id: "name", label: "Nombre (A–Z)" },
    { id: "email", label: "Correo (A–Z)" },
  ];

  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <AdminHeader
          eyebrow={isSpanishSafe(rt, "users")}
          title="Cuentas del panel"
          description="Alta de gestores de entidad y gestores de formularios, con su alcance por entidad."
        >
          <Button size="md" onClick={openCreate}>
            <UserPlus className="h-4 w-4" strokeWidth={1.7} /> {rt("newUser")}
          </Button>
        </AdminHeader>

        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" aria-label="Resumen de cuentas">
          <StatTile icon={UsersIcon} label="Cuentas" value={users.length} tone="accent" />
          <StatTile icon={ShieldCheck} label="Super admin" value={counts.super_admin} tone="info" />
          <StatTile icon={UserShield} label="Gestor de entidad" value={counts.entity_admin} tone="warning" />
          <StatTile icon={ClipboardList} label="Gestores de Formularios" value={counts.form_creator} tone="success" />
        </section>

        {/* z-30: eleva el stacking context del panel para que sus
            controles pinten por encima de la sección de la lista (que va
            después en el DOM). */}
        <div className="relative z-30 mt-6">
          <AdminPanel className="p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)] lg:items-end">
              <SpotlightTrigger
                id={TRIGGER_ID}
                label="Buscar"
                placeholder={activeQuery || "Buscar por nombre, correo, rol o entidad…"}
                ariaLabel="Buscar cuentas"
                onClick={() => setSpotlightOpen(true)}
              />
              <div>
                <p className="adm-label">{rt("role")}</p>
                <Segmented
                  ariaLabel="Filtrar por rol"
                  value={role}
                  onChange={setRole}
                  options={[
                    { id: "", label: "Todos los roles" },
                    { id: "super_admin", label: ROLE_LABEL.super_admin, icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> },
                    { id: "entity_admin", label: ROLE_LABEL.entity_admin, icon: <UserShield className="h-3.5 w-3.5" aria-hidden="true" /> },
                    { id: "form_creator", label: ROLE_LABEL.form_creator, icon: <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> },
                  ]}
                />
              </div>
              <div>
                <p className="adm-label">{rt("status")}</p>
                <Segmented
                  ariaLabel="Filtrar por estado de la cuenta"
                  value={status}
                  onChange={setStatus}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>
          </AdminPanel>
        </div>

        <SummaryBar icon={UsersIcon} tickKey={`${filteredUsers.length}-${role}-${status}-${activeQuery}`}>
          {activeQuery
            ? `${filteredUsers.length} coinciden con «${activeQuery}»`
            : filterLabels.length
              ? `${filteredUsers.length} cuentas · ${filterLabels.join(" · ")}`
              : `${users.length} cuentas en el panel`}
        </SummaryBar>

        <ListSection
          title="Cuentas"
          countText={String(filteredUsers.length)}
          sorts={SORTS}
          sortBy={sortBy}
          onSort={setSortBy}
          density={density}
          onDensity={setDensity}
          chips={[
            ...(activeQuery ? [{ key: "search", label: `Búsqueda: «${activeQuery}»`, onClear: () => setQuery("") }] : []),
            ...(role ? [{ key: "role", label: ROLE_LABEL[role] || role, onClear: () => setRole("") }] : []),
            ...(status ? [{ key: "status", label: statusLabelOf(status), onClear: () => setStatus("") }] : []),
          ]}
          columns={[
            { icon: UserRound, label: "Nombre" },
            { icon: Mail, label: "Correo" },
            { icon: KeyRound, label: rt("role") },
            { icon: Building2, label: rt("entity") },
            { icon: Activity, label: rt("status") },
            { icon: Settings, label: "Acciones" },
          ]}
          colsClass={USERS_COLS}
          rows={filteredUsers}
          renderRow={(u, i, d) => (
            <UserRow
              key={u._id || i}
              user={u}
              index={i}
              density={d}
              entityName={entityName}
              onEdit={openEdit}
              onDelete={remove}
              onToggleActive={toggleActive}
              onResend={resend}
            />
          )}
          empty={{
            icon: UsersIcon,
            title: rt("noResults"),
            hint: activeQuery ? "Prueba con otro término o quita la búsqueda" : "Prueba con otro rol de la lista",
          }}
        />

      {/* Overlay AppleSpotlight: buscador tipo Spotlight (⌘K / Ctrl K) con
          resultados locales sobre las cuentas y acciones rápidas de rol.
          Lo escrito filtra la tabla en vivo; al elegir un resultado se
          cierra con el filtro fijado y se hace scroll a su fila. */}
      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        shortcuts={spotlightShortcuts}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder="Buscar cuentas…"
        ariaLabel="Buscar cuentas"
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
        title={isCreate ? rt("newUser") : "Editar usuario"}
        description={
          isCreate
            ? "El alta nunca puede crear un super_admin: ese rol sólo existe por variable de entorno."
            : editingSuper
              ? "Cuenta de super administrador: solo se edita el nombre. Su rol, entidad y URL de acceso no aplican."
              : "El correo no se cambia aquí. Para la contraseña, recuperación de contraseña."
        }
        size="md"
        closeOnOverlay={!busy}
        closeOnEsc={!busy}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModal(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="admin-user-form" loading={busy} disabled={busy || (isCreate && !accessUrlValue)}>
              {isCreate ? " Crear cuenta" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form id="admin-user-form" onSubmit={handleSubmit(submit)} className="space-y-4 pt-1" noValidate>
          <AdminInput
            id="adm-user-name"
            label="Nombre"
            icon={UserRound}
            placeholder="Nombre completo"
            autoComplete="name"
            control={control}
            name="name"
            error={errors.name?.message}
          />

          <AdminInput
            id="adm-user-email"
            label="Correo"
            icon={Mail}
            type="email"
            placeholder="persona@entidad.cu"
            autoComplete="email"
            disabled={!isCreate}
            control={control}
            name="email"
            error={errors.email?.message}
          />

          {!isCreate && (
            <AdminFieldGroup className="grid-cols-1 sm:grid-cols-2">
              <AdminInput
                id="adm-user-username"
                label="Usuario"
                hint="Opcional"
                icon={AtSign}
                placeholder="@usuario"
                autoComplete="username"
                control={control}
                name="username"
                error={errors.username?.message}
              />
              <AdminInput
                id="adm-user-password"
                label="Contraseña"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Déjala en blanco para no cambiarla"
                hint="Solo si quieres cambiarla"
                autoComplete="off"
                control={control}
                name="password"
                error={errors.password?.message}
                trail={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
              />
            </AdminFieldGroup>
          )}
          {!isCreate && (
            <p className="-mt-2 text-xs text-muted">Se guarda con bcrypt (12 rondas). Nunca se envía en claro.</p>
          )}

          {!editingSuper && (
            <>
              <AdminOptionGroup
                label={rt("role")}
                control={control}
                name="role"
                required
                error={errors.role?.message}
                options={[
                  { value: "form_creator", label: ROLE_LABEL.form_creator, icon: ClipboardList, description: "Crea y publica formularios" },
                  { value: "entity_admin", label: ROLE_LABEL.entity_admin, icon: UserShield, description: "Gestiona el alcance de su entidad" },
                ]}
              />
              <EntitySelectField
                control={control}
                name="entityId"
                entities={entities}
                label={rt("entity")}
                error={errors.entityId?.message}
              />
              <AccessUrlField
                control={control}
                name="accessUrlId"
                entityId={entityValue}
                role={roleValue}
                accessUrls={accessUrls}
                label={rt("accessUrl")}
                error={errors.accessUrlId?.message}
                required={accessUrlRequired}
              />
            </>
          )}
        </form>
      </FormModal>

      {/* Resultado del alta: confirma el envío de credenciales por correo. */}
      <SuccessModal
        open={!!created && created?.mail?.sent === true}
        onClose={() => setCreated(null)}
        title={rt("credentialsSentTitle")}
        description={created ? rt("credentialsSentBody", created.mail?.to || created.user?.email) : ""}
      />
      <InfoModal
        open={!!created && created?.mail?.sent !== true}
        onClose={() => setCreated(null)}
        title={rt("credentialsNotSentTitle")}
        description={created ? rt("credentialsNotSentBody", created.mail?.to || created.user?.email) : ""}
      />
    </div>
  );
}

/**
 * Fila-cuenta en las dos densidades del design sheet: avatar + nombre y
 * su meta (ID corto y @usuario o correo) como cabecera, y el resto de
 * columnas alineadas con la cabecera de la lista. El correo y la entidad
 * caen a "-" cuando no existen.
 */
function UserRow({ user, index, density, entityName, onEdit, onDelete, onToggleActive, onResend }) {
  const rt = useRoleT();
  const shortId = `#${String(user._id || "").slice(0, 6).toUpperCase()}`;
  const active = user.isActive !== false;
  const entity = user.entityName || entityName(user.entityId);

  return (
    <RowShell id={`usr-${user._id || index}`} index={index} density={density}>
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", USERS_COLS)}>
        <div className="min-w-0 basis-full lg:basis-auto">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: user.avatarColor ? `${user.avatarColor}22` : "var(--surface-2)",
                color: user.avatarColor || "var(--fg-muted)",
                border: "1px solid var(--border)",
              }}
              aria-hidden="true"
            >
              {String(user.name || "?").trim().charAt(0).toUpperCase()}
            </span>
            <RowHeading>{user.name || "-"}</RowHeading>
          </div>
          <MetaLine>
            <span className="adm-mono" aria-hidden="true">{shortId}</span>
            <MetaDot />
            <span>{user.username ? `@${user.username}` : user.email || "-"}</span>
            {user.accessUrlSlug && (
              <>
                <MetaDot />
                <span className="adm-mono">/a/{user.accessUrlSlug}</span>
              </>
            )}
          </MetaLine>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.email || "-"}</p>
        </div>

        <div className="min-w-0">
          <Pill tone={user.role === "super_admin" ? "gold" : "brand"} dot>
            {ROLE_LABEL[user.role] || "Legacy"}
          </Pill>
        </div>

        <div className="min-w-0">
          <IconPill icon={Building2} title="Entidad">{entity}</IconPill>
        </div>

        <div className="min-w-0">
          <Pill tone={active ? "green" : "amber"} dot>
            {active ? "Activo" : "Inactivo"}
          </Pill>
        </div>

        <div className="flex basis-full items-center justify-end gap-1 lg:basis-auto lg:justify-start">
          <FabSpeedDial
            label={`Acciones de ${user.name || "la cuenta"}`}
            actions={[
              {
                id: "edit",
                label: `Editar ${user.name}`,
                icon: <Pencil className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: () => onEdit(user),
              },
              ...(user.role && user.role !== "super_admin"
                ? [
                    {
                      id: "resend",
                      label: rt("resendEmail"),
                      icon: <Send className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                      onClick: () => onResend(user),
                    },
                  ]
                : []),
              {
                id: "toggle-active",
                label: active ? "Desactivar" : "Activar",
                icon: active ? (
                  <PowerOff className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                ) : (
                  <Power className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                ),
                onClick: () => onToggleActive(user),
              },
              {
                id: "delete",
                label: `Eliminar ${user.name}`,
                icon: <Trash2 className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                danger: true,
                onClick: () => onDelete(user),
              },
            ]}
          />
        </div>
      </div>
    </RowShell>
  );
}

/* El rótulo del encabezado sale de roleI18n, que ya trae su propio idioma;
   este fallback sólo cubre el caso de que la clave no exista. */
function isSpanishSafe(rt, key) {
  const v = rt(key);
  return v === key ? "Gestión de cuentas" : v;
}
