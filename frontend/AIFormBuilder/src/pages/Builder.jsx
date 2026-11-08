import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Eye,
  Share2,
  Globe,
  Sparkles,
  Layers,
  Settings2,
  Check,
  Loader2,
  Inbox,
  BarChart3,
  FileQuestion,
} from "lucide-react";
import { formApi } from "../services/index.js";
import { useHistoryState } from "../hooks/useHistoryState.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { createField, FIELD_DEFS } from "../lib/fieldTypes.js";
import { cn } from "../lib/utils.js";
import { useAutoGrow } from "../lib/useAutoGrow.js";
import { Logo } from "../components/Logo.jsx";
import { Button } from "../components/ui/Button.jsx";
import { PageLoader, EmptyState } from "../components/ui/Feedback.jsx";
import { Modal } from "../components/ui/Modal.tsx";
import { FieldPalette } from "../components/builder/FieldPalette.jsx";
import { SortableField } from "../components/builder/SortableField.jsx";
import { SettingsPanel } from "../components/builder/SettingsPanel.jsx";
import { AIGenerateModal } from "../components/builder/AIGenerateModal.jsx";
import { ShareModal } from "../components/builder/ShareModal.jsx";
import { FormView } from "../components/public/FormView.jsx";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { canSeeStatsPage, isCreator, isGuest } from "../lib/roles.js";
import { analyticsPath, builderPath, homePath, responsesPath, siteBuilderPath } from "../lib/routes.js";

export default function Builder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  /* Quien construye desde el SITIO (invitado o sin sesión) vive en la raíz:
     su URL es `/constructor/<id>` y de ahí vuelve a `/`. `/panel-gestion` es
     el panel de las cuentas reales, así que ningún enlace de un invitado
     puede apuntar allí. */
  const enElSitio = !isAuthenticated || isGuest(user);

  /* Los usuarios de entidad (form_creator) editan y navegan SIEMPRE bajo el
     slug de su entidad: una ruta global del panel la rebotaría el guard. El
     invitado no tiene entidad y se queda en el constructor del SITIO. */
  const entityCode = enElSitio ? undefined : user?.entity?.code;

  /* La visibilidad Público/Privado solo la gestiona el CREADOR de
     formularios: el invitado del sitio no tiene entidad y lo privado exige
     una (`form.service.js`). El resto de constructores (cuentas legacy) que
     ya tenían el campo fijado lo conservan intacto, pero sin control. */
  const canManageVisibility = !enElSitio && isCreator(user);

  /* Respuestas y analíticas están vetadas al creador y al invitado: ofrecer un
     botón que el guard devolvería a home es prometer lo que no hay. */
  const puedeStats = !enElSitio && canSeeStatsPage(user, "responses");

  const { state: form, set: setForm, reset, undo, redo } = useHistoryState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("build"); // build | design
  const [expandedId, setExpandedId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [saveState, setSaveState] = useState("saved"); // saved | saving | dirty
  const [preview, setPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeDrag, setActiveDrag] = useState(null); // drives the DragOverlay

  const formIdRef = useRef(null);
  const skipSaveRef = useRef(true);

  /* Los dos textos de la tarjeta se miden a sí mismos para ocupar lo que
     necesitan. Sin tope (`maxRows`): el usuario no ha puesto ningún límite a
     su título, y un campo que se autoajusta pero acaba con scroll-bar sería
     el mismo recorte que estamos quitando, solo que más difícil de ver. */
  const refTitulo = useAutoGrow(form?.title ?? "");
  const refDescripcion = useAutoGrow(form?.description ?? "");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ----- Load or create -----
  useEffect(() => {
    let active = true;
    skipSaveRef.current = true;

    async function init() {
      setLoading(true);
      try {
        if (id === "new") {
          const fromAI = searchParams.get("ai") === "1";
          const created = await formApi.create({
            title: t("untitledForm"),
            creationSource: fromAI ? "ai" : "blank",
            notify: false,
          });
          if (!active) return;
          formIdRef.current = created._id;
          reset(created);
          // Replace URL so refresh/back works, preserving ?ai flag.
          const conIA = searchParams.get("ai") ? true : false;
          navigate(
            enElSitio
              ? siteBuilderPath(created._id, { ai: conIA })
              : builderPath(language, created._id, { ai: conIA }, entityCode),
            { replace: true }
          );
        } else {
          const loaded = await formApi.get(id);
          if (!active) return;
          formIdRef.current = loaded._id;
          reset(loaded);
        }
        // AI feature hidden - retained in code: the `?ai=1` URL flag used to open
        // the AIGenerateModal on load (`setAiOpen(true)`). The modal is still
        // mounted below, but nothing in the UI can open it anymore.
      } catch (err) {
        toast.error(err.message);
        navigate(enElSitio ? "/" : homePath(language, entityCode));
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ----- Autosave (debounced) -----
  const debouncedForm = useDebounce(form, 800);
  useEffect(() => {
    if (!debouncedForm || !formIdRef.current) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    setSaveState("saving");
    formApi
      .update(formIdRef.current, {
        title: debouncedForm.title,
        description: debouncedForm.description,
        theme: debouncedForm.theme,
        questions: debouncedForm.questions,
        settings: debouncedForm.settings,
      })
      .then(() => setSaveState("saved"))
      .catch((err) => {
        setSaveState("dirty");
        toast.error(err.message);
      });
  }, [debouncedForm]);

  const markDirty = useCallback(() => setSaveState("dirty"), []);

  /* El chevron de expandir colapsa el abierto y expande el suyo; se estabiliza
     con `useCallback` (y recibe el `id`) para no crear una función nueva por
     campo en cada render —si no, el `memo` de SortableField no serviría de nada. */
  const toggleField = useCallback(
    (id) => setExpandedId((prev) => (prev === id ? null : id)),
    []
  );

  /* Identidad del array de ids que recibe <SortableContext>. dnd-kit memoriza
     su contexto por IDENTIDAD de este array, y `form.questions.map(...)` en
     línea creaba uno nuevo en cada render de la página: eso despertaba a los
     N campos en cada tecla del título y en cada transición del guardado.
     La clave es la LISTA de ids —no las preguntas—, así que editar una
     etiqueta u opciones (que no cambia el orden ni las claves) tampoco
     re-renderiza el lienzo entero. */
  const idsKey = form?.questions?.map((q) => q.id).join(",") ?? "";
  const sortableIds = useMemo(() => (idsKey ? idsKey.split(",") : []), [idsKey]);

  /* La visibilidad NO va por el autosave: tiene su propio endpoint (auditado
     como `form.visibility.changed`). Se aplica de forma optimista y se revierte
     si el backend la rechaza (p. ej. pasar a "privado" un formulario
     sin entidad). */
  const changeVisibility = useCallback(
    async (visibility) => {
      const previous = form?.visibility;
      if (!formIdRef.current || visibility === previous) return;
      setForm((prev) => ({ ...prev, visibility }));
      setSaveState("saving");
      try {
        const updated = await formApi.setVisibility(formIdRef.current, visibility);
        setForm((prev) => ({ ...prev, visibility: updated?.visibility ?? visibility }));
        setSaveState("saved");
      } catch (err) {
        setForm((prev) => ({ ...prev, visibility: previous }));
        setSaveState("dirty");
        toast.error(err.message);
      }
    },
    [form?.visibility, setForm]
  );

  // ----- Field operations -----
  const addField = useCallback(
    (type, index) => {
      const field = createField(type);
      setForm((prev) => {
        const questions = [...prev.questions];
        questions.splice(index ?? questions.length, 0, field);
        return { ...prev, questions };
      });
      setSelectedId(field.id);
      setExpandedId(field.id);
      markDirty();
    },
    [setForm, markDirty]
  );

  const updateField = useCallback(
    (updated) => {
      setForm((prev) => ({
        ...prev,
        questions: prev.questions.map((q) => (q.id === updated.id ? updated : q)),
      }));
      markDirty();
    },
    [setForm, markDirty]
  );

  const duplicateField = useCallback(
    (fieldId) => {
      setForm((prev) => {
        const idx = prev.questions.findIndex((q) => q.id === fieldId);
        if (idx === -1) return prev;
        const copy = { ...createField(prev.questions[idx].type), ...prev.questions[idx], id: createField("short_text").id };
        const questions = [...prev.questions];
        questions.splice(idx + 1, 0, copy);
        return { ...prev, questions };
      });
      markDirty();
    },
    [setForm, markDirty]
  );

  const deleteField = useCallback(
    (fieldId) => {
      setForm((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== fieldId) }));
      markDirty();
    },
    [setForm, markDirty]
  );

  // ----- Drag & drop -----
  const handleDragStart = ({ active }) => {
    if (active.data.current?.fromPalette) {
      setActiveDrag({ fromPalette: true, type: active.data.current.type });
    } else {
      const field = form.questions.find((q) => q.id === active.id);
      setActiveDrag(field ? { field } : null);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveDrag(null);
    if (!over) return;
    const fromPalette = active.data.current?.fromPalette;

    if (fromPalette) {
      const type = active.data.current.type;
      let overIndex;
      if (over.id === "canvas-top") overIndex = 0;
      else if (over.id === "canvas-bottom" || over.id === "canvas") overIndex = form.questions.length;
      else overIndex = form.questions.findIndex((q) => q.id === over.id);
      addField(type, overIndex === -1 ? form.questions.length : overIndex);
      return;
    }

    // reorder existing field — supports top/bottom edge drops
    if (over.id === "canvas-top") {
      setForm((prev) => {
        const oldIndex = prev.questions.findIndex((q) => q.id === active.id);
        if (oldIndex === -1) return prev;
        return { ...prev, questions: arrayMove(prev.questions, oldIndex, 0) };
      });
      markDirty();
      return;
    }
    if (over.id === "canvas-bottom" || over.id === "canvas") {
      setForm((prev) => {
        const oldIndex = prev.questions.findIndex((q) => q.id === active.id);
        if (oldIndex === -1) return prev;
        return { ...prev, questions: arrayMove(prev.questions, oldIndex, prev.questions.length - 1) };
      });
      markDirty();
      return;
    }

    if (active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = prev.questions.findIndex((q) => q.id === active.id);
        const newIndex = prev.questions.findIndex((q) => q.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
      });
      markDirty();
    }
  };

  // ----- Keyboard shortcuts -----
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        markDirty();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        markDirty();
      } else if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPreview(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo, redo, markDirty]);

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const updated = await formApi.publish(formIdRef.current, form.status !== "published");
      setForm((prev) => ({ ...prev, status: updated.status, slug: updated.slug }));
      skipSaveRef.current = true;
      toast.success(updated.status === "published" ? `${t("formPublished")} 🚀` : t("formUnpublished"));
      if (updated.status === "published") setShareOpen(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !form) return <PageLoader label={t("loadingBuilder")} />;

  const published = form.status === "published";

  return (
    <div className="animate-page-enter flex h-screen flex-col bg-slate-50 dark:bg-[#070a12]">
      {/* Top bar — premium glass */}
      <header className="flex h-16 min-w-0 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 lg:gap-3 lg:px-4 shadow-[0_1px_10px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
        <Button variant="ghost" size="icon" onClick={() => navigate(enElSitio ? "/" : homePath(language, entityCode))} aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo showText={false} size={30} />

        {/*
          Este título es el de la barra, de una línea y altura fija (h-16): aquí
          un textarea que creciera descuadraría la barra. Se queda como input,
          pero `truncate` fuera —en un <input> no dibuja elipsis, solo se
          desplazaba— y con `title` el texto completo sale al pasar el ratón.
          La edición sin recorte de verdad está en la tarjeta de abajo.
        */}
        <input
          value={form.title}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, title: e.target.value }));
            markDirty();
          }}
          title={form.title}
          aria-label={t("formTitle")}
          className="min-w-0 max-w-xs flex-1 rounded-lg bg-transparent px-2 py-1 text-sm font-semibold text-fg outline-none hover:bg-surface-2 focus:bg-surface-2"
        />

        <SaveIndicator state={saveState} t={t} />

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto scrollbar-thin">
          <LanguageSwitcher className="mr-1 hidden sm:flex" />
          <Button variant="ghost" size="icon" onClick={() => { undo(); markDirty(); }} aria-label={t("undo")} title={`${t("undo")} (Ctrl+Z)`}>
            <Undo2 className="h-4.5 w-4.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { redo(); markDirty(); }} aria-label={t("redo")} title={`${t("redo")} (Ctrl+Shift+Z)`}>
            <Redo2 className="h-4.5 w-4.5" />
          </Button>
          <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />
          {/* Respuestas y analíticas son páginas del PANEL: para el invitado
              no hay botón que apunte a `/panel-gestion`; el creador tampoco
              las ve (stats vetadas por rol). */}
          {puedeStats && (
            <>
              <Button variant="ghost" size="icon" onClick={() => navigate(responsesPath(language, form._id, entityCode))} aria-label={t("responses")} title={t("responses")}>
                <Inbox className="h-4.5 w-4.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate(analyticsPath(language, form._id, entityCode))} aria-label={t("insights")} title={t("insights")}>
                <BarChart3 className="h-4.5 w-4.5" />
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4" /> <span className="hidden sm:inline">{t("preview")}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)} disabled={!published}>
            <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">{t("share")}</span>
          </Button>
          <Button size="sm" variant={published ? "outline" : "primary"} loading={publishing} onClick={togglePublish}>
            <Globe className="h-4 w-4" /> <span className="hidden sm:inline">{published ? t("unpublish") : t("publish")}</span>
          </Button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="flex min-h-0 flex-1 bg-slate-50 dark:bg-[#070a12]">
          {/* Left: palette — premium glass, easy grip */}
          <aside className="hidden w-[320px] shrink-0 flex-col overflow-hidden border-r border-slate-200/70 bg-white shadow-[4px_0_24px_rgba(16,24,40,0.04)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[4px_0_24px_rgba(0,0,0,0.35)] lg:flex">
            <div className="border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50/50 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>{t("addFields")}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Arrastra o haz clic para añadir</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
              <FieldPalette onAdd={(type) => addField(type)} />
            </div>
            <div className="border-t border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              {/* AI feature hidden - retained in code: the AI Generate button used to live here
                  (Sparkles → setAiOpen(true)). The AIGenerateModal is still mounted below, but
                  nothing in the UI can open it anymore. */}
              <p className="mt-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">Tip: arrastra al área punteada → se marca el hueco</p>
            </div>
          </aside>

          {/* Center: canvas — modern drop canvas with perfect light/dark contrast */}
          <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin bg-slate-50 dark:bg-[#070a12]">
            <div className="mx-auto max-w-[640px] px-4 py-8">
              {/* Mobile tab switch */}
              <div className="mb-4 flex gap-1 rounded-xl border border-slate-200/70 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:hidden">
                <TabButton active={tab === "build"} onClick={() => setTab("build")} icon={Layers}>{t("build")}</TabButton>
                <TabButton active={tab === "design"} onClick={() => setTab("design")} icon={Settings2}>{t("design")}</TabButton>
              </div>

              {(tab === "build" || window.innerWidth >= 1024) && (
                <div className={cn(tab === "design" && "hidden lg:block")}>
                  <div className="mb-5 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white shadow-[0_2px_10px_rgba(16,24,40,0.04),0_18px_40px_-20px_rgba(16,24,40,0.12)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                    <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-600" />
                    <div className="p-5">
                      {/*
                        Título y descripción como textarea que crece: antes eran
                        <input>, que es UNA línea con scroll horizontal, así que
                        un texto largo seguía oculto aunque no llevara
                        `truncate`. Enter no mete salto de línea en el título
                        (no es un campo multilínea), pero sí en la descripción.
                      */}
                      <textarea
                        ref={refTitulo}
                        value={form.title}
                        rows={1}
                        onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); markDirty(); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder={t("formTitle")}
                        className="block w-full resize-none overflow-hidden bg-transparent text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                        style={{ fontFamily: "var(--font-display)" }}
                      />
                      <textarea
                        ref={refDescripcion}
                        value={form.description}
                        rows={1}
                        onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); markDirty(); }}
                        placeholder={t("descriptionOptional")}
                        className="mt-1.5 block w-full resize-none overflow-hidden bg-transparent text-sm font-medium text-slate-500 outline-none placeholder:text-slate-400 dark:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <CanvasDropArea hasFields={form.questions.length > 0} activeDrag={activeDrag}>
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {form.questions.map((q, i) => (
                          <SortableField
                            key={q.id}
                            field={q}
                            allQuestions={form.questions}
                            fieldIndex={i}
                            expanded={expandedId === q.id}
                            selected={selectedId === q.id}
                            accent={form.settings.primaryColor}
                            onToggle={toggleField}
                            onSelect={setSelectedId}
                            onChange={updateField}
                            onDuplicate={duplicateField}
                            onDelete={deleteField}
                          />
                        ))}
                      </div>
                    </SortableContext>

                    {form.questions.length === 0 && (
                      <EmptyState
                        icon={FileQuestion}
                        title={t("emptyForm")}
                        description={t("emptyFormDescription")}
                        action={
                          <div className="flex gap-2">
                            <Button onClick={() => addField("short_text")}>{t("addField")}</Button>
                            {/* AI feature hidden - retained in code: the "Use AI" button used to
                                sit here (Sparkles → setAiOpen(true)). The AIGenerateModal is still
                                mounted below, but nothing in the UI can open it anymore. */}
                          </div>
                        }
                      />
                    )}
                  </CanvasDropArea>
                </div>
              )}

              {tab === "design" && (
                <div className="lg:hidden">
                  <SettingsPanel form={form} onChange={(patch) => { setForm((p) => ({ ...p, ...patch })); markDirty(); }} canManageVisibility={canManageVisibility} onVisibilityChange={changeVisibility} />
                </div>
              )}
            </div>
          </main>

          {/* Right: settings — premium panel */}
          <aside className="hidden w-[360px] shrink-0 flex-col overflow-hidden border-l border-slate-200/70 bg-white shadow-[-4px_0_24px_rgba(16,24,40,0.04)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[-4px_0_24px_rgba(0,0,0,0.35)] xl:flex">
            <div className="border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>Diseño</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Personaliza tu formulario</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              <SettingsPanel form={form} onChange={(patch) => { setForm((p) => ({ ...p, ...patch })); markDirty(); }} canManageVisibility={canManageVisibility} onVisibilityChange={changeVisibility} />
            </div>
          </aside>
        </div>

        {/* Floating preview that follows the cursor while dragging */}
        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeDrag && <DragPreview drag={activeDrag} />}
        </DragOverlay>
      </DndContext>

      {/* Preview */}
      <Modal open={preview} onClose={() => setPreview(false)} size="xl" title={t("preview")} orb={
        /* Sin `--cr-orb`: mismo motivo que en Compartir y en el generador de
           IA — el orbe se tiñe con `--glass-chroma` y el diálogo sigue al
           acento de la cuenta. */
        <span className="cr-orb cr-orb-lg text-white" aria-hidden="true">
          <Eye className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
        </span>
      }>
        <div className="-mx-4 sm:-mx-5 -mb-5 max-h-[75vh] overflow-y-auto scrollbar-thin rounded-b-2xl">
          <FormView form={form} preview />
        </div>
      </Modal>

      <AIGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerated={(generated) => {
          setForm((prev) => ({
            ...prev,
            title: generated.title || prev.title,
            description: generated.description || prev.description,
            theme: generated.theme || prev.theme,
            questions: (generated.questions || []).map((q) =>
              q.id ? q : { ...q, id: createField(q.type || "short_text").id },
            ),
          }));
          markDirty();
        }}
      />

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} form={form} />
    </div>
  );
}

/** Floating card — premium glass that follows cursor, crystal clear */
function DragPreview({ drag }) {
  const type = drag.fromPalette ? drag.type : drag.field?.type;
  const def = FIELD_DEFS[type];
  if (!def) return null;
  const label = drag.fromPalette ? def.label : drag.field.label;

  return (
    <div className="flex w-[min(280px,90vw)] max-w-[280px] cursor-grabbing items-center gap-3 rounded-[16px] border border-brand-300 bg-white px-4 py-3 shadow-[var(--shadow-brand-drag)] ring-2 ring-brand-500/20 dark:border-brand-700 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-200 bg-brand-50 text-brand-600 shadow-sm dark:border-brand-800/50 dark:bg-brand-950/40 dark:text-brand-300">
        <def.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="flex-1 truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">{label}</span>
      {drag.fromPalette ? (
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">Nuevo</span>
      ) : (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Mover</span>
      )}
    </div>
  );
}

function CanvasDropArea({ hasFields, activeDrag, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
  const { setNodeRef: setTopRef, isOver: isOverTop } = useDroppable({ id: "canvas-top" });
  const { setNodeRef: setBottomRef, isOver: isOverBottom } = useDroppable({ id: "canvas-bottom" });
  const isDragging = !!activeDrag;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-[20px] transition-all duration-200",
        hasFields
          ? cn(
              "min-h-[140px] p-3",
              "border",
              isOver && !isOverTop && !isOverBottom
                ? "border-dashed border-brand-400/70 bg-brand-50/30 dark:border-brand-500/70 dark:bg-brand-950/10"
                : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            )
          : cn(
              "flex min-h-[340px] flex-col items-center justify-center gap-3 p-6 text-center",
              "border-2 border-dashed bg-white dark:bg-slate-900",
              isOver
                ? "border-brand-400 bg-brand-50/60 dark:border-brand-500 dark:bg-brand-950/30 shadow-[var(--shadow-brand-ring-wide)] scale-[1.01]"
                : "border-slate-300 dark:border-slate-700"
            )
      )}
    >
      {/* subtle canvas pattern */}
      <div className="pointer-events-none absolute inset-0 rounded-[20px] opacity-[0.03] dark:opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "20px 20px" }} />

      <div className="relative w-full">
        {/* ── TOP edge — ultra visible dashed slot ── */}
        {hasFields && (
          <div
            ref={setTopRef}
            className={cn(
              "mb-3 overflow-hidden rounded-[14px] border-2 border-dashed transition-all duration-200",
              isDragging ? "opacity-100" : "pointer-events-none h-0 opacity-0 border-0 py-0",
              isOverTop
                ? "border-brand-500 bg-brand-50 px-4 py-5 shadow-[var(--shadow-brand-ring)] dark:border-brand-400 dark:bg-brand-950/30 scale-[1.01]"
                : isDragging
                  ? "border-slate-300 bg-slate-50/70 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/40"
                  : ""
            )}
          >
            <div className={cn("flex items-center justify-center gap-2 text-sm font-bold", isOverTop ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400")}>
              <span className={cn("grid h-7 w-7 place-items-center rounded-full border-2 text-xs", isOverTop ? "border-brand-500 bg-brand-500 text-on-brand-500 shadow-sm dark:border-brand-400 dark:bg-brand-400 dark:text-on-brand-400" : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                {isOverTop ? "↑" : "+"}
              </span>
              {isOverTop ? "Suelta aquí — al inicio" : "Arrastra aquí para colocar al inicio"}
            </div>
            {isOverTop && <p className="mt-1 text-center text-xs font-medium text-brand-600/80 dark:text-brand-300/80">Se insertará como primer campo</p>}
          </div>
        )}

        {children}

        {/* ── BOTTOM edge — ultra visible dashed slot ── */}
        {hasFields && (
          <div
            ref={setBottomRef}
            className={cn(
              "mt-3 overflow-hidden rounded-[14px] border-2 border-dashed transition-all duration-200",
              isDragging ? "opacity-100" : "pointer-events-none h-0 opacity-0 border-0 py-0",
              isOverBottom
                ? "border-brand-500 bg-brand-50 px-4 py-5 shadow-[var(--shadow-brand-ring)] dark:border-brand-400 dark:bg-brand-950/30 scale-[1.01]"
                : isDragging
                  ? "border-slate-300 bg-slate-50/70 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/40"
                  : ""
            )}
          >
            <div className={cn("flex items-center justify-center gap-2 text-sm font-bold", isOverBottom ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400")}>
              <span className={cn("grid h-7 w-7 place-items-center rounded-full border-2 text-xs", isOverBottom ? "border-brand-500 bg-brand-500 text-on-brand-500 shadow-sm dark:border-brand-400 dark:bg-brand-400 dark:text-on-brand-400" : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                {isOverBottom ? "↓" : "+"}
              </span>
              {isOverBottom ? "Suelta aquí — al final" : "Arrastra aquí para colocar al final"}
            </div>
            {isOverBottom && <p className="mt-1 text-center text-xs font-medium text-brand-600/80 dark:text-brand-300/80">Se añadirá después del último campo</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition",
        active ? "bg-surface text-fg shadow-soft" : "text-muted"
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function SaveIndicator({ state, t }) {
  const map = {
    saved: { icon: Check, text: t("saved"), cls: "text-emerald-600" },
    saving: { icon: Loader2, text: t("saving"), cls: "text-muted", spin: true },
    dirty: { icon: Loader2, text: t("unsaved"), cls: "text-amber-600" },
  };
  const { icon: Icon, text, cls, spin } = map[state];
  return (
    <span className={cn("hidden items-center gap-1.5 text-xs font-medium sm:flex", cls)}>
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} /> {text}
    </span>
  );
}
