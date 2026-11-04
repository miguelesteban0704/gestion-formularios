# Despliegue

Este documento es la lista de cosas que tienen que estar bien **fuera del
código**. La app compila y todas sus sondas pasan en local; si esto falla, el
fallo aparece en producción como una página en blanco o un 404 en una URL que
"funcionaba en mi máquina".

- [1. Regla que no se negocia: `index.html` para cualquier ruta](#1-regla-que-no-se-negocia-indexhtml-para-cualquier-ruta)
- [2. Configuración por servidor](#2-configuración-por-servidor)
- [3. Comprobarlo en 30 segundos](#3-comprobarlo-en-30-segundos)
- [4. El proveedor de identidad](#4-el-proveedor-de-identidad)
- [5. Pendiente conocido: el puerto 5173 escrito en el backend](#5-pendiente-conocido-el-puerto-5173-escrito-en-el-backend)
- [6. Compilación](#6-compilación)

---

## 1. Regla que no se negocia: `index.html` para cualquier ruta

Es una SPA: no hay un fichero por página. El servidor tiene que devolver
`index.html` para **toda** ruta de la app, y dejar que el enrutador del cliente
decida qué pantalla es. Sin esto, `/panel-gestion/formularios` da 404 en el
servidor y nunca llega a existir la redirección a `/panel-gestion` que la app
trae de las rutas viejas: el 404 es del servidor, no de la app, y por eso
`npm run preview` (que sí lo hace) no lo reproduce.

Las rutas que tienen que devolver `index.html`:

| Patrón | Qué es |
|---|---|
| `/panel-gestion/**` | el panel en español, **y la raíz `/panel-gestion`** |
| `/en/panel-management/**` | el panel en inglés, incluida su raíz |
| `/` | la portada, que salta al panel del idioma actual |
| `/login`, `/auth/callback` | las puertas que usa el proveedor de identidad |
| `/f/*` | los formularios publicados, que se comparten por correo |
| `/dashboard`, `/forms`, `/settings`, `/insights`, `/inbox`, `/templates`, `/design`, `/builder/*`, `/forms/*/responses`, `/forms/*/analytics` | rutas viejas: la app las redirige al panel, pero solo si el servidor se las deja llegar |

Las tres últimas filas son las que más se olvidan. `/login` y `/auth/callback`
las llama el proveedor de identidad por su cuenta: si el servidor devuelve 404,
el usuario vuelve de un login correcto a una pantalla de error. Y las rutas
viejas son enlaces ya compartidos: sin ellas, un marcador guardado deja de
funcionar sin avisar.

El fallo tiene dos caras y conviene verlas las dos:

- **Con el fallback puesto**, `/f/mi-encuesta` carga la app y se ve el
  formulario.
- **Sin él**, el enlace público es un 404 del servidor. Y como `/f/*` no depende
  del panel, no hay ninguna redirección que lo salve.

> `dist/` no se sirve desde un subdirectorio (`base` es `/`). Si el despliegue
> final cuelga de algo como `/app/`, hay que cambiar `base` en `vite.config.js`
> y cambiar también los alias con `VITE_PANEL_BASE_ES` / `VITE_PANEL_BASE_EN`.

## 2. Configuración por servidor

### Render (frontend y API separados)

El sitio estático debe compilarse con `VITE_API_URL` apuntando al dominio del
servicio backend, terminado en `/api` (como en `.env.production` y `render.yaml`).
La app conserva ese host: no se debe reemplazar por el dominio del navegador,
porque el frontend estático puede responder con `index.html` para una ruta
`/api` y hacer que la app interprete HTML como una respuesta de la API.

### nginx

```nginx
root /var/www/cubagob;          # donde esté dist/
index index.html;

location / {
  try_files $uri $uri/ /index.html;
}

# Los assets tienen nombre con hash: si existen, se sirven; si no, es que se
# pidió una versión vieja que ya no existe y no debe devolverse la app.
location /assets/ {
  try_files $uri =404;
}
```

### Caddy

```
example.gob.cu {
  root * /var/www/cubagob
  try_files {path} /index.html
  file_server
}
```

### Apache

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Netlify / Vercel / Cloudflare Pages

Netlify (`public/_redirects`):

```
/*  /index.html  200
```

Vercel y Cloudflare Pages: en `vercel.json`, `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]`.

## 3. Comprobarlo en 30 segundos

Con la build servida **por el servidor real**, no por `npm run preview` (el
preview siempre hace fallback y por eso nunca falla):

```bash
npm run build
npx serve dist        # o nginx, o lo que sea

# Todas tienen que devolver 200 y el HTML de index.html:
for r in / /panel-gestion /panel-gestion/formularios \
         /panel-gestion/configuracion \
         /en/panel-management/forms \
         /login /auth/callback \
         /f/cualquiera /builder/42 /forms; do
  printf '%s -> %s\n' "$r" "$(curl -s -o /dev/null -w '%{http_code}' "https://TU-DOMINIO$r")"
done
```

Un `404` en cualquiera de ellas es un 404 del servidor. La app nunca devuelve
404 por esas rutas: o redirige, o dibuja la pantalla de "no encontrada".

## 4. El proveedor de identidad

Tres URL, todas en `backend/.env`:

```dotenv
OIDC_REDIRECT_URI=https://TU-DOMINIO/api/auth/callback
OIDC_LOGIN_REDIRECT_URI=https://TU-DOMINIO/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=https://TU-DOMINIO/
```

`/auth/callback` y `/` **no** cuelgan del panel a propósito: las llama el
proveedor de identidad, que usa la URL registrada en el backend. Moverlas al
alias rompería el inicio de sesión.

El idioma de destino lo decide la app, no estas variables: al volver del login
aterriza en `/auth/callback` y salta al panel del idioma que tenga elegido, con
el título `Gestor de Formularios`.

La URL de redirección al IDP es `redirect_uri` del *callback del backend*, no
una página de la app: por eso va en el backend y no en el frontend.

## 5. Pendiente conocido: el puerto 5173 escrito en el backend

`backend/controllers/auth.controller.js`, en `getRequestRedirects()`, construye
la URL del frontend **con el puerto 5173 escrito a mano**:

```js
const frontendUrl = new URL(`https://${hostname}:5173`);
```

Eso es el servidor de desarrollo de Vite. En producción, el login terminaría
mandando al usuario a `https://TU-DOMINIO:5173/auth/callback`, donde no hay
nada. `OIDC_LOGIN_REDIRECT_URI` y `OIDC_POST_LOGOUT_REDIRECT_URI` **no lo
arreglan**: solo se usan como reserva cuando algo falla (por ejemplo, un
`state` que no cuadra), no en el camino normal.

Mientras no se cambie, el frontend hay que servirlo en el 5173 o hay que tocar
esa función para que tome el puerto y el protocolo de una variable de entorno.
Está pendiente de decidir; no se ha tocado porque es un cambio en el contrato
de autenticación y porque solo importa cuando haya un dominio de producción.

## 6. Compilación

```bash
npm ci
npm run build        # -> dist/
```

Comprobaciones antes de publicar:

```bash
npm run qa:routes    # 124 comprobaciones de rutas, sin red ni navegador
npm run qa:nav       # la app montada, con sesión: títulos, menú, cambio de idioma
npm run lint
npx tsc --noEmit
```

`npm run lint` y `npx tsc --noEmit` avisan de cosas preexistentes que no se han
tocado (tres errores de *rules-of-hooks* en `src/components/ui/Card.jsx`). No
son de este despliegue.
