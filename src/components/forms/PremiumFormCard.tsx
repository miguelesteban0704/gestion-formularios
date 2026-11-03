import { Link2, BarChart3, Folder, Clock } from "lucide-react";
import { FormActionsMenu } from "./FormActionsMenu.tsx";
import { PreviewButton } from "../ui/PreviewButton.tsx";

interface PremiumFormCardProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    status: "published" | "draft" | "paused";
    visibility: "public" | "private";
    createdAt: string;
    responseCount?: number;
  };
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePause: (id: string) => void;
  onPreview: (id: string) => void;
  onAnalytics: (id: string) => void;
  publicUrl?: string;
}

export function PremiumFormCard({
  form,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePause,
  onPreview,
  onAnalytics,
  publicUrl,
}: PremiumFormCardProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    published: { label: "Público", color: "text-emerald-600 bg-emerald-50/50 border-emerald-100" },
    draft: { label: "Borrador", color: "text-gray-600 bg-gray-50/50 border-gray-100" },
    paused: { label: "Pausado", color: "text-amber-600 bg-amber-50/50 border-amber-100" },
  };

  const cfg = statusConfig[form.status];

  return (
    <article
      className="group relative rounded-2xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 ease-in-out hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] hover:-translate-y-1"
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-shrink-0">
            <Folder className="h-6 w-6 text-gray-300" />
          </div>
          <div className="flex items-end gap-2">
            <PreviewButton onClick={() => onPreview(form.id)} className="text-xs px-3 py-1.5" />
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-1 group-hover:text-indigo-600 transition-colors">
          {form.title}
        </h3>
        {form.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{form.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatPill
            icon={<BarChart3 className="h-4 w-4" />}
            label="Respuestas"
            value={form.responseCount ?? 0}
          />
          <StatPill
            icon={<Clock className="h-4 w-4" />}
            label="Creado"
            value={new Date(form.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link2 className="h-3.5 w-3.5" />
            <span>{form.visibility === "public" ? "Público" : "Privado"}</span>
          </div>
          <FormActionsMenu
            form={form}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onTogglePause={onTogglePause}
            publicUrl={publicUrl}
          />
        </div>
      </div>
    </article>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}
