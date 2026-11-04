import express from "express";
import path from "path";

const app = express();
const distPath = path.resolve("dist");

// Servir archivos estáticos del build
app.use(express.static(distPath));

// SPA fallback: cualquier ruta que no sea un archivo físico va a index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend sirviendo en puerto ${PORT}`);
});