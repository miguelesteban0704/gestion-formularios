import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AtSign,
  Calendar,
  ChevronRight,
  Files,
  Folder,
  Globe,
  Image as FortuneIcon,
  LayoutGrid,
  Mail,
  MessageSquare,
  Music,
  Search,
  Settings,
  StickyNote,
  Terminal,
} from "lucide-react";
import { cn } from "@/shared/skills";

export interface SpotlightShortcut {
  label: string;
  icon: ReactNode;
  link?: string;
  /** Si existe, se renderiza como botón (acción rápida) en vez de enlace. */
  onClick?: () => void;
}

export interface SpotlightResult {
  icon: ReactNode;
  label: string;
  description: string;
  link?: string;
  /** Términos extra para el filtrado local (ID, slug, métricas…). */
  keywords?: string[];
}

const SVGFilter = () => (
  <svg width="0" height="0">
    <filter id="blob">
      <feGaussianBlur stdDeviation="10" in="SourceGraphic" />
      <feColorMatrix
        values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -9"
        result="blob"
      />
      <feBlend in="SourceGraphic" in2="blob" />
    </filter>
  </svg>
);

const ShortcutButton = ({
  icon,
  link,
  label,
  onClick,
}: {
  icon: ReactNode;
  link?: string;
  label: string;
  onClick?: () => void;
}) =>
  onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="cursor-pointer"
    >
      <div className="rounded-full cursor-pointer hover:shadow-lg opacity-30 hover:opacity-100 transition-[opacity,shadow] duration-200">
        <div className="size-16 aspect-square flex items-center justify-center">{icon}</div>
      </div>
    </button>
  ) : (
    <a href={link} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <div className="rounded-full cursor-pointer hover:shadow-lg opacity-30 hover:opacity-100 transition-[opacity,shadow] duration-200">
        <div className="size-16 aspect-square flex items-center justify-center">{icon}</div>
      </div>
    </a>
  );

const SpotlightPlaceholder = ({ text, className }: { text: string; className?: string }) => (
  <motion.div layout className={cn("absolute text-gray-500 dark:text-neutral-400 flex items-center pointer-events-none z-10", className)}>
    <AnimatePresence mode="popLayout">
      <motion.p
        layoutId={`placeholder-${text}`}
        key={`placeholder-${text}`}
        initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {text}
      </motion.p>
    </AnimatePresence>
  </motion.div>
);

const SpotlightInput = ({
  placeholder,
  hidePlaceholder,
  value,
  onChange,
  placeholderClassName,
  ariaLabel,
}: {
  placeholder: string;
  hidePlaceholder: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholderClassName?: string;
  ariaLabel?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center w-full justify-start gap-2 px-6 h-16">
      <motion.div layoutId="search-icon"><Search /></motion.div>
      <div className="flex-1 relative text-2xl">
        {!hidePlaceholder && <SpotlightPlaceholder text={placeholder} className={placeholderClassName} />}
        <motion.input
          ref={inputRef}
          layout="position"
          type="text"
          aria-label={ariaLabel || "Search"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none ring-none text-black dark:text-white"
        />
      </div>
    </div>
  );
};

const SearchResultCard = ({
  icon,
  label,
  description,
  link,
  isLast,
  onActivate,
}: SpotlightResult & { isLast: boolean; onActivate?: () => void }) => {
  const inner = (
    <div
      className={cn(
        "flex items-center text-black dark:text-white justify-start hover:bg-white dark:hover:bg-neutral-700 gap-3 py-2 px-2 rounded-xl hover:shadow-md w-full transition-colors duration-150",
        isLast && "rounded-b-3xl",
      )}
    >
      <div className="size-8 [&_svg]:stroke-[1.5] [&_svg]:size-6 aspect-square flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex flex-col min-w-0 text-left">
        <p className="font-medium truncate">{label}</p>
        <p className="text-xs opacity-50 truncate">{description}</p>
      </div>
      <div className="flex-1 flex items-center justify-end opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
        <ChevronRight className="size-6" />
      </div>
    </div>
  );

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className="overflow-hidden w-full group/card cursor-pointer">
        {inner}
      </button>
    );
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="overflow-hidden w-full group/card">
      {inner}
    </a>
  );
};

const SearchResultsContainer = ({
  searchResults,
  onHover,
  onActivate,
  emptyText,
  emptySubText,
}: {
  searchResults: SpotlightResult[];
  onHover: (index: number | null) => void;
  onActivate?: (result: SpotlightResult) => void;
  emptyText?: string;
  emptySubText?: string;
}) => (
  <motion.div
    layout
    onMouseLeave={() => onHover(null)}
    className="px-2 border-t border-black/10 dark:border-white/10 flex flex-col bg-neutral-100 dark:bg-neutral-800 max-h-96 overflow-y-auto w-full py-2"
  >
    {searchResults.length === 0 ? (
      <div className="px-4 py-6 text-center">
        <p className="text-sm font-medium text-black/70 dark:text-white/80">{emptyText ?? "No matches"}</p>
        {emptySubText && <p className="mt-1 text-xs text-black/45 dark:text-white/50">{emptySubText}</p>}
      </div>
    ) : (
      searchResults.map((result, index) => (
        <motion.div
          key={`search-result-${index}`}
          onMouseEnter={() => onHover(index)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: Math.min(index * 0.1, 0.6), duration: 0.2, ease: "easeOut" }}
        >
          <SearchResultCard
            {...result}
            isLast={index === searchResults.length - 1}
            onActivate={onActivate ? () => onActivate(result) : undefined}
          />
        </motion.div>
      ))
    )}
  </motion.div>
);

export interface AppleSpotlightProps {
  shortcuts?: SpotlightShortcut[];
  /** Resultados reales; sin ellos se usan los de demostración. */
  results?: SpotlightResult[];
  isOpen?: boolean;
  handleClose?: () => void;
  /** Si existe, los resultados se renderizan como botones (sin abrir pestaña). */
  onSelect?: (result: SpotlightResult) => void;
  placeholder?: string;
  ariaLabel?: string;
  emptyText?: string;
  emptySubText?: string;
  maxResults?: number;
  /** Consulta controlada: si la página pasa `onQueryChange`, el campo lo
      gobierna ella — así lo escrito filtra la tabla en vivo además del
      overlay. Sin él, el campo usa estado interno como antes. */
  value?: string;
  onQueryChange?: (value: string) => void;
}

const DEFAULT_SHORTCUTS: SpotlightShortcut[] = [
  { label: "Apps", icon: <LayoutGrid />, link: "#" },
  { label: "Files", icon: <Folder />, link: "#" },
  { label: "Actions", icon: <Activity />, link: "#" },
  { label: "Clipboard", icon: <Files />, link: "#" },
];

const DEFAULT_SEARCH_RESULTS: SpotlightResult[] = [
  { icon: <AtSign />, label: "Twitter", description: "Open Twitter", link: "#" },
  { icon: <Globe />, label: "Safari", description: "Open web browser", link: "#" },
  { icon: <Mail />, label: "Mail", description: "Open Mail", link: "#" },
  { icon: <Calendar />, label: "Calendar", description: "View calendar", link: "#" },
  { icon: <StickyNote />, label: "Notes", description: "Open Notes", link: "#" },
  { icon: <FortuneIcon />, label: "Photos", description: "Browse photos", link: "#" },
  { icon: <Settings />, label: "Settings", description: "Open Settings", link: "#" },
  { icon: <Terminal />, label: "Terminal", description: "Open Terminal", link: "#" },
  { icon: <Folder />, label: "Finder", description: "Open Finder", link: "#" },
  { icon: <MessageSquare />, label: "Messages", description: "Open Messages", link: "#" },
  { icon: <Music />, label: "Music", description: "Open Music", link: "#" },
];

export function AppleSpotlight({
  shortcuts = DEFAULT_SHORTCUTS,
  results,
  isOpen = true,
  handleClose = () => {},
  onSelect,
  placeholder = "Search",
  ariaLabel = "Search shortcuts",
  emptyText = "No matches",
  emptySubText,
  maxResults = 8,
  value: valueProp,
  onQueryChange,
}: AppleSpotlightProps) {
  const [hovered, setHovered] = useState(false);
  const [hoveredSearchResult, setHoveredSearchResult] = useState<number | null>(null);
  const [hoveredShortcut, setHoveredShortcut] = useState<number | null>(null);
  const [innerValue, setInnerValue] = useState("");
  // Controlado cuando la página escucha lo escrito: el mismo texto filtra
  // el overlay y —vía `onQueryChange`— la tabla de la página en vivo.
  const searchValue = onQueryChange ? (valueProp ?? "") : innerValue;

  const source = results ?? DEFAULT_SEARCH_RESULTS;

  // Filtrado local real (el original no filtraba): label + descripción +
  // keywords, case-insensitive, con tope de resultados.
  const visibleResults = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return [];
    return source
      .filter((r) => {
        const hay = `${r.label} ${r.description} ${(r.keywords ?? []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, maxResults);
  }, [source, searchValue, maxResults]);

  // Escape cierra y el scroll del body queda bloqueado mientras el overlay
  // está montado. El cierre va por ref para no re-registrar por renders.
  const closeRef = useRef(handleClose);
  useEffect(() => {
    closeRef.current = handleClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen]);

  const activate = (result: SpotlightResult) => {
    onSelect?.(result);
    handleClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, filter: "blur(20px)", scaleX: 1.3, scaleY: 1.1, y: -10 }}
          animate={{ opacity: 1, filter: "blur(0px)", scaleX: 1, scaleY: 1, y: 0 }}
          exit={{ opacity: 0, filter: "blur(20px)", scaleX: 1.3, scaleY: 1.1, y: 10 }}
          transition={{ stiffness: 550, damping: 50, type: "spring" }}
          // Anclaje superior estilo Spotlight (a ~16vh del borde): el modal
          // queda cerca del campo que lo abre en vez de flotar en el centro,
          // igual en las 5 páginas del panel (componente compartido).
          className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto bg-black/20 px-4 pb-8 pt-[16vh] dark:bg-black/55"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <SVGFilter />
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
              setHovered(false);
              setHoveredShortcut(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full flex items-center justify-end gap-4 z-20 group",
              "[&>div]:bg-neutral-100 dark:[&>div]:bg-neutral-800 [&>div]:text-black dark:[&>div]:text-white [&>div]:rounded-full [&>div]:backdrop-blur-xl",
              "[&_svg]:size-7 [&_svg]:stroke-[1.4]",
              "max-w-3xl",
            )}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                layoutId="search-input-container"
                transition={{ layout: { duration: 0.5, type: "spring", bounce: 0.2 } }}
                style={{ borderRadius: "30px" }}
                className="h-full w-full flex flex-col items-center justify-start z-10 relative shadow-lg overflow-hidden border border-black/10 dark:border-white/10"
              >
                <SpotlightInput
                  ariaLabel={ariaLabel}
                  placeholder={
                    hoveredShortcut !== null && shortcuts[hoveredShortcut]
                      ? shortcuts[hoveredShortcut].label
                      : hoveredSearchResult !== null && visibleResults[hoveredSearchResult]
                        ? visibleResults[hoveredSearchResult].label
                        : placeholder
                  }
                  placeholderClassName={hoveredSearchResult !== null ? "text-black dark:text-white bg-white dark:bg-neutral-700" : "text-gray-500 dark:text-neutral-400"}
                  hidePlaceholder={!(hoveredSearchResult !== null || !searchValue)}
                  value={searchValue}
                  onChange={(value) => {
                    if (onQueryChange) onQueryChange(value);
                    else setInnerValue(value);
                    setHoveredSearchResult(null);
                  }}
                />
                {searchValue && (
                  <SearchResultsContainer
                    searchResults={visibleResults}
                    onHover={setHoveredSearchResult}
                    onActivate={onSelect ? activate : undefined}
                    emptyText={emptyText}
                    emptySubText={emptySubText}
                  />
                )}
              </motion.div>
              {hovered &&
                !searchValue &&
                shortcuts.map((shortcut, index) => (
                  <motion.div
                    key={`shortcut-${index}`}
                    onMouseEnter={() => setHoveredShortcut(index)}
                    layout
                    initial={{ scale: 0.7, x: -1 * (64 * (index + 1)) }}
                    animate={{ scale: 1, x: 0 }}
                    exit={{ scale: 0.7, x: 1 * (16 * (shortcuts.length - index - 1) + 64 * (shortcuts.length - index - 1)) }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.2, delay: index * 0.05 }}
                    className="rounded-full cursor-pointer"
                  >
                    <ShortcutButton
                      icon={shortcut.icon}
                      link={shortcut.link ?? "#"}
                      label={shortcut.label}
                      onClick={shortcut.onClick}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppleSpotlight;
