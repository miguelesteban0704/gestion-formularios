import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  AtSign,
  Building2,
  ClipboardList,
  Copy,
  Dices,
  KeyRound,
  LayoutGrid,
  Link2,
  Lock,
  Mail,
  Pencil,
  Power,
  PowerOff,
  Send,
  Settings,
  Trash2,
  UserPlus,
  UserRound,
  Users as UsersIcon,
} from "lucide-react";
import { entityAdminApi } from "../../services/index.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { ROLE_LABEL } from "../../lib/roles.js";
import { accessLoginPath } from "../../lib/routes.js";
import { rememberAccessDoor } from "../../lib/accessDoor.js";
import { copyText } from "../../lib/clipboard.js";
import { Pill } from "../../components/admin/AdminTable.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FormModal, SuccessModal, InfoModal } from "../../components/ui/Modal.tsx";
import { AppleSpotlight } from "../../components/ui/apple-spotlight";
import { FabSpeedDial } from "../../components/ui/FabSpeedDial";
import { PasswordToggle } from "../../components/ui/PasswordToggle.jsx";
import { cn } from "../../lib/utils.js";
import {
  AdminHeader,
  AdminPanel,
  StatTile,
  useConfirm,
  notifySaved,
  notifyDeleted,
  notifyError,
} from "../../components/admin/AdminKit.jsx";
import {
  AdminFieldGroup,
  AdminInput,
  FieldLabel,
} from "../../components/admin/FormFields.jsx";
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

/**
 * Gestión de los creadores de formularios de la entidad del `entity_admin`.
 *
 * Acotado SIEMPRE a `req.user.entityId` por el backend: el rol se fuerza a
 * `form_creator` y la entidad es fija (la del administrador), así que aquí no
 * hay selectores de rol ni de entidad. Tras dar de alta una cuenta se ofrece
 * un botón para abrir su puerta `/a/<slug>` en una pestaña nueva: el login local
 * del creador vive en su propia ranura de sesión, de modo que abrirlo NO cierra
 * la sesión del administrador.
 */

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(120),
  email: z.string().email("Correo inválido").max(254).optional().or(z.literal("")),
  username: z
    .string()
    .regex(/^[a-z0-9_.-]{3,32}$/, "Solo minúsculas, números, puntos y guiones (3-32)")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128).optional().or(z.literal("")),
  accessUrlId: z.string().optional().or(z.literal("")),
});

// Rejilla de las 6 columnas (Nombre | Correo | Rol | URL | Estado | Acciones).
// Igual que en el resto del panel: una sola constante compartida por la
// cabecera y las filas, y la última columna en `fr` (nunca `auto`) para que
// cabecera y filas no desalineen sus tracks.
const ENTITY_USERS_COLS =
  "lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,0.95fr)_minmax(0,0.6fr)_minmax(0,0.55fr)]";

const TRIGGER_ID = "adm-entity-users-spotlight-trigger";

export default function EntityUsers() {
  const rt = useRoleT();
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isSpanish = language === "es";
  const entityName = user?.entity?.name || "-";

  const [users, setUsers] = useState([]);
  const [accessUrls, setAccessUrls] = useState([]);
  const [modal, setModal] = useState(null); // {mode:'create'} | {mode:'edit', user}
  const [created, setCreated] = useState(null); // {name, slug, mail} · diálogo post-alta
  const [generated, setGenerated] = useState(null); // {slug, fullUrl} de la URL recién creada
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [density, setDensity] = useState("b");
  const [sortBy, setSortBy] = useState("recent");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", username: "", password: "", accessUrlId: "" },
    mode: "onChange",
  });

  const accessUrlValue = watch("accessUrlId");

  const load = () =>
    entityAdminApi.users({}).then((d) => setUsers(d.users)).catch((e) => notifyError(e));

  useEffect(() => {
    load();
    // Solo las URLs de acceso activas de SU entidad y del rol creador.
    entityAdminApi.accessUrls({}).then((d) => setAccessUrls(d.urls)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSpotlightHotkey(spotlightOpen, setSpotlightOpen);

  const counts = useMemo(() => {
    let active = 0;
    for (const u of users) if (u.isActive !== false) active += 1;
    return { total: users.length, active, inactive: users.length - active };
  }, [users]);

  // El estado de la cuenta es un filtro local sobre lo ya cargado (mismo
  // criterio que la columna Estado de la tabla), igual que en el resto del panel.
  const statusFiltered = useMemo(() => {
    if (!status) return users;
    return users.filter((u) => (u.isActive !== false ? "active" : "inactive") === status);
  }, [users, status]);

  const sortedUsers = useMemo(() => {
    const list = [...statusFiltered];
    if (sortBy === "name") list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
    else if (sortBy === "email") list.sort((a, b) => String(a.email || "").localeCompare(String(b.email || ""), "es"));
    return list;
  }, [statusFiltered, sortBy]);

  const openCreate = () => {
    reset({ name: "", email: "", username: "", password: "", accessUrlId: "" });
    setGenerated(null);
    setModal({ mode: "create" });
  };
  const openEdit = (target) => {
    reset({
      name: target.name || "",
      email: target.email || "",
      username: target.username || "",
      password: "",
      accessUrlId: target.accessUrlId || "",
    });
    setGenerated(null);
    setModal({ mode: "edit", user: target });
  };

  /* Genera la URL de acceso de la entidad + rol creador que necesita la cuenta
     (alta) o que puede sustituir la actual (edición): queda vinculada en el
     estado oculto `accessUrlId` y su enlace visible/copiable debajo. Todo
     dentro de SU entidad: el backend la fabrica con `req.user.entityId`. */
  const generateUrl = async () => {
    setGenerating(true);
    try {
      const url = await entityAdminApi.createAccessUrl();
      setAccessUrls((prev) => [url, ...prev.filter((u) => u._id !== url._id)]);
      setValue("accessUrlId", url._id, { shouldValidate: true });
      setGenerated({ slug: url.slug });
      notifySaved(rt("generateAccessUrl"));
    } catch (err) {
      notifyError(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyUrl = async (slug) => {
    if (!slug) return;
    const ok = await copyText(`${window.location.origin}${accessLoginPath(slug)}`);
    if (ok) {
      notifySaved(rt("linkCopied"));
    } else {
      notifyError(new Error("No se pudo copiar"));
    }
  };

  const submit = async (values) => {
    const isCreate = modal?.mode === "create";
    if (isCreate && !values.accessUrlId) {
      notifyError(new Error("Completa la URL de acceso del gestor"));
      return;
    }
    setBusy(true);
    try {
      if (isCreate) {
        const { user: createdUser, mail } = await entityAdminApi.createUser({
          name: values.name,
          email: values.email,
          username: values.username || undefined,
          accessUrlId: values.accessUrlId,
        });
        const slug = accessUrls.find((u) => u._id === values.accessUrlId)?.slug;
        notifySaved(rt("newCreator"));
        setModal(null);
        load();
        setCreated({ name: createdUser?.name || values.name, slug, mail });
      } else {
        await entityAdminApi.updateUser(modal.user._id, {
          name: values.name,
          email: values.email || undefined,
          username: values.username || null,
          password: values.password || undefined,
          accessUrlId: values.accessUrlId || null,
        });
        notifySaved(isSpanish ? "Usuario actualizado" : "User updated");
        setModal(null);
        load();
      }
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (target) => {
    await confirm({
      title: `Eliminar a ${target.name}`,
      description: "La cuenta y sus sesiones quedan invalidadas. Esta acción no se puede deshacer.",
      confirmText: "Eliminar usuario",
      onConfirm: async () => {
        await entityAdminApi.deleteUser(target._id);
        notifyDeleted("Usuario");
        load();
      },
    });
  };

  /* Activa o desactiva un gestor de la entidad. El backend revoca sus sesiones
     al desactivarlo (no puede volver a entrar hasta reactivarlo). */
  const toggleActive = async (target) => {
    const nextActive = target.isActive === false;
    try {
      await entityAdminApi.updateUser(target._id, { isActive: nextActive });
      notifySaved(rt(nextActive ? "userActivated" : "userDeactivated"));
      load();
    } catch (err) {
      notifyError(err);
    }
  };

  const closeSpotlight = () => {
    setSpotlightOpen(false);
    requestAnimationFrame(() => document.getElementById(TRIGGER_ID)?.focus());
  };

  // Reenvía el correo de bienvenida/activación al gestor. La contraseña
  // original no se puede reenviar (está hasheada): variante A firma un token
  // nuevo, variante B genera una contraseña temporal nueva. Best-effort.
  const resend = async (target) => {
    try {
      const { mail } = await entityAdminApi.resendWelcome(target._id, { language });
      if (mail?.sent) notifySaved(rt("resendSent", target.email));
      else notifyError(new Error(rt("resendFailed", target.email)));
    } catch (err) {
      notifyError(err);
    }
  };

  const spotlightResults = sortedUsers.map((u) => ({
    icon: <UserRound />,
    label: u.name || "-",
    description: [u.email, ROLE_LABEL[u.role] || "-", u.accessUrlSlug ? `/a/${u.accessUrlSlug}` : "-"]
      .filter((v) => v && v !== "-")
      .join(" · ") || "-",
    link: `#eusr-${u._id}`,
    keywords: [
      u._id,
      u.email,
      u.username,
      u.role,
      ROLE_LABEL[u.role],
      u.accessUrlSlug,
      u.isActive === false ? "inactivo" : "activo",
    ].filter(Boolean),
  }));

  const activeQuery = query.trim();
  const filteredUsers = applySpotlightQuery(sortedUsers, spotlightResults, query, (u) => `#eusr-${u._id}`);

  const STATUS_OPTIONS = [
    { id: "", label: rt("allStatuses"), icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: "active", label: rt("active"), icon: <Activity className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: "inactive", label: rt("inactive"), icon: <PowerOff className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  // Rótulo del filtro fijado (resumen + chip), de las mismas opciones que
  // pinta el Segmented para que no haya dos fuentes de verdad.
  const statusLabelOf = (s) => STATUS_OPTIONS.find((o) => o.id === s)?.label || "";

  const SORTS = [
    { id: "recent", label: isSpanish ? "Más recientes" : "Most recent" },
    { id: "name", label: isSpanish ? "Nombre (A–Z)" : "Name (A–Z)" },
    { id: "email", label: isSpanish ? "Correo (A–Z)" : "Email (A–Z)" },
  ];

  const isCreate = modal?.mode === "create";
  // En edición, sin regenerar se muestra la URL ya asignada a la cuenta.
  const currentSlug = !isCreate && modal?.user?.accessUrlSlug ? modal.user.accessUrlSlug : null;
  const displaySlug = generated?.slug || currentSlug;

  return (
    <div className="animate-page-enter relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <AdminHeader
        eyebrow={rt("roleEntity")}
        title={rt("entityUsers")}
        description={rt("entityUsersDesc")}
      >
        <Button size="md" onClick={openCreate}>
          <UserPlus className="h-4 w-4" strokeWidth={1.7} /> {rt("newCreator")}
        </Button>
      </AdminHeader>

      <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" aria-label={rt("entityUsers")}>
        <StatTile icon={UsersIcon} label={rt("entityUsers")} value={counts.total} hint={entityName} tone="accent" />
        <StatTile icon={Activity} label={rt("active")} value={counts.active} tone="success" />
        <StatTile icon={Lock} label={rt("inactive")} value={counts.inactive} tone="warning" />
        <StatTile icon={ClipboardList} label={rt("role")} value={ROLE_LABEL.form_creator} tone="info" />
      </section>

      <div className="relative z-30 mt-6">
        <AdminPanel className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(16rem,0.6fr)] lg:items-end">
            <SpotlightTrigger
              id={TRIGGER_ID}
              label={rt("searchEntities")}
              placeholder={activeQuery || `${rt("entityUsers")}…`}
              ariaLabel={rt("entityUsers")}
              onClick={() => setSpotlightOpen(true)}
            />
            <div>
              <p className="adm-label">{rt("status")}</p>
              <Segmented
                ariaLabel="Filtrar por estado de la cuenta"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
              />
            </div>
            <div>
              <p className="adm-label">{rt("entity")}</p>
              <IconPill icon={Building2} title={rt("entity")}>{entityName}</IconPill>
            </div>
          </div>
        </AdminPanel>
      </div>

      <SummaryBar icon={UsersIcon} tickKey={`${filteredUsers.length}-${status}-${activeQuery}`}>
        {activeQuery
          ? `${filteredUsers.length} · «${activeQuery}»`
          : status
            ? `${filteredUsers.length} · ${statusLabelOf(status)}`
            : rt("creatorRoleHint")}
      </SummaryBar>

      <ListSection
        title={rt("entityUsers")}
        countText={String(filteredUsers.length)}
        sorts={SORTS}
        sortBy={sortBy}
        onSort={setSortBy}
        density={density}
        onDensity={setDensity}
        chips={[
          ...(activeQuery ? [{ key: "search", label: `«${activeQuery}»`, onClear: () => setQuery("") }] : []),
          ...(status ? [{ key: "status", label: statusLabelOf(status), onClear: () => setStatus("") }] : []),
        ]}
        columns={[
          { icon: UserRound, label: "Nombre" },
          { icon: Mail, label: "Correo" },
          { icon: KeyRound, label: rt("role") },
          { icon: Link2, label: "URL" },
          { icon: Activity, label: rt("status") },
          { icon: Settings, label: "Acciones" },
        ]}
        colsClass={ENTITY_USERS_COLS}
        rows={filteredUsers}
        renderRow={(u, i, d) => (
          <EntityUserRow
            key={u._id || i}
            user={u}
            index={i}
            density={d}
            onEdit={openEdit}
            onDelete={remove}
            onToggleActive={toggleActive}
            onResend={resend}
          />
        )}
        empty={{
          icon: UsersIcon,
          title: rt("noResults"),
          hint: activeQuery ? "Prueba con otro término o quita la búsqueda" : rt("newCreator"),
        }}
      />

      <AppleSpotlight
        isOpen={spotlightOpen}
        handleClose={closeSpotlight}
        results={spotlightResults}
        value={query}
        onQueryChange={setQuery}
        placeholder={`${rt("entityUsers")}…`}
        ariaLabel={rt("entityUsers")}
        emptyText={rt("noResults")}
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
        title={isCreate ? rt("newCreator") : "Editar usuario"}
        description={isCreate ? rt("creatorRoleHint") : "Correo, usuario, contraseña y URL de acceso editables"}
        size="md"
        closeOnOverlay={!busy}
        closeOnEsc={!busy}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModal(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="entity-user-form"
              loading={busy}
              disabled={busy || (isCreate && !accessUrlValue)}
            >
              {isCreate ? "Crear cuenta" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form id="entity-user-form" onSubmit={handleSubmit(submit)} className="space-y-4 pt-1" noValidate>
          {isCreate && (
            <div className="flex items-center gap-2.5 rounded-xl border border-line/70 bg-surface-2/50 px-3 py-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <p className="text-sm text-ink">
                <span className="font-semibold">{entityName}</span>
                <span className="ml-1 text-ink-muted">{rt("entityFixedHint")}</span>
              </p>
            </div>
          )}

          <AdminInput
            id="entity-user-name"
            label="Nombre"
            icon={UserRound}
            placeholder="Nombre completo"
            autoComplete="name"
            control={control}
            name="name"
            error={errors.name?.message}
          />

          <AdminInput
            id="entity-user-email"
            label="Correo"
            icon={Mail}
            type="email"
            placeholder="persona@entidad.cu"
            autoComplete="email"
            control={control}
            name="email"
            error={errors.email?.message}
          />

          <AdminFieldGroup className="grid-cols-1 sm:grid-cols-2">
            <AdminInput
              id="entity-user-username"
              label="Usuario"
              hint="Opcional"
              icon={AtSign}
              placeholder="@usuario"
              autoComplete="username"
              control={control}
              name="username"
              error={errors.username?.message}
            />
            {!isCreate && (
              <AdminInput
                id="entity-user-password"
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
            )}
          </AdminFieldGroup>

          {/* URL de acceso: sin selector (la entidad es fija y la URL se genera
              bajo demanda). En edición se ve la asignada y se puede regenerar. */}
          <div className="space-y-1.5 pt-1">
            <FieldLabel label={rt("accessUrl")} required={isCreate} />
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={generating}
                disabled={generating || busy}
                onClick={generateUrl}
              >
                <Dices className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                {isCreate ? rt("generateAccessUrl") : "Regenerar"}
              </Button>
              {displaySlug && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line/70 bg-surface-2/50 px-2.5 py-1.5">
                  <Link2 className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                  <span className="adm-mono text-xs text-ink">{accessLoginPath(displaySlug)}</span>
                  <button
                    type="button"
                    onClick={() => copyUrl(displaySlug)}
                    className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label={rt("copyLink")}
                    title={rt("copyLink")}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              )}
            </div>
            {!isCreate && !displaySlug && (
              <p className="text-xs text-ink-muted">Sin URL de acceso asignada.</p>
            )}
          </div>
        </form>
      </FormModal>

      {/* Post-alta: confirma el envío de credenciales por correo y ofrece
          abrir la puerta de acceso del gestor (sin cerrar la sesión actual). */}
      <SuccessModal
        open={!!created && created?.mail?.sent === true}
        onClose={() => setCreated(null)}
        title={rt("credentialsSentTitle")}
        description={created ? rt("credentialsSentBody", created.mail?.to || "") : ""}
        actionText={created?.slug ? rt("goToLogin") : undefined}
        onAction={
          created?.slug
            ? () => {
                rememberAccessDoor("form_creator", created.slug);
                window.open(accessLoginPath(created.slug), "_blank", "noopener");
                setCreated(null);
              }
            : undefined
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {created ? rt("userCreatedBody", created.name) : ""}
        </p>
      </SuccessModal>
      <InfoModal
        open={!!created && created?.mail?.sent !== true}
        onClose={() => setCreated(null)}
        title={rt("credentialsNotSentTitle")}
        description={created ? rt("credentialsNotSentBody", created.mail?.to || "") : ""}
        actionText={created?.slug ? rt("goToLogin") : undefined}
        onAction={
          created?.slug
            ? () => {
                rememberAccessDoor("form_creator", created.slug);
                window.open(accessLoginPath(created.slug), "_blank", "noopener");
                setCreated(null);
              }
            : undefined
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {created ? rt("userCreatedBody", created.name) : ""}
        </p>
      </InfoModal>
    </div>
  );
}

function EntityUserRow({ user, index, density, onEdit, onDelete, onToggleActive, onResend }) {
  const rt = useRoleT();
  const shortId = `#${String(user._id || "").slice(0, 6).toUpperCase()}`;
  const active = user.isActive !== false;

  return (
    <RowShell id={`eusr-${user._id || index}`} index={index} density={density}>
      <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", ENTITY_USERS_COLS)}>
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
          </MetaLine>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.email || "-"}</p>
        </div>

        <div className="min-w-0">
          <Pill tone="brand" dot>{ROLE_LABEL[user.role] || "-"}</Pill>
        </div>

        <div className="min-w-0">
          <span className="adm-mono text-xs text-ink-muted">
            {user.accessUrlSlug ? `/a/${user.accessUrlSlug}` : "-"}
          </span>
        </div>

        <div className="min-w-0">
          <Pill tone={active ? "green" : "amber"} dot>
            {active ? rt("active") : rt("inactive")}
          </Pill>
        </div>

        <div className="flex basis-full items-center justify-end gap-1 lg:basis-auto lg:justify-start">
          <FabSpeedDial
            label={`Acciones de ${user.name || "la cuenta"}`}
            actions={[
              {
                id: "copy",
                label: rt("copyAccessUrl"),
                icon: <Copy className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                disabled: !user.accessUrlSlug,
                onClick: () => copyUrl(user.accessUrlSlug),
              },
              {
                id: "edit",
                label: `Editar ${user.name}`,
                icon: <Pencil className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: () => onEdit(user),
              },
              {
                id: "resend",
                label: rt("resendEmail"),
                icon: <Send className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />,
                onClick: () => onResend(user),
              },
              {
                id: "toggle-active",
                label: active ? rt("deactivate") : rt("activate"),
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
