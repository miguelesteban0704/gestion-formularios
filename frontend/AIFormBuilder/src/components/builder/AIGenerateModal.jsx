import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Modal } from "../ui/Modal.tsx";
import { Textarea } from "../ui/Input.jsx";
import { aiApi } from "../../services/index.js";
import { isStatic } from "../../lib/fieldTypes.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

/** Modal that turns a natural-language prompt into a full form via local AI. */
export function AIGenerateModal({ open, onClose, onGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [stages, setStages] = useState([]);
  const { t } = useLanguage();
  const examples = ["feedback", "employee", "event", "research", "job"].map((key) => t(`example_${key}`));

  // Reset progress when modal opens
  useEffect(() => {
    if (open) {
      setProgress(0);
      setStages([]);
      setError(null);
    }
  }, [open]);

  const generate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setProgress(10);
    setStages([
      { id: 1, name: t("stageCheckCache"), status: "active" },
      { id: 2, name: t("stageGenerateForm"), status: "pending" },
    ]);
    setError(null);

    try {
      // Simulate cache check
      await new Promise(r => setTimeout(r, 500));
      setProgress(25);
      setStages(stages => stages.map(s =>
        s.id === 1 ? { ...s, status: "completed" } : s
      ));

      setProgress(50);
      setStages(stages => stages.map(s =>
        s.id === 2 ? { ...s, status: "active" } : s
      ));

      const form = await aiApi.generateForm(prompt);

      /* El formulario se aplica siempre: si algo quedó mal se arregla en el
         constructor en un minuto, y perder el trabajo sería peor que avisar. */
      onGenerated(form);

      /* Solo el conteo de preguntas: nada de informe ni de avisos. */
      const n = (form.questions || []).filter((q) => !isStatic(q.type)).length;
      toast.success(`${t("formGeneratedAI")}: ${n} ${t("aiReportQuestions")}`);

      setProgress(100);
      setStages(stages => stages.map(s => ({ ...s, status: "completed" })));

      setPrompt("");
      onClose();
    } catch (err) {
      console.error("Generation error:", err);
      setError(err.message || t("errorGenerationFailed"));
      toast.error(err.message || t("errorGenerationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const cerrar = () => {
    setPrompt("");
    setProgress(0);
    setStages([]);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={t("generateFormWithAI")}
      description={t("aiModalDescription")}
      size="lg"
      orb={
        /* Sin `--cr-orb`: el orbe se tiñe con `--glass-chroma`, que es
           `--color-brand-*`. Con un hex fijo el diálogo entero se quedaba en
           ese violeta con cualquier acento que hubiera elegido el usuario. */
        <span className="cr-orb cr-orb-lg text-white" aria-hidden="true">
          <Sparkles className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
        </span>
      }
    >
      <div className="relative">
        <Textarea
          autoFocus
          rows={4}
          value={prompt}
          disabled={loading}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("aiPromptPlaceholder")}
          className="pr-3"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
          }}
        />
      </div>

      <div className="mt-3">
        <p className="mb-2 text-xs font-medium text-muted">{t("tryExample")}</p>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              disabled={loading}
              onClick={() => setPrompt(ex)}
              className="rounded-lg border border-default px-3 py-1 text-xs text-muted transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-muted">{t("tipShortcut")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cerrar}
            disabled={loading}
            className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="cr-btn cr-btn-brand min-w-[112px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("generateForm")}
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 space-y-3">
          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress Stages */}
          {stages.length > 0 && (
            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {stage.status === "completed" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {stage.status === "active" && (
                    <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
                  )}
                  {stage.status === "pending" && (
                    <Clock className="h-4 w-4 text-muted" />
                  )}
                  <span className={
                    stage.status === "completed" ? "text-green-600 dark:text-green-400" :
                    stage.status === "active" ? "text-brand-600 dark:text-brand-400 font-medium" :
                    "text-muted"
                  }>
                    {stage.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Status Message */}
          <div
            className="flex items-center gap-2.5 rounded-2xl border border-brand-200/70 bg-brand-50/70 px-3.5 py-3 text-sm text-brand-700 backdrop-blur-md dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200"
            style={{ boxShadow: "0 12px 28px -16px color-mix(in srgb, var(--color-brand-500) 55%, transparent)" }}
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {t("designingForm")}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-red-200/70 bg-red-50/70 px-3.5 py-3 text-sm text-red-700 backdrop-blur-md dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </Modal>
  );
}
