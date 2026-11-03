/**
 * La dirección elegida: NOCTURNE.
 *
 * Sustituye al catálogo de tres candidatas que se mostró antes en /design.
 * Este bloque ya no ofrece opciones: documenta la receta que aplica TODO el
 * sistema de interacción, para que no se erosione al añadir componentes.
 *
 * Las tres recetas alternativas (Editorial · Señal) están en el historial
 * (`git show e3c575c`) por si hay que volver atrás.
 */
import "./nocturne.css";

const RULES = [
  {
    n: "Croma en la base",
    d: "La superficie se mezcla con el color de acento, no con un blanco roto. Sin esto, un cristal claro sobre un fondo claro solo se apoya en la sombra y no se distingue de una tarjeta.",
    css: "color-mix(in srgb, var(--modal-aura) 9%, #ffffff)",
  },
  {
    n: "Contorno de color",
    d: "El borde es el propio acento. Es lo que separa la pieza de la superficie sin necesidad de una sombra fuerte.",
    css: "border: 1px solid color-mix(in srgb, var(--modal-aura) 34%, #ffffff)",
  },
  {
    n: "Filo de luz de 2px",
    d: "La firma visual. Un hilo de acento de 2px que se apaga hacia los extremos, sobre el canto superior de todo cristal con volumen.",
    css: '<div className="cr-hairline" style={{ "--cr-accent": "var(--modal-aura)" }} />',
  },
  {
    n: "Sombra teñida",
    d: "La sombra lleva el color del acento en lugar de gris neutro: hace que la pieza 'proyecte' su propio color sobre el fondo.",
    css: "0 30px 60px -22px color-mix(in srgb, var(--modal-aura) 34%, rgba(8,14,26,.55))",
  },
];

const TINTS = [
  ["--modal-aura", "diálogo · splash · drawer", "#f43f5e en la variante destructiva"],
  ["--toast-tint", "notificaciones, por tipo", "éxito · error · aviso · info"],
  ["--chip-tint", "píldoras de dato", "hereda del aura o del tipo"],
  ["--card-tint", "tarjetas de cristal", "caen en --glass-chroma si no hay"],
  ["--cr-orb", "orbes con icono", "el color vive en el orbe"],
];

export default function Nocturne() {
  return (
    <section className="noc mb-10">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
          Dirección elegida · aplicada a todo el sistema
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Nocturne
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          La diferencia con la iteración anterior no está en la forma — los componentes ya estaban
          unificados — sino en que el cristal{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">deja de ser blanco</strong>.
          Antes un modal, un toast y un splash se apoyaban en la sombra y el desenfoque; ahora llevan
          color de acento en la base, en el contorno y en la sombra, y llevan un filo de luz de 2px
          arriba. De lejos, un componente flotante se distingue de una tarjeta normal.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {RULES.map((r) => (
          <div key={r.n} className="noc-card">
            <p className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              <span className="noc-dot" aria-hidden="true" />
              {r.n}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{r.d}</p>
            <code className="noc-code">{r.css}</code>
          </div>
        ))}
      </div>

      <div className="noc-card mt-3">
        <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
          Dónde vive el acento
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          El color se inyecta por variable CSS desde cada componente, no por clases duplicadas. Si una
          superficie no recibe tinte, el cristal cae en{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800">
            --glass-chroma
          </code>{" "}
          (teal de marca).
        </p>
        <ul className="mt-3 grid gap-1.5">
          {TINTS.map(([v, where, note]) => (
            <li key={v} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <code className="font-mono font-semibold text-slate-700 dark:text-slate-200">{v}</code>
              <span className="text-slate-500 dark:text-slate-400">{where}</span>
              <span className="text-slate-400 dark:text-slate-500">— {note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
