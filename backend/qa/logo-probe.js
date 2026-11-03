// Prueba de extremo a extremo del logo SIN IDP.
//
// El punto de este archivo: la imagen del logo NO viene del IDP. Va de la
// maquina del autor al backend por multipart, y de ahi a la base de datos. El
// IDP solo interviene al iniciar sesion, para emitir el token que autoriza la
// peticion. Por eso se puede y se debe probar la subidacalling al servicio
// directamente, con el id del propietario real.
//
// Se usa un borrador de la cuenta QA y se RESTAURA su estado al final, para no
// dejar basura en la cuenta.
import "dotenv/config";
import { query } from "../config/db.js";
import { setFormLogo, clearFormLogo } from "../services/form.service.js";

const BASE = "https://127.0.0.1:8000";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let fallos = 0;
const ok = (t, c, e = "") => {
  if (!c) fallos++;
  console.log(`  ${c ? "OK   " : "FALLA"} ${t}${e ? "  " + e : ""}`);
};

// ── Alquiler de un borrador y su estado original ────────────────────────────
const [alquilado] = (
  await query(
    `SELECT f.id, f.owner, f.settings FROM forms f
      WHERE f.status = 'draft'
      ORDER BY f.updated_at DESC LIMIT 1`,
  )
).rows;
const ORIGINAL = JSON.stringify(alquilado.settings);
const formId = alquilado.id;
const userId = alquilado.owner;
console.log(`formulario de prueba: ${formId}`);
console.log(`ajustes originales: ${ORIGINAL}\n`);

// 1x1 PNG transparente real.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
// GIF 1x1 valido: el usuario pidio explicitamente que se acepte GIF.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

// ── 1. Subida de un PNG ─────────────────────────────────────────────────────
console.log("1. Subida de PNG");
const r1 = await setFormLogo(formId, userId, { buffer: PNG, mimetype: "image/png" });
const logo1 = r1.settings?.logo || "";
ok("settings.logo apunta al archivo subido", logo1.startsWith(`/form-logos/${formId}.png`), logo1);
ok("lleva version de cache-busting", /\?v=\d+/.test(logo1), logo1);
ok("la extension sale del mimetype (.png)", logo1.includes(".png"));

// ── 2. El resto de settings sobrevive (esto es lo que justifica jsonb_set) ──
console.log("\n2. Los demas ajustes no se pisan");
ok("primaryColor intacto", r1.settings?.primaryColor === alquilado.settings?.primaryColor,
  `${alquilado.settings?.primaryColor} -> ${r1.settings?.primaryColor}`);
ok("submitButtonText intacto", r1.settings?.submitButtonText === alquilado.settings?.submitButtonText,
  JSON.stringify(r1.settings?.submitButtonText));
ok("borderRadius intacto", r1.settings?.borderRadius === alquilado.settings?.borderRadius);
ok("todas las claves originales siguen", Object.keys(alquilado.settings || {}).every(
  (k) => k in (r1.settings || {})), Object.keys(r1.settings || {}).join(", "));

// ── 3. El archivo se sirve por HTTP (el bug que rompia la vista previa) ─────
console.log("\n3. El archivo se sirve por HTTP");
const servido = await fetch(BASE + logo1.split("?")[0]);
ok("HTTP 200", servido.status === 200, `status ${servido.status}`);
ok("Content-Type image/png", (servido.headers.get("content-type") || "").includes("image/png"),
  servido.headers.get("content-type"));
const bytes = Buffer.from(await servido.arrayBuffer());
ok("los bytes son los mismos", bytes.equals(PNG), `${bytes.length} vs ${PNG.length} bytes`);
ok("magic number de PNG", bytes.subarray(0, 4).toString("hex") === "89504e47", bytes.subarray(0, 4).toString("hex"));
ok("CSP anti-XSS presente", (servido.headers.get("content-security-policy") || "").includes("sandbox"),
  servido.headers.get("content-security-policy") || "(ninguna)");

// ── 4. GIF (lo que pidio el usuario) ────────────────────────────────────────
console.log("\n4. Subida de GIF");
const r2 = await setFormLogo(formId, userId, { buffer: GIF, mimetype: "image/gif" });
ok("acepta image/gif", (r2.settings?.logo || "").includes(".gif"), r2.settings?.logo);
const gifServido = await fetch(BASE + r2.settings.logo.split("?")[0]);
ok("el GIF se sirve", gifServido.status === 200, `status ${gifServido.status}`);
ok("Content-Type image/gif", (gifServido.headers.get("content-type") || "").includes("image/gif"),
  gifServido.headers.get("content-type"));

// ── 5. Re-subir cambia la version (el navegador no sirve el cacheado) ───────
console.log("\n5. Cache-busting al re-subir");
ok("la version cambia al re-subir", r1.settings.logo.split("?v=")[1] !== r2.settings.logo.split("?v=")[1],
  `${r1.settings.logo.split("?v=")[1]} -> ${r2.settings.logo.split("?v=")[1]}`);

// ── 6. Se rechaza un archivo que no es imagen ───────────────────────────────
console.log("\n6. Rechazo de lo que no es imagen");
for (const [nombre, mime] of [["PDF", "application/pdf"], ["HTML", "text/html"], ["ejecutable", "application/octet-stream"]]) {
  try {
    await setFormLogo(formId, userId, { buffer: Buffer.from("contenido"), mimetype: mime });
    ok(`rechaza ${nombre}`, false, "lo acepto");
  } catch (e) {
    ok(`rechaza ${nombre}`, /imagen|image/i.test(e.message), e.message);
  }
}

// ── 7. Propiedad: otro usuario no puede tocar el logo ───────────────────────
console.log("\n7. Aislamiento entre cuentas");
const [otro] = (await query(`SELECT id FROM users WHERE id <> $1 LIMIT 1`, [userId])).rows;
try {
  await setFormLogo(formId, otro.id, { buffer: PNG, mimetype: "image/png" });
  ok("un usuario ajeno NO puede escribir el logo", false, "lo permitio");
} catch (e) {
  ok("un usuario ajeno NO puede escribir el logo", true, e.message);
}

// ── 8. Borrado ──────────────────────────────────────────────────────────────
console.log("\n8. Borrado");
const r3 = await clearFormLogo(formId, userId);
ok("settings.logo queda vacio", (r3.settings?.logo || "") === "", JSON.stringify(r3.settings?.logo));
const tras = await fetch(BASE + r2.settings.logo.split("?")[0]);
ok("el archivo desaparece de disco", tras.status === 404, `status ${tras.status}`);
ok("los demas ajustes sobreviven al borrado", r3.settings?.primaryColor === alquilado.settings?.primaryColor,
  JSON.stringify(r3.settings?.primaryColor));

// ── Restaurar el formulario a su estado original ────────────────────────────
console.log("\nRestaurando el formulario de la cuenta QA...");
await query(`UPDATE forms SET settings = $2::jsonb WHERE id = $1`, [formId, ORIGINAL]);
const [final] = (await query(`SELECT settings FROM forms WHERE id = $1`, [formId])).rows;
ok("settings restaurados exactamente", JSON.stringify(final.settings) === ORIGINAL);
ok("el logo quedo como estaba", final.settings?.logo === alquilado.settings?.logo, JSON.stringify(final.settings?.logo));

console.log(`\n${fallos === 0 ? "Todo pasa." : fallos + " comprobacion(es) fallan."}`);
process.exit(fallos === 0 ? 0 : 1);
