import assert from "node:assert/strict";
import crypto from "node:crypto";
import { connectDB, pool, query } from "../config/db.js";
import * as accessUrlRepo from "../repositories/accessUrl.repo.js";
import * as userRepo from "../repositories/user.repo.js";
import * as settingsRepo from "../repositories/settings.repo.js";
import { hashPassword, generateTempPassword } from "../utils/password.js";
import { env } from "../config/env.js";
import { randomAccessSlug, sealAccessContext } from "../utils/urlCrypto.js";
import {
  isCredentialVariant,
  activationTtlMinutes,
  tempPasswordExpiry,
  resendWelcomeEmail,
} from "../services/welcome.service.js";

const fixtureIds = [];
const userIds = [];
const accessUrlIds = [];

const createEntity = async (suffix) => {
  const code = `qa-${crypto.randomUUID()}`;
  const { rows } = await query(
    `INSERT INTO entities (code, name, category) VALUES ($1, $2, 'qa') RETURNING id`,
    [code, `QA mail probe ${suffix}`],
  );
  fixtureIds.push(rows[0].id);
  return { id: rows[0].id, code };
};

const createAccessUrl = async ({ entityId, entityCode, role }) => {
  const slug = randomAccessSlug();
  const context = sealAccessContext({ entityId, entityCode, role, slug });
  const url = await accessUrlRepo.createAccessUrl({ entityId, role, slug, context });
  accessUrlIds.push(url._id);
  return url;
};

const createUser = async ({ role, email, entityId = null, accessUrlId = null, passwordHash = null }) => {
  const user = await userRepo.createLocalUser({
    name: `QA mail probe ${role}`,
    email,
    passwordHash,
    role,
    entityId,
    accessUrlId,
  });
  userIds.push(user._id);
  return user;
};

const countPasswordResets = async (userId) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM password_resets WHERE user_id = $1`,
    [userId],
  );
  return rows[0].n;
};

try {
  await connectDB();

  // 1. Generador de contraseña temporal (variante B / reenvío).
  const temp = generateTempPassword();
  assert.equal(temp.length, 12, "La contraseña temporal debe tener 12 caracteres");
  assert.match(temp, /[A-Za-z]/, "La contraseña temporal debe incluir letras");
  assert.notEqual(generateTempPassword(), generateTempPassword(), "Dos temporales no deben coincidir");

  // 2. TTLs coherentes con la configuración de entorno.
  assert.equal(
    activationTtlMinutes(),
    env.mailActivationTtlHours * 60,
    "El TTL de activación debe derivar de MAIL_ACTIVATION_TTL_HOURS",
  );
  assert.ok(
    new Date(tempPasswordExpiry()).getTime() > Date.now(),
    "La caducidad de la temporal debe estar en el futuro",
  );
  assert.equal(
    isCredentialVariant(),
    env.mailSendCredentials === true,
    "La variante debe seguir MAIL_SEND_CREDENTIALS",
  );

  // 3. Fixture: entidad + URL de acceso + usuario con URL asociada.
  // QA_MAIL_TO permite dirigir el envío real (p.ej. Gmail SMTP) a un buzón
  // concreto; por defecto usa una dirección no entregable de prueba.
  const mailTo = process.env.QA_MAIL_TO || `qa-${crypto.randomUUID()}@example.invalid`;
  const entity = await createEntity("active");
  const accessUrl = await createAccessUrl({
    entityId: entity.id,
    entityCode: entity.code,
    role: "form_creator",
  });
  const user = await createUser({
    role: "form_creator",
    email: mailTo,
    entityId: entity.id,
    accessUrlId: accessUrl._id,
    passwordHash: await hashPassword("test-password-123"),
  });
  assert.equal(user.mustChangePassword, false, "Un alta normal no debe marcar cambio forzado");

  // 4. setTemporaryPassword marca el cambio forzado y la caducidad.
  const expiry = tempPasswordExpiry();
  await userRepo.setTemporaryPassword(user._id, await hashPassword("Tmp-pass-123456"), expiry);
  const afterTemp = await userRepo.findUserById(user._id);
  assert.equal(afterTemp.mustChangePassword, true, "La temporal debe marcar must_change_password");
  assert.ok(afterTemp.tempPasswordExpiresAt, "La temporal debe fijar temp_password_expires_at");
  assert.equal(
    new Date(afterTemp.tempPasswordExpiresAt).toISOString(),
    new Date(expiry).toISOString(),
    "La caducidad guardada debe ser la solicitada",
  );

  // 5. settings.repo.setPassword limpia la marca y la caducidad.
  await settingsRepo.setPassword(user._id, await hashPassword("Nueva-pass-123456"));
  const afterSet = await userRepo.findUserById(user._id);
  assert.equal(afterSet.mustChangePassword, false, "El cambio real debe limpiar must_change_password");
  assert.equal(afterSet.tempPasswordExpiresAt, null, "El cambio real debe limpiar la caducidad de la temporal");

  // 6. Reenvío sin URL de acceso: no hay destino → motivo explícito, sin tocar el correo.
  const orphan = await createUser({
    role: "entity_admin",
    email: `qa-${crypto.randomUUID()}@example.invalid`,
    passwordHash: await hashPassword("test-password-123"),
  });
  const orphanResend = await resendWelcomeEmail({ user: orphan, language: "es" });
  assert.equal(orphanResend.sent, false, "Un usuario sin URL no debe enviar correo");
  assert.equal(orphanResend.reason, "no_access_url", "El motivo debe ser no_access_url");
  assert.equal(orphanResend.to, orphan.email, "Debe informar el destinatario aunque no envíe");

  // 7. Reenvío con URL: variante A firma un token; variante B marca temporal.
  const resetsBefore = await countPasswordResets(user._id);
  const resend = await resendWelcomeEmail({ user, language: "es" });
  assert.equal(resend.to, user.email, "El reenvío debe apuntar al correo del usuario");
  assert.equal(typeof resend.sent, "boolean", "El reenvío debe devolver un estado booleano de envío");

  if (isCredentialVariant()) {
    const afterResend = await userRepo.findUserById(user._id);
    assert.equal(afterResend.mustChangePassword, true, "El reenvío B debe marcar cambio forzado");
    assert.ok(afterResend.tempPasswordExpiresAt, "El reenvío B debe fijar caducidad de la temporal");
  } else {
    const resetsAfter = await countPasswordResets(user._id);
    assert.equal(resetsAfter, resetsBefore + 1, "El reenvío A debe firmar un token de activación nuevo");
    const afterResend = await userRepo.findUserById(user._id);
    assert.equal(afterResend.mustChangePassword, false, "El reenvío A no debe marcar cambio forzado");
  }

  console.log(
    `OK: correo de bienvenida / cambio forzado (variante ${isCredentialVariant() ? "B (credenciales)" : "A (activación)"}, correo ${resend.sent ? "enviado" : `no enviado: ${resend.reason || "sin configuración"}`})`,
  );
} finally {
  if (userIds.length) await query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]);
  if (accessUrlIds.length) await query(`DELETE FROM access_urls WHERE id = ANY($1::uuid[])`, [accessUrlIds]);
  if (fixtureIds.length) await query(`DELETE FROM entities WHERE id = ANY($1::uuid[])`, [fixtureIds]);
  await pool.end();
}
