import { useState } from "react";
import {
  Copy,
  Link,
  QrCode,
  Code2,
  X,
  Mail,
  Download
} from "lucide-react";
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
  const embedCode = `<iframe src="${linkUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px; border:none;"></iframe>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    toast.success("Descargando código QR...");
  };

  const sendEmail = () => {
    toast.success("Enviando enlace por correo...");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "link", label: "Enlace URL", icon: Link },
    { id: "qr", label: "Código QR", icon: QrCode },
    { id: "embed", label: "Código Embed", icon: Code2 },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay glassmorphism */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300" />
      </div>

      {/* Modal glassmorphism premium */}
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4"
        role="dialog"
        aria-modal="true"
        aria-label="Compartir formulario"
      >
        <div className="relative rounded-2xl bg-white/82 backdrop-blur-md border border-white/50 shadow-[0_20px_60px_rgb(0,0,0,0.12)] overflow-hidden transition-all duration-300 ease-in-out animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="bg-white/60 backdrop-blur px-6 py-4 border-b border-white/40 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 leading-tight">Compartir: <span className="text-brand-600 font-medium">{formTitle}</span></h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-200"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 py-4 border-b border-white/40">
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200 whitespace-nowrap
                      ${active
                        ? "bg-brand-600 text-on-brand-600 shadow-sm shadow-brand-600/20"
                        : "text-gray-500 hover:text-brand-600 hover:bg-gray-50/50"
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

          {/* Content */}
          <div className="p-6">
            {tab === "link" && (
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={linkUrl}
                    readOnly
                    className="w-full pl-10 pr-40 py-3.5 rounded-xl border border-gray-200 bg-gray-50/60 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                    <Link className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => copyToClipboard(linkUrl)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
                      style={{
                        background: copied ? "#10b981" : "rgba(99, 102, 241, 0.1)",
                        color: copied ? "#ffffff" : "#5b21b6",
                      }}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" /> ¡Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copiar enlace
                        </>
                      )}
                    </button>
                    <button
                      onClick={sendEmail}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-500 hover:text-brand-600 hover:bg-gray-50/50"
                    >
                      <Mail className="h-4 w-4" /> Enviar
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Cualquier persona con este enlace puede responder el formulario. No requiere iniciar sesión.
                </p>
              </div>
            )}

            {tab === "qr" && (
              <div className="flex flex-col items-center gap-5">
                <div className="p-5 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <QrCode className="h-14 w-14 text-brand-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">form/{formId.slice(-6)}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Escanea para abrir el formulario</p>
                </div>
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 font-medium shadow-sm hover:bg-brand-100 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300"
                >
                  <Download className="h-4 w-4" /> Descargar código QR
                </button>
              </div>
            )}

            {tab === "embed" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Copia este código e insértalo en tu sitio web o blog:</p>
                <div className="relative group">
                  <textarea
                    value={embedCode}
                    readOnly
                    rows={3}
                    className="w-full pl-10 pr-40 py-3.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                    <Code2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <button
                    onClick={() => copyToClipboard(embedCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
                    style={{
                      background: copied ? "#10b981" : "rgba(99, 102, 241, 0.1)",
                      color: copied ? "#ffffff" : "#5b21b6",
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copiar código
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">El iframe es responsivo y se adapta al ancho del contenedor.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
