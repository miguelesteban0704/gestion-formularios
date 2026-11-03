/**
 * Diagnóstico y reparación de la regla de administrador único.
 *
 * La migración en `config/db.js` lanza un error si hay:
 *  - `entity_admin` con `entity_id` NULL (administradores sin entidad)
 *  - `entity_admin` con `entity_id` duplicado (más de uno por entidad)
 *
 * Este script:
 *  1. Muestra el estado actual de la BD.
 *  2. Repara automáticamente si se pasa `--fix`.
 *  3. Es idempotente: se puede ejecutar múltiples veces sin dañar datos.
 *
 * Uso:  node utils/repairAdmins.js         # solo diagnóstico
 *       node utils/repairAdmins.js --fix   # reparar
 */

import { query } from "../config/db.js";
import { env } from "../config/env.js";

async function diagnose() {
  const { rows: unassigned } = await query(`
    SELECT id, email, name, role, entity_id
    FROM users
    WHERE role = 'entity_admin' AND entity_id IS NULL
  `);

  const { rows: duplicates } = await query(`
    SELECT entity_id, COUNT(*)::int AS n
    FROM users
    WHERE role = 'entity_admin' AND entity_id IS NOT NULL
    GROUP BY entity_id
    HAVING COUNT(*) > 1
  `);

  let dupUsers = [];
  if (duplicates.length) {
    const { rows } = await query(`
      SELECT id, email, name, role, entity_id
      FROM users
      WHERE role = 'entity_admin' AND entity_id = ANY($1)
      ORDER BY created_at
    `, [duplicates.map((d) => d.entity_id)]);
    dupUsers = rows;
  }

  return { unassigned, duplicates, dupUsers };
}

async function repair() {
  console.log(" reparando entity_admin sin entity_id → entity_admin con la primera entidad disponible...\n");

  // 1. Obtener una entidad válida para asignar
  const { rows: entities } = await query(`SELECT id FROM entities LIMIT 1`);
  if (!entities.length) {
    console.log("  ⚠ No hay entidades en la BD. Saltando reparación de administradores sin entidad.");
    return;
  }
  const fallbackEntityId = entities[0].id;

  // 2. Asignar entity_id a los entity_admin que no lo tienen
  const { rows: unassigned } = await query(`
    SELECT id, email, name, role, entity_id
    FROM users
    WHERE role = 'entity_admin' AND entity_id IS NULL
  `);

  for (const u of unassigned) {
    await query(
      `UPDATE users SET entity_id = $1 WHERE id = $2`,
      [fallbackEntityId, u.id],
    );
    console.log(`  ✔ ${u.email} → entity_id ${fallbackEntityId}`);
  }

  // 3. Resolver duplicados: mantener al más antiguo, cambiar rol del resto a 'form_creator'
  const { rows: duplicates } = await query(`
    SELECT entity_id, COUNT(*)::int AS n
    FROM users
    WHERE role = 'entity_admin' AND entity_id IS NOT NULL
    GROUP BY entity_id
    HAVING COUNT(*) > 1
  `);

  for (const d of duplicates) {
    const { rows: users } = await query(`
      SELECT id, email, name, role, entity_id, created_at
      FROM users
      WHERE role = 'entity_admin' AND entity_id = $1
      ORDER BY created_at ASC
    `, [d.entity_id]);

    // El primero (más antiguo) se queda como entity_admin; el resto pasa a form_creator
    for (let i = 1; i < users.length; i++) {
      await query(
        `UPDATE users SET role = 'form_creator' WHERE id = $1`,
        [users[i].id],
      );
      console.log(`  ✔ ${users[i].email} → rol 'form_creator' (duplicado en entidad ${d.entity_id})`);
    }
  }

  console.log("\n reparación completada.");
}

const args = process.argv.slice(2);
const fix = args.includes("--fix");

(async () => {
  try {
    const { unassigned, duplicates, dupUsers } = await diagnose();

    if (!unassigned.length && !duplicates.length) {
      console.log("✔ No hay problemas con la regla de administrador único. La BD está limpia.");
      process.exit(0);
    }

    console.log("── Problemas detectados ──\n");
    if (unassigned.length) {
      console.log(`entity_admin sin entity_id (${unassigned.length}):`);
      for (const u of unassigned) {
        console.log(`  - ${u.email} (${u.name})`);
      }
      console.log("");
    }
    if (duplicates.length) {
      console.log(`Entidades con más de un entity_admin (${duplicates.length}):`);
      for (const d of duplicates) {
        console.log(`  - entidad ${d.entity_id}: ${d.n} administradores`);
      }
      for (const u of dupUsers) {
        console.log(`    - ${u.email} (${u.name})`);
      }
      console.log("");
    }

    if (fix) {
      await repair();
    } else {
      console.log("Para reparar automáticamente, ejecuta:  node utils/repairAdmins.js --fix");
      console.log("Los usuarios afectados serán reasignados o cambiarán de rol de forma segura.");
    }
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();