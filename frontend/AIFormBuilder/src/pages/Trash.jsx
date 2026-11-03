import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { toast } from "sonner";
import { formApi } from "../services/index.js";
import { TrashBin } from "../components/responses/TrashBin.jsx";
import { isCreator } from "../lib/roles.js";
import { Trash2 } from "lucide-react";
import { Skeleton } from "../components/ui/Feedback.jsx";

export default function Trash() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteCount, setDeleteCount] = useState(1);
  const isFormCreator = isCreator(user);

  useEffect(() => {
    let cancelled = false;
    formApi.list({}).then((allForms) => {
      if (cancelled) return;
      const trashed = allForms.filter((f) => f.visibility !== "public");
      setForms(trashed);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleRestore = async (formId) => {
    try {
      await formApi.setVisibility(formId, "public");
      toast.success(t("formRestored"));
      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch (e) {
      toast.error("Error al restaurar");
    }
  };

  const handleSingleDelete = async (formId) => {
    try {
      await formApi.remove(formId);
      toast.success("Formulario eliminado permanentemente");
      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch (e) {
      toast.error("Error al borrar");
    }
  };

  const handleBulkDelete = async (count) => {
    const formsToDelete = forms.slice(0, count);
    if (!window.confirm(`¿Eliminar permanentemente ${count} ${count === 1 ? "formulario" : "formularios"}?`)) return;
    try {
      formsToDelete.forEach((f) => {
        formApi.remove(f.id);
      });
      toast.success(`${count} ${count === 1 ? t("form") : t("forms")} eliminados permanentemente`);
      setForms((prev) => prev.filter((f) => !formsToDelete.some((tf) => tf.id === f.id)));
      setDeleteCount(1);
    } catch (e) {
      toast.error("Error al borrar");
    }
  };

  if (loading) {
    return (
      <div className="animate-page-enter">
        <div className="h-32 border-b border-default bg-surface" />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 lg:px-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-gray-800">{t("papelera")}</h2>
      <p className="text-sm text-gray-500">
        {forms.length} {t("trashedCount")}
      </p>

      {forms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="h-16 w-16 rounded-full bg-gray-100/50 flex items-center justify-center text-gray-400 mb-4">
            <Trash2 className="h-8 w-8" />
          </div>
          <h4 className="font-semibold text-gray-800">{t("emptyTrash")}</h4>
          <p className="text-sm text-gray-500 mt-1">{t("noTrashedForms")}</p>
        </div>
      )}

      {forms.length > 0 && (
        <TrashBin
          trashedForms={forms.map((f) => ({
            id: f.id,
            title: f.title,
            deletedAt: f.updatedAt || f.createdAt,
            entityName: f.entity?.name || null,
          }))}
          onRestore={handleRestore}
          onSingleDelete={handleSingleDelete}
          onBulkDelete={handleBulkDelete}
          deleteCount={deleteCount}
          isFormCreator={isFormCreator}
          setDeleteCount={setDeleteCount}
        />
      )}
    </div>
  );
}