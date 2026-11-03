import { Fingerprint, LogIn, ShieldCheck } from "lucide-react";
import { Modal } from "../ui/Modal.tsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getResolvedApiBase } from "../../lib/api.js";
import "../ui/crystal.css";

export function getIdpLoginUrl() {
  const apiUrl = getResolvedApiBase();
  return `${apiUrl}/auth/login`;
}

export function AuthRequiredModal({ open, onClose }) {
  const { t } = useLanguage();
  const { initiateLogin } = useAuth();
  const aura = "#4f7de8";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("loginRequiredTitle")}
      description={t("loginRequired")}
      size="sm"
      orb={
        <span className="cr-orb cr-orb-lg text-white" style={{ "--cr-orb": aura }} aria-hidden="true">
          <Fingerprint className="h-8 w-8 drop-shadow-sm" strokeWidth={1.7} />
        </span>
      }
      /* Tono `info` de la paleta semántica, el mismo que StatusModal: azul es
         "necesitas identificarte", no un color de marca. */
      aura={aura}
      footer={
        <>
          <button type="button" onClick={onClose} className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2">
            {t("close")}
          </button>
          <button
            type="button"
            onClick={() => { onClose?.(); initiateLogin(); }}
            className="cr-btn cr-btn-blue min-w-[118px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
          >
            <LogIn className="h-4 w-4" strokeWidth={2.2} /> {t("logIn")}
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <p className="text-sm leading-relaxed text-muted">{t("loginRequiredDescription")}</p>
        <div className="cr-chip w-full justify-start gap-2.5 px-3.5 py-2.5" style={{ "--chip-tint": aura }}>
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, ${aura} 88%, white), color-mix(in srgb, ${aura} 62%, black))`,
              boxShadow: `0 6px 14px -8px color-mix(in srgb, ${aura} 70%, transparent)`,
            }}
            aria-hidden="true"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.3} />
          </span>
          <span className="text-[12.5px] leading-snug">{t("loginRequiredSecurity")}</span>
        </div>
      </div>
    </Modal>
  );
}
