import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { runBootstrap } from "./utils/bootstrap.js";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";

function loadCerts() {
  const candidates = [
    "./certs/192.168.5.105+2-key.pem",
    "./certs/192.168.5.105+2.pem",
  ];
  // Rutas alternativas donde mkcert suele dejar los archivos (frontend)
  const altBase = [
    path.resolve("certs"),
    path.resolve("../frontend/AIFormBuilder/certs"),
    path.resolve("frontend/AIFormBuilder/certs"),
    path.resolve("D:/My Stuff/React JS/AI form builder/frontend/AIFormBuilder/certs"),
  ];

  for (const base of altBase) {
    const keyPath = path.join(base, "192.168.5.105+2-key.pem");
    const certPath = path.join(base, "192.168.5.105+2.pem");
    try {
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
          from: base,
        };
      }
    } catch {}
  }
  // Intento directo relativo a cwd (fallback original)
  try {
    return {
      key: fs.readFileSync("./certs/192.168.5.105+2-key.pem"),
      cert: fs.readFileSync("./certs/192.168.5.105+2.pem"),
      from: "./certs",
    };
  } catch (e) {
    return null;
  }
}

async function start() {
  await connectDB();
  await runBootstrap();

  const certs = loadCerts();
  let server;
  if (certs) {
    console.log(`✔ Certificados HTTPS encontrados en: ${certs.from}`);
    server = https.createServer(certs, app).listen(env.port, "0.0.0.0", () => {
      console.log(`✔ Server running in ${env.nodeEnv} mode on https://192.168.5.105:${env.port} (https://localhost:${env.port})`);
    });
  } else {
    console.warn("⚠ Certificados HTTPS no encontrados en backend/certs — iniciando en HTTP. Copia los .pem de frontend/AIFormBuilder/certs/ a backend/certs/ para https://192.168.5.105:8000");
    server = http.createServer(app).listen(env.port, "0.0.0.0", () => {
      console.log(`✔ Server running in ${env.nodeEnv} mode on http://localhost:${env.port} (LAN: http://<tu-ip>:${env.port})`);
    });
  }

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`x Port ${env.port} is already in use. Stop the other backend process or use a different PORT in backend/.env.`);
      process.exit(1);
    }
    throw error;
  });
}

start();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
