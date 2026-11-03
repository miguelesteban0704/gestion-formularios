import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Globe, Code2, Wifi, MonitorSmartphone, Share2 } from "lucide-react";
import { Modal } from "../ui/Modal.tsx";
import { Button } from "../ui/Button.jsx";
import { CopiedIcon } from "../ui/animated-state-icons";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { getLocalShareUrl, isLocalhostOrigin, fetchNetworkInfo, buildNetworkShareUrl } from "../../lib/shareUrl.js";
import { copyText } from "../../lib/clipboard.js";

export function ShareModal({ open, onClose, form }) {
  const url = getLocalShareUrl(form.slug);
  const embed = `<iframe src="${url}" width="100%" height="700" frameborder="0"></iframe>`;
  const { t } = useLanguage();
  const [networkUrls, setNetworkUrls] = useState([]);
  const [networkEmbed, setNetworkEmbed] = useState("");
  // Qué botón acaba de copiar. Antes solo había un toast: el botón no
  // confirmaba nada en sí mismo y el usuario no sabía qué había copiado.
  const [copiedKey, setCopiedKey] = useState(null);
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  useEffect(() => {
    if (!open) return;
    if (!isLocalhostOrigin()) return;
    let alive = true;
    fetchNetworkInfo().then(({ networkUrls: urls }) => {
      if (!alive) return;
      setNetworkUrls(urls);
      if (urls[0]) setNetworkEmbed(`<iframe src="${buildNetworkShareUrl(form.slug, urls[0])}" width="100%" height="700" frameborder="0"></iframe>`);
    });
    return () => { alive = false; };
  }, [open, form.slug]);

  const copy = async (text, label, key) => {
    // Si la copia falla, no se confirma: el tick y el toast solo aparecen
    // cuando el texto llegó de verdad al portapapeles.
    if (!(await copyText(text))) {
      toast.error(t("copyFailed"));
      return;
    }
    setCopiedKey(key);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedKey(null), 1800);
    toast.success(label === "Link" ? t("linkCopied") : t("embedCopied"));
  };

  // El icono se dibuja a 16px sobre un viewBox de 40: sin subir el trazo
  // quedaría en 0,8px y desaparecería.
  const copyGlyph = (key) => (
    <CopiedIcon active={copiedKey === key} size={16} strokeWidth={4} />
  );

  return (
    <Modal open={open} onClose={onClose} title={t("shareForm")} description={t("anyoneCanRespond")} size="md"
      orb={
        /* Sin `--cr-orb`: el orbe se tiñe con `--glass-chroma`, que es
           `--color-brand-*`. Con un hex fijo el diálogo entero se quedaba en
           ese azul con cualquier acento que hubiera elegido el usuario. */
        <span className="cr-orb cr-orb-lg text-white" aria-hidden="true">
          <Share2 className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
        </span>
      }
    >
      {form.status !== "published" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {t("publishFirst")}
        </div>
      ) : (
        <div className="space-y-4">
          {form.visibility !== "public" && (
            /* Aviso para formularios que no están en el escaparate: el enlace
               directo es el único canal de reparto (lo comparte el gestor de la
               entidad o el gestor del formulario). En "privado" (unlisted)
               cualquiera con la URL responde; en "restringido", además hay que
               identificarse. */
            <div className="rounded-xl border border-default bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              {form.visibility === "unlisted" ? t("shareUnlistedNote") : t("sharePrivateNote")}
            </div>
          )}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
              <Globe className="h-4 w-4" /> {t("publicLink")}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={url}
                className="h-10 min-w-0 flex-1 rounded-xl border border-default bg-surface-2 px-3 text-sm text-fg"
              />
              <Button variant="secondary" size="icon" className="shrink-0" onClick={() => copy(url, "Link", "url")}>
                {copyGlyph("url")}
              </Button>
              <Button variant="secondary" size="icon" className="shrink-0" onClick={() => window.open(url, "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {!isLocalhostOrigin() && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                <Wifi className="h-3 w-3" /> Funciona en la misma subred si el firewall permite el puerto {window.location.port || "5173"}.
              </p>
            )}
          </div>

          {isLocalhostOrigin() && networkUrls.length > 0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-900/40 dark:bg-brand-900/20">
              <p className="flex items-center gap-1.5 text-xs font-bold text-brand-800 dark:text-brand-200">
                <Wifi className="h-3.5 w-3.5" /> Enlace para misma subred — otra máquina
              </p>
              <p className="mt-1 text-xs leading-relaxed text-brand-700 dark:text-brand-300">
                Estás en <code className="rounded bg-brand-100 px-1 py-0.5 font-mono dark:bg-brand-900/40">localhost</code> — ese enlace no abre desde otro equipo. Usa este:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  readOnly
                  value={buildNetworkShareUrl(form.slug, networkUrls[0])}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-3 text-sm font-medium text-brand-900 dark:border-brand-800 dark:bg-slate-900 dark:text-brand-100"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="shrink-0 border-brand-200 bg-white hover:bg-brand-50 dark:border-brand-800 dark:bg-slate-800"
                  onClick={() => copy(buildNetworkShareUrl(form.slug, networkUrls[0]), "Link", "net")}
                >
                  {copyGlyph("net")}
                </Button>
                <Button variant="secondary" size="icon" className="shrink-0" onClick={() => window.open(buildNetworkShareUrl(form.slug, networkUrls[0]), "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              {networkUrls.length > 1 && (
                <p className="mt-2 text-[11px] text-brand-700/70 dark:text-brand-300/60">Otras IPs detectadas: {networkUrls.join(", ")}</p>
              )}
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-700/70 dark:text-brand-300/60">
                <MonitorSmartphone className="h-3 w-3" /> Asegúrate que el firewall deja pasar el puerto {window.location.port || "5173"} y que ambos equipos estén en la misma Wi-Fi/LAN.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
              <Code2 className="h-4 w-4" /> {t("embedCode")}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={isLocalhostOrigin() && networkEmbed ? networkEmbed : embed}
                className="h-10 min-w-0 flex-1 rounded-xl border border-default bg-surface-2 px-3 font-mono text-xs text-muted"
              />
              <Button variant="secondary" size="icon" className="shrink-0" onClick={() => copy(isLocalhostOrigin() && networkEmbed ? networkEmbed : embed, "Embed code", "embed")}>
                {copyGlyph("embed")}
              </Button>
            </div>
            {isLocalhostOrigin() && networkUrls.length > 0 && (
              <p className="mt-1 text-xs text-muted">El embed usa el enlace de red cuando estás en localhost.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
