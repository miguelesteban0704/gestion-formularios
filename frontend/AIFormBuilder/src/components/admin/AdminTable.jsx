import { cn } from "@/shared/skills";
import { EmptyState } from "./AdminKit.jsx";
import { CardSurface } from "../ui/CardSurface.jsx";
import { accents } from "@/shared/styles/tokens";
import "./admin.css";

/**
 * Tabla del panel de gestión.
 *
 * Misma API que antes (`columns`/`rows`/`empty`/`rowKey`), otra forma. La
 * superficie es la misma `card-surface` + `CardSurface` que las tarjetas
 * del sitio, y las filas usan los tokens `--border` / `--surface-2` /
 * `--fg-muted` del tema.
 *
 * Tres cambios que no son de gusto sino de uso:
 *
 *  - La cabecera va `sticky`. Las tablas del panel llegan a 81 entidades y a
 *    cientos de accesos de auditoría; sin cabecera fija no se sabe qué
 *    columna se está leyendo a mitad de la lista.
 *  - `cell` puede devolver un nodo además de texto, y el `title` (que antes
 *    ponía para el tooltip) sólo se escribe cuando el valor es texto.
 *  - `actions` es una columna con `align: "right"` y sin `truncate`: los
 *    botones de la fila no deben heredar el recorte de las de contenido.
 */
export function AdminTable({
  columns = [],
  rows = [],
  empty,
  rowKey = (r, i) => r._id || i,
  className,
  label,
}) {
  if (!rows.length) {
    return (
      <div className={cn("card-surface overflow-hidden", className)} style={{ "--card-backdrop": "none" }}>
        <CardSurface />
        <div className="relative z-10">
          <EmptyState title={empty || "Sin resultados"} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card-surface overflow-hidden", className)} style={{ "--card-backdrop": "none" }}>
      <CardSurface />
      <div className="relative z-10 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[680px] text-left text-sm" aria-label={label}>
          <thead className="adm-table-head">
            <tr className="border-b border-[var(--border)]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn("adm-th", c.align === "right" && "text-right")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="adm-tr adm-tr-hover adm-tr-last">
                {columns.map((c) => {
                  const value = c.cell(row);
                  const isText = typeof value === "string" || typeof value === "number";
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "adm-td",
                        c.truncate !== false && "max-w-[320px] truncate",
                        c.align === "right" && "text-right"
                      )}
                      {...(c.truncate !== false && isText ? { title: String(value) } : {})}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* La pastilla se queda aquí porque todas las tablas del panel la usan.
   Ahora se tiñe con el color que le pide quien la llama, con el mismo
   patrón que `Badge` de Feedback.jsx: rounded-full, tinte suave, texto
   compuesto con el color sobre `--fg`.

   `tone` acepta los nombres antiguos (muted/green/amber/brand/rose) más el
   `gold` del panel, para no romper los llamantes que ya están escritos. */
const TONES = {
  muted: "var(--fg-muted)",
  green: "var(--color-success)",
  amber: "var(--color-warning)",
  brand: "var(--color-brand-600)",
  rose: "var(--color-danger)",
  gold: accents.gold,
};

export function Pill({ tone = "muted", dot = false, children, className }) {
  const tint = TONES[tone] || TONES.muted;
  return (
    <span
      className={cn("adm-pill", className)}
      style={{
        "--card-accent": tint,
        borderColor: `color-mix(in srgb, ${tint} 26%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${tint} 11%, transparent)`,
        color: `color-mix(in srgb, ${tint} 76%, var(--fg))`,
      }}
    >
      {dot && <span className="adm-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
