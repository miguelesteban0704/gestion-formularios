import { useState } from "react";
import {
  MoreVertical,
  Edit2,
  Copy,
  Share2,
  Pause,
  Play,
  Trash2,
  Eye,
} from "lucide-react";
import { ShareModal } from "./ShareModal";

interface FormActionsMenuProps {
  form: {
    id: string;
    title: string;
    status: "published" | "draft" | "paused";
    visibility: "public" | "private";
    responseCount?: number;
  };
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePause: (id: string) => void;
  onPreview: (id: string) => void;
  publicUrl?: string;
}

export function FormActionsMenu({
  form,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePause,
  onPreview,
  publicUrl,
}: FormActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isPaused = form.status === "paused";

  return (
    <>
      <div className="relative inline-block">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-ink-muted transition-all duration-200 hover:bg-surface-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          aria-label="Más opciones"
          aria-expanded={open}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white/90 backdrop-blur-md shadow-[0_24px_48px_rgb(0,0,0,0.14)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <MenuItem
              icon={<Edit2 className="h-4 w-4 text-brand-600" />}
              label="Editar formulario"
              shortcut="⌘E"
              onClick={() => { setOpen(false); onEdit(form.id); }}
            />
            {form.status !== "draft" && (
              <MenuItem
                icon={<Eye className="h-4 w-4 text-gray-500" />}
                label="Vista previa"
                onClick={() => { setOpen(false); onPreview(form.id); }}
              />
            )}
            <MenuItem
              icon={<Copy className="h-4 w-4 text-gray-500" />}
              label="Duplicar formulario"
              onClick={() => { setOpen(false); onDuplicate(form.id); }}
            />
            <MenuItem
              icon={<Share2 className="h-4 w-4 text-brand-600" />}
              label="Compartir"
              description={form.visibility === "public" ? "Enlace público" : "Enlace privado"}
              onClick={() => { setOpen(false); setShareOpen(true); }}
            />
            <MenuDivider />
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
              tone={isPaused ? "success" : "warning"}
              onClick={() => { setOpen(false); onTogglePause(form.id); }}
            />
            <MenuDivider />
            <MenuItem
              icon={<Trash2 className="h-4 w-4 text-rose-500" />}
              label="Enviar a la papelera"
              tone="danger"
              onClick={() => { setOpen(false); onDelete(form.id); }}
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
  shortcut,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "success" | "warning" | "danger";
  shortcut?: string;
  description?: string;
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
        transition-all duration-200 rounded-lg
        text-gray-700 font-medium
        hover:bg-gray-50 hover:text-brand-600
        ${tone ? toneColors[tone] : ""}
      `}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {description && (
        <span className="text-xs text-gray-400 truncate mx-2">{description}</span>
      )}
      {shortcut && (
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{shortcut}</span>
      )}
    </button>
  );
}

function MenuDivider() {
  return (
    <div className="h-px bg-gray-100 my-1" />
  );
}
