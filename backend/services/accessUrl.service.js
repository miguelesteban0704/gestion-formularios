import { ApiError } from "../utils/ApiError.js";
import { openAccessContext } from "../utils/urlCrypto.js";
import * as accessUrlRepo from "../repositories/accessUrl.repo.js";
import * as entityRepo from "../repositories/entity.repo.js";
import * as userRepo from "../repositories/user.repo.js";
import { ROLES } from "../middleware/rbac.js";
import { query } from "../config/db.js";

export { registerUse } from "../repositories/accessUrl.repo.js";

export async function resolveActiveAccessUrl(slug, suppliedContext) {
  const row = await accessUrlRepo.findAccessUrlBySlug(slug);
  if (!row || !row.isActive) {
    // Portal fijo del super_admin: siempre /formularios-con-ia-loginadmin
    if (slug === "formularios-con-ia-loginadmin") {
      return {
        id: "portal-super-admin",
        slug: slug,
        role: "super_admin",
        entityId: null,
        entityCode: null,
        isActive: true,
      };
    }
    throw ApiError.notFound("URL de acceso no válida");
  }

  const context = openAccessContext(suppliedContext || row.context);
  if (
    !context ||
    context.s !== row.slug ||
    context.r !== row.role ||
    (context.eid || null) !== (row.entityId || null) ||
    (context.e || null) !== (row.entityCode || null)
  ) {
    throw ApiError.unauthorized("Contexto de acceso inválido");
  }

  return row;
}

/**
 * Correlación cuenta ↔ URL de acceso (punto único de validación).
 * Comprueba que el enlace exista, esté activo y corresponda a la entidad y
 * al rol del usuario que se está creando/editando. Es la garantía de que
 * «sin una URL de acceso válida para esa entidad y ese rol no hay cuenta».
 */
export async function assertAccessUrlFor({ accessUrlId, entityId, role }) {
  const url = accessUrlId ? await accessUrlRepo.findAccessUrlById(accessUrlId) : null;
  if (!url || !url.isActive) throw ApiError.badRequest("La URL de acceso no existe o está inactiva");
  if (url.role !== role) throw ApiError.badRequest("La URL de acceso no corresponde al rol seleccionado");
  if ((url.entityId || null) !== (entityId || null)) {
    throw ApiError.badRequest("La URL de acceso no corresponde a la entidad seleccionada");
  }
  return url;
}

export async function getAccessUrlContext(slug, suppliedContext) {
  const row = await resolveActiveAccessUrl(slug, suppliedContext);
  const entity = row.entityId ? await entityRepo.findEntityById(row.entityId) : null;
  const registrationAvailable = row.role === ROLES.ENTITY &&
    !!entity?.isActive &&
    !(await userRepo.findEntityAdminByEntity(row.entityId));

  // Buscar el usuario asociado a esta URL de acceso (para validación de email en recuperación de contraseña)
  let userEmail = null;
  if (row._id) {
    const user = await userRepo.findUserByAccessUrlId(row._id);
    if (user?.email) userEmail = user.email;
  }

  return {
    accessUrl: row,
    data: {
      entity: entity
        ? { _id: entity._id, name: entity.name, code: entity.code }
        : null,
      role: row.role,
      slug: row.slug,
      registrationAvailable,
      user: userEmail ? { email: userEmail } : null,
    },
  };
}
