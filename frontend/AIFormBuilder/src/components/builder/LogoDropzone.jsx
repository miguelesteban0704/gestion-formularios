import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { assetUrl } from "../../lib/api.js";

const MAX_BYTES = 4 * 1024 * 1024;

/* Cualquier `image/*` del navegador es válido: jpeg, png, webp, gif, svg, avif,
   heic, bmp… El `<input>` NO lleva `accept` a propósito (ver nota 1 más abajo),
   así que la única puerta es esta comprobación. El backend acepta lo mismo. */
const isImage = (type) => typeof type === "string" && type.startsWith("image/");

/**
 * Selector de logo del formulario.
 *
 * props:
 *  - logoUrl    → lo que hay guardado ahora (URL del backend o URL externa)
 *  - onUpload(file) → devuelve una promesa; el componente muestra el spinner
 *  - onRemove()     → devuelve una promesa; vacía `logo`
 *  - uploading      → fuerza el estado de subida desde fuera (opcional)
 *  - disabled       → bloquea la interacción
 *  - labels         → { title, hint, replace, remove, errorType, errorSize }
 *
 * Decisiones que no son obvias:
 *
 * 1. El `<input type="file">` NO tiene `accept`. Es deliberado: con `accept`
 *    el navegador filtra el selector y, sobre todo, no avisa de nada cuando
 *    el usuario arrastra un archivo que no es imagen. Validando en JS se puede
 *    explicar el motivo con un mensaje, que es lo que hace el `error` de abajo.
 *
 * 2. El `input` se reutiliza para volver a elegir el MISMO archivo. Si se
 *    cambiara su `value` a "" tras cada subida, elegir dos veces la misma foto
 *    no dispararía `onChange` y el usuario creería que el botón está roto.
 *
 * 3. El preview usa un `objectURL` y lo revoca al desmontar. Sin revocar, cada
 *    subida deja un blob retenido en memoria durante toda la sesión.
 *
 * 4. Se acepta CUALQUIER `image/*`: gif animado, avif, bmp, heic, svg… La
 *    validación es un prefijo, no una lista. El backend acepta lo mismo.
 *
 * 5. `broken` (la imagen guardada no carga) se reinicia en cuanto cambia lo que
 *    se muestra, y el aviso se oculta mientras hay una subida en curso o un
 *    preview local. Sin eso el mensaje se quedaba pegado aunque después se
 *    subiera un logo perfectamente válido, que es justo lo que se veía.
 */
export function LogoDropzone({
  logoUrl,
  onUpload,
  onRemove,
  uploading = false,
  disabled = false,
  labels = {},
  className,
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  /* `broken` se guarda como { failed, forUrl } en vez de como un booleano, y
     no se reinicia con un efecto. El fallo pertenece a UNA URL concreta, así
     que se guarda cuál era; si lo que se muestra ahora es otra cosa, `broken`
     se resuelve a false solo, durante el render. Con un `useEffect` había un
     render entero con el aviso viejo en pantalla. */
  const [broken, setBroken] = useState({ failed: false, forUrl: "" });

  const shown = previewUrl || logoUrl || "";
  const isBusy = busy || uploading;
  const isBroken = broken.failed && broken.forUrl === shown;

  // El objectURL se libera al cambiar o al desmontar.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptFile = useCallback(
    async (file) => {
      setError(null);
      if (!file || disabled) return;

      if (!isImage(file.type)) {
        setError(labels.errorType || "El archivo no es una imagen");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(labels.errorSize || "El archivo supera 4 MB");
        return;
      }

      const local = URL.createObjectURL(file);
      setPreviewUrl(local);
      setBusy(true);
      try {
        await onUpload?.(file);
      } catch (err) {
        // Si la subida falla, el preview local mentía: se revoca y se vuelve a
        // lo que hubiera en el servidor.
        URL.revokeObjectURL(local);
        setPreviewUrl(null);
        setError(err?.response?.data?.message || err?.message || "No se pudo subir el logo");
      } finally {
        setBusy(false);
      }
    },
    [disabled, labels.errorType, labels.errorSize, onUpload],
  );

  const handleRemove = async () => {
    setError(null);
    setBusy(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      await onRemove?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "No se pudo quitar el logo");
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => {
    if (disabled || isBusy) return;
    // Reiniciar el valor permite re-elegir el mismo archivo (ver punto 2).
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {/* ── Vista previa ────────────────────────────────────────────────
          El marco usa las mismas piezas de superficie que las tarjetas
          (`card-icon`, bisel, sombra de contacto) para que el logo se lea
          como parte del panel y no como una imagen pegada encima. */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "logo-frame grid h-[4.5rem] w-[4.5rem] place-items-center overflow-hidden rounded-2xl border border-default bg-surface-2/70 dark:border-white/10 dark:bg-white/5"
          )}
        >
          {shown && !isBroken ? (
            <img
              /* `key={shown}` obliga a React a crear un <img> NUEVO cuando
                 cambia la fuente. Sin esto, si la imagen anterior falló y la
                 nueva tiene otra URL, el navegador puede no volver a pedirla:
                 el elemento se reutiliza, no se recarga, y el `onError` se
                 queda en el pasado. Con la key cambia el nodo entero. */
              key={shown}
              src={assetUrl(shown)}
              alt=""
              /* `onLoad` también limpia el error: hay servidores y cachés que
                 devuelven un error transitorio y la imagen carga al segundo
                 intento. Sin esto habría que esperar a resubir para limpiarlo. */
              onLoad={() => setBroken({ failed: false, forUrl: shown })}
              onError={() => setBroken({ failed: true, forUrl: shown })}
              className="h-full w-full object-contain p-2.5"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted/60" aria-hidden="true" />
          )}

          {isBusy && (
            <span className="absolute inset-0 grid place-items-center rounded-2xl bg-surface/75 backdrop-blur-[2px]">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Halo del color del formulario, muy tenue: conecta el marco con el
            acento que se elige justo debajo en "Color principal". */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-70 blur-[6px]"
          style={{ background: "var(--color-brand-500)", opacity: 0.18 }}
        />
      </div>

      {/* ── Zona de carga ────────────────────────────────────────────────
          Es un <button>, no un <div>, para que se pueda abrir con Enter y
          con barra espaciadora sin necesidad de un manejador de keydown: el
          teclado entra gratis y el foco es visible. */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer?.files?.[0]);
          }}
          disabled={disabled || isBusy}
          aria-label={labels.title || "Subir logo"}
          className={cn(
            "group/drop flex w-full flex-col items-start gap-1 rounded-lg border border-dashed px-3.5 py-3 text-left",
            "transition-[border-color,background-color,box-shadow] duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-60",
            dragging
              ? "border-brand-500 bg-brand-50/70 dark:bg-brand-900/20"
              : cn(
                  "border-default bg-surface-2/40",
                  "hover:border-brand-400/70 hover:bg-surface-2",
                  "group-hover/drop:border-brand-400/70"
                )
          )}
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-fg">
            <Upload
              className="h-3.5 w-3.5 text-brand-600 transition-transform duration-200 ease-out group-hover/drop:-translate-y-0.5"
              aria-hidden="true"
            />
            {isBusy
              ? labels.uploading || "Subiendo…"
              : logoUrl
                ? labels.replace || "Cambiar logo"
                : labels.title || "Subir logo"}
          </span>
          <span className={cn("text-[11px] leading-snug", error ? "font-medium text-red-600" : "text-muted")}>
            {error || labels.hint || "Cualquier imagen · hasta 4 MB"}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />

        {/* El aviso de "no se pudo cargar" solo tiene sentido para el logo YA
            GUARDADO. Si lo que falla es el preview local justo después de
            elegir el archivo, la causa es la subida —y de eso avisa `error` con
            el mensaje del servidor—, no una imagen rota en el servidor. Y
            durante una subida tampoco: el `?v=` cambia al terminar y la
            petición en curso apunta a la versión anterior. */}
        {isBroken && !error && !isBusy && !previewUrl && (
          <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {labels.broken || "La imagen guardada no se pudo cargar"}
          </p>
        )}

        {(logoUrl || previewUrl) && !isBusy && !disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="btn-ghost btn-hi btn-press btn-focus btn-off mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-muted"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.remove || "Quitar"}
          </button>
        )}
      </div>
    </div>
  );
}
