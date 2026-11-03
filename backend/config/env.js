import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Proveedor de Identidad Digital (CGD / Soberanía - Keycloak)
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL,
  oidcRealm: process.env.OIDC_REALM,
  oidcClientId: process.env.OIDC_CLIENT_ID,
  oidcRedirectUri: process.env.OIDC_REDIRECT_URI,
  oidcLoginRedirectUri: process.env.OIDC_LOGIN_REDIRECT_URI || "http://localhost:5173/auth/callback",
  oidcPostLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI || "http://localhost:5173/",
  frontendUrl:
    process.env.FRONTEND_URL ||
    String(process.env.CLIENT_URL || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)[0] ||
    "http://localhost:5173",

  // Configuración de IA Remota (DashScope)
  aiProvider: process.env.AI_PROVIDER || "dashscope",
  aiApiKey: process.env.AI_API_KEY,
  aiBaseUrl: process.env.AI_BASE_URL,
  aiModel: process.env.AI_MODEL || "qwen-coder-plus",
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS) || 10000,
  // Peticiones simultaneas contra el proveedor. Muchos gateways (LLM7, por
  // ejemplo) solo admiten UNA en vuelo por cuenta y devuelven 429 al resto, asi
  // que el valor por defecto es 1: serializar cuesta segundos, pero un 429
  // cuesta tandas enteras de preguntas sin tipo. Si el proveedor aguanta mas,
  // se sube por .env.
  aiMaxParallel: Math.max(1, parseInt(process.env.AI_MAX_PARALLEL) || 1),
  // Reintentos ante 429/5xx/timeout. El SDK se configura sin reintentos propios
  // para no multiplicar esperas: los controla remote.service.js y respeta el
  // Retry-After que mande el proveedor.
  aiMaxRetries: Math.max(0, parseInt(process.env.AI_MAX_RETRIES) || 1),

  // ── Ollama Local Inference ───────────────────────────────────────────
  // URL de la API de Ollama (por defecto http://localhost:11434)
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
    // Modelo a usar (ej. llama3.1:8b, qwen2.5:7b, mistral:7b)
    model: process.env.OLLAMA_MODEL || "llama3.1:8b",
    // Modelo para embeddings (opcional)
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
    // Timeout en ms (por defecto 2 min para inferencia local)
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS) || 120000,
    // Reintentos para Ollama
    maxRetries: Math.max(0, parseInt(process.env.OLLAMA_MAX_RETRIES) || 2),
    // Habilitar/deshabilitar fallback a Ollama
    enabled: (process.env.OLLAMA_ENABLED || "true").toLowerCase() === "true",
  },

  // ── RBAC + auth local ────────────────────────────────────────────────
  // Secreto para el contexto cifrado de las URLs de acceso por entidad/rol.
  // Si no se define, deriva de JWT_SECRET (documentado, no silencioso).
  urlSecret: process.env.URL_SECRET || null,
  // Bootstrap del único super_admin (solo si ambos están definidos).
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || null,
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || null,
  superAdminName: process.env.SUPER_ADMIN_NAME || "Super Administrador",
  // Endurecimiento del login local.
  localLoginMaxAttempts: parseInt(process.env.LOCAL_LOGIN_MAX_ATTEMPTS) || 8,
  localLoginLockMinutes: parseInt(process.env.LOCAL_LOGIN_LOCK_MINUTES) || 15,
  passwordResetTtlMinutes: parseInt(process.env.PASSWORD_RESET_TTL_MINUTES) || 60,

  // ── Política de sesiones (idle + vida absoluta por rol) ───────────────
  // Minutos de INACTIVIDAD real (sin interacción del usuario) antes de cerrar
  // la sesión. El super_admin, la cuenta más sensible, es la más estricta.
  sessionIdleSuperMinutes: parseInt(process.env.SESSION_IDLE_SUPER_MIN) || 15,
  sessionIdleEntityMinutes: parseInt(process.env.SESSION_IDLE_ENTITY_MIN) || 30,
  sessionIdleCreatorMinutes: parseInt(process.env.SESSION_IDLE_CREATOR_MIN) || 60,
  // Respaldo para roles sin regla propia (invitado / cuentas legacy).
  sessionIdleDefaultMinutes: parseInt(process.env.SESSION_IDLE_DEFAULT_MIN) || 60,
  // Vida máxima absoluta: ninguna sesión se renueva más allá de esto, haya o no
  // actividad. 480 = 8 h.
  sessionAbsoluteMinutes: parseInt(process.env.SESSION_ABSOLUTE_MIN) || 480,
  // Sesiones concurrentes máximas por rol; al superar el tope se cierra la más
  // antigua.
  sessionMaxConcurrentSuper: parseInt(process.env.SESSION_MAX_CONCURRENT_SUPER) || 3,
  sessionMaxConcurrentEntity: parseInt(process.env.SESSION_MAX_CONCURRENT_ENTITY) || 5,
  sessionMaxConcurrentCreator: parseInt(process.env.SESSION_MAX_CONCURRENT_CREATOR) || 5,
  sessionMaxConcurrentDefault: parseInt(process.env.SESSION_MAX_CONCURRENT_DEFAULT) || 5,

  // ── Correo transaccional (recuperación + bienvenida/activación) ──────
  // "ethereal" (pruebas, solo dev) | "smtp" (real) | vacío = sin correo.
  mailProvider: (process.env.MAIL_PROVIDER || "").toLowerCase() || null,
  smtpHost: process.env.SMTP_HOST || null,
  smtpPort: process.env.SMTP_PORT || "587",
  smtpUser: process.env.SMTP_USER || null,
  smtpPass: process.env.SMTP_PASS || null,
  // TLS implícito. "true" fuerza secure; si no se define, se infiere del puerto.
  mailSecure: process.env.MAIL_SECURE === undefined ? null : process.env.MAIL_SECURE === "true",
  // Ruta a la imagen de marca del correo (favicon). Si no se define, se busca el
  // favicon del frontend y, si no existe, se usa `${FRONTEND_URL}/favicon.png`.
  mailLogoPath: process.env.MAIL_LOGO_PATH || null,
  mailFrom: process.env.MAIL_FROM || null,
  // Variante del correo de alta:
  //   false (por defecto) = A: sin contraseña, con enlace de activación.
  //   true                = B: con contraseña temporal + cambio forzado.
  mailSendCredentials: (process.env.MAIL_SEND_CREDENTIALS || "false").toLowerCase() === "true",
  // Caducidad del enlace de activación (horas).
  mailActivationTtlHours: parseInt(process.env.MAIL_ACTIVATION_TTL_HOURS) || 24,
  // Caducidad de la contraseña temporal en la variante B (horas).
  mailTempPasswordTtlHours: parseInt(process.env.MAIL_TEMP_PASSWORD_TTL_HOURS) || 72,
};

export const isProd = env.nodeEnv === "production";