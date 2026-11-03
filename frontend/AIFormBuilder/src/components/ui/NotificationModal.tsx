import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import type { Tone } from "../../feedback/types";

/* Modal genérico con slots header/body/footer. Cuando `header` es string, el
   <Modal/> asocia aria-labelledby (y si `body` también es string, lo expone
   como `description` → aria-describedby). Con `body` vacío muestra el estado
   vacío traducido. */

export interface NotificationModalProps {
  open: boolean;
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  tone?: Tone;
  onClose?: () => void;
}

export function NotificationModal({ open, header, body, footer, tone = "info", onClose }: NotificationModalProps) {
  const { t } = useLanguage();
  const aura =
    tone === "success"
      ? "var(--color-success)"
      : tone === "error"
        ? "var(--color-danger)"
        : tone === "warning"
          ? "var(--color-warning)"
          : "var(--color-info)";
  const bodyIsString = typeof body === "string";
  const empty = <p className="text-[13.5px] leading-[1.6] text-muted">{t("notificationsEmpty")}</p>;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={header}
      description={bodyIsString ? body : undefined}
      size="md"
      aura={aura}
      footer={footer}
    >
      {bodyIsString ? null : body ?? empty}
    </Modal>
  );
}