import { useState } from "react";
import { Copy, Link, QrCode, Code2, X, Mail } from "lucide-react";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formTitle: string;
  publicUrl?: string;
}

type Tab = "link" | "qr" | "embed";

export function ShareModal({ isOpen, onClose, formId, formTitle, publicUrl }: ShareModalProps) {
  const [tab, setTab] = useState<Tab>("link");
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const linkUrl = publicUrl || `${baseUrl}/f/${formId}`;
  const embedCode = `<iframe src="${linkUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px;"></iframe>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    toast.success("Descargando código QR...");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "link", label: "Enlace URL", icon: Link },
    { id: "qr", label: "Código QR", icon: QrCode },
    { id: "embed", label: "Código Embed", icon: Code2 },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
      </div>

      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4"
        role="dialog"
        aria-modal="true"
        aria-label="Compartir formulario"
      >
        <div className="relative rounded-2xl bg-white/80 backdrop-blur-md border border-white/30 shadow-[0_20px_60px_rgb(0,0,0,0.12)] overflow-hidden transition-all duration-300 ease-in-out">
          <div className="bg-gray-50/40 px-6 py-4 border-b border-white/40 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Compartir: {formTitle}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-white/40">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${active
                        ? "bg-gray-900/80 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {tab === "link" && (
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={linkUrl}
                    readOnly
                    className="w-full pl-10 pr-36 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300/50 transition-all"
                    readOnly
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors">
                    <Link className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <button
                    onClick={() => copyToClipboard(linkUrl)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: copied ? "#10b981" : "rgba(99, 102, 241, 0.1)",
                      color: copied ? "#ffffff" : "#5b21b6",
                    }}
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Cualquier persona con este enlace puede responder el formulario.</p>
              </div>
            )}

            {tab === "qr" && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-16 w-16 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">form/{formId.slice(-6)}</span>
                  </div>
                </div>
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Descargar QR
                </button>
              </div>
            )}

            {tab === "embed" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Copia este código e insértalo en tu sitio web:</p>
                <div className="relative group">
                  <textarea
                    value={embedCode}
                    readOnly
                    rows={3}
                    className="w-full pl-10 pr-36 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300/50 transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors">
                    <Code2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <button
                    onClick={() => copyToClipboard(embedCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: copied ? "#10b981" : "rgba(99, 102, 241, 0.1)",
                      color: copied ? "#ffffff" : "#5b21b6",
                    }}
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Download({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
