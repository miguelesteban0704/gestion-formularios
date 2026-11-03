import { motion } from "framer-motion";
import { Check, X, Info, AlertTriangle, Trash2, Sparkles } from "lucide-react";
import "../ui/crystal.css";
import "./crystal.css";

// ─── Datos de las notificaciones (columna izquierda) ─────────────────────
const NOTIFICATIONS = [
  {
    id: "success",
    tone: "emerald",
    orb: "#10b981",
    Icon: Check,
    title: "¡Perfil guardado con éxito!",
    subtitle: "Tu información quedó actualizada en la aplicación.",
  },
  {
    id: "error",
    tone: "ruby",
    orb: "#e11d48",
    Icon: X,
    title: "Error en la red",
    subtitle: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.",
  },
  {
    id: "info",
    tone: "sapphire",
    orb: "#3b82f6",
    Icon: Info,
    title: "Nueva información",
    subtitle: "Hay una actualización disponible con más detalles.",
  },
  {
    id: "warning",
    tone: "amber",
    orb: "#e8a317",
    Icon: AlertTriangle,
    title: "Atención en tu cuenta",
    subtitle: "Revisa tu cuenta: tienes acciones pendientes por confirmar.",
  },
];

// ─── Datos de los modales de confirmación (columna derecha) ──────────────
const MODALS = [
  {
    id: "account",
    type: "avatar",
    initials: "ME",
    title: "Confirmar eliminación de cuenta",
    subtitle:
      "Esta acción es permanente: se eliminará tu cuenta y todos tus datos asociados.",
    buttons: [
      { label: "Cancelar", variant: "cr-btn-red" },
      { label: "Confirmar", variant: "cr-btn-green" },
    ],
  },
  {
    id: "trash",
    type: "trash",
    icon: Trash2,
    title: "Confirmar eliminación de cuenta",
    subtitle: "Se borrarán definitivamente tus formularios y sus respuestas.",
    buttons: [
      { label: "Eliminar", variant: "cr-btn-red" },
      { label: "Cancelar", variant: "cr-btn-blue" },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function CrystalVision() {
  return (
    <section className="mt-12">
      {/* Cabecera de la sección */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
          Visión · Aurora Glass
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Vidrio esmerilado · aura de color
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Cristal esmerilado sobre metal cepillado oscuro: notificaciones de
          vidrio tintado con orbe de color a la izquierda y modales de
          confirmación con luz de acento superior y botones de cristal.
        </p>
      </div>

      {/* Escenario */}
      <div className="cr-stage">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* Columna izquierda: pila de notificaciones */}
          <div className="flex flex-col gap-4">
            {NOTIFICATIONS.map((n, i) => (
              <motion.div
                key={n.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className={`cr-card cr-tone-${n.tone} flex items-center gap-4 p-4 pr-6`}
              >
                <span
                  className="cr-orb h-14 w-14 shrink-0 text-white"
                  style={{ "--cr-orb": n.orb }}
                  aria-hidden="true"
                >
                  <n.Icon className="h-6 w-6 drop-shadow-sm" strokeWidth={2.4} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-snug text-fg">
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                    {n.subtitle}
                  </span>
                </span>
              </motion.div>
            ))}
          </div>

          {/* Columna derecha: modales de confirmación */}
          <div className="flex flex-col gap-6">
            {MODALS.map((m, i) => (
              <motion.div
                key={m.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="cr-card cr-modal flex flex-col items-center px-6 py-7 text-center"
              >
                <span
                  className="cr-orb cr-orb-lg text-white"
                  style={{ "--cr-orb": "#3b82f6" }}
                  aria-hidden="true"
                >
                  {m.type === "avatar" ? (
                    <span className="text-sm font-extrabold tracking-[0.08em]" style={{ fontFamily: "var(--font-display)" }}>
                      {m.initials}
                    </span>
                  ) : (
                    <m.icon className="h-7 w-7" strokeWidth={2.2} />
                  )}
                </span>

                <h3 className="mt-5 text-[17px] font-bold leading-snug text-fg">
                  {m.title}
                </h3>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
                  {m.subtitle}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {m.buttons.map((b) => (
                    <button key={b.label} type="button" className={`cr-btn ${b.variant}`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sello inferior */}
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          <Sparkles className="h-3.5 w-3.5" />
          Detalles de luz · biselado · neomorfismo
        </div>
      </div>
    </section>
  );
}