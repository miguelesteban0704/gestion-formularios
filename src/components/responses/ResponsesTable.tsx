import { useState } from "react";
import {
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface ResponseRow {
  id: string;
  respondentName: string;
  respondentEmail?: string | null;
  submittedAt: string;
  status: "completed" | "partial" | "spam";
  answersCount: number;
  device?: string;
}

interface ResponsesTableProps {
  responses: ResponseRow[];
  onDeleteResponse: (id: string) => void;
  onExport: () => void;
  isLoading?: boolean;
}

export function ResponsesTable({ responses, onDeleteResponse, onExport, isLoading = false }: ResponsesTableProps) {
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    onExport();
    toast.success("Exportando a Excel...");
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    completed: { label: "Completada", color: "text-emerald-600 bg-emerald-50/50", icon: CheckCircle },
    partial: { label: "Parcial", color: "text-amber-600 bg-amber-50/50", icon: Clock },
    spam: { label: "Spam", color: "text-rose-600 bg-rose-50/50", icon: AlertCircle },
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Respuestas recibidas</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </button>
          <button
            onClick={() => setOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-md hover:bg-indigo-700 transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4" />
            Gestionar respuestas
          </button>
        </div>
      </div>

      {/* Empty state */}
      {responses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <AlertCircle className="h-12 w-12 text-gray-300" />
          <h4 className="mt-3 font-semibold text-gray-800">Sin respuestas todavía</h4>
          <p className="text-sm text-gray-500">Las respuestas de los encuestados aparecerán aquí.</p>
        </div>
      )}

      {/* Table */}
      {responses.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Encuestado</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Respuestas</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {responses.map((r) => {
                const cfg = statusConfig[r.status];
                const Icon = cfg.icon;
                return (
                  <tr
                    key={r.id}
                    className="transition-all duration-200 hover:bg-gray-50/50 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-sm">
                          {r.respondentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{r.respondentName}</p>
                          {r.respondentEmail && (
                            <p className="text-xs text-gray-500">{r.respondentEmail}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{new Date(r.submittedAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{r.answersCount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onDeleteResponse(r.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          aria-label="Eliminar respuesta"
                          title="Eliminar respuesta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {toDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setToDelete(null)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.12)] p-6 animate-in zoom-in duration-200">
            <h3 className="font-semibold text-gray-800 mb-2">¿Eliminar esta respuesta?</h3>
            <p className="text-sm text-gray-600 mb-6">Esta acción no se puede deshacer. La respuesta se enviará a la papelera de reciclaje.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteResponse(toDelete!);
                  setToDelete(null);
                  setOpen(false);
                  toast.success("Respuesta eliminada");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
