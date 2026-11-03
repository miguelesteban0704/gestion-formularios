import assert from "node:assert/strict";
import crypto from "node:crypto";
import { connectDB, pool, query } from "../config/db.js";
import * as accessUrlRepo from "../repositories/accessUrl.repo.js";
import * as userRepo from "../repositories/user.repo.js";
import { randomAccessSlug, sealAccessContext } from "../utils/urlCrypto.js";

import * as sessionRepo from "../repositories/session.repo.js";
import { generateJti, getTokenExpiryDate, signToken } from "../utils/token.js";
const fixtureIds = [];
const userIds = [];
const accessUrlIds = [];
const API = `${process.env.TEST_API_URL || "https://127.0.0.1:8001"}/api`;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const createEntity = async (suffix) => {
  const code = `qa-${crypto.randomUUID()}`;
  const { rows } = await query(
    `INSERT INTO entities (code, name, category) VALUES ($1, $2, 'qa') RETURNING id`,
    [code, `QA entity ${suffix}`],
  );
  fixtureIds.push(rows[0].id);
  return rows[0].id;
};

const createAdmin = async (entityId, suffix) => {
  const { rows } = await query(
    `INSERT INTO users (name, email, role, entity_id)
     VALUES ($1, $2, 'entity_admin', $3) RETURNING id`,
    [`QA entity admin ${suffix}`, `qa-${crypto.randomUUID()}@example.invalid`, entityId],
  );
  userIds.push(rows[0].id);
  return rows[0].id;
};

const createAccessUrl = async ({ entityId, role }) => {
  const { rows } = await query(`SELECT code FROM entities WHERE id = $1`, [entityId]);
  const slug = randomAccessSlug();
  const context = sealAccessContext({ entityId, entityCode: rows[0].code, role, slug });
  const url = await accessUrlRepo.createAccessUrl({ entityId, role, slug, context });
  accessUrlIds.push(url._id);
  return { ...url, context };
};

const registrationPayload = (entityId, suffix) => ({
  name: `QA registration ${suffix}`,
  email: `qa-${crypto.randomUUID()}@example.invalid`,
  username: `qa-${crypto.randomUUID().slice(0, 12)}`,
  password: "test-password-123",
  role: "super_admin",
  entityId,
});

const postRegistration = (url, payload) => fetch(
  `${API}/auth/local/register-by-access/${url.slug}?ctx=${encodeURIComponent(url.context)}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  },
);

try {
  await connectDB();
  const firstEntity = await createEntity("first");
  const secondEntity = await createEntity("second");

  const entityAdminUrl = await createAccessUrl({
    entityId: firstEntity,
    role: "entity_admin",
  });
  const creatorUrl = await createAccessUrl({ entityId: secondEntity, role: "form_creator" });
  const resolutionResponse = await fetch(
    `${API}/access/${entityAdminUrl.slug}?ctx=${encodeURIComponent(entityAdminUrl.context)}`,
  );
  assert.equal(resolutionResponse.status, 200, "Un enlace activo debe poder resolverse");
  const resolution = await resolutionResponse.json();
  assert.equal(resolution.data?.registrationAvailable, true, "Una entidad sin administrador debe admitir registro");

  const registrationResponse = await postRegistration(
    entityAdminUrl,
    registrationPayload(secondEntity, "admin invite"),
  );
  assert.equal(registrationResponse.status, 201, "El enlace entity_admin debe poder registrar una cuenta");
  const registered = await registrationResponse.json();
  userIds.push(registered.data.user._id);
  assert.equal(registered.data.user.role, "entity_admin", "El rol debe venir del contexto cifrado, no del body");
  assert.equal(registered.data.user.entityId, firstEntity, "La entidad debe venir del contexto cifrado, no del body");
  assert.ok(registered.data.token, "El registro debe devolver el token de inicio de sesión");
  const { rows: sessionRows } = await query(
    `SELECT COUNT(*)::int AS active_sessions FROM user_sessions WHERE user_id = $1 AND is_active = true`,
    [registered.data.user._id],
  );
  assert.equal(sessionRows[0].active_sessions, 1, "El registro debe crear una sesión local activa");

  const entityDashboardResponse = await fetch(`${API}/forms?search=&filter=all`, {
    headers: { authorization: `Bearer ${registered.data.token}` },
  });
  assert.equal(entityDashboardResponse.status, 200, "La nueva cuenta debe poder cargar los datos del dashboard de entidad");

  const alreadyRegistered = await fetch(
    `${API}/access/${entityAdminUrl.slug}?ctx=${encodeURIComponent(entityAdminUrl.context)}`,
  );
  assert.equal((await alreadyRegistered.json()).data?.registrationAvailable, false);
  const secondRegistration = await postRegistration(entityAdminUrl, registrationPayload(secondEntity, "duplicate"));
  assert.equal(secondRegistration.status, 409, "Un enlace no puede registrar dos entity_admin para su entidad");

  const creatorResolution = await fetch(
    `${API}/access/${creatorUrl.slug}?ctx=${encodeURIComponent(creatorUrl.context)}`,
  );
  assert.equal((await creatorResolution.json()).data?.registrationAvailable, false);
  const creatorRegistration = await postRegistration(creatorUrl, registrationPayload(firstEntity, "creator"));
  assert.equal(creatorRegistration.status, 403, "Una URL form_creator no permite autorregistrar un administrador");

  const { rows: secondEntityRows } = await query(`SELECT code FROM entities WHERE id = $1`, [secondEntity]);
  const forgedContext = sealAccessContext({
    entityId: secondEntity,
    entityCode: secondEntityRows[0].code,
    role: "entity_admin",
    slug: entityAdminUrl.slug,
  });
  const forgedResolution = await fetch(
    `${API}/access/${entityAdminUrl.slug}?ctx=${encodeURIComponent(forgedContext)}`,
  );
  assert.equal(forgedResolution.status, 401, "El contexto de otra entidad no puede reutilizar el enlace");

  const { rows: firstEntityRows } = await query(`SELECT code FROM entities WHERE id = $1`, [firstEntity]);
  const forgedRoleContext = sealAccessContext({
    entityId: firstEntity,
    entityCode: firstEntityRows[0].code,
    role: "form_creator",
    slug: entityAdminUrl.slug,
  });
  const forgedRoleResolution = await fetch(
    `${API}/access/${entityAdminUrl.slug}?ctx=${encodeURIComponent(forgedRoleContext)}`,
  );
  assert.equal(forgedRoleResolution.status, 401, "Un rol sellado distinto no puede reutilizar el enlace");

  const forgedSlugContext = sealAccessContext({
    entityId: firstEntity,
    entityCode: firstEntityRows[0].code,
    role: "entity_admin",
    slug: randomAccessSlug(),
  });
  const forgedSlugResolution = await fetch(
    `${API}/access/${entityAdminUrl.slug}?ctx=${encodeURIComponent(forgedSlugContext)}`,
  );
  assert.equal(forgedSlugResolution.status, 401, "Un slug sellado distinto no puede reutilizar el enlace");

  const inactiveEntity = await createEntity("inactive");
  const inactiveEntityUrl = await createAccessUrl({ entityId: inactiveEntity, role: "entity_admin" });
  await query(`UPDATE entities SET is_active = false WHERE id = $1`, [inactiveEntity]);
  const inactiveEntityResolution = await fetch(
    `${API}/access/${inactiveEntityUrl.slug}?ctx=${encodeURIComponent(inactiveEntityUrl.context)}`,
  );
  assert.equal((await inactiveEntityResolution.json()).data?.registrationAvailable, false);
  const inactiveEntityRegistration = await postRegistration(inactiveEntityUrl, registrationPayload(firstEntity, "inactive"));
  assert.equal(inactiveEntityRegistration.status, 400, "Una entidad inactiva no permite autorregistro");
  await query(`UPDATE entities SET is_active = true WHERE id = $1`, [inactiveEntity]);

  await accessUrlRepo.updateAccessUrl(creatorUrl._id, { isActive: false });
  const revokedUrl = await fetch(`${API}/access/${creatorUrl.slug}?ctx=${encodeURIComponent(creatorUrl.context)}`);
  assert.equal(revokedUrl.status, 404, "Un enlace revocado no se puede resolver");
  await accessUrlRepo.updateAccessUrl(creatorUrl._id, { isActive: true });

  const firstAdminId = registered.data.user._id;
  await createAdmin(secondEntity, "other-entity");
  assert.equal((await userRepo.findEntityAdminByEntity(firstEntity))?._id, firstAdminId);

  assert.equal((await userRepo.findEntityAdminByEntity(firstEntity))?._id, firstAdminId);

  const superAdmin = await userRepo.createLocalUser({
    name: "QA temporary superadmin",
    email: `qa-${crypto.randomUUID()}@example.invalid`,
    passwordHash: null,
    role: "super_admin",
    entityId: null,
  });
  userIds.push(superAdmin._id);
  const superAdminJti = generateJti();
  await sessionRepo.createSession({
    userId: superAdmin._id,
    jti: superAdminJti,
    deviceInfo: { test: true },
    ip: "127.0.0.1",
    userAgent: "entity-admin-registration-probe",
    expiresAt: getTokenExpiryDate(),
  });
  const superAdminToken = signToken({ id: superAdmin._id, jti: superAdminJti });
  const superAdminHeaders = {
    authorization: `Bearer ${superAdminToken}`,
    "content-type": "application/json",
  };

  const duplicateManagedCreate = await fetch(`${API}/auth/local/register`, {
    method: "POST",
    headers: superAdminHeaders,
    body: JSON.stringify({
      name: "QA duplicate admin create",
      email: `qa-${crypto.randomUUID()}@example.invalid`,
      password: "test-password-123",
      role: "entity_admin",
      entityId: firstEntity,
      accessUrlId: entityAdminUrl._id,
    }),
  });
  assert.equal(duplicateManagedCreate.status, 409, "El alta gestionada debe devolver conflicto para entidad ocupada");

  const creatorUser = await userRepo.createLocalUser({
    name: "QA temporary creator",
    email: `qa-${crypto.randomUUID()}@example.invalid`,
    passwordHash: null,
    role: "form_creator",
    entityId: secondEntity,
  });
  userIds.push(creatorUser._id);
  const duplicateManagedUpdate = await fetch(`${API}/admin/users/${creatorUser._id}`, {
    method: "PATCH",
    headers: superAdminHeaders,
    body: JSON.stringify({ role: "entity_admin", entityId: firstEntity }),
  });
  assert.equal(duplicateManagedUpdate.status, 409, "El cambio de rol gestionado debe devolver conflicto para entidad ocupada");
  const unchangedCreator = await userRepo.findUserById(creatorUser._id);
  assert.equal(unchangedCreator.role, "form_creator", "El usuario no debe cambiar si su edición se rechaza");

  const noOpAdminUpdate = await fetch(`${API}/admin/users/${firstAdminId}`, {
    method: "PATCH",
    headers: superAdminHeaders,
    body: JSON.stringify({ role: "entity_admin", entityId: firstEntity }),
  });
  assert.equal(noOpAdminUpdate.status, 200, "El administrador actual debe poder guardar un no-op de rol/entidad");
  let duplicateError;
  try {
    await createAdmin(firstEntity, "duplicate");
  } catch (error) {
    duplicateError = error;
  }

  assert.equal(duplicateError?.code, "23505", "El segundo administrador de una entidad debe violar unicidad");
  assert.equal(
    duplicateError?.constraint,
    "users_entity_admin_entity_unique_idx",
    "La violacion debe proceder del indice parcial previsto",
  );
  console.log("OK: cardinalidad entity_admin por entidad");
} finally {
  if (userIds.length) await query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]);
  if (accessUrlIds.length) await query(`DELETE FROM access_urls WHERE id = ANY($1::uuid[])`, [accessUrlIds]);
  if (fixtureIds.length) await query(`DELETE FROM entities WHERE id = ANY($1::uuid[])`, [fixtureIds]);
  await pool.end();
}