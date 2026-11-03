import { query } from "../config/db.js";

export async function writeAudit({ actorId, actorRole, action, entityType, entityId, ip, userAgent, details }) {
  await query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, ip, user_agent, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      actorId || null,
      actorRole || null,
      action,
      entityType || null,
      entityId || null,
      ip || null,
      userAgent || null,
      JSON.stringify(details || {}),
    ],
  );
}

export async function listAuditLogs({ actorId = "", action = "", limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (actorId) { params.push(actorId); where.push(`l.actor_id = $${params.length}`); }
  if (action) { params.push(action); where.push(`l.action = $${params.length}`); }
  params.push(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));
  params.push(Math.max(parseInt(offset, 10) || 0, 0));
  const { rows } = await query(
    `SELECT l.*, u.name AS actor_name, u.email AS actor_email
     FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY l.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows.map((r) => ({
    _id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorEmail: r.actor_email,
    actorRole: r.actor_role,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    ip: r.ip,
    userAgent: r.user_agent,
    details: r.details || {},
    createdAt: r.created_at,
  }));
}
