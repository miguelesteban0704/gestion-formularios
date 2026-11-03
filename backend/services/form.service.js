import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ApiError } from "../utils/ApiError.js";
import * as formRepo from "../repositories/form.repo.js";
import * as notificationRepo from "../repositories/notification.repo.js";

/**
 * Control de acceso por rol (rediseño RBAC).
 *
 * - super_admin: solo lectura de formularios. Nunca escribe. Su superficie
 *   vive en `admin.controller` (listPublicFormsScoped): el listado y el
 *   agregado aceptan `visibility` (públicos y privados publicados). Para
 *   formularios privados individuales sigue vetado: `canViewForm` y
 *   `canSeeStats` lo mantienen fuera de ver/descargar/estadísticas puntuales.
 * - entity_admin: autoridad total sobre los formularios de SU entidad
 *   (públicos y privados), incluidas estadísticas.
 * - form_creator: sus propios formularios, sin estadísticas.
 * - legacy (role NULL, cuentas previas): conserva su comportamiento
 *   histórico (sus formularios + estadísticas).
 *
 * `actorOrId` acepta el objeto usuario (`req.user`, con role/entityId) o un
 * id plano (llamadas internas históricas → camino legacy).
 */
function asActor(actorOrId) {
  if (!actorOrId) return { _id: null, role: null, entityId: null, isGuest: false };
  if (typeof actorOrId === "string") return { _id: actorOrId, role: null, entityId: null, isGuest: false };
  return {
    _id: actorOrId._id,
    role: actorOrId.role ?? null,
    entityId: actorOrId.entityId ?? null,
    isGuest: actorOrId.isGuest === true,
  };
}

export { asActor };

function sameId(a, b) {
  return String(a || "") === String(b || "");
}

function canWriteForm(actor, form) {
  if (actor.role === "super_admin") return false;
  if (!actor.role) return sameId(form.owner, actor._id);
  if (actor.role === "entity_admin") {
    return !!form.entityId && !!actor.entityId && sameId(form.entityId, actor.entityId);
  }
  if (actor.role === "form_creator") return sameId(form.owner, actor._id);
  return false;
}

function canViewForm(actor, form) {
  if (!actor.role) return form.visibility === "public";
  if (actor.role === "super_admin") return true;
  if (actor.role === "entity_admin") {
    return !!form.entityId && !!actor.entityId && sameId(form.entityId, actor.entityId);
  }
  if (actor.role === "form_creator") return sameId(form.owner, actor._id);
  return false;
}

export function canSeeStats(actorOrId, form) {
  const actor = asActor(actorOrId);
  // Invitado: estadísticas solo de lo público (propio o ajeno). Lo privado
  // no muestra botón de estadísticas y el backend lo veta aquí también.
  if (actor.isGuest) return form.visibility !== "private";
  if (actor.role === "super_admin") return form.visibility === "public";
  if (!actor.role) return sameId(form.owner, actor._id);
  if (actor.role === "entity_admin") {
    return !!form.entityId && !!actor.entityId && sameId(form.entityId, actor.entityId);
  }
  // form_creator: sin estadísticas (ni ver ni exportar).
  return false;
}

async function getOwnedForm(formId, actorOrId) {
  const actor = asActor(actorOrId);
  const form = await formRepo.findFormById(formId);
  if (!form) throw ApiError.notFound("Form not found");
  if (!canViewForm(actor, form)) {
    throw ApiError.forbidden("You do not have access to this form");
  }
  return form;
}

/** Escritura: misma visibilidad + veto explícito al super_admin. */
async function getWritableForm(formId, actorOrId) {
  const actor = asActor(actorOrId);
  const form = await formRepo.findFormById(formId);
  if (!form) throw ApiError.notFound("Form not found");
  if (!canWriteForm(actor, form)) {
    throw ApiError.forbidden(
      actor.role === "super_admin"
        ? "El super_admin no gestiona formularios"
        : "You do not have access to this form",
    );
  }
  return form;
}

/** Estadísticas: el creador no entra aquí (ni ver ni exportar). */
export async function getStatsForm(formId, actorOrId) {
  const form = await formRepo.findFormById(formId);
  if (!form) throw ApiError.notFound("Form not found");
  if (!canSeeStats(actorOrId, form)) {
    throw ApiError.forbidden("No tienes acceso a las estadísticas");
  }
  return form;
}

export async function listForms(userId, opts = {}) {
  return formRepo.listFormsByOwner(userId, opts);
}

export async function listFormsScoped(actorOrId, opts = {}) {
  return formRepo.listFormsScoped(asActor(actorOrId), opts);
}

export async function listGuestForms(opts = {}) {
  return formRepo.listPublishedForGuests(opts);
}

/* El dueño es OBLIGATORIO y va antes que el filtro. Antes esta función no
   filtraba por dueño y el endpoint que la llama devolvía los formularios
   publicados de TODOS los usuarios de la plataforma. En un despliegue de un
   centro de gobierno eso es una fuga de datos entre cuentas, no un detalle. */
export async function listPublicForms(actorOrId, opts = {}) {
  // Superficie autenticada del panel: publicados del scope (entidad o propios).
  return formRepo.listFormsScoped(asActor(actorOrId), { ...opts, filter: "published" });
}

export async function getFormById(formId, actorOrId) {
  return getOwnedForm(formId, actorOrId);
}

export async function getPublicForm(slug) {
  const form = await formRepo.findPublishedBySlug(slug);
  if (!form) throw ApiError.notFound("This form is not available");
  return form;
}

/**
 * Detalle para invitados (sin sesión). Lo público entrega todo; lo privado
 * solo metadatos + `requiresAuth: true` (las preguntas no salen sin IDP),
 * salvo que llegue un encuestado identificado y válido para ESA misma URL de
 * formulario (`respondent.slug === slug`): entonces se entrega el formulario
 * completo, ya que la firma/vigencia del `rid` la validó `attachRespondent`.
 */
export async function getGuestFormDetail(slug, respondent = null) {
  const form = await getPublicForm(slug);
  if (form.visibility === "private") {
    const verified = Boolean(respondent?.sub) && respondent.slug === slug;
    if (!verified) {
      return {
        _id: form._id,
        title: form.title,
        description: form.description,
        theme: form.theme,
        slug: form.slug,
        visibility: form.visibility,
        entityId: form.entityId,
        entityName: form.entityName || null,
        requiresAuth: true,
        questions: [],
        settings: { ...(form.settings || {}), logo: form.settings?.logo || "" },
        responseCount: form.responseCount,
      };
    }
    return { ...form, requiresAuth: false };
  }
  return { ...form, requiresAuth: false };
}


export async function registerView(slug) {
  await formRepo.incrementViews(slug);
}

function resolveEntityForCreate(actor, payload) {
  // entity_admin y form_creator crean siempre dentro de su entidad.
  if (actor.role === "entity_admin" || actor.role === "form_creator") {
    return actor.entityId || null;
  }
  return payload.entityId || null;
}

/* Tres estados de visibilidad. Cualquier valor desconocido cae a "public" para
   que un payload manipulado no invente un cuarto estado. */
const RESTRICTED_VISIBILITIES = ["private", "unlisted"];

function normalizeVisibility(value) {
  return value === "private" || value === "unlisted" ? value : "public";
}

function restrictedEntityError(visibility) {
  return visibility === "unlisted"
    ? "Un formulario privado debe pertenecer a una entidad"
    : "Un formulario restringido debe pertenecer a una entidad";
}

export async function createForm(actorOrId, payload = {}) {
  const actor = asActor(actorOrId);
  if (actor.role === "super_admin") {
    throw ApiError.forbidden("El super_admin no gestiona formularios");
  }
  const visibility = normalizeVisibility(payload.visibility);
  const entityId = resolveEntityForCreate(actor, payload);
  // Regla obligatoria: lo privado y lo restringido nacen atados a una
  // entidad registrada (ahí viven los gestores que reparten el enlace).
  if (RESTRICTED_VISIBILITIES.includes(visibility) && !entityId) {
    throw ApiError.badRequest(restrictedEntityError(visibility));
  }
  const { notify = true, ...formPayload } = payload;
  const form = await formRepo.createForm(actor._id, {
    ...formPayload,
    visibility,
    entityId,
  });
  if (notify) await notificationRepo.createFormCreatedNotification(actor._id, form);
  return form;
}

export async function updateForm(formId, actorOrId, updates) {
  const current = await getWritableForm(formId, actorOrId);

  const allowed = [
    "title",
    "description",
    "theme",
    "questions",
    "settings",
    "isFavorite",
    "isArchived",
    "entityId",
    "categoryId",
    "visibility",
  ];
  const patch = {};
  for (const key of allowed) {
    if (key in updates) patch[key] = updates[key];
  }
  patch.updatedBy = asActor(actorOrId)._id;
  if ("visibility" in patch) patch.visibility = normalizeVisibility(patch.visibility);
  if (
    RESTRICTED_VISIBILITIES.includes(patch.visibility) &&
    !(patch.entityId || current.entityId)
  ) {
    throw ApiError.badRequest(restrictedEntityError(patch.visibility));
  }
  const form = await formRepo.updateForm(formId, patch);
  if (["ai", "blank"].includes(current.creationSource)) {
    await notificationRepo.createFormCreatedNotification(current.owner, form);
  }
  return form;
}

/**
 * Cambia SOLO la visibilidad, con las mismas reglas que `updateForm` pero en un
 * endpoint dedicado y auditable (`PATCH /forms/:id/visibility`). Devuelve el
 * estado anterior y el nuevo para que el controlador registre el cambio; sin
 * cambio real no escribe y `from === to`.
 */
export async function setVisibility(formId, actorOrId, value) {
  const current = await getWritableForm(formId, actorOrId);
  const visibility = normalizeVisibility(value);
  if (RESTRICTED_VISIBILITIES.includes(visibility) && !current.entityId) {
    throw ApiError.badRequest(restrictedEntityError(visibility));
  }
  if (visibility === current.visibility) {
    return { form: current, from: current.visibility, to: visibility };
  }
  const form = await formRepo.updateForm(formId, {
    visibility,
    updatedBy: asActor(actorOrId)._id,
  });
  return { form, from: current.visibility, to: visibility };
}

/**
 * Guarda el logo subido de un formulario.
 *
 * Reutiliza `getOwnedForm`, o sea que un usuario no puede tocar el logo de un
 * formulario ajeno ni aunque conozca el id. El buffer y el nombre original los
 * pasa el controlador (multer ya los dejó en `req.file`).
 *
 * El archivo va a `public/form-logos/<id de formulario>.<ext>`: un archivo por
 * formulario, con nombre derivado del id y no del nombre que envía el cliente,
 * para que nadie pueda escribir fuera de ese directorio ni elegir extensión
 * arbitraria. Al volver a subir uno nuevo se sobreescribe, que es lo que se
 * espera de un logo.
 */
/* Una extensión derivada de un MIME desconocido tiene que quedar SIEMPRE en un
   solo segmento de nombre: sin barras, sin `..`, sin nada que una ruta pueda
   interpretar. Un Content-Type como `image/../../x` produciría `image....x` con
   una limpieza normal; aquí se queda en un identificador corto y sin puntos. */
function safeExtension(derived) {
  const cleaned = String(derived || "").replace(/[^a-z0-9]/gi, "");
  if (!cleaned) return EXT_POR_DEFECTO[0];
  return `.${cleaned.slice(0, 10).toLowerCase()}`;
}

const LOGO_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "form-logos",
);

/* Extensiones de reserva para los `image/*` que no están en el mapa.
   Se guardan siempre bajo el nombre `<id de formulario>.<ext>`, así que el
   cliente nunca decide dónde se escribe: como mucho elige una de estas
   cuatro, y todas son inertes. */
const EXT_POR_DEFECTO = [".img", ".bin", ".dat", ".raw"];

/* Extensión -> la que realmente se escribe en disco.

   El mapa va al revés de lo intuitivo a propósito. La extensión la saca el
   SERVIDOR a partir del `mimetype` declarado, no del nombre que envía el
   cliente: un nombre manipulado (`logo.svg.html`) no decide nada, y el
   `Content-Type` que sale servido sale de la extensión, así que mandan los dos.

   `.jpeg` y `.jfif` se guardan como `.jpg` porque son el mismo formato y
   tener dos archivos por formulario solo duplicaría el borrado. */
const EXT_POR_MIME = new Map(
  Object.entries({
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/x-png": ".png",
    "image/apng": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/x-ms-bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
  }),
);

/**
 * Decide la extensión del archivo a partir de lo que declara el navegador.
 *
 * Se acepta CUALQUIER `image/*` (gif animado, avif, bmp, heic, svg…), como se
 * pidió. La primera puerta es el prefijo `image/`: un PDF o un .exe se
 * rechazan. Y la segunda es el mapa: si el navegador declara una imagen con un
 * `Content-Type` que no reconocemos —cosa normal con formatos raros—, NO se
 * rechaza la subida, se le da una extensión neutra. El `<img>` la seguirá
 * mostrando igual porque decide por los bytes, no por el nombre.
 */
export function extensionFor(mimetype) {
  const type = String(mimetype || "").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) return null;
  if (EXT_POR_MIME.has(type)) return EXT_POR_MIME.get(type);
  // `image/` a secas o un sub-tipo rarísimo: extensión neutra, no rechazo.
  return safeExtension(type.slice("image/".length));
}

export async function setFormLogo(formId, actorOrId, { buffer, mimetype }) {
  await getWritableForm(formId, actorOrId);

  if (!buffer || !buffer.length) {
    throw ApiError.badRequest("No se recibio ningun archivo.");
  }
  if (buffer.length > 4 * 1024 * 1024) {
    throw ApiError.badRequest("El archivo no puede superar 4 MB.");
  }

  const ext = extensionFor(mimetype);
  if (!ext) {
    throw ApiError.badRequest("El archivo no es una imagen.");
  }

  await fs.mkdir(LOGO_DIR, { recursive: true });
  await fs.writeFile(path.join(LOGO_DIR, `${formId}${ext}`), buffer);

  // El nombre del archivo es estable (`<id>.<ext>`), asi que el navegador lo
  // cachearia y seguiria mostrando el logo anterior tras volver a subir uno
  // nuevo. Una query de version en la URL le da una identidad distinta a cada
  // subida sin tocar el nombre en disco.
  const version = Date.now();
  return formRepo.updateFormLogo(
    formId,
    `/form-logos/${formId}${ext}?v=${version}`,
    asActor(actorOrId)._id,
  );
}

/** Quita el logo del formulario y borra el archivo del disco. */
export async function clearFormLogo(formId, actorOrId) {
  const form = await getWritableForm(formId, actorOrId);

  const previous = form.settings?.logo || "";
  // Solo se borra un archivo que sea nuestro: si el logo era una URL externa
  // escrita a mano, no hay nada local que quitar.
  if (previous.startsWith("/form-logos/")) {
    // `path.basename` sobre la ruta guardada: así el nombre del archivo sale
    // de lo que puso el servidor al subir, no de nada que venga del cliente.
    const ext = path.extname(path.basename(previous.split("?")[0]));
    await fs.rm(path.join(LOGO_DIR, `${formId}${ext}`), { force: true });
  }
  return formRepo.updateFormLogo(formId, "", asActor(actorOrId)._id);
}

export async function setPublishState(formId, actorOrId, shouldPublish) {
  const form = await getWritableForm(formId, actorOrId);

  if (shouldPublish && form.questions.length === 0) {
    throw ApiError.badRequest("Add at least one question before publishing");
  }

  return formRepo.updateForm(formId, {
    status: shouldPublish ? "published" : "draft",
    publishedAt: shouldPublish ? new Date() : null,
    updatedBy: asActor(actorOrId)._id,
  });
}

export async function duplicateForm(formId, actorOrId) {
  const actor = asActor(actorOrId);
  const form = await getWritableForm(formId, actor);
  return formRepo.createForm(actor._id, {
    title: `${form.title} (Copy)`,
    description: form.description,
    theme: form.theme,
    questions: form.questions,
    settings: form.settings,
    status: "draft",
    entityId: form.entityId,
    categoryId: form.categoryId,
    visibility: form.visibility,
  });
}

export async function deleteForm(formId, actorOrId) {
  await getWritableForm(formId, actorOrId);
  await formRepo.deleteForm(formId);
}

export { getOwnedForm };