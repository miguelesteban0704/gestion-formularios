import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { Dropdown, MenuItem } from "../ui/Dropdown.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "../../hooks/useTheme.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { exportStats } from "../../services/exportService.js";

/* Un icono por formato y un tinte propio para cada uno. El color es lo que
 * separa de un vistazo las tres opciones, mucho antes de leer la etiqueta. */
const FORMAT_UI = {
  xlsx: { Icon: FileSpreadsheet, tint: "[&>svg]:text-brand-600 dark:[&>svg]:text-brand-400" },
  docx: { Icon: FileText, tint: "[&>svg]:text-sky-600 dark:[&>svg]:text-sky-400" },
  pdf: { Icon: FileType2, tint: "[&>svg]:text-rose-600 dark:[&>svg]:text-rose-400" },
};

const ORDER = ["xlsx", "docx", "pdf"];

/**
 * Menu de exportacion de estadisticas.
 *
 * Vive como `right` de las cabeceras que ya existen (`PageHeader` en Insights y
 * `FormPageHeader` en la vista de un formulario), de modo que no hay que tocar
 * ninguno de los dos componentes ni duplicar su maquetacion.
 *
 * No recibe los datos ya aplanados: recibe el scope y las fuentes tal cual
 * llegan de cada pagina y el servicio las convierte en el modelo de documento.
 * Asi las dos vistas comparten este componente entero.
 *
 * @param {"overview"|"form"} scope  De donde se exporta: decide el titulo del
 *   documento y si el logo es el de CubaGob o el del propio formulario.
 * @param {object} [form]     Formulario, en `scope="form"`.
 * @param {object} [analytics] Payload de las estadisticas del formulario.
 * @param {object} [insights]  Payload de las estadisticas agregadas.
 */
export function ExportMenu({ scope = "overview", form, analytics, insights }) {
  const { t, language } = useLanguage();
  const { accent } = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* El modelo se arma una vez y se reutiliza en los tres formatos: el nombre
     de los tipos de campo se resuelve aqui, ya traducido, porque el servicio
     no sabe de idiomas. */
  const inputs = useMemo(
    () => ({
      scope,
      form,
      analytics,
      insights,
      user,
      accent,
      language,
      t,
      /* `t` devuelve la propia clave cuando no existe. Un tipo de campo nuevo
         anadido a `FIELD_DEFS` sin su `field_*` se imprimiria en el documento
         como `field_nuevo`, y eso no lo pilla ni el build ni los tipos: sale
         solo, en una tabla, en un fichero que ya esta descargado. Caer al
         identificador crudo es feo pero al menos dice la verdad. */
      typeLabel: (type) => {
        const key = `field_${type}`;
        const label = t(key);
        return label === key ? type : label;
      },
    }),
    [scope, form, analytics, insights, user, accent, language, t]
  );

  const run = useCallback(
    async (format) => {
      /* `MenuItem` no acepta `disabled`, asi que la guarda va aqui: mientras se
         genera un documento, un segundo clic no debe lanzar otra vez la
         libreria ni descargar dos archivos. */
      if (busy) return;
      setBusy(true);
      try {
        const filename = await exportStats({ ...inputs, format });
        toast.success(t("exportDone"), { description: filename });
      } catch (error) {
        toast.error(t("exportFailed"), {
          description: error?.message || t("exportTryAgain"),
        });
      } finally {
        setBusy(false);
      }
    },
    [inputs, t, busy]
  );

  return (
    /* `open` controlado para poder elevar el contenedor mientras el menu esta
       abierto: el boton va pegado al borde derecho de la pagina y sin esto la
       sombra del panel se la comeria el contenedor de la cabecera. */
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="right"
      ariaLabel={t("exportMenuTitle")}
      className="min-w-[14.5rem] rounded-2xl p-1 shadow-[0_28px_70px_-22px_rgba(15,23,42,0.45),0_10px_24px_-14px_rgba(15,23,42,0.3)] ring-1 ring-white/70 dark:ring-white/10"
      trigger={
        /* Sin `aria-label` aqui a proposito: el texto visible es el nombre
           accesible del boton, y `Button` deja a los hijos como estan mientras
           carga. Poner un `aria-label` lo pisaria y el nombre dejaria de
           contener la etiqueta visible. El nombre del menu va en `ariaLabel`. */
        <Button
          variant="primary"
          size="sm"
          loading={busy}
          /* Mismo remate que el CTA "Nuevo formulario": el halo `shadow-glow`
             sobre el gradiente de marca y el ligero acercamiento al pasar. */
          className="transform-gpu justify-center shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{busy ? t("exporting") : t("export")}</span>
          <ChevronDown className="hidden h-4 w-4 shrink-0 opacity-60 sm:block" aria-hidden="true" />
        </Button>
      }
    >
      <div className="px-2.5 pb-1 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {t("exportMenuTitle")}
        </p>
      </div>
      {ORDER.map((id) => {
        const { Icon, tint } = FORMAT_UI[id];
        return (
          <MenuItem
            key={id}
            icon={Icon}
            onClick={() => run(id)}
            /* El hover no puede ser un `translate`: el panel tiene
               `overflow-hidden`, asi que una sombra o un desplazamiento se
               recortarian justo en el borde. La elevacion se cuenta con el aro
               interior y con mas cuerpo en el fondo, que si se ven. */
            className={`${tint} hover:bg-slate-900/[0.07] hover:ring-1 hover:ring-inset hover:ring-slate-900/10 dark:hover:bg-white/[0.09] dark:hover:ring-white/15`}
          >
            <span className="flex-1">{t(`export_${id}`)}</span>
            <span className="text-xs font-medium uppercase text-ink-muted">
              {t(`exportExt_${id}`)}
            </span>
          </MenuItem>
        );
      })}
    </Dropdown>
  );
}