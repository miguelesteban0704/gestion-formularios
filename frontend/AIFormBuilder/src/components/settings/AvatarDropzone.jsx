import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { cn } from "../../lib/utils.js";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Dropzone de avatar con drag & drop + preview.
 *
 * props:
 *  - currentUrl, color, name   → avatar actual (para preview y fallback)
 *  - uploading                 → muestra spinner mientras sube
 *  - onFile(File)              → se llama al elegir/soltar una imagen válida
 *  - onRemove                  → se llama al quitar el avatar
 *  - hints                     → { dragDrop, remove } (i18n)
 */
export function AvatarDropzone({ currentUrl, color, name, uploading, onFile, onRemove, hints }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  const acceptFile = useCallback(
    (file) => {
      setError(null);
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError("JPG, PNG, WEBP o GIF");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("max 4 MB");
        return;
      }
      setPreviewUrl(URL.createObjectURL(file));
      onFile?.(file);
    },
    [onFile],
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer?.files?.[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative">
        <Avatar name={name} color={color} avatarUrl={previewUrl || currentUrl} size="lg" className="h-20 w-20 text-xl" />
        {uploading && (
          <span className="absolute -inset-1 grid place-items-center rounded-full bg-surface/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-start gap-1.5 rounded-lg border-2 border-dashed px-4 py-3.5 text-left transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
            dragging
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
              : "border-default bg-surface-2/50 hover:border-brand-300 hover:bg-surface-2",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <ImagePlus className="h-4 w-4 text-brand-600" />
            {uploading ? "…" : (hints?.dragDrop || "Subir avatar")}
          </span>
          <span className={cn("text-xs", error ? "font-medium text-red-500" : "text-muted")}>
            {error || (hints?.formatHint || "JPG, PNG, WEBP, GIF · hasta 4 MB")}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />

        {currentUrl && !uploading && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" /> {hints?.remove || "Quitar"}
          </Button>
        )}
      </div>
    </div>
  );
}