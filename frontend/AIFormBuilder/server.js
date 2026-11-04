import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Buscar dist/ en varias ubicaciones posibles (por compatibilidad con Render)
const possibleDistPaths = [
  path.resolve("dist"),
  path.resolve("frontend/AIFormBuilder/dist"),
  path.resolve(__dirname, "dist"),
];

let distPath = null;
for (const p of possibleDistPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
    distPath = p;
    break;
  }
}

if (!distPath) {
  console.warn("WARNING: dist/ no encontrado. Sirviendo página de estado.");
  app.get("*", (req, res) => {
    res.status(503).send("<h2>Frontend no construido aún</h2><p>Ejecuta <code>npm run build</code> en el frontend.</p>");
  });
} else {
  console.log(`Sirviendo archivos estáticos desde: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback: cualquier ruta que no sea un archivo físico va a index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend sirviendo en puerto ${PORT}`);
});