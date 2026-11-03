/**
 * Declaración de tipos para `src/services/index.js`.
 *
 * El proyecto no modela todavía las formas del backend en TS, así que las
 * cargas y las respuestas se declaran como `unknown`: lo que sí se gana es
 * autocompletado de nombres de método, aridad y tipos de los parámetros
 * primitivos (ids, slugs, banderas). Cuando exista un modelo de dominio, se
 * sustituye `unknown` por el tipo real sin tocar los llamadores.
 *
 * `services/index.js` es la fachada sobre `@/lib/api.js` (axios + interceptor).
 */

/** Valor de la API aún sin modelo en TS. */
export type ApiValue = unknown;
/** Parámetros de consulta (query string). */
export type ApiParams = Record<string, unknown>;

export interface AuthApi {
  me(): Promise<ApiValue>;
  updateProfile(payload: ApiValue): Promise<ApiValue>;
  deleteAccount(): Promise<ApiValue>;
  getSessions(): Promise<ApiValue>;
  revokeSession(id: string): Promise<ApiValue>;
  revokeOtherSessions(): Promise<ApiValue>;
  logoutSession(): Promise<ApiValue>;
  currentSession(): Promise<ApiValue>;
  activity(): Promise<ApiValue>;
}

export interface InsightsApi {
  overview(): Promise<ApiValue>;
  inbox(params?: ApiParams): Promise<ApiValue>;
}

export interface NotificationApi {
  list(): Promise<ApiValue>;
  markRead(id: string): Promise<ApiValue>;
  markAllRead(): Promise<ApiValue>;
}

export interface FormApi {
  list(params?: ApiParams): Promise<ApiValue>;
  listPublic(params?: ApiParams): Promise<ApiValue>;
  get(id: string): Promise<ApiValue>;
  getPublic(slug: string): Promise<ApiValue>;
  create(payload: ApiValue): Promise<ApiValue>;
  update(id: string, payload: ApiValue): Promise<ApiValue>;
  setVisibility(id: string, visibility: string): Promise<ApiValue>;
  publish(id: string, publish?: boolean): Promise<ApiValue>;
  duplicate(id: string): Promise<ApiValue>;
  remove(id: string): Promise<ApiValue>;
  uploadLogo(id: string, file: Blob): Promise<ApiValue>;
  removeLogo(id: string): Promise<ApiValue>;
}

export interface ResponseApi {
  submit(slug: string, payload: ApiValue): Promise<ApiValue>;
  list(formId: string, params?: ApiParams): Promise<ApiValue>;
  analytics(formId: string): Promise<ApiValue>;
  remove(id: string): Promise<ApiValue>;
  exportCsv(formId: string): Promise<ApiValue>;
}

export interface SettingsApi {
  get(): Promise<ApiValue>;
  updateProfile(payload: ApiValue): Promise<ApiValue>;
  uploadAvatar(file: Blob): Promise<ApiValue>;
  deleteAvatar(): Promise<ApiValue>;
  updateNotifications(payload: ApiValue): Promise<ApiValue>;
  updateAppearance(payload: ApiValue): Promise<ApiValue>;
  getSessions(): Promise<ApiValue>;
  revokeSession(id: string): Promise<ApiValue>;
  revokeOtherSessions(): Promise<ApiValue>;
  exportData(format?: string): Promise<ApiValue>;
  deactivateAccount(confirmWord: string): Promise<ApiValue>;
  deleteAccount(confirmWord: string): Promise<ApiValue>;
  changePassword(payload: ApiValue): Promise<ApiValue>;
  twoFASetup(): Promise<ApiValue>;
  twoFAVerify(code: string): Promise<ApiValue>;
  twoFADisable(code: string): Promise<ApiValue>;
}

export interface GuestApi {
  listForms(params?: ApiParams): Promise<ApiValue>;
  getForm(slug: string, rid?: string): Promise<ApiValue>;
  submit(slug: string, payload: ApiValue, rid?: string): Promise<ApiValue>;
  listEntities(): Promise<ApiValue>;
  session(): Promise<ApiValue>;
  formStats(slug: string): Promise<ApiValue>;
  insights(): Promise<ApiValue>;
}

export interface LocalAuthApi {
  login(identifier: string, password: string, door?: { slug?: string; ctx?: string }): Promise<ApiValue>;
  registerByAccess(slug: string, payload: ApiValue): Promise<ApiValue>;
  logout(): Promise<ApiValue>;
  register(payload: ApiValue): Promise<ApiValue>;
  forgot(email: string): Promise<ApiValue>;
  reset(token: string, password: string): Promise<ApiValue>;
}

export interface AdminApi {
  users(params?: ApiParams): Promise<ApiValue>;
  updateUser(id: string, payload: ApiValue): Promise<ApiValue>;
  resendWelcome(id: string, payload?: ApiValue): Promise<ApiValue>;
  deleteUser(id: string): Promise<ApiValue>;
  entities(params?: ApiParams): Promise<ApiValue>;
  createEntity(payload: ApiValue): Promise<ApiValue>;
  updateEntity(id: string, payload: ApiValue): Promise<ApiValue>;
  deleteEntity(id: string): Promise<ApiValue>;
  categories(): Promise<ApiValue>;
  accessUrls(params?: ApiParams): Promise<ApiValue>;
  createAccessUrl(payload: ApiValue): Promise<ApiValue>;
  toggleAccessUrl(id: string, isActive: boolean): Promise<ApiValue>;
  regenerateAccessUrl(id: string): Promise<ApiValue>;
  deleteAccessUrl(id: string): Promise<ApiValue>;
  audit(params?: ApiParams): Promise<ApiValue>;
  publicForms(params?: ApiParams): Promise<ApiValue>;
  publicStats(params?: ApiParams): Promise<ApiValue>;
  publicFormStats(id: string): Promise<ApiValue>;
  publicFormExport(id: string): Promise<ApiValue>;
  entityStats(): Promise<ApiValue>;
}

export interface EntityAdminApi {
  users(params?: ApiParams): Promise<ApiValue>;
  createUser(payload: ApiValue): Promise<ApiValue>;
  updateUser(id: string, payload: ApiValue): Promise<ApiValue>;
  resendWelcome(id: string, payload?: ApiValue): Promise<ApiValue>;
  deleteUser(id: string): Promise<ApiValue>;
  forms(params?: ApiParams): Promise<ApiValue>;
  formStats(id: string): Promise<ApiValue>;
  accessUrls(params?: ApiParams): Promise<ApiValue>;
  createAccessUrl(): Promise<ApiValue>;
  entityStats(): Promise<ApiValue>;
}

export interface AccessApi {
  resolve(slug: string, ctx?: string | null): Promise<ApiValue>;
  verifyPortal(slug: string): Promise<ApiValue>;
}

export interface AiApi {
  generateForm(prompt: string): Promise<ApiValue>;
  generateValidation(payload: ApiValue): Promise<ApiValue>;
  improveQuestion(payload: ApiValue): Promise<ApiValue>;
  formSummary(form: ApiValue): Promise<ApiValue>;
}

export declare const authApi: AuthApi;
export declare const insightsApi: InsightsApi;
export declare const notificationApi: NotificationApi;
export declare const formApi: FormApi;
export declare const responseApi: ResponseApi;
export declare const settingsApi: SettingsApi;
export declare const guestApi: GuestApi;
export declare const localAuthApi: LocalAuthApi;
export declare const adminApi: AdminApi;
export declare const entityAdminApi: EntityAdminApi;
export declare const accessApi: AccessApi;
export declare const aiApi: AiApi;
