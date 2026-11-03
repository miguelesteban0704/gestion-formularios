import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias raíz estilo shadcn: permite instalar componentes con
      // `npx shadcn@latest add ...` sin reescribir sus imports.
      "@": `${import.meta.dirname}/src`,
      // `sonner` NO es la librería: es nuestro sistema de notificaciones.
      sonner: `${import.meta.dirname}/src/components/ui/Toast.tsx`,
    },
  },
  server: {
    https: {
      key: fs.readFileSync("./certs/192.168.5.105+2-key.pem"),
      cert: fs.readFileSync("./certs/192.168.5.105+2.pem"),
    },
    host: "0.0.0.0",
    port: 5173,
    open: true,
    strictPort: true,
    /* Todo el tráfico del navegador pasa por el MISMO origen (`:5173`) y Vite lo
       reenvía al backend. Es lo que permite abrir la app desde otro equipo de la
       red sin instalar nada allí: con la API en `:8000` el navegador tenía que
       validar un SEGUNDO certificado, también de la CA privada de mkcert, y en
       un dispositivo que no la tiene el `fetch` se bloquea en silencio (axios
       lo ve como "sin conexión", aunque el backend esté encendido). Al pasar por
       el proxy solo hay un origen y un certificado: el de `:5173`.
       `secure: false` porque el backend usa su propio certificado de mkcert. */
    proxy: {
      "/api": { target: "https://127.0.0.1:8000", changeOrigin: true, secure: false },
      "/avatars": { target: "https://127.0.0.1:8000", changeOrigin: true, secure: false },
      "/form-logos": { target: "https://127.0.0.1:8000", changeOrigin: true, secure: false },
    },
    /* SPA fallback: servir index.html para cualquier ruta que no sea una petición
       de API ni un archivo estático, así React Router puede manejar rutas como
       /formularios-con-ia/loginadmin correctamente. */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Las llamadas a la API y archivos estáticos pasan directamente
        if (
          req.url.startsWith("/api") ||
          req.url.startsWith("/avatars") ||
          req.url.startsWith("/form-logos") ||
          req.url.startsWith("/@vite") ||
          req.url.endsWith(".png") ||
          req.url.endsWith(".jpg") ||
          req.url.endsWith(".css") ||
          req.url.endsWith(".js") ||
          req.url.endsWith(".ico")
        ) {
          return next();
        }
        // Cualquier otra ruta se sirve como index.html para que React Router
        // gestione la ruta (SPA fallback).
        res.setHeader("Content-Type", "text/html");
        res.status(200);
        res.end(fs.readFileSync(path.join(server.config.root, "index.html")));
      }, { prepend: true });
    },
    hmr: { overlay: true },
    watch: { usePolling: true, interval: 100 },
  },
  preview: { port: 4173, open: true },
});
