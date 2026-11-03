import { useState } from "react";
import {
  Trash2,
  RefreshCw,
  FolderMinus,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface TrashForm {
  id: string;
  title: string;
  deletedAt: string;
  entityName?: string | null;
}

interface TrashBinProps {
  trashedForms: TrashForm[];
  onRestore: (id: string) => void;
  onSingleDelete: (id: string) => void;
  onBulkDelete: (count: number) => void;
  deleteCount: number;
  isFormCreator: boolean;
  setDeleteCount: (count: number) => void;
  isLoading?: boolean;
}

export function TrashBin({
  trashedForms,
  onRestore,
  onSingleDelete,
  onBulkDelete,
  deleteCount,
  isFormCreator,
  setDeleteCount,
}: TrashBinProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleRestore = (id: string) => {
    setConfirmId(null);
    onRestore(id);
    toast.success("Formulario restaurado");
  };

  const handleSingleDelete = (id: string) => {
    setConfirmId(null);
    onSingleDelete(id);
    toast.success("Formulario eliminado permanentemente");
  };

  const daysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((now - deleted) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-rose-50/60 flex items-center justify-center text-rose-600 shadow-sm">
          <Trash2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Papelera de Reciclaje</h2>
          <p className="text-sm text-gray-500">Los formularios eliminados se conservan aquí durante 30 días.</p>
        </div>
      </div>

      {/* Selector de cantidad para gestores de formularios */}
      {isFormCreator && trashedForms.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-rose-200 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800">Borrado masivo</h3>
              <p className="text-xs text-gray-500">Selecciona la cantidad de formularios a eliminar permanentemente</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Cantidad:</label>
              <select
                value={deleteCount}
                onChange={(e) => setDeleteCount(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-rose-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
              >
                {Array.from({ length: trashedForms.length }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "formulario" : "formularios"}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => onBulkDelete(deleteCount)}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium shadow-sm hover:bg-rose-700 hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" /> Borrar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {trashedForms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-rose-100 bg-rose-50/50">
          <div className="h-16 w-16 rounded-full bg-rose-100/50 flex items-center justify-center text-rose-400 mb-4">
            <FolderMinus className="h-8 w-8" />
          </div>
          <h4 className="font-semibold text-gray-800">Papelera vacía</h4>
          <p className="text-sm text-gray-500">No hay formularios eliminados recientemente.</p>
        </div>
      )}

      {/* List */}
      {trashedForms.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formulario</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entidad</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Eliminado</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {trashedForms.map((f) => {
                const days = daysRemaining(f.deletedAt);
                return (
                  <tr key={f.id} className="transition-colors hover:bg-rose-50/50 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-medium">
                          {f.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{f.title}</p>
                          <p className="text-xs text-gray-500">ID: {f.id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {f.entityName || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          {new Date(f.deletedAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="block mt-1 text-xs font-medium text-rose-600">
                        Expira en {days} día{days !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(f.id)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium shadow-sm hover:bg-emerald-100 hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3 w-3" /> Restaurar
                        </button>
                        {confirmId === f.id ? (
                          <button
                            onClick={() => handleSingleDelete(f.id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium shadow-sm hover:bg-rose-100 hover:shadow-md transition-all duration-200 flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3 w-3" /> Borrar
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmId(f.id)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3 w-3" /> Borrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
