import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FolderOpen } from "lucide-react";
import { useForms } from "../../hooks/useForms.js";
import { useDebounce } from "../../hooks/useDebounce.js";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Skeleton, EmptyState } from "../ui/Feedback.jsx";
import { ConfirmModal } from "../ui/Modal.tsx";
import { FormCard } from "./FormCard.jsx";
import { FilteredFormsList } from "./FilteredFormsList.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useRoleT } from "../../lib/roleI18n.js";
import { builderPath } from "../../lib/routes.js";

/**
 * Self-contained forms list: filter tabs, search, responsive card grid and a
 * delete confirmation. `filter`/`onFilterChange` make the filter optionally
 * controlled (used by the dashboard category cards). `onMutate` fires after any
 * create/delete/favorite change so a parent can refresh aggregate counts.
 * `guestMode`: mismo diseño para el escaparate de invitados (publicados de
 * todos, sin sesión ni gestión; las acciones viven en la tarjeta).
 */
export const FormsBrowser = forwardRef(function FormsBrowser(
  { title, filter: filterProp, onFilterChange, onMutate, publicOnly = false, guestMode = false, hideFilters = false, publishedOnly = false },
  ref
) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  // Sin sesión no hay gestión de formularios: todo vacío y sin acciones
  const canManage = isAuthenticated && !publicOnly && !guestMode;
  const filters = guestMode
    ? [
        { id: "all", label: t("all") },
        { id: "public", label: rt("visibilityPublic") },
        { id: "private", label: rt("visibilityPrivate") },
      ]
    : [
        { id: "all", label: t("all") },
        { id: "published", label: t("published") },
        { id: "draft", label: t("drafts") },
        { id: "favorites", label: t("favorites") },
        { id: "archived", label: t("archived") },
      ];
  const [internalFilter, setInternalFilter] = useState("all");
  const filter = filterProp ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  // Un filtro heredado del panel (p. ej. "draft") no existe en el escaparate.
  const safeFilter = guestMode && !["all", "public", "private"].includes(filter) ? "all" : filter;

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { forms, loading, remove, duplicate, patch } = useForms({ search, filter: safeFilter, publicOnly, guestMode });
  // Portada pública: solo encuestas publicadas, sin pestañas de filtro.
  const visibleForms = publishedOnly ? forms.filter((f) => f.status === "published") : forms;

  const handleDelete = async (id) => {
    await remove(id);
    onMutate?.();
  };
  const handleDuplicate = async (id) => {
    await duplicate(id);
    onMutate?.();
  };
  const handlePatch = (id, data) => {
    patch(id, data);
    onMutate?.();
  };

  return (
    <div ref={ref} className="scroll-mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {title !== "" && <h2 className="text-lg font-semibold text-fg">{title || t("yourForms")}</h2>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {(canManage || guestMode) && !hideFilters && <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={safeFilter === f.id}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-300 ease-out",
                  safeFilter === f.id ? "bg-brand-600 text-white shadow-soft" : "text-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>}
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("searchForms")} className="h-9 pl-9" />
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        {/* Recarga suave: línea de progreso en vez de parpadeo de skeletons. */}
        {guestMode && loading && forms.length > 0 && (
          <div className="absolute -top-2 left-0 right-0 h-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full w-1/3 animate-[guestbar_1.1s_ease-in-out_infinite] rounded-full bg-brand-gradient" />
          </div>
        )}
        {loading && visibleForms.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : visibleForms.length === 0 ? (
          <EmptyState
            icon={searchInput ? Search : FolderOpen}
            title={searchInput ? t("noFormsMatch") : t("noFormsYet")}
            description={
              searchInput ? t("searchFormsHint") : guestMode ? rt("emptyPublicForms") : t("createFirstForm")
            }
            action={
              !searchInput && canManage && (
                <div className="flex gap-2">
                  <Button onClick={() => navigate(builderPath(language, "new", {}, user?.entity?.code))}>
                    <Plus className="h-4 w-4" /> {t("blankForm")}
                  </Button>
                  {/* AI feature hidden - retained in code: the "Use AI" button used to
                      live here (Sparkles → builderPath(..., { ai: true })). The
                      AIGenerateModal is still mounted in Builder, but nothing in the UI can
                      open it anymore. */}
                </div>
              )
            }
          />
        ) : guestMode ? (
          <FilteredFormsList
            forms={visibleForms}
            activeTab={safeFilter}
            searchValue={searchInput}
            onDuplicate={handleDuplicate}
            onDelete={setToDelete}
            onPatch={handlePatch}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleForms.map((form, i) => (
              <FormCard key={form._id} form={form} index={i} publicOnly={publicOnly || guestMode} guestMode={guestMode} onDuplicate={handleDuplicate} onDelete={setToDelete} onPatch={handlePatch} />
            ))}
          </div>
        )}
      </div>

      {!guestMode && (
      <ConfirmModal
        open={!!toDelete}
        loading={deleting}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={async () => {
          // El botón entra en estado de carga: ni doble clic ni doble request.
          setDeleting(true);
          try {
            await handleDelete(toDelete._id);
          } finally {
            setDeleting(false);
            setToDelete(null);
          }
        }}
        title={t("deleteFormQuestion")}
        description={`"${toDelete?.title}" ${t("deleteFormDescription")}`}
        confirmText={t("deleteForm")}
        danger
      />
      )}
    </div>
  );
});
