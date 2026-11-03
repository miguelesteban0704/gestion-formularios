import { ShieldCheck, Fingerprint, Mail, AtSign } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import "./respondent.css";

/**
 * Ficha premium del encuestado verificado por el IDP.
 *
 * Solo tiene sentido para respuestas que pasaron por el flujo de identidad de
 * un formulario privado (`respondentSub` presente): muestra el nombre, el
 * correo, el usuario y el identificador (`sub`) que aportó el Proveedor de
 * Identidad. Se reutiliza en el detalle de la bandeja de entrada y en la
 * sección de estadísticas, para no duplicar el diseño.
 */
export function RespondentCard({ response, className }) {
  const { t } = useLanguage();
  if (!response) return null;

  const name = response.respondentName || response.respondentEmail || "";
  const sub = response.respondentSub || "";

  return (
    <article className={cn("idp-card", className)}>
      <div className="idp-card__inner">
        <span className="idp-card__scan" aria-hidden="true" />

        <header className="idp-head">
          <span className="idp-badge">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
            {t("idpVerified")}
          </span>
          <span className="idp-provider">
            <Fingerprint className="h-4 w-4" strokeWidth={1.7} />
            {t("idpProvider")}
          </span>
        </header>

        <div className="idp-body">
          <span className="idp-ring" aria-hidden="true">
            <Avatar name={name || "?"} className="idp-avatar" />
          </span>
          <div className="idp-id">
            <h3 className="idp-name">{name || t("anonymousRespondent")}</h3>
            {response.respondentUsername && (
              <p className="idp-line">
                <AtSign className="h-3.5 w-3.5" strokeWidth={1.8} />
                {response.respondentUsername}
              </p>
            )}
            {response.respondentEmail && (
              <p className="idp-line">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                {response.respondentEmail}
              </p>
            )}
          </div>
        </div>

        <footer className="idp-foot">
          <span className="idp-foot-label">{t("idpIdentifier")}</span>
          {sub ? (
            <span className="idp-sub" title={sub}>
              {sub.length > 18 ? `${sub.slice(0, 10)}…${sub.slice(-6)}` : sub}
            </span>
          ) : (
            <span className="idp-sub idp-sub--none">—</span>
          )}
        </footer>
      </div>
    </article>
  );
}
