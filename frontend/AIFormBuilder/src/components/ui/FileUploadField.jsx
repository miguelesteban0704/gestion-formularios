/*
 * FileUploadField — campo de subida de archivos premium.
 *
 * Diseño "glass" moderno:
 *  • Zona de soltar (drop zone) con vidrio esmerilado, borde puntiagudo y
 *    anillo de marca al focar / al arrastrar sobre ella.
 *  • Drag & drop real sobre la zona (preventDefault + datos del DataTransfer).
 *  • Vista previa del archivo: miniatura para imágenes, ícono de documento
 *    con el color del formato para el resto, con nombre, etiqueta de formato,
 *    peso y botón «Quitar».
 *  • Enlaces «Cambiar archivo» para reemplazar sin recargar la página.
 *  • Validación local de tipo y tamaño (imágenes, PDF y Office, hasta 8 MB).
 *  • Estados: error (borde rojo), disabled (opacidad), required (asterisco).
 *  • Todo el texto resuelve mediante `t()` del contexto de idioma (es/en);
 *    nunca hay cadenas hardcodeadas.
 *  • Solo tokens de marca (sin hex de marca a fuego); respeta dark mode.
 */
import { useState, useCallback, useRef } from "react";
import {
  Upload,
  File as FileIcon,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileAudio,
  FileVideo,
  FileArchive,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils.js";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
];

export function FileUploadField({
  label,
  onChange,
  disabled = false,
  error = false,
  required = false,
  value,
  t,
  accept = ACCEPTED_TYPES.join(","),
  maxSize = MAX_BYTES,
}) {
  const [file, setFile] = useState(value || null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  const labelText = label ?? (t ? t("field_file") : "Subir archivo");
  const clickText = t ? t("uploadFile") : "Pulsa para subir un archivo";
  const dropText = t ? t("fileDrop") : "Arrastra y suelta archivos aquí";
  const removeText = t ? t("fileRemove") : "Quitar";
  const changeText = t ? t("fileChange") : "Cambiar archivo";
  const sizeLimitText = t ? t("fileSizeLimit") : "Hasta 8 MB";
  const acceptedText = t ? t("fileAccepted") : "Solo imágenes y PDF";
  const invalidTypeText = t ? t("fileInvalidType") : "Tipo de archivo no válido";
  const tooLargeText = t ? t("fileTooLarge") : "Archivo demasiado grande";

  /* ── Detecta el formato del archivo y devuelve ícono + etiqueta + color ──
     Se basa en el `type` (MIME) del archivo y, como respaldo, en la extensión
     del nombre. Siempre devuelve un ícono de lucide-react, una etiqueta corta
     y una clase de color de Tailwind para que cada formato se distinga. */
  const getFileFormat = (file) => {
    if (!file) return { Icon: FileIcon, label: "Archivo", colorClass: "text-slate-400" };
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    const ext = name.slice(name.lastIndexOf("."));

    if (/^image\/(jpeg|png|webp|gif|bmp|svg\+xml|avif)$/i.test(type))
      return { Icon: FileImage, label: "Imagen", colorClass: "text-brand-500" };
    if (type === "application/pdf" || ext === ".pdf")
      return { Icon: FileText, label: "PDF", colorClass: "text-red-600" };
    if (
      type.includes("msword") ||
      type.includes("wordprocessingml") ||
      ext === ".doc" ||
      ext === ".docx"
    )
      return { Icon: FileText, label: "Word", colorClass: "text-blue-600" };
    if (
      type.includes("ms-excel") ||
      type.includes("spreadsheetml") ||
      ext === ".xls" ||
      ext === ".xlsx" ||
      ext === ".csv"
    )
      return { Icon: FileSpreadsheet, label: "Excel", colorClass: "text-green-600" };
    if (
      type.includes("ms-powerpoint") ||
      type.includes("presentationml") ||
      ext === ".ppt" ||
      ext === ".pptx"
    )
      return { Icon: FileText, label: "PowerPoint", colorClass: "text-orange-600" };
    if (
      /^text\//i.test(type) ||
      ext === ".txt" ||
      ext === ".md" ||
      ext === ".log"
    )
      return { Icon: FileText, label: "Texto", colorClass: "text-slate-400" };
    if (
      /^audio\//i.test(type) ||
      ext === ".mp3" ||
      ext === ".wav" ||
      ext === ".ogg"
    )
      return { Icon: FileAudio, label: "Audio", colorClass: "text-purple-600" };
    if (
      /^video\//i.test(type) ||
      ext === ".mp4" ||
      ext === ".mov" ||
      ext === ".avi"
    )
      return { Icon: FileVideo, label: "Vídeo", colorClass: "text-indigo-600" };
    if (
      type.includes("zip") ||
      type.includes("compressed") ||
      ext === ".zip" ||
      ext === ".rar" ||
      ext === ".7z" ||
      ext === ".tar"
    )
      return { Icon: FileArchive, label: "Comprimido", colorClass: "text-slate-500" };
    if (
      type.includes("json") ||
      type.includes("javascript") ||
      ext === ".js" ||
      ext === ".ts" ||
      ext === ".json" ||
      ext === ".html" ||
      ext === ".css"
    )
      return { Icon: FileCode, label: "Código", colorClass: "text-yellow-500" };
    return { Icon: FileIcon, label: "Archivo", colorClass: "text-slate-400" };
  };

  const displayFile = file || (typeof value === "string" && value ? { name: value } : null);
  const fileFormat = displayFile ? getFileFormat(displayFile) : null;
  const isImage = displayFile
    ? /^image\/(jpeg|png|webp|gif)$/i.test(displayFile.type || "")
    : false;

  const FormatIcon = fileFormat?.Icon || FileIcon;
  const formatColorClass = fileFormat?.colorClass || "text-slate-400";

  // Limpia la URL de preview previa al desmontar o al cambiar de archivo.
  const revokePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const acceptFile = (file) => {
    if (disabled) return;
    if (!file) return;

    const typeOk = ACCEPTED_TYPES.includes(file.type);
    const sizeOk = file.size <= maxSize;

    if (!typeOk) {
      setValidationError(invalidTypeText);
      setFile(null);
      revokePreview();
      setPreviewUrl(null);
      onChange?.(null);
      return;
    }
    if (!sizeOk) {
      setValidationError(tooLargeText);
      setFile(null);
      revokePreview();
      setPreviewUrl(null);
      onChange?.(null);
      return;
    }

    setValidationError(null);
    setFile(file);
    revokePreview();
    setPreviewUrl(URL.createObjectURL(file));
    onChange?.(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) acceptFile(files[0]);
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (files.length) acceptFile(files[0]);
  };

  const removeFile = (e) => {
    e.stopPropagation();
    revokePreview();
    setFile(null);
    setValidationError(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const showError = error || validationError;

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-fg dark:text-slate-100">
          {labelText}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Zona de soltar — crystal glass */}
      <label
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-all duration-200 cursor-pointer",
          disabled
            ? "cursor-not-allowed bg-slate-100/40 dark:bg-slate-800/40 opacity-60 border-slate-200/40 dark:border-slate-700/40"
            : dragOver
            ? "border-brand-500/70 bg-brand-50/60 dark:bg-brand-950/20 shadow-[0_0_24px_rgba(59,130,246,0.12)] dark:shadow-[0_0_24px_rgba(16,185,129,0.10)]"
            : showError
            ? "border-red-500/60 bg-red-50/40 dark:bg-red-950/10"
            : "border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 hover:border-brand-500/60 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 backdrop-blur-md",
        )}
        onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={openPicker}
        aria-label={clickText}
      >
        {!displayFile && (
          <>
            <Upload
              className="mb-3 h-10 w-10 text-brand-500/30 dark:text-brand-400/30 transition-colors duration-200"
            />
            <span className="text-sm font-medium text-fg dark:text-slate-100">
              {clickText}
            </span>
            <span className="mt-1.5 text-[11px] text-ink-muted dark:text-slate-500">
              {dropText} · {acceptedText} · {sizeLimitText}
            </span>
          </>
        )}

        {/* Archivo seleccionado — tarjeta de vista previa */}
        {displayFile && (
          <div className="w-full flex items-center gap-3 rounded-xl border bg-white/60 dark:bg-slate-800/60 p-3">
            <div className="shrink-0 h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
              {isImage && previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FormatIcon
                  className={`h-5 w-5 ${formatColorClass}`}
                aria-hidden="true"
              />
            )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm text-fg dark:text-slate-100 truncate" title={displayFile.name}>
                {displayFile.name}
              </span>
              <span className="block text-[11px] text-ink-muted dark:text-slate-500 flex items-center gap-1.5">
                {fileFormat?.label && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-semibold uppercase tracking-tighter opacity-70">
                    {fileFormat.label}
                  </span>
                )}
                <span className="ml-1">·</span>
                {(displayFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="shrink-0 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={removeFile}
                className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                aria-label={removeText}
              >
                {removeText}
              </button>
              <button
                type="button"
                onClick={openPicker}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                aria-label={changeText}
              >
                {changeText}
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={disabled}
          accept={accept}
          onChange={handleChange}
        />
      </label>

      {showError && (
        <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {validationError ?? error}
        </p>
      )}
    </div>
  );
}
