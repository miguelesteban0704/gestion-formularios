import api from "../lib/api.js";

/* Peticiones cuyo 401 NO significa "la sesión ha muerto". Son la propia puerta
 * de entrada (credenciales erróneas), la recuperación de acceso o la
 * comprobación de una sesión que se está PROBANDO (arranque / login recién
 * emitido). Sin esta marca, el interceptor de `lib/api.js` trata cualquier 401
 * con token presente como caducidad de sesión: borra la ranura y navega a
 * `/login`, que es la puerta del IDP. Así, un simple error de credenciales
 * cerraría la sesión en vez de mostrar el error en la propia puerta. */
const NO_LOGOUT = { __noLogout: true };

//-------Auth-------
export const authApi = {
  me: () => api.get("/auth/me", NO_LOGOUT).then((r) => r.data.data),
  updateProfile: (payload) => api.put("/auth/profile", payload).then((r) => r.data.data.user),
  deleteAccount: () => api.delete("/auth/me").then((r) => r.data),
  getSessions: () => api.get("/auth/sessions").then((r) => r.data.data),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`).then((r) => r.data),
  revokeOtherSessions: () => api.post("/auth/sessions/revoke-others").then((r) => r.data),
  logoutSession: () => api.post("/auth/sessions/logout").then((r) => r.data),
  // Política de sesiones: estado y actividad.
  currentSession: () => api.get("/auth/sessions/current").then((r) => r.data.data),
  activity: () => api.post("/auth/activity").then((r) => r.data),
};
//-------Workspace wide-------
export const insightsApi = {
  overview: () => api.get("/insights").then((r) => r.data.data.insights),
  inbox: (params) => api.get("/inbox", { params }).then((r) => r.data.data),
};
export const notificationApi = {
  list: () => api.get("/notifications").then((r) => r.data.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch("/notifications/read-all").then((r) => r.data),
};
//-------Forms-------
export const formApi = {
  list: (params) => api.get("/forms", { params }).then((r) => r.data.data.forms),
  listPublic: (params) => api.get("/public/forms", { params }).then((r) => r.data.data.forms),
  get: (id) => api.get(`/forms/${id}`).then((r) => r.data.data.form),
  getPublic: (slug) => api.get(`/public/forms/${slug}`).then((r) => r.data.data.form),

  create: (payload) => api.post("/forms", payload).then((r) => r.data.data.form),
  update: (id, payload) => api.put(`/forms/${id}`, payload).then((r) => r.data.data.form),
  /* Visibilidad en endpoint propio (auditado en el backend). Se separa del
     autosave para que el cambio de público/privado/solo-por-enlace quede
     registrado como un evento único. */
  setVisibility: (id, visibility) =>
    api.patch(`/forms/${id}/visibility`, { visibility }).then((r) => r.data.data.form),
  publish: (id, publish = true) =>
    api.post(`/forms/${id}/publish`, { publish }).then((r) => r.data.data.form),
  duplicate: (id) => api.post(`/forms/${id}/duplicate`).then((r) => r.data.data.form),
  remove: (id) => api.delete(`/forms/${id}`).then((r) => r.data),

  /* Logo del formulario. No entra en el `update` de ajustes: es un archivo, va
     como multipart en su propia petición, y el backend devuelve el formulario
     ya actualizado (no solo la ruta) para que el panel no tenga que reconstruir
     el objeto a mano. */
  uploadLogo: (id, file) => {
    const body = new FormData();
    body.append("logo", file);
    return api
      .post(`/forms/${id}/logo`, body, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data.form);
  },
  removeLogo: (id) => api.delete(`/forms/${id}/logo`).then((r) => r.data.data.form),
};
//-------Responses and Analytics-------
export const responseApi = {
  submit: (slug, payload) =>
    api.post(`/public/forms/${slug}/respond`, payload).then((r) => r.data.data),
  list: (formId, params) =>
    api.get(`/forms/${formId}/responses`, { params }).then((r) => r.data.data),
  analytics: (formId) =>
    api.get(`/forms/${formId}/analytics`).then((r) => r.data.data.analytics),
  remove: (id) => api.delete(`/responses/${id}`).then((r) => r.data),
  exportCsv: (formId) =>
    api.get(`/forms/${formId}/responses/export`, { responseType: "text" }).then((r) => r.data),
};
//-------Settings-------
export const settingsApi = {
  get: () => api.get("/settings").then((r) => r.data.data),
  updateProfile: (payload) => api.patch("/settings/profile", payload).then((r) => r.data.data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("avatar", file);
    return api.post("/settings/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data.data);
  },
  deleteAvatar: () => api.delete("/settings/avatar").then((r) => r.data),
  updateNotifications: (payload) => api.patch("/settings/notifications", payload).then((r) => r.data.data),
  updateAppearance: (payload) => api.patch("/settings/appearance", payload).then((r) => r.data.data),
  getSessions: () => api.get("/settings/sessions").then((r) => r.data.data),
  revokeSession: (id) => api.delete(`/settings/sessions/${id}`).then((r) => r.data),
  revokeOtherSessions: () => api.delete("/settings/sessions").then((r) => r.data),
  exportData: (format = "json") =>
    api.get("/settings/export", { params: { format }, responseType: "blob" }).then((r) => r),
  deactivateAccount: (confirmWord) =>
    api.post("/settings/deactivate", { confirmWord }).then((r) => r.data),
  deleteAccount: (confirmWord) =>
    api.delete("/settings/account", { data: { confirmWord } }).then((r) => r.data),
  changePassword: (payload) =>
    api.post("/settings/password", payload).then((r) => r.data),
  twoFASetup: () => api.post("/settings/2fa/setup").then((r) => r.data.data),
  twoFAVerify: (code) =>
    api.post("/settings/2fa/verify", { code }).then((r) => r.data.data),
  twoFADisable: (code) =>
    api.post("/settings/2fa/disable", { code }).then((r) => r.data.data),
};
//-------Guest (sin sesión)-------
export const guestApi = {
  listForms: (params) => api.get("/guest/forms", { params }).then((r) => r.data.data),
  getForm: (slug, rid) =>
    api.get(`/guest/forms/${slug}`, {
      headers: rid ? { "X-Idp-Respondent": `Bearer ${rid}` } : {},
    }).then((r) => r.data.data.form),
  submit: (slug, payload, rid) =>
    api.post(`/guest/forms/${slug}/respond`, payload, {
      headers: rid ? { "X-Idp-Respondent": `Bearer ${rid}` } : {},
    }).then((r) => r.data.data),
  listEntities: () => api.get("/guest/entities").then((r) => r.data.data.entities),
  /** Sesión anónima: el invitado crea/edita con dueño propio (constructor, IA, plantillas). */
  session: () => api.post("/guest/session").then((r) => r.data.data),
  formStats: (slug) => api.get(`/guest/forms/${slug}/stats`).then((r) => r.data.data),
  insights: () => api.get("/guest/stats").then((r) => r.data.data.insights),
};
//-------Auth local (panel por rol)-------
export const localAuthApi = {
  /* `door` ata el login a una puerta de entidad/rol (`/a/:slug`): { slug, ctx }.
     Sin ella, el login es el del portal fijo del super_admin. */
  login: (identifier, password, door = {}) =>
    api.post(
      "/auth/local/login",
      { identifier, password, slug: door.slug, ctx: door.ctx },
      NO_LOGOUT,
    ).then((r) => r.data.data),
  registerByAccess: (slug, payload) =>
    api.post(`/auth/local/register-by-access/${encodeURIComponent(slug)}`, payload, NO_LOGOUT).then((r) => r.data.data),
  logout: () => api.post("/auth/local/logout").then((r) => r.data),
  register: (payload) => api.post("/auth/local/register", payload, NO_LOGOUT).then((r) => r.data.data),
  forgot: (email) =>
    api.post("/auth/local/forgot", { email }, { ...NO_LOGOUT, __noMailDialogs: true }).then(
      (r) => r.data.data,
    ),
  /* Correo esperado del Super Admin para validar la recuperación de acceso.
     Endpoint público: no requiere sesión, se consulta antes de autenticar. */
  getSuperAdminEmail: () =>
    api.get("/auth/local/super-admin-email", NO_LOGOUT).then((r) => r.data.data),
  reset: (token, password) => api.post("/auth/local/reset", { token, password }, NO_LOGOUT).then((r) => r.data.data),
};
//-------Administración (super_admin / entity_admin)-------
export const adminApi = {
  users: (params) => api.get("/admin/users", { params }).then((r) => r.data.data),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload).then((r) => r.data.data.user),
  resendWelcome: (id, payload) => api.post(`/admin/users/${id}/resend-welcome`, payload).then((r) => r.data.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  entities: (params) => api.get("/admin/entities", { params }).then((r) => r.data.data),
  createEntity: (payload) => api.post("/admin/entities", payload).then((r) => r.data.data.entity),
  updateEntity: (id, payload) => api.patch(`/admin/entities/${id}`, payload).then((r) => r.data.data.entity),
  deleteEntity: (id) => api.delete(`/admin/entities/${id}`).then((r) => r.data),
  categories: () => api.get("/admin/categories").then((r) => r.data.data),
  accessUrls: (params) => api.get("/admin/access-urls", { params }).then((r) => r.data.data),
  createAccessUrl: (payload) => api.post("/admin/access-urls", payload).then((r) => r.data.data.url),
  toggleAccessUrl: (id, isActive) => api.patch(`/admin/access-urls/${id}`, { isActive }).then((r) => r.data.data.url),
  regenerateAccessUrl: (id) => api.post(`/admin/access-urls/${id}/regenerate`).then((r) => r.data.data.url),
  deleteAccessUrl: (id) => api.delete(`/admin/access-urls/${id}`).then((r) => r.data),
  audit: (params) => api.get("/admin/audit", { params }).then((r) => r.data.data),
  publicForms: (params) => api.get("/admin/public-forms", { params }).then((r) => r.data.data),
  publicStats: (params) => api.get("/admin/public-stats", { params }).then((r) => r.data.data),
  publicFormStats: (id) => api.get(`/admin/public-forms/${id}/stats`).then((r) => r.data.data.analytics),
  publicFormExport: (id) =>
    api.get(`/admin/public-forms/${id}/export`, { responseType: "blob" }).then((r) => r),
  entityStats: () => api.get("/admin/entity-stats").then((r) => r.data.data),
};
//-------Gestión de Entidad (entity_admin)-------
// Todo se acota en el servidor a `req.user.entityId`: el cliente nunca manda
// la entidad. Es una superficie distinta de `adminApi` (que es del super_admin).
export const entityAdminApi = {
  users: (params) => api.get("/entity-admin/users", { params }).then((r) => r.data.data),
  createUser: (payload) => api.post("/entity-admin/users", payload).then((r) => r.data.data),
  updateUser: (id, payload) => api.patch(`/entity-admin/users/${id}`, payload).then((r) => r.data.data.user),
  resendWelcome: (id, payload) => api.post(`/entity-admin/users/${id}/resend-welcome`, payload).then((r) => r.data.data),
  deleteUser: (id) => api.delete(`/entity-admin/users/${id}`).then((r) => r.data),
  forms: (params) => api.get("/entity-admin/forms", { params }).then((r) => r.data.data),
  formStats: (id) => api.get(`/entity-admin/forms/${id}/stats`).then((r) => r.data.data.analytics),
  accessUrls: (params) => api.get("/entity-admin/access-urls", { params }).then((r) => r.data.data),
  /* Genera (siempre dentro de SU entidad y del rol `form_creator`) una URL de
     acceso nueva: slug aleatorio + sello. El alta del creador la puede usar
     recién creada. */
  createAccessUrl: () => api.post("/entity-admin/access-urls").then((r) => r.data.data.url),
  /* Agregado de la entidad: ya existe como `GET /api/admin/entity-stats`
     (registrado para entity_admin); es la fuente de la página de Estadísticas. */
  entityStats: () => api.get("/admin/entity-stats").then((r) => r.data.data),
};
//-------URLs de acceso por entidad/rol-------
export const accessApi = {
  resolve: (slug, ctx) =>
    api.get(`/access/${slug}`, { params: ctx ? { ctx } : {}, ...NO_LOGOUT }).then((r) => r.data.data),
  verifyPortal: (slug) =>
    api.post("/guest/login-portal/verify", { slug }, NO_LOGOUT).then((r) => r.data.data),
  // Obtiene el slug actual del portal del super_admin (guardado en la BD al cerrar sesión).
  // Es público porque solo revela la dirección de la puerta de login, no credenciales.
  getLoginPortalSlug: () =>
    api.get("/auth/login-portal/slug", NO_LOGOUT).then((r) => r.data?.slug),
};
//-------AI-------
export const aiApi = {
  generateForm: (prompt) =>
    api.post("/ai/generate-form", { prompt }).then((r) => r.data.data.form),
  generateValidation: (payload) =>
    api.post("/ai/generate-validation", payload).then((r) => r.data.data.validation),
  improveQuestion: (payload) =>
    api.post("/ai/improve-question", payload).then((r) => r.data.data.result),
  formSummary: (form) =>
    api.post("/ai/form-summary", { form }).then((r) => r.data.data.summary),
};
