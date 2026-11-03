import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { FIELD_DEFS, FIELD_GROUPS } from "../../lib/fieldTypes.js";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

// Diccionario exhaustivo para las categorías / grupos
const GROUP_TITLES_DICTIONARY = {
  es: {
    basic: "Texto e Entradas",
    text: "Texto e Entradas",
    choice: "Opciones",
    options: "Opciones",
    location: "Opciones",
    advanced: "Avanzados",
    layout: "Diseño"
  },
  en: {
    basic: "Text & Inputs",
    text: "Text & Inputs",
    choice: "Options",
    options: "Options",
    location: "Options",
    advanced: "Advanced",
    layout: "Layout"
  }
};

// Diccionario exhaustivo para todos los campos de la paleta
const FIELD_LABELS_DICTIONARY = {
  es: {
    // Texto e Entradas
    short_text: "Texto corto",
    text: "Texto corto",
    long_text: "Texto largo",
    textarea: "Texto largo",
    email: "Correo electrónico",
    phone: "Teléfono",
    number: "Número",
    url: "URL",
    password: "Contraseña",
    address: "Dirección",

    // Opciones
    province: "Provincia",
    municipality: "Municipio",
    gender: "Género",
    education: "Nivel de escolaridad",
    education_level: "Nivel de escolaridad",
    select: "Lista desplegable",
    dropdown: "Lista desplegable",
    radio: "Opción múltiple",
    multiple_choice: "Opción múltiple",
    checkbox: "Casillas",
    casillas: "Casillas",
    yes_no: "Sí / No",

    // Avanzados
    date: "Selector de fecha",
    time: "Selector de hora",
    rating: "Valoración",
    quality_rating: "Valoración Calidad",
    score_rating: "Valoración Número",
    file: "Subir archivo",

    // Diseño
    section: "Separador de sección",
    heading: "Encabezado",
    paragraph: "Párrafo",
    message: "Mensaje",
    image: "Bloque de imagen (subir desde PC)"
  },
  en: {
    // Text & Inputs
    short_text: "Short text",
    text: "Short text",
    long_text: "Long text",
    textarea: "Long text",
    email: "Email",
    phone: "Phone",
    number: "Number",
    url: "URL",
    password: "Password",
    address: "Address",

    // Options
    province: "Province",
    municipality: "Municipality",
    gender: "Gender",
    education: "Education level",
    education_level: "Education level",
    select: "Dropdown list",
    dropdown: "Dropdown list",
    radio: "Multiple choice",
    multiple_choice: "Multiple choice",
    checkbox: "Checkboxes",
    casillas: "Checkboxes",
    yes_no: "Yes / No",

    // Advanced
    date: "Date picker",
    time: "Time picker",
    rating: "Rating",
    quality_rating: "Quality rating",
    score_rating: "Number rating",
    file: "File upload",

    // Layout
    section: "Section divider",
    heading: "Heading",
    paragraph: "Paragraph",
    message: "Message",
    image: "Image block (upload from PC)"
  }
};

function PaletteItem({ type, onAdd, language, t }) {
  const def = FIELD_DEFS[type];
  const isEs = language === "es";

  const { attributes, listeners, setNodeRef, isDragging, over } = useDraggable({
    id: `palette:${type}`,
    data: { fromPalette: true, type },
  });

  const getLabel = () => {
    const langKey = isEs ? "es" : "en";
    const dictionaryLabel = FIELD_LABELS_DICTIONARY[langKey]?.[type];
    if (dictionaryLabel) return dictionaryLabel;
    const translationKey = `field_${type}`;
    const translated = t(translationKey);
    if (translated && translated !== translationKey) return translated;
    return def?.label || type;
  };

  if (!def) return null;

  return (
    <button
      ref={setNodeRef}
      onClick={() => onAdd(type)}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-8px_rgba(16,24,40,0.12)] active:scale-[0.98]",
        "border-slate-200/70 hover:border-slate-200 hover:bg-slate-50",
        "dark:border-slate-800 dark:bg-slate-800 dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] dark:hover:bg-slate-800/80 dark:hover:border-slate-700 dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]",
        isDragging && "opacity-50 shadow-lg ring-2 ring-brand-500/20 border-brand-300 dark:border-brand-700 dark:ring-brand-500/30"
      )}
    >
      {/* accent left stripe on hover */}
      <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] origin-center scale-y-0 rounded-full bg-brand-500 transition-transform group-hover:scale-y-100 dark:bg-brand-400" />
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200/60 bg-slate-50 text-slate-600 shadow-sm transition-colors group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:border-brand-800/50 dark:group-hover:bg-brand-950/40 dark:group-hover:text-brand-300">
        <def.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="flex-1 text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">{getLabel()}</span>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:bg-white group-hover:shadow-sm dark:bg-slate-700 dark:text-slate-400 dark:group-hover:bg-slate-600 dark:group-hover:text-slate-200">
        <GripVertical className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function FieldPalette({ onAdd }) {
  const { t, language } = useLanguage();
  const isEs = language === "es";

  const getGroupTitle = (group) => {
    const langKey = isEs ? "es" : "en";
    const dictionaryTitle = GROUP_TITLES_DICTIONARY[langKey]?.[group.id];
    if (dictionaryTitle) return dictionaryTitle;
    const translationKey = `fieldGroup_${group.id}`;
    const translated = t(translationKey);
    if (translated && translated !== translationKey) return translated;
    return group.label;
  };

  return (
    <div className="space-y-6">
      {FIELD_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-700/60" />
            <p className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {getGroupTitle(group)}
            </p>
            <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-2">
            {/* Los tipos `hidden` (legado) siguen pintándose en formularios
                viejos, pero no se ofrecen para campos nuevos. */}
            {Object.keys(FIELD_DEFS)
              .filter((type) => FIELD_DEFS[type].group === group.id && !FIELD_DEFS[type].hidden)
              .map((type) => (
                <PaletteItem key={type} type={type} onAdd={onAdd} language={language} t={t} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FieldPalette;