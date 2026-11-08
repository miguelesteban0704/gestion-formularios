import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Copy, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { FIELD_DEFS } from "../../lib/fieldTypes.js";
import { FieldRenderer } from "../public/FieldRenderer.jsx";
import { FieldSettings } from "./FieldSettings.jsx";
import { Button } from "../ui/Button.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

// Diccionario exhaustivo de títulos, etiquetas y placeholders para la construcción del formulario
const FIELD_TEXTS_DICTIONARY = {
  es: {
    // Títulos y etiquetas predeterminadas
    "Address question": "Dirección",
    "Phone question": "Teléfono",
    "Province question": "Provincia",
    "Municipality question": "Municipio",
    "Gender question": "Género",
    "Education level": "Nivel de escolaridad",
    "Education Level": "Nivel de escolaridad",
    "Education level question": "Nivel de escolaridad",
    "Province": "Provincia",
    "Municipality": "Municipio",
    "Gender": "Género",
    "Short text": "Texto corto",
    "Short text question": "Texto corto",
    "Long text": "Texto largo",
    "Long text question": "Texto largo",
    "Email": "Correo electrónico",
    "Email question": "Correo electrónico",
    "Phone": "Teléfono",
    "Number": "Número",
    "Number question": "Número",
    "URL": "URL",
    "URL question": "URL",
    "Password": "Contraseña",
    "Password question": "Contraseña",
    "Date": "Fecha",
    "Date question": "Fecha",
    "Date Picker question": "Selector de fecha",
    "date picker question": "Selector de fecha",
    "Date Picker": "Selector de fecha",
    "Time Picker question": "Selector de hora",
    "time picker question": "Selector de hora",
    "Time Picker": "Selector de hora",
    "Rating": "Valoración",
    "Rating question": "Valoración",
    "Quality Rating": "Valoración Calidad",
    "Quality Rating question": "Valoración Calidad",
    "Quality rating": "Valoración Calidad",
    "Quality Stars": "Valoración Calidad",
    "Quality Stars question": "Valoración Calidad",
    "Quality stars": "Valoración Calidad",
    "Number Rating": "Valoración Número",
    "Number Rating question": "Valoración Número",
    "Number rating": "Valoración Número",
    "Numeric Score": "Valoración Número",
    "Numeric Score question": "Valoración Número",
    "Numeric score": "Valoración Número",
    "File": "Archivo",
    "File question": "Subir archivo",
    "File Upload": "Subir archivo",
    "File upload": "Subir archivo",
    "Address": "Dirección",
    "Dropdown": "Lista desplegable",
    "Dropdown question": "Lista desplegable",
    "Multiple Choice": "Opción múltiple",
    "Multiple Choice question": "Opción múltiple",
    "Multiple choice": "Opción múltiple",
    "Multiple choice question": "Opción múltiple",
    "Checkboxes": "Casillas",
    "Checkboxes question": "Casillas",
    "Checkbox": "Casillas",
    "Checkbox question": "Casillas",
    "Yes/No question": "Sí / No",
    "Yes / No question": "Sí / No",
    "Yes / No": "Sí / No",
    "Heading": "Encabezado",
    "Paragraph": "Párrafo",
    "Message": "Mensaje",
    "Message question": "Mensaje",
    "Section divider": "Separador de sección",
    "Image block": "Bloque de imagen",

    // Placeholders
    "Street address": "Dirección de residencia...",
    "Select province...": "Seleccionar provincia...",
    "Select municipality...": "Seleccionar municipio...",
    "Enter phone number": "Ingresar teléfono...",
    "Enter email address": "Ingresar correo...",
    "Escribe tu respuesta": "Escribe tu respuesta",
    "Dirección completa": "Dirección completa",
    "Ranking": "Clasificación",
  },
  en: {
    "Dirección": "Address question",
    "Mensaje": "Message",
    "Teléfono": "Phone question",
    "Provincia": "Province question",
    "Municipio": "Municipality question",
    "Género": "Gender question",
    "Nivel de escolaridad": "Education level",
    "Texto corto": "Short text",
    "Texto largo": "Long text",
    "Correo electrónico": "Email",
    "Número": "Number",
    "Contraseña": "Password",
    "Fecha": "Date",
    "Escribe tu respuesta": "Write your answer",
    "Dirección completa": "Full address",
    "Date Picker question": "Date Picker",
    "date picker question": "Date Picker",
    "Date Picker": "Date Picker",
    "Time Picker question": "Time Picker",
    "time picker question": "Time Picker",
    "Time Picker": "Time Picker",
    "Valoración": "Rating",
    "Calidad con estrellas": "Quality rating",
    "Valoración Calidad": "Quality rating",
    "Valoración numérica": "Number rating",
    "Valoración Número": "Number rating",
    "Subir archivo": "File upload",
    "Province": "Province",
    "Municipality": "Municipality",
    "Gender": "Gender",
    "Clasificación": "Ranking",
    "Sí / No": "Yes / No"
  }
};

/* Los callbacks reciben el `id` del campo (no se cierra sobre él en el
   padre): así el Builder puede pasar funciones estables con `useCallback` y
   este componente entra en el `memo` de abajo sin re-renderizarse en cada
   tecla del título o en cada cambio del indicador de guardado. */
function SortableFieldBase({
  field,
  expanded,
  selected,
  accent,
  onToggle,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  allQuestions = [],
  fieldIndex = 0,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: field.id,
  });
  const def = FIELD_DEFS[field.type];
  const { t, language } = useLanguage();

  // Función helper para traducir dinámicamente títulos y textos
  const translateText = (text) => {
    if (!text) return text;
    const langKey = language === "es" ? "es" : "en";
    return FIELD_TEXTS_DICTIONARY[langKey]?.[text] || text;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  // Objeto de campo adaptado con la traducción activa para la vista previa interna
  const translatedField = {
    ...field,
    language,
    label: translateText(field.label),
    placeholder: translateText(field.placeholder),
  };

  return (
  <>
    {/* Drop indicator — crystal clear slot when dragging over this card */}
    {isOver && !isDragging && (
      <div className="relative -my-1.5 flex items-center gap-2 py-1.5">
        <span className="h-[2px] flex-1 rounded-full bg-brand-500 shadow-[var(--shadow-brand-rail)] dark:bg-brand-400" />
        <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-brand-500 bg-brand-50 text-brand-600 shadow-sm dark:border-brand-400 dark:bg-brand-950 dark:text-brand-300">
          <span className="h-2 w-2 rounded-full bg-brand-500 dark:bg-brand-400" />
        </span>
        <span className="h-[2px] flex-1 rounded-full bg-brand-500 shadow-[var(--shadow-brand-rail)] dark:bg-brand-400" />
      </div>
    )}
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(field.id)}
      className={cn(
        "group relative overflow-hidden rounded-[18px] border bg-white transition-all duration-200 dark:bg-slate-900",
        selected
          ? "border-brand-400 ring-2 ring-brand-500/15 shadow-[var(--shadow-brand-select)] dark:border-brand-500 dark:ring-brand-500/20 dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          : "border-slate-200/70 dark:border-slate-800 hover:border-brand-200 hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] dark:hover:border-slate-700 dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]",
        isDragging && "opacity-70 shadow-2xl ring-2 ring-brand-500/20 scale-[0.98]"
      )}
    >
    <div
      className={cn(
        "flex items-center gap-2 rounded-t-2xl px-2.5 py-2 transition-colors",
        selected && "bg-brand-50/40 dark:bg-brand-900/15"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="grid h-7 w-7 cursor-grab touch-none place-items-center rounded-lg text-muted/70 transition-colors hover:bg-surface-2 dark:hover:bg-slate-800 hover:text-fg dark:hover:text-slate-200 active:cursor-grabbing"
        aria-label={t("dragToReorder")}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg transition-colors",
          selected ? "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300" : "bg-surface-2 dark:bg-slate-800 text-muted dark:text-slate-400"
        )}
      >
        {def?.icon && <def.icon className="h-4 w-4" strokeWidth={1.8} />}
      </span>
      <span className="flex-1 truncate text-sm font-semibold text-fg dark:text-slate-100">
        {translateText(field.label)}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <span className="hidden rounded-full bg-surface-2 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted dark:text-slate-400 sm:block">
        {t(`field_${field.type}`) || def?.label}
      </span>
      {/* Puerta de salida y condición: se ven sin abrir la tarjeta. */}
      {field.isConsentGate && (
        <span className="hidden rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300 sm:block">
          {t("badgeGate")}
        </span>
      )}
      {!field.isConsentGate && field.visibleIf && (
        <span className="hidden rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300 sm:block">
          {t("badgeConditional")}
        </span>
      )}

      <div className="flex items-center opacity-0 transition group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(field.id);
          }}
          aria-label={t("duplicate")}
        >
          <Copy className="h-3.5 w-3.5 dark:text-slate-300" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          aria-label={t("delete")}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(field.id);
        }}
        className="text-muted dark:text-slate-400 hover:text-fg dark:hover:text-slate-200"
        aria-label={t("toggleSettings")}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </div>

    {/* Live preview row con datos traducidos dinámicamente */}
    <div className="border-t border-default dark:border-slate-800 px-4 py-3">
      <div className="pointer-events-none text-fg dark:text-slate-100">
        <FieldRenderer field={translatedField} value={undefined} onChange={() => {}} accent={accent} disabled language={language} />
      </div>
    </div>

    {/* Inline settings */}
    {expanded && (
      <div className="border-t border-default dark:border-slate-800 bg-surface-2/50 dark:bg-slate-900/60 p-4" onClick={(e) => e.stopPropagation()}>
        <FieldSettings field={field} onChange={onChange} allQuestions={allQuestions} fieldIndex={fieldIndex} accent={accent} />
      </div>
    )}
  </div>
  </>
);
}

/* Comparador propio del `memo`. `allQuestions` solo lo consume FieldSettings,
   que solo se pinta con la tarjeta expandida: un cambio del array (pasa en
   CADA edición de cualquier campo) no debe despertar a las demás tarjetas.
   El expandido sí lo compara, para que su lista de condiciones nunca quede
   con datos viejos. El resto es el shallow-compare de siempre. */
function mismasProps(prev, next) {
  if (
    prev.field !== next.field ||
    prev.expanded !== next.expanded ||
    prev.selected !== next.selected ||
    prev.accent !== next.accent ||
    prev.fieldIndex !== next.fieldIndex ||
    prev.onToggle !== next.onToggle ||
    prev.onSelect !== next.onSelect ||
    prev.onChange !== next.onChange ||
    prev.onDuplicate !== next.onDuplicate ||
    prev.onDelete !== next.onDelete
  ) {
    return false;
  }
  return !next.expanded || prev.allQuestions === next.allQuestions;
}

export const SortableField = memo(SortableFieldBase, mismasProps);