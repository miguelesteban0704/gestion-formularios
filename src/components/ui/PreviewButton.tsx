import { Eye } from "lucide-react";

interface PreviewButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function PreviewButton({ onClick, disabled = false, className }: PreviewButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2
        px-4 py-2.5 text-sm font-semibold
        transition-all duration-300 ease-in-out
        rounded-xl border border-gray-200 bg-white
        text-gray-700 shadow-sm
        hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]
        hover:-translate-y-0.5
        focus:outline-none focus:ring-2 focus:ring-gray-300/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      Vista Previa
    </button>
  );
}
