import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Modal, ConfirmModal, DestructiveModal, FormModal, InfoModal, SuccessModal, ErrorModal, WarningModal, LoadingModal, StatusModal, ConfirmDialog } from "../components/ui/Modal.tsx";
import { LoadingOverlay } from "../components/ui/Splash.jsx";
import { Tooltip } from "../components/ui/Tooltip.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Textarea } from "../components/ui/Input.jsx";
import { Check, AlertTriangle, Info, Sparkles } from "lucide-react";
import CrystalVision from "../components/showcase/CrystalVision.jsx";
import Nocturne from "../components/showcase/Nocturne.jsx";
import StateIconsGallery from "../components/showcase/StateIconsGallery.jsx";
import { AlertDialog } from "../components/ui/AlertDialog.tsx";
import { SuccessAlert } from "../components/ui/SuccessAlert.tsx";
import { DeleteDialog } from "../components/ui/DeleteDialog.tsx";
import { NotificationModal } from "../components/ui/NotificationModal.tsx";
import { DialogSkeleton } from "../components/ui/DialogSkeleton.tsx";
import { useConfirm } from "../components/admin/AdminKit";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";
import { useNotification } from "../hooks/useNotification";

export default function DesignShowcase() {
  const [modal, setModal] = useState(null);
  const [formVal, setFormVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [morphTone, setMorphTone] = useState("loading");
  const [successOpen, setSuccessOpen] = useState(false);
  const { confirm, busy: confirmBusy } = useConfirm();
  const { confirmDelete } = useDeleteConfirm();
  const { notify } = useNotification();
  // El morph se programa con un temporizador. Sin limpiarlo, saltar de
  // página antes de los 1,8s deja un setState sobre un componente ya
  // desmontado, que React avisa y el estado se queda a medias.
  const morphTimer = useRef(null);
  useEffect(() => () => clearTimeout(morphTimer.current), []);

  /** Patrón "un solo toast": loading → update, sin parpadeo ni duplicados. */
  const demoTracked = () => {
    const id = toast.loading({ title: "Procesando…", description: "Estamos guardando los cambios." });
    setTimeout(() => toast.update(id, { title: "Guardado correctamente", description: "Los cambios ya están en el servidor.", type: "success" }), 2000);
  };

  /**
   * El MISMO modal pasa de cargando a éxito, sin cerrarse y sin montar un
   * orbe nuevo. Es lo que hace el toast, aplicado a una decisión que
   * bloquea: el usuario ve que la operación empezó y terminó en el mismo
   * sitio. Un icono que se sustituye de golpe pierde esa continuidad.
   */
  const demoMorph = () => {
    setMorphTone("loading");
    setModal("morph");
    clearTimeout(morphTimer.current);
    morphTimer.current = setTimeout(() => setMorphTone("success"), 1800);
  };

  /** uso REAL de useConfirm(): `await` sobre el diálogo estilable. */
  const demoConfirm = async () => {
    const ok = await confirm({
      title: "¿Archivar el formulario?",
      description: "Quedará oculto para quien conozca el enlace.",
      danger: true,
      confirmText: "Archivar",
    });
    if (ok) toast.success("Formulario archivado");
    else toast.info("Nada cambiado");
  };

  /** uso REAL de useDeleteConfirm(): wrapper destructivo de useConfirm. */
  const demoDeleteConfirm = async () => {
    const ok = await confirmDelete({
      title: "Eliminar registro de auditoría",
      description: "El registro seleccionado se borrará y no podrás recuperarlo.",
      confirmText: "Eliminar registro",
    });
    if (ok) toast.error("Registro eliminado");
  };

  const demoSuccessAlert = () => setSuccessOpen(true);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Estudio · Identidad propia</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>
          Sistema Premium — Toasts · Modales · Tooltips
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Aurora Glass — vidrio esmerilado con aura de color: toasts de tintado semántico,
          orbes con halo, modales con luz de acento superior y drawers de cristal.
          Tokens en <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">src/index.css @theme</code> — paleta teal/ámbar/rojo/sky sin morado genérico, radios jerárquicos y sombras por componente.
        </p>
      </div>

      <Nocturne />

      {/* Toasts */}
      <section className="rounded-[var(--radius-modal)] border border-slate-200/70 bg-white p-6 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>
          <Sparkles className="h-4 w-4 text-brand-600" /> Notificaciones / Toasts
        </h2>
        <p className="mt-1 text-xs text-slate-500">Jerarquía por tipo: color + icono + forma. Barra de progreso, acciones inline, stacking.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => toast.success("Formulario publicado", { description: "Tu formulario ya está recibiendo respuestas.", action: { label: "Ver más", onClick: () => toast.info("Abriendo analytics…") } })}>Success · Ver más</Button>
          <Button variant="secondary" onClick={() => toast.error("No se pudo guardar", { description: "Revisa tu conexión y vuelve a intentar.", action: { label: "Deshacer", onClick: () => toast.success("Cambios revertidos") } })}>Error · Deshacer</Button>
          <Button variant="secondary" onClick={() => toast.warning("Límite casi alcanzado", { description: "Has usado el 92% de respuestas del plan." })}>Warning</Button>
          <Button variant="secondary" onClick={() => toast.info("Enlace copiado", { description: "El enlace público está en tu portapapeles." })}>Info</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => { toast.success("Guardado"); toast.info("Sincronizando…"); toast.warning("Revisión pendiente"); toast.error("Error menor"); }}>Probar stacking (4)</Button>
          <Button size="sm" variant="ghost" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1800)), { loading: "Guardando…", success: "Guardado con éxito", error: "Falló" })}>Promise</Button>
          <Button size="sm" variant="ghost" onClick={demoTracked}>Loading → Success (mismo toast)</Button>
          <Button size="sm" variant="ghost" onClick={() => toast.success({ title: "Guardado correctamente", description: "Los cambios fueron guardados." })}>API por objeto</Button>
          <Button size="sm" variant="ghost" onClick={() => { const id = toast.loading("Publicando…"); setTimeout(() => toast.update(id, { title: "No se pudo publicar", description: "El slug ya está en uso.", type: "error" }), 1800); }}>Loading → Error</Button>
        </div>
      </section>

      {/* Modales de estado + splash */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-modal)] border border-slate-200/70 bg-white p-6 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>
            <Check className="h-4 w-4 text-brand-600" /> Modales de estado
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Para decisiones que bloquean. El feedback rutinario debe ser un toast, no un modal.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button size="sm" variant="secondary" onClick={() => setModal("info")}>Información</Button>
            <Button size="sm" variant="secondary" onClick={() => setModal("success")}>Éxito</Button>
            <Button size="sm" variant="secondary" onClick={() => setModal("error")}>Error</Button>
            <Button size="sm" variant="secondary" onClick={() => setModal("warning")}>Advertencia</Button>
            <Button size="sm" variant="ghost" onClick={() => setModal("loading")}>Cargando (bloqueante)</Button>
            <Button size="sm" variant="ghost" onClick={demoMorph}>Cargando → éxito (morph)</Button>
            <Button size="sm" variant="ghost" onClick={() => setBusy(true)}>Splash / Loading overlay</Button>
          </div>
        </div>

        <div className="rounded-[var(--radius-modal)] border border-slate-200/70 bg-white p-6 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>Capas (z-index)</h2>
          <p className="mt-1 text-xs text-slate-500">Un solo origen: <code className="font-mono">--z-*</code>. Nada de números sueltos.</p>
          <div className="mt-4 space-y-1.5 font-mono text-[11px] text-slate-500">
            {[
              ["--z-sticky", 20, "header, sidebar"],
              ["--z-dropdown", 40, "menús, popovers, calendarios"],
              ["--z-tooltip", 80, "tooltips portaled"],
              ["--z-modal", 60, "diálogo + drawer"],
              ["--z-toast", 100, "notificaciones"],
              ["--z-splash", 200, "arranque y traspaso SSO"],
            ].map(([k, v, d]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-[120px] font-semibold text-slate-700 dark:text-slate-200">{k}</span>
                <span className="w-8 text-right">{v}</span>
                <span className="text-slate-400">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modals */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-modal)] border border-slate-200/70 bg-white p-6 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>Modales</h2>
          <p className="mt-1 text-xs text-slate-500">Overlay blur sutil, escala + fade, focus trap, variantes con jerarquía.</p>
          <div className="mt-4 grid gap-3">
            <Button onClick={() => setModal("default")}>Modal default</Button>
            <Button variant="secondary" onClick={() => setModal("orbe")}>Modal con orbe</Button>
            <Button variant="secondary" onClick={() => setModal("confirm")}>Confirmación</Button>
            <Button variant="danger" onClick={() => setModal("danger")}>Alerta destructiva</Button>
            <Button variant="secondary" onClick={() => setModal("form")}>Formulario</Button>
          </div>
        </div>

        <div className="rounded-[var(--radius-modal)] border border-slate-200/70 bg-white p-6 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>Tooltips</h2>
          <p className="mt-1 text-xs text-slate-500">Mismo cristal que el modal y el toast, teñido con el color de acento que elijas en Apariencia.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Tooltip content="Arriba — el cristal se tinta con tu acento" side="top"><Button size="sm">Top</Button></Tooltip>
            <Tooltip content="Abajo con descripción más larga para probar wrap y max-width" side="bottom"><Button size="sm" variant="secondary">Bottom</Button></Tooltip>
            <Tooltip content="Izquierda" side="left"><Button size="sm" variant="ghost">Left</Button></Tooltip>
            <Tooltip content="Derecha · filete de acento y flecha del mismo tinte" side="right"><Button size="sm" variant="ghost">Right</Button></Tooltip>
            <Tooltip content="Acción rápida" side="top" align="start"><span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><Info className="h-4 w-4" /></span></Tooltip>
            <Tooltip content="Apartado de la marca con `tint`" side="top" tint="var(--color-danger)"><Button size="sm" variant="ghost">Con tint</Button></Tooltip>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
            Los tooltips usan <code className="font-mono">cr-tooltip</code> — croma real en la base, contorno del acento, filo de luz y sombra teñida. El tinte sale de <code className="font-mono">--glass-chroma</code>, que es <code className="font-mono">--color-brand-*</code>: la escala que <code className="font-mono">lib/accent.js</code> reescribe en vivo, así que el tooltip sigue al color de la cuenta sin tocar este componente.
          </div>
        </div>
      </section>

      {/* Sistema de feedback — piezas nuevas del spec */}
      <section className="mt-6 rounded-[var(--radius-modal)] border border-slate-200/70 bg-white p-6 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>
          <Sparkles className="h-4 w-4 text-brand-600" /> Sistema de feedback
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Diálogos y avisos tipados sobre el MISMO shell: ConfirmDialog (alias), AlertDialog
          (warning/error), SuccessAlert no bloqueante, DeleteDialog con confirmación escrita,
          NotificationModal con slots, avisos persistentes y el skeleton de carga.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="secondary" onClick={() => setModal("confirmDialog")}>ConfirmDialog</Button>
          <Button variant="secondary" onClick={() => setModal("alert-warning")}>AlertDialog · warning</Button>
          <Button variant="danger" onClick={() => setModal("alert-error")}>AlertDialog · error</Button>
          <Button variant="secondary" onClick={demoSuccessAlert}>SuccessAlert</Button>
          <Button variant="danger" onClick={() => setModal("deleteDialog")}>DeleteDialog (escribe ELIMINAR)</Button>
          <Button variant="secondary" onClick={() => setModal("notificationModal")}>NotificationModal</Button>
          <Button variant="ghost" onClick={() => setModal("skeleton")}>DialogSkeleton (loading)</Button>
          <Button variant="ghost" onClick={() => notify({ title: "Aviso persistente", description: "No se cierra solo: descártalo con la X o márcalo leído desde la pila.", tone: "info" })}>Aviso persistente</Button>
          <Button variant="ghost" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1200)), { loading: "Validando…", success: "Todo correcto", error: "Falló la validación" })}>toast.promise (1,2s)</Button>
          <Button variant="ghost" onClick={demoConfirm} disabled={confirmBusy}>useConfirm (await)</Button>
          <Button variant="ghost" onClick={demoDeleteConfirm}>useDeleteConfirm</Button>
        </div>
      </section>

      {/* Modals instances */}
      <Modal open={modal === "default"} onClose={() => setModal(null)} title="Modal por defecto" description="Overlay con blur sutil y transición escala+fade. Foco atrapado, Esc y click fuera cierran." footer={<><button type="button" onClick={() => setModal(null)} className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2">Cerrar</button><button type="button" onClick={() => { toast.success("Acción confirmada"); setModal(null); }} className="cr-btn cr-btn-green min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2">Confirmar</button></>}>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Este es el shell base. Radios <code className="font-mono text-xs">var(--radius-modal)</code> y sombra <code className="font-mono text-xs">var(--shadow-modal)</code> — consistentes en todo el sistema.</p>
      </Modal>

      {/* El caso que dejó congelados los modales de Compartir y del generador de
          IA: un orbe con `--cr-orb` fijo tomaba el control de `--modal-aura` y
          pintaba el diálogo entero de ese color. Aquí el orbe NO lleva tinte, así
          que tanto él como el shell salen de `--glass-chroma` → acento de la
          cuenta. `qa/accent-probe.js` mide esta escena (y no solo la de arriba,
          que va sin orbe) para que el fallo no vuelva sin que se note. */}
      <Modal open={modal === "orbe"} onClose={() => setModal(null)} title="Modal con orbe" description="Cabecera centrada con orbe elevado. El aura la decide el Modal, no el icono." orb={
        <span className="cr-orb cr-orb-lg text-white" aria-hidden="true">
          <Sparkles className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
        </span>
      }>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Ni el orbe ni el shell llevan un hex: los dos caen en <code className="font-mono text-xs">--glass-chroma</code>. Un diálogo con otro tono (peligro, éxito, aviso) lo pide con <code className="font-mono text-xs">aura</code>, no colando el color en el icono.
        </p>
      </Modal>

      <ConfirmModal open={modal === "confirm"} onClose={() => setModal(null)} onConfirm={() => { toast.success("Confirmado"); setModal(null); }} title="¿Publicar formulario?" description="Se notificará a los colaboradores y el enlace público será accesible." confirmText="Publicar" />

      <DestructiveModal open={modal === "danger"} onClose={() => setModal(null)} onConfirm={() => { toast.success("Eliminado", { description: "Puedes deshacer en 5s", action: { label: "Deshacer", onClick: () => toast.info("Restaurado") } }); setModal(null); }} title="¿Eliminar formulario?" description="Esta acción no se puede deshacer. Se borrarán todas las respuestas asociadas." confirmText="Eliminar" />

      <FormModal open={modal === "form"} onClose={() => setModal(null)} title="Editar formulario" description="Variante de formulario — footer neutro y cuerpo scrolleable." footer={<><button type="button" onClick={() => setModal(null)} className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2">Cancelar</button><button type="button" onClick={() => { toast.success("Guardado"); setModal(null); }} disabled={!formVal.trim()} className="cr-btn cr-btn-blue min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2">Guardar</button></>} size="lg">
        <div className="space-y-4 py-1">
          <Input label="Título" placeholder="Encuesta de satisfacción" value={formVal} onChange={(e) => setFormVal(e.target.value)} />
          <Textarea label="Descripción" placeholder="Describe el propósito…" rows={3} />
          <p className="text-xs text-slate-500">El foco queda atrapado dentro del modal. Prueba <kbd className="rounded border bg-slate-50 px-1 font-mono text-xs">Tab</kbd> y <kbd className="rounded border bg-slate-50 px-1 font-mono text-xs">Esc</kbd>.</p>
        </div>
      </FormModal>

      {/* Modales de estado — un mismo lenguaje para el resultado de una operación */}
      <InfoModal
        open={modal === "info"}
        onClose={() => setModal(null)}
        title="Tu plan se renueva en 3 días"
        description="La renovación conserva tus formularios, respuestas y analíticas tal cual."
        actionText="Ver plan"
        onAction={() => { toast.info("Abriendo facturación…"); setModal(null); }}
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Nada que hacer: si la tarjeta tiene saldo, se renueva sola.</p>
      </InfoModal>

      <SuccessModal
        open={modal === "success"}
        onClose={() => setModal(null)}
        title="Formulario publicado"
        description="El enlace público ya está activo y recibiendo respuestas."
        actionText="Copiar enlace"
        onAction={() => { toast.success("Enlace copiado"); setModal(null); }}
      />

      <ErrorModal
        open={modal === "error"}
        onClose={() => setModal(null)}
        title="No se pudo guardar el formulario"
        description="El servidor rechazó la operación. Tus cambios siguen en el borrador local: reintenta en unos segundos."
        actionText="Reintentar"
        onAction={() => { toast.loading("Reintentando…"); setModal(null); }}
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Si persiste, revisa tu conexión o contacta con soporte indicando el código <code className="font-mono text-xs">E-5021</code>.
        </p>
      </ErrorModal>

      <WarningModal
        open={modal === "warning"}
        onClose={() => setModal(null)}
        title="Vas a quedarte sin respuestas"
        description="has usado el 92% de las respuestas incluidas en tu plan."
        actionText="Ampliar plan"
        onAction={() => { toast.info("Abriendo facturación…"); setModal(null); }}
      />

      <LoadingModal
        open={modal === "loading"}
        title="Sincronizando con el servidor"
        description="No cierres esta ventana: estamos aplicando los cambios."
      />

      <StatusModal
        open={modal === "morph"}
        tone={morphTone}
        onClose={() => setModal(null)}
        title={morphTone === "loading" ? "Publicando cambios" : "Cambios publicados"}
        description={
          morphTone === "loading"
            ? "Estamos aplicando los cambios en todos los formularios."
            : "Ya están visibles para quien tenga el enlace."
        }
        actionText="Cerrar"
        onAction={() => setModal(null)}
      />

      <LoadingOverlay
        open={busy}
        title="Cargando analítica"
        description="Reuniendo respuestas de los últimos 30 días."
        label="Cargando"
      />

      {/* Sistema de feedback — instancias */}
      <ConfirmDialog
        open={modal === "confirmDialog"}
        onClose={() => setModal(null)}
        onConfirm={() => { toast.success("Acción confirmada"); setModal(null); }}
        title="¿Confirmar la acción?"
        description="Demo del alias ConfirmDialog = ConfirmModal: la misma API, un nombre por cada intención."
        confirmText="Aceptar"
      />

      <AlertDialog
        open={modal === "alert-warning"}
        tone="warning"
        onCancel={() => setModal(null)}
        onConfirm={() => { toast.success("Entendido"); setModal(null); }}
        title="Límite de respuestas"
        description="Estás en el 92% de tu plan. Al llegar al tope, los envíos nuevos no se guardarán."
        confirmText="Ver plan"
      />

      <AlertDialog
        open={modal === "alert-error"}
        tone="error"
        onCancel={() => setModal(null)}
        title="No se pudo conectar con la pasarela"
        description="Revisa la configuración del proveedor e inténtalo de nuevo."
      />

      <SuccessAlert
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Cambios publicados"
        description="El portal ya muestra la nueva identidad de marca."
        action={<button type="button" onClick={() => setSuccessOpen(false)} className="cr-btn cr-btn-green min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2">Ver portal</button>}
      />

      <DeleteDialog
        open={modal === "deleteDialog"}
        requireWord
        onCancel={() => setModal(null)}
        onConfirm={() => { toast.error("Formulario eliminado"); setModal(null); }}
        title="¿Eliminar este formulario?"
        description="Esta acción no tiene vuelta atrás: se borrarán también sus respuestas."
      />

      <NotificationModal
        open={modal === "notificationModal"}
        tone="info"
        onClose={() => setModal(null)}
        header="Avisos de la cuenta"
        body="No tienes avisos pendientes. Los avisos persistentes de la pila del Toaster se gestionan aquí y desde el panel."
      />

      <Modal open={modal === "skeleton"} onClose={() => setModal(null)} title="Cargando datos" size="md">
        <DialogSkeleton rows={4} />
      </Modal>

      {/* Visión Neo-Cristal */}
      <StateIconsGallery />
      <CrystalVision />
    </div>
  );
}
