/**
 * Plantillas de correo transaccional (HTML + texto plano) de Formularios con IA.
 *
 * Reglas de este módulo:
 *  - Única fuente de verdad de los colores de marca (hex en línea, porque los
 *    clientes de correo no resuelven variables CSS ni tokens de Tailwind). El
 *    orden replica `src/index.css` (@theme) para que diseño y correo no se
 *    desincronicen.
 *  - Tablas con `role="presentation"`, ancho máximo 600px y estilos en línea:
 *    es lo único que renderiza de forma consistente en Gmail/Outlook/Apple Mail.
 *    Los degradados van con `background-color` de respaldo + `background-image`.
 *  - Modo oscuro mediante `<meta color-scheme>` + `@media (prefers-color-scheme)`
 *    (soportado por Apple Mail, iOS, Outlook.com); el resto cae al claro.
 *  - Todo texto dinámico se escapa con `escapeHtml`: nombre, entidad, correo y
 *    usuario nunca deben poder inyectar HTML en el correo.
 */

export const brandColors = {
  brand: "#00D2FF",
  brandLight: "#2EDAFF",
  brandDark: "#0097B8",
  brandDeep: "#005C70",
  brandInk: "#003B47",
  brandSoft: "#EBFBFF",
  ink: "#0F172A",
  inkMuted: "#64748B",
  surface: "#FFFFFF",
  appBg: "#EDF3F9",
  line: "#E8ECF2",
  white: "#FFFFFF",
  danger: "#EF4444",
};

// Degradados de marca (mismos pasos que `btn-primary` de `src/index.css`).
const BRAND_GRADIENT =
  "linear-gradient(145deg,#2EDAFF 0%,#00D2FF 52%,#00B5DB 100%)";
const ACCENT_BAR =
  "linear-gradient(90deg,#2EDAFF 0%,#00D2FF 45%,#0097B8 100%)";
const HERO_BG =
  "linear-gradient(150deg,#071A22 0%,#0A3441 55%,#0B4D61 100%)";
const CTA_TEXT = "#052A33";
const CTA_SHADOW = "0 12px 26px -10px rgba(0,210,255,0.55)";

export const ROLE_LABELS = {
  super_admin: { es: "Superadministrador", en: "Super administrator" },
  entity_admin: { es: "Administrador de entidad", en: "Entity administrator" },
  form_creator: { es: "Creador de formularios", en: "Form creator" },
};

export function roleLabel(role, language = "es") {
  const entry = ROLE_LABELS[role];
  if (!entry) return role || "";
  return entry[language] || entry.es;
}

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

/**
 * Envoltura común premium: fondo, tarjeta con héroe oscuro y acento de marca,
 * contenido y pie. Los colores claros van en línea; el modo oscuro se aplica
 * con clases vía media query (degradación elegante en clientes sin soporte).
 */
function layout({ language, logoUrl, appName, title, eyebrow, badge, preheader, intro, body, footer }) {
  const c = brandColors;
  const lang = language === "en" ? "en" : "es";
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="" style="display:block;border-radius:8px;" />`
    : "";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; padding:0; background:${c.appBg}; font-family:${FONT_STACK}; color:${c.ink}; -webkit-font-smoothing:antialiased; }
    .frame { width:100%; background:${c.appBg}; }
    .card { width:100%; max-width:600px; margin:0 auto; background:${c.surface}; border:1px solid ${c.line}; border-radius:20px; overflow:hidden; }
    .content-title { color:${c.ink}; }
    .body-text { color:${c.inkMuted}; }
    .panel { background:${c.brandSoft}; border:1px solid #d5f2fb; }
    .row-line { border-color:#e3eef5; }
    .label { color:${c.inkMuted}; }
    .value { color:${c.ink}; }
    .note { color:${c.inkMuted}; }
    .sec-label { color:${c.brandDark}; }
    .link-url, .link-url a { color:${c.brandDeep}; }
    .footer-text { color:#8b95a6; }
    .divider { border-color:${c.line}; }
    @media (prefers-color-scheme: dark) {
      body, .frame { background:#05070C !important; }
      .card { background:#0E131B !important; border-color:#232B38 !important; }
      .content-title { color:#E9EDF4 !important; }
      .body-text, .note { color:#8A93A6 !important; }
      .panel { background:#0B1A20 !important; border-color:#123540 !important; }
      .row-line { border-color:#1C2733 !important; }
      .label { color:#7C8699 !important; }
      .value { color:#E9EDF4 !important; }
      .footer-text { color:#6C7688 !important; }
      .divider { border-color:#232B38 !important; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || title)}</div>
  <table role="presentation" class="frame" width="100%" cellpadding="0" cellspacing="0" style="background:${c.appBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${c.surface};border:1px solid ${c.line};border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:6px;line-height:6px;font-size:0;background:${c.brandDark};background-image:${ACCENT_BAR};border-radius:20px 20px 0 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="background-color:#0A3441;background-image:${HERO_BG};padding:36px 36px 34px 36px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${logoUrl ? `<td style="vertical-align:middle;width:52px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;background:#ffffff;border-radius:14px;">${logo}</td></tr></table></td>` : ""}
                        <td style="vertical-align:middle;padding-left:${logoUrl ? "14px" : "0"};">
                          <span style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:${c.brand};">${escapeHtml(eyebrow || appName)}</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:18px 0 0 0;font-size:25px;line-height:1.28;font-weight:800;color:#ffffff;letter-spacing:-.01em;">${escapeHtml(title)}</h1>
                    ${
                      badge
                        ? `<span style="display:inline-block;margin-top:14px;padding:6px 12px;border-radius:999px;background:rgba(0,210,255,0.14);border:1px solid rgba(0,210,255,0.4);font-size:12px;font-weight:700;letter-spacing:.02em;color:${c.brand};">${escapeHtml(badge)}</span>`
                        : ""
                    }
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="content" style="padding:34px 36px 10px 36px;">
                  ${intro ? `<p class="body-text" style="margin:0 0 20px 0;font-size:15px;line-height:1.65;">${intro}</p>` : ""}
                  ${body}
                </td>
              </tr>
              <tr>
                <td style="padding:22px 36px 30px 36px;">
                  <hr class="divider" style="border:none;border-top:1px solid ${c.line};margin:0 0 16px 0;" />
                  <p class="note" style="margin:0;font-size:12.5px;line-height:1.65;">${footer}</p>
                  <p class="footer-text" style="margin:14px 0 0 0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;">${escapeHtml(appName)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function dataRow(label, value) {
  const c = brandColors;
  return `
          <tr>
            <td class="label row-line" style="padding:12px 0;border-bottom:1px solid #e3eef5;font-size:12px;letter-spacing:.02em;text-transform:uppercase;font-weight:600;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
            <td class="value row-line" style="padding:12px 0 12px 18px;border-bottom:1px solid #e3eef5;font-size:14px;font-weight:600;text-align:right;word-break:break-all;">${value}</td>
          </tr>`;
}

function ctaButton(url, label) {
  const c = brandColors;
  return `
        <p style="margin:22px 0 0 0;text-align:center;">
          <a href="${escapeHtml(url)}" style="display:inline-block;background-color:${c.brandDark};background-image:${BRAND_GRADIENT};color:${CTA_TEXT};text-decoration:none;font-size:15px;font-weight:800;letter-spacing:.01em;border-radius:12px;padding:16px 34px;box-shadow:${CTA_SHADOW};">${escapeHtml(label)}</a>
        </p>`;
}

function section(label, content) {
  const c = brandColors;
  return `
        <div style="margin:0 0 22px 0;">
          <p class="sec-label" style="margin:0 0 9px 0;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;">${escapeHtml(label)}</p>
          <div class="body-text" style="font-size:14.5px;line-height:1.7;">${content}</div>
        </div>`;
}

function accessPanel(rows) {
  return `
          <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;background:${brandColors.brandSoft};border:1px solid #d5f2fb;">
            <tr><td style="padding:8px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
          </table>`;
}

function fallbackLink(lead, url) {
  const c = brandColors;
  return `
        <p class="note" style="margin:18px 0 6px 0;font-size:12.5px;line-height:1.6;">${escapeHtml(lead)}</p>
        <p class="link-url" style="margin:0;font-family:${MONO_STACK};font-size:12.5px;line-height:1.6;word-break:break-all;"><a class="link-url" href="${escapeHtml(url)}" style="text-decoration:underline;">${escapeHtml(url)}</a></p>`;
}

const COPY = {
  es: {
    subjectActivation: "Activa tu cuenta de Formularios con IA",
    subjectCredentials: "Tu cuenta de Formularios con IA",
    eyebrow: "Formularios con IA",
    title: "Tu cuenta está lista",
    greeting: "Hola,",
    lApertura: "Apertura",
    lContexto: "Contexto de la cuenta",
    lCta: "Llamada a la acción",
    lDetalles: "Detalles de acceso",
    lSeguridad: "Recomendación de seguridad",
    apertura:
      "Te damos la bienvenida a Formularios con IA, la plataforma que permite a tu entidad crear, gestionar y analizar formularios con el respaldo de inteligencia artificial.",
    contexto: (entityName, roleText) =>
      `Se ha creado una cuenta para ti${
        roleText ? ` con el rol de ${roleText}` : ""
      }${entityName ? ` dentro de ${entityName}` : ""}. Desde este momento tienes acceso a tu panel de trabajo, donde podrás gestionar tus formularios, consultar respuestas y revisar estadísticas en tiempo real.`,
    ctaLead: (ttl) =>
      `Para comenzar, establece tu contraseña de acceso en el siguiente enlace. Por seguridad, este enlace caduca en ${ttl} horas:`,
    activateCta: "Establecer mi contraseña",
    fallbackLead:
      "Si el botón no funciona, copia y pega esta dirección en tu navegador:",
    accesoLead: "Una vez configurada tu contraseña, podrás acceder desde:",
    seguridad:
      "Por tu seguridad, te recomendamos no compartir este correo ni tu contraseña con nadie. Si detectas algún acceso no autorizado, contacta de inmediato con el administrador de tu entidad.",
    user: "Usuario",
    email: "Correo",
    entity: "Entidad",
    role: "Rol",
    accessUrl: "URL de acceso",
    password: "Contraseña",
    loginCta: "Iniciar sesión",
    credentialsNote:
      "Por seguridad, cambia esta contraseña la primera vez que entres.",
    footerActivation:
      "Si no esperabas este correo, ignóralo: tu contraseña no cambió. Si tienes dudas, avisa a quien administra el panel.",
    footerCredentials:
      "Guarda estos datos en un lugar seguro y no los compartas. Si no esperabas este correo, avisa a quien administra el panel.",
    preheaderActivation: "Establece tu contraseña para activar tu cuenta.",
    preheaderCredentials: "Tu cuenta de Formularios con IA ya está lista.",
    textTitle: "Formularios con IA — tu cuenta está lista",
  },
  en: {
    subjectActivation: "Activate your Formularios con IA account",
    subjectCredentials: "Your Formularios con IA account",
    eyebrow: "Formularios con IA",
    title: "Your account is ready",
    greeting: "Hi,",
    lApertura: "Welcome",
    lContexto: "Account details",
    lCta: "Next step",
    lDetalles: "Access details",
    lSeguridad: "Security note",
    apertura:
      "Welcome to Formularios con IA, the platform that lets your organization create, manage and analyze forms with the support of artificial intelligence.",
    contexto: (entityName, roleText) =>
      `An account has been created for you${
        roleText ? ` with the ${roleText} role` : ""
      }${entityName ? ` within ${entityName}` : ""}. From now on you have access to your workspace, where you can manage your forms, review responses and check real-time statistics.`,
    ctaLead: (ttl) =>
      `To get started, set your access password using the link below. For your security, this link expires in ${ttl} hours:`,
    activateCta: "Set my password",
    fallbackLead:
      "If the button does not work, copy and paste this address into your browser:",
    accesoLead: "Once your password is set, you can sign in from:",
    seguridad:
      "For your security, we recommend that you do not share this email or your password with anyone. If you notice any unauthorized access, contact your organization's administrator immediately.",
    user: "Username",
    email: "Email",
    entity: "Entity",
    role: "Role",
    accessUrl: "Access URL",
    password: "Password",
    loginCta: "Sign in",
    credentialsNote:
      "For your security, change this password the first time you sign in.",
    footerActivation:
      "If you did not expect this email, ignore it: your password did not change. If in doubt, contact your panel administrator.",
    footerCredentials:
      "Keep these details safe and do not share them. If you did not expect this email, contact your panel administrator.",
    preheaderActivation: "Set your password to activate your account.",
    preheaderCredentials: "Your Formularios con IA account is ready.",
    textTitle: "Formularios con IA — your account is ready",
  },
};

/**
 * Correo de bienvenida/activación.
 *
 * `mode`:
 *  - "activation"  (variante A): NO incluye contraseña; el CTA es el enlace de
 *    activación firmado. `activationUrl` y `ttlHours` son obligatorios.
 *  - "credentials" (variante B): incluye la contraseña temporal y el CTA es el
 *    inicio de sesión.
 *
 * Devuelve `{ subject, html, text }`.
 */
export function welcomeEmail({
  language = "es",
  mode = "activation",
  logoUrl,
  appName = "Formularios con IA",
  name,
  entityName,
  role,
  username,
  email,
  password,
  url,
  activationUrl,
  ttlHours = 24,
}) {
  const lang = language === "en" ? "en" : "es";
  const t = COPY[lang];
  const roleText = role ? roleLabel(role, lang) : "";
  const isActivation = mode === "activation";

  const displayName = name || username || email || "";
  const greeting = `<p class="content-title" style="margin:0 0 26px 0;font-size:18px;font-weight:700;">${escapeHtml(
    t.greeting,
  )} <strong>${escapeHtml(displayName)}</strong>:</p>`;

  const aperturaSection = section(
    t.lApertura,
    `<p style="margin:0;">${escapeHtml(t.apertura)}</p>`,
  );
  const contextoSection = section(
    t.lContexto,
    `<p style="margin:0;">${escapeHtml(t.contexto(entityName, roleText))}</p>`,
  );
  const seguridadSection = section(
    t.lSeguridad,
    `<p style="margin:0;">${escapeHtml(t.seguridad)}</p>`,
  );

  let body;
  let textLines;
  if (isActivation) {
    const cta = section(
      t.lCta,
      `<p style="margin:0;">${escapeHtml(t.ctaLead(ttlHours))}</p>${ctaButton(
        activationUrl,
        t.activateCta,
      )}${fallbackLink(t.fallbackLead, activationUrl)}`,
    );
    const detalles = section(
      t.lDetalles,
      `<p style="margin:0 0 14px 0;">${escapeHtml(t.accesoLead)}</p>${accessPanel(
        dataRow(t.accessUrl, escapeHtml(url)) +
          dataRow(t.user, escapeHtml(username || email)),
      )}`,
    );
    body =
      greeting + aperturaSection + contextoSection + cta + detalles + seguridadSection;

    textLines = [
      t.textTitle,
      "",
      `${t.greeting} ${displayName}:`,
      "",
      t.lApertura.toUpperCase(),
      t.apertura,
      "",
      t.lContexto.toUpperCase(),
      t.contexto(entityName, roleText),
      "",
      t.lCta.toUpperCase(),
      t.ctaLead(ttlHours),
      `${t.activateCta}: ${activationUrl}`,
      "",
      t.lDetalles.toUpperCase(),
      `${t.accessUrl}: ${url}`,
      `${t.user}: ${username || email}`,
      "",
      t.lSeguridad.toUpperCase(),
      t.seguridad,
    ];
  } else {
    const rows =
      dataRow(t.user, escapeHtml(username || email)) +
      dataRow(t.email, escapeHtml(email)) +
      (entityName ? dataRow(t.entity, escapeHtml(entityName)) : "") +
      (roleText ? dataRow(t.role, escapeHtml(roleText)) : "") +
      dataRow(
        t.password,
        `<span style="font-family:${MONO_STACK};font-size:15px;letter-spacing:.06em;">${escapeHtml(password)}</span>`,
      );
    const detalles = section(
      t.lDetalles,
      `<p style="margin:0 0 14px 0;">${escapeHtml(t.accesoLead)}</p>${accessPanel(
        rows,
      )}${ctaButton(url, t.loginCta)}`,
    );
    body = greeting + aperturaSection + contextoSection + detalles + seguridadSection;

    textLines = [
      t.textTitle,
      "",
      `${t.greeting} ${displayName}:`,
      "",
      t.lApertura.toUpperCase(),
      t.apertura,
      "",
      t.lContexto.toUpperCase(),
      t.contexto(entityName, roleText),
      "",
      t.lDetalles.toUpperCase(),
      `${t.accessUrl}: ${url}`,
      `${t.user}: ${username || email}`,
      `${t.password}: ${password}`,
      "",
      t.credentialsNote,
      "",
      t.lSeguridad.toUpperCase(),
      t.seguridad,
    ];
  }

  const html = layout({
    language: lang,
    logoUrl,
    appName,
    title: t.title,
    eyebrow: t.eyebrow,
    badge: roleText || null,
    preheader: isActivation ? t.preheaderActivation : t.preheaderCredentials,
    body,
    footer: isActivation ? t.footerActivation : t.footerCredentials,
  });

  return {
    subject: isActivation ? t.subjectActivation : t.subjectCredentials,
    html,
    text: textLines.join("\n"),
  };
}

/** Correo de recuperación por código numérico. */
export function resetEmail({ language = "es", code, ttlMinutes = 60, logoUrl }) {
  const lang = language === "en" ? "en" : "es";
  const c = brandColors;
  const minutes = ttlMinutes || 60;
  const copy =
    lang === "en"
      ? {
          title: "Your recovery code",
          intro:
            "You received this email because someone (presumably you) asked to reset the password of your administration account.",
          note: `Enter this code in the recovery step to choose a new password. It expires in ${minutes} minutes and can be used once.`,
          footer:
            "If you did not request this email, ignore it: your password did not change.",
          subject: "Your recovery code",
          preheader: "Use this code to reset your password.",
          textTitle: "Formularios con IA — password recovery",
        }
      : {
          title: "Tu código de recuperación",
          intro:
            "Hola, recibiste este correo porque alguien (supuestamente tú) pidió restablecer la contraseña de tu cuenta de administración.",
          note: `Introduce este código en el paso de recuperación para elegir una contraseña nueva. Caduca en ${minutes} minutos y es de un solo uso.`,
          footer: "Si no pediste este correo, ignóralo: tu contraseña no cambió.",
          subject: `Tu código de recuperación: ${code}`,
          preheader: "Usa este código para restablecer tu contraseña.",
          textTitle: "Formularios con IA — recuperación de contraseña",
        };

  const body = `
        <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0 0;border-radius:16px;background:${c.brandSoft};border:1px solid #d5f2fb;">
          <tr>
            <td style="padding:24px 20px;text-align:center;">
              <span style="font-family:${MONO_STACK};font-size:34px;font-weight:800;letter-spacing:.3em;color:${c.brandDeep};">${escapeHtml(code)}</span>
            </td>
          </tr>
        </table>
        <p class="note" style="margin:20px 0 0 0;text-align:center;font-size:13.5px;line-height:1.65;">${copy.note}</p>`;

  const html = layout({
    language: lang,
    logoUrl,
    appName: "Formularios con IA",
    title: copy.title,
    eyebrow: "Formularios con IA",
    preheader: copy.preheader,
    intro: copy.intro,
    body,
    footer: copy.footer,
  });

  const text = [
    copy.textTitle,
    "",
    lang === "en" ? `Your recovery code: ${code}` : `Tu código de recuperación: ${code}`,
    copy.note,
    copy.footer,
  ].join("\n");

  return { subject: copy.subject, html, text };
}
