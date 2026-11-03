import { useMemo } from "react";
import { FileX2, SearchX } from "lucide-react";
import { useFilterAnimation } from "../../hooks/useFilterAnimation.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { FormCard } from "./FormCard.jsx";
import { EmptyState } from "../ui/Feedback.jsx";
import "./FilteredFormsList.css";

/**
 * Listado animado del escaparate: fadeIn desde la izquierda al entrar,
 * fadeOut hacia la derecha al salir, con cascada sutil. Idéntico para las
 * tres pestañas y para el buscador. Reutiliza FormCard y EmptyState del
 * sistema (sin duplicar diseño) y no usa librerías de animación.
 */
export function FilteredFormsList({
  forms = [],
  activeTab = "all",
  searchValue = "",
  onDuplicate,
  onDelete,
  onPatch,
}) {
  const rt = useRoleT();

  const filteredForms = useMemo(() => {
    const q = String(searchValue || "").trim().toLowerCase();
    return forms.filter((form) => {
      // "public"/"private" filtran estrictos; "privado" (unlisted) solo aparece
      // en la pestaña "todos" (no tiene pestaña propia).
      if (activeTab === "public" && form.visibility !== "public") return false;
      if (activeTab === "private" && form.visibility !== "private") return false;
      if (!q) return true;
      return `${form.title || ""} ${form.description || ""}`.toLowerCase().includes(q);
    });
  }, [forms, activeTab, searchValue]);

  const { renderedItems, exitingIds, enteringIds } = useFilterAnimation(filteredForms, {
    duration: 460,
    stagger: 40,
  });

  // Vacío real: solo cuando ya no queda ni un saliente por animar.
  if (renderedItems.length === 0) {
    const searching = String(searchValue || "").trim().length > 0;
    const message = searching
      ? rt("emptyNoMatch")
      : activeTab === "private"
        ? rt("emptyPrivateForms")
        : activeTab === "public"
          ? rt("emptyPublicForms")
          : rt("emptyNoForms");
    return (
      <div className="empty-state--animated" role="status" aria-live="polite">
        <EmptyState
          icon={searching ? SearchX : FileX2}
          title={message}
          description=""
        />
      </div>
    );
  }

  return (
    <div className="filtered-forms-list__grid">
      {renderedItems.map((form, index) => {
        const id = form._id ?? form.id;
        const exiting = exitingIds.has(id);
        return (
          <div
            key={id}
            className={exiting ? "filter-item filter-item--exit" : "filter-item filter-item--enter"}
            style={enteringIds.has(id) && !exiting ? { animationDelay: `${Math.min(index * 40, 200)}ms` } : undefined}
          >
            <FormCard
              form={form}
              index={index}
              publicOnly
              guestMode
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onPatch={onPatch}
            />
          </div>
        );
      })}
    </div>
  );
}
