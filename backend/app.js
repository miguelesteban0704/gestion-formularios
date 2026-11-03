import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { protect } from "./middleware/auth.js";
import { localizedMessage } from "./utils/messages.js";

import os from "os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import localAuthRoutes from "./routes/localAuth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import entityAdminRoutes from "./routes/entityAdmin.routes.js";
import { resolveAccessUrl, verifyLoginPortal, listEntitiesPublic } from "./controllers/admin.controller.js";
import { guestSession, guestFormStats, guestFormExport, guestInsights } from "./controllers/guest.controller.js";
import formRoutes from "./routes/form.routes.js";
import responseRoutes from "./routes/response.routes.js";
import insightsRoutes from "./routes/insights.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

const app = express();
app.set("trust proxy", 1);
const allowedOrigins = env.clientUrl.split(",").map((origin) => origin.trim()).filter(Boolean);

// Patrón para IPs de red local (mismo subnet / LAN)
const localNetPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Demasiados intentos de autenticación, espera unos minutos." },
});

// Login local: mismo trato que el IDP (fuerza bruta + enumeración).
const localAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Demasiados intentos de autenticación, espera unos minutos." },
});

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Demasiadas verificaciones de sesión, reintentando..." },
});

// Limiter global para toda la API (ahora con skipSuccessful, no bloquea polling exitoso)
app.use("/api/", apiLimiter);
// Limiters específicos para auth — más permisivos para sesiones en tiempo real
app.use("/api/auth/login", strictAuthLimiter);
app.use("/api/auth/callback", strictAuthLimiter);
app.use("/api/auth/logout", strictAuthLimiter);
app.use("/api/auth/local/login", localAuthLimiter);
app.use("/api/auth/local/register-by-access", localAuthLimiter);
app.use("/api/auth/local/forgot", localAuthLimiter);
app.use("/api/auth/local/reset", localAuthLimiter);
app.use("/api/guest/login-portal/verify", localAuthLimiter);
app.use("/api/guest/session", localAuthLimiter);
app.use("/api/auth/sessions", sessionLimiter);
app.use("/api/auth/me", sessionLimiter);
app.use("/api/auth/activity", sessionLimiter);

// ✅ CORS para misma subred: permite localhost + cualquier IP local 192.168.x.x / 10.x / 172.16-31.x
// En desarrollo se permite cualquier origen local para que el link sea accesible desde otra máquina
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl / mobile webview sin origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (localNetPattern.test(origin)) return callback(null, true);
      // En desarrollo, sé permisivo para no bloquear pruebas en LAN
      if (env.nodeEnv === "development") return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    // `X-Idp-Respondent` lo lleva la respuesta de formularios privados (invitado
    // identificado por IDP); sin listarlo, el preflight CORS lo bloquea.
    allowedHeaders: ["Content-Type", "Authorization", "X-Idp-Respondent"],
  }),
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  const language = _req.headers["accept-language"]?.startsWith("es") ? "es" : "en";
  res.json({
    success: true,
    message: localizedMessage("API is healthy", language),
    uptime: process.uptime(),
  });
});

// Para que el frontend construya enlaces accesibles en la misma subred.
// Va con `protect` por el mismo motivo que el resto: con el sitio entero
// detrás del IDP, esto ya no lo consulta nadie sin sesión, y lo que devuelve son
// las IP de la red local del servidor. Es información de topología interna, y
// dato que solo hace falta dentro del panel (compartir por la subred), así que
// pedir identificación no le cuesta nada a quien lo usa de verdad.
app.get("/api/meta/network", protect, (_req, res) => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
    // Puerto y protocolo del frontend (ahora https)
  let frontendPort = "5173";
  let frontendProto = "https:";
  try {
    const u = new URL(env.frontendUrl || env.clientUrl || "https://localhost:5173");
    frontendPort = u.port || "5173";
    frontendProto = u.protocol;
  } catch {}
  const networkUrls = ips.map((ip) => `${frontendProto}//${ip}:${frontendPort}`);
  res.json({ success: true, data: { ips, networkUrls, frontendPort } });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth/local", localAuthRoutes);
app.use("/api/admin", adminRoutes);
// Panel de Gestión de Entidad (entity_admin): todo acotado a su entidad.
app.use("/api/entity-admin", entityAdminRoutes);
// Resolver público de URLs de acceso (sin sesión: precarga el login).
app.get("/api/access/:slug", resolveAccessUrl);
// Verificación del portal oculto (sin sesión; 404 si el slug no es el vigente).
app.post("/api/guest/login-portal/verify", verifyLoginPortal);
// Sesión anónima de invitados (limitada: cada llamada crea una cuenta).
app.post("/api/guest/session", guestSession);
// Stats + CSV públicos para invitados (el controlador veta lo privado).
app.get("/api/guest/stats", guestInsights);
app.get("/api/guest/forms/:slug/stats", guestFormStats);
app.get("/api/guest/forms/:slug/export", guestFormExport);
// Catálogo público de entidades activas (escaparate de invitados).
app.get("/api/guest/entities", listEntitiesPublic);
app.use("/api/forms", formRoutes);
app.use("/api", responseRoutes);
app.use("/api", insightsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);

// Carpeta de estáticos, resuelta con `fileURLToPath` y NO con `new URL(...).pathname`.
//
// Esto no es cosmético: `.pathname` devuelve la ruta percent-codificada, así que
// en una instalación bajo una ruta con espacios el proyecto se convertía en
// `/D:/My%20Stuff/React%20JS/AI%20form%20builder/backend/public/…`. Esa carpeta
// no existe, `express.static` no encuentra nada y responde 404 a todas las
// imágenes. `fileURLToPath` devuelve `D:\My Stuff\…\public\…`, que sí existe.
const staticDir = (dir) => path.join(path.dirname(fileURLToPath(import.meta.url)), "public", dir);

// Servir avatares subidos
app.use("/avatars", express.static(staticDir("avatars")));

// Logos de los formularios. Se sirven en la raíz (y no bajo /api) porque el
// <img> del formulario público los pide como URL absoluta, igual que los
// avatares. `immutable` + `maxAge` largos tienen sentido porque cada subida
// cambia la URL con un ?v=, así que una versión dada no cambia nunca.
//
// Cabeceras defensivas: se acepta cualquier formato de imagen, y eso incluye
// SVG, que es XML y puede llevar <script>. Un <img> no lo ejecuta, pero si
// alguien abre la URL en una pestaña sí. `Content-Security-Policy: default-src
// 'none'` deja la imagen pintada y prohíbe cualquier script, y `nosniff` impide
// que el navegador interprete el contenido de otra manera. Sin esto, subir un
// SVG sería un XSS guardado en el propio origen de la API.
app.use(
  "/form-logos",
  express.static(staticDir("form-logos"), {
    maxAge: "30d",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.use(notFound);
app.use(errorHandler);

export default app;
