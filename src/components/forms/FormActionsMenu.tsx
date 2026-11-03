import { useState } from "react";
import {
  MoreHorizontal,
  Edit2,
  Copy,
  Share2,
  Pause,
  Play,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { ShareModal } from "./ShareModal.tsx";
import { toast } from "sonner";

interface FormActionsMenuProps {
  form: {
    id: string;
    title: string;
    status: "published" | "draft" | "paused";
    visibility: "public" | "private";
  };
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePause: (id: string) => void;
  publicUrl?: string;
}

export function FormActionsMenu({
  form,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePause,
  publicUrl,
}: FormActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isPaused = form.status === "paused";

  const handleDelete = () => {
    setOpen(false);
    onDelete(form.id);
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Más acciones"
          aria-expanded={open}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white shadow-[0_20px_60px_rgb(0,0,0,0.12)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <MenuItem
              icon={<Edit2 className="h-4 w-4" />}
              label="Editar formulario"
              onClick={() => { setOpen(false); onEdit(form.id); }}
            />
            <MenuItem
              icon={<Copy className="h-4 w-4" />}
              label="Duplicar"
              onClick={() => { setOpen(false); onDuplicate(form.id); }}
            />
            <MenuItem
              icon={<Share2 className="h-4 w-4" />}
              label="Compartir"
              onClick={() => { setOpen(false); setShareOpen(true); }}
            />
            <MenuItem
              icon={
                <>
                  {isPaused ? (
                    <Play className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Pause className="h-4 w-4 text-amber-600" />
                  )}
                </>
              }
              label={isPaused ? "Reanudar formulario" : "Pausar formulario"}
              onClick={() => { setOpen(false); onTogglePause(form.id); }}
              tone={isPaused ? "success" : "warning"}
            />
            <MenuItem
              icon={<Trash2 className="h-4 w-4 text-rose-500" />}
              label="Eliminar"
              tone="danger"
              onClick={handleDelete}
            />
          </div>
        )}
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        formId={form.id}
        formTitle={form.title}
        publicUrl={publicUrl}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "success" | "warning" | "danger";
}) {
  const toneColors: Record<string, string> = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-500",
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 text-sm
        transition-colors duration-200 rounded-lg
        text-gray-700 hover:bg-gray-50
        ${tone ? toneColors[tone] : ""}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
