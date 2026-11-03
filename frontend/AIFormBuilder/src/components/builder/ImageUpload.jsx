import { useRef, useState } from "react";
import { ImagePlus, Trash2, Link, Upload } from "lucide-react";
import { hexToRgba, shade } from "../../lib/utils.js";

/**
 * Premium image upload component with TWO modes:
 * 1. Upload from PC (drag & drop or click to browse)
 * 2. Enter URL from internet
 *
 * Features a modern, tactile segmented-toggle for switching modes with
 * smooth animations and a premium feel. Never throws errors, always
 * shows something.
 */

export function ImageUpload({ initialUrl, onUpload, onRemove, hints, accent = "#0c8b7c" }) {
  const [previewUrl, setPreviewUrl] = useState(initialUrl || null);
  const [mode, setMode] = useState("upload"); // "upload" or "url"
  const [error, setError] = useState(null);
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type || !file.type.startsWith("image/")) {
        setError("Solo se permiten imágenes (JPG, PNG, WEBP, GIF)");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setError("El archivo no debe superar 8 MB");
        return;
      }

      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onUpload?.({ file, previewUrl: objectUrl });
    } catch {
      setError("No se pudo leer la imagen seleccionada");
    }
  };

  const handleUrlChange = (e) => {
    const value = e.target.value.trim();
    setUrlValue(value);

    if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
      setError("La URL debe comenzar con http:// o https://");
      return;
    }
    setError(null);
  };

  const confirmUrl = () => {
    try {
      const value = urlValue.trim();
      if (!value) return;
      if (!value.startsWith("http://") && !value.startsWith("https://")) {
        setError("URL inválida");
        return;
      }
      setError(null);
      setPreviewUrl(value);
      onUpload?.({ file: null, previewUrl: value });
      setMode("upload");
    } catch {
      setError("No se pudo confirmar la URL");
    }
  };

  const removeImage = () => {
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    } catch {}
    setPreviewUrl(null);
    setUrlValue("");
    onRemove?.();
    setMode("upload");
  };

  return (
    <div className="space-y-4">
      {/* ── Premium Segmented Toggle ──────────────────────────────────
          Solo se muestra cuando NO hay imagen: una vez subida, la imagen
          reemplaza por completo esta zona (una sola imagen por bloque). */}
      {!previewUrl && (
        <div className="relative mb-4 h-11 w-full max-w-sm">
        <div
          className="absolute inset-0 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 backdrop-blur"
          style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}
        />
        <div
          className="absolute top-1 bottom-1 w-1/2 rounded-lg shadow-md transition-transform duration-300 ease-out"
          style={{
            transform: mode === "upload" ? "translateX(0)" : "translateX(100%)",
            background: `linear-gradient(145deg, ${accent}, ${shade(accent, -14)})`,
            boxShadow: `0 4px 14px -4px ${hexToRgba(accent, 0.5)}`,
          }}
        />
        <button
          type="button"
          onClick={() => {
            setMode("upload");
            setError(null);
            setUrlValue("");
          }}
          className={`
            absolute inset-0 flex items-center justify-center gap-2 rounded-xl text-sm font-medium
            transition-colors duration-300
            ${mode === "upload"
              ? "text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}
          `}
          style={{ width: "50%" }}
        >
          <Upload className={`h-4 w-4 ${mode === "upload" ? "text-white" : "text-slate-400"}`} />
          <span>Desde PC</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("url");
            setError(null);
          }}
          className={`
            absolute inset-0 flex items-center justify-center gap-2 rounded-xl text-sm font-medium
            transition-colors duration-300
            ${mode === "url"
              ? "text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}
          `}
          style={{ left: "50%", width: "50%" }}
        >
          <Link className={`h-4 w-4 ${mode === "url" ? "text-white" : "text-slate-400"}`} />
          <span>URL de internet</span>
        </button>
      </div>
      )}

      {/* ── MODE: UPLOAD FROM PC ────────────────────────────────────── */}
      {mode === "upload" && (
        <div>
          {/* Solo mostrar el dropzone si NO hay imagen subida (una sola imagen) */}
          {!previewUrl && (
            <div>
              <div
                type="button"
                onClick={() => inputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-5 py-5 text-center transition-all duration-200 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 cursor-pointer"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100/50 text-brand-500 transition-colors group-hover:bg-brand-200/60">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {hints?.dragDrop || "Arrastra y suelta una imagen"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hints?.orClick || "o haz clic para explorar"}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    JPG, PNG, WEBP, GIF · Máx. 8 MB
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-2 rounded-lg bg-red-50/80 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {previewUrl && (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="Vista previa"
                className="aspect-video w-full rounded-xl object-cover shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50"
              />
              <button
                onClick={removeImage}
                className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Quitar imagen
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODE: URL FROM INTERNET ─────────────────────────────────── */}
      {mode === "url" && (
        <div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              URL de la imagen
            </label>
            <div className="relative">
              <input
                type="text"
                value={urlValue}
                onChange={handleUrlChange}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400/60 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
                maxLength={500}
              />
              <Link className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmUrl}
              disabled={!urlValue.trim()}
              className="flex-1 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
              style={{ background: `linear-gradient(145deg, ${accent}, ${shade(accent, -16)})` }}
            >
              Confirmar
            </button>
            <button
              onClick={() => {
                setMode("upload");
                setError(null);
                setUrlValue("");
              }}
              className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>

          {previewUrl && (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="Imagen desde URL"
                className="aspect-video w-full rounded-xl object-cover shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50"
              />
              <button
                onClick={removeImage}
                className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Quitar imagen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageUpload;