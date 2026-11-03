import { useState } from "react";
import { Trash2, RefreshCw, FolderMinus, Inbox } from "lucide-react";
import { toast } from "sonner";

interface TrashForm {
  id: string;
  title: string;
  deletedAt: string;
  entityName?: string | null;
  reason?: string;
}

interface TrashBinProps {
  trashedForms: TrashForm[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isLoading?: boolean;
}

export function TrashBin({ trashedForms, onRestore, onPermanentDelete, isLoading = false }: TrashBinProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleRestore = (id: string) => {
    setSelected(null);
    onRestore(id);
    toast.success("Formulario restaurado");
  };

  const handlePermanentDelete = (id: string) => {
    if (!window.confirm("¿Eliminar permanentemente este formulario? Esta acción no se puede deshacer.")) return;
    setSelected(null);
    onPermanentDelete(id);
    toast.success("Formulario eliminado permanentemente");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-rose-600" />
        <h2 className="font-semibold text-gray-800">Papelera de Reciclaje</h2>
      </div>

      <p className="text-sm text-gray-500">
        Aquí se almacenan los formularios eliminados durante 30 días antes de borrarse permanentemente.
      </p>

      {trashedForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <FolderMinus className="h-16 w-16 text-gray-300 mb-3" />
          <h4 className="font-semibold text-gray-800">Papelera vacía</h4>
          <p className="text-sm text-gray-500">No hay formularios eliminados recientemente.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formulario</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entidad</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Eliminado</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {trashedForms.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-rose-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-medium text-sm">
                        {f.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{f.title}</p>
                        <p className="text-xs text-gray-500">ID: {f.id.slice(-6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {f.entityName || "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="text-sm font-medium">
                      {new Date(f.deletedAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore(f.id)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(f.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
