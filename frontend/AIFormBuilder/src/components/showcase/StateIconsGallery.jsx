import { STATE_ICONS } from "../ui/state-icon-catalog";
import "./state-icons.css";

/**
 * Catálogo de los iconos de estado animado.
 *
 * En el catálogo cada uno alterna solo (`loop`) para enseñar la
 * transformación entera. En la app no: ahí el estado llega por prop
 * (`active` / `copied` / `done`…), que es lo único que evita que un
 * icono de "copiado" vuelva solo a "no copiado".
 *
 * Cada celda enseña tres cosas, no una: el nombre, qué significa cada
 * extremo, y la prop que manda en la app. La segunda fila es el mismo
 * icono a 20px con el trazo subido, que es donde se ve para qué existe
 * `strokeWidth`: el viewBox es de 40, así que a media escala el trazo se
 * quedaría en un pelo.
 *
 * Los 24 iconos son decorativos: el texto del figcaption ya dice qué es
 * cada uno, y un `aria-label` en el SVG lo repetiría. Donde el icono
 * necesita nombre propio se pasa `label` y el componente lo da.
 */
export default function StateIconsGallery() {
  return (
    <section className="si mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
            ui/animated-state-icons
          </p>
          <h2
            className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Iconos de estado animado
          </h2>
        </div>
        <p className="max-w-lg text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Doce iconos que se transforman entre dos estados con significado. Cada uno cuenta una
          microhistoria: cargando→éxito, play→pausa, bloqueado→abierto. Aquí alternan solos para
          enseñar el ciclo entero; en la app el estado llega por prop.
        </p>
      </div>

      <div className="si-grid">
        {STATE_ICONS.map(({ name, Component, states, tint, alias }) => (
          <figure key={name} className="si-cell" style={{ "--si-tint": tint }}>
            <div className="si-frame">
              <Component loop size={36} strokeWidth={2.4} />
            </div>
            <figcaption>
              <span className="si-name">{name}</span>
              <span className="si-states">{states}</span>
              <code className="si-alias">{alias}</code>
            </figcaption>
            <div className="si-frame si-frame-sm">
              <Component loop size={20} strokeWidth={3.4} />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
