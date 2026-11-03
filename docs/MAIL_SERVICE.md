# Servicio de correo — alta de cuentas y bienvenida

> Contrato del correo transaccional del backend (`backend/services/mail.*` y
> `welcome.service.js`). Verificado contra el árbol real.

## 1. Qué resuelve

Al crear una cuenta gestionada (`entity_admin` o `form_creator`) desde el panel
del super-admin o del gestor de entidad, el sistema **envía un correo de
bienvenida** al nuevo usuario con:

- su **nombre** y su **entidad**,
- la **URL de acceso** (`<clientUrl>/a/<slug>`),
- lo necesario para entrar, según la **variante** configurada.

El alta **nunca falla** por el correo: el envío es *best-effort*. El panel
recibe el resultado (`mail.sent`) y muestra un diálogo u otro.

## 2. Variantes (variable `MAIL_SEND_CREDENTIALS`)

| Variante | `MAIL_SEND_CREDENTIALS` | El correo lleva | Caducidad | Efecto en la cuenta |
|---|---|---|---|---|
| **A** (por defecto) | `false` | **Enlace de activación** (`?token=…`, un solo uso) | `MAIL_ACTIVATION_TTL_HOURS` (24 h) | Sin contraseña en el correo; la cuenta ya existe con la contraseña que fijó el admin |
| **B** | `true` | **Usuario + contraseña temporal** | `MAIL_TEMP_PASSWORD_TTL_HOURS` (72 h) | `must_change_password = true`; cambio forzado al entrar |

- En **A**, el enlace apunta a una **ruta estable**: `${frontendUrl}/activar?token=<token>`
  (espejo del backend: `ACTIVATION_PATH` en `welcome.service.js`; del frontend:
  `ACTIVATION_PATH` en `lib/routes.js`).
  **No lleva el slug de la puerta a propósito:** el slug es el secreto de
  `/a/<slug>` y «Regenerar» existe para invalidar un enlace filtrado, así que si
  el correo lo llevara, rotar una puerta mataría los correos de activación ya
  enviados. La activación la protege el **token** (un solo uso, con caducidad).
  El correo sigue mostrando la puerta del usuario como dato, y al terminar,
  `localReset` devuelve la **puerta vigente** (`data.door`, ruta relativa) para
  que `/activar` le lleve a iniciar sesión: un correo antiguo también acaba en la
  puerta correcta.
  El enlace se compone con `FRONTEND_URL` + ruta, **sin ningún dominio escrito**,
  así que el mismo vale en cualquier entorno.
  El token se firma con `userRepo.createPasswordReset(userId, ttlMinutos)` y lo
  valida `localReset` por token, con independencia de la página desde la que se
  abra.
- En **B**, la contraseña temporal la genera `generateTempPassword()` (12
  caracteres, `crypto.randomInt`, sin caracteres ambiguos) y se guarda hasheada
  con `userRepo.setTemporaryPassword(userId, hash, expiresAtIso)`.

## 3. Reenvío («Reenviar correo»)

La contraseña original **nunca** se puede reenviar (está hasheada). `resendWelcomeEmail`:

- **A**: firma un **token nuevo**.
- **B**: **genera una contraseña temporal nueva** y vuelve a marcar
  `must_change_password`.
- Si la cuenta no tiene URL de acceso asociada, devuelve
  `{ sent:false, reason:"no_access_url" }` (no hay a dónde mandar el enlace).

Endpoints:
- `POST /api/admin/users/:id/resend-welcome` (super_admin; rechaza `super_admin`).
- `POST /api/entity-admin/users/:id/resend-welcome` (entity_admin, solo SU entidad).

Cuerpo opcional: `{ language: "es" | "en" }` (por defecto `"es"`).

## 4. Contrato de retorno (alta y reenvío)

Ambos devuelven `data: { user, mail }` (alta) o `data: { mail }` (reenvío), con:

```js
mail = {
  sent: boolean,        // true si el proveedor aceptó el envío
  reason: "disabled" | "error" | "no_access_url" | null,
  to: string,           // destinatario
  preview?: string,     // solo con Ethereal (dev)
}
```

`sendUserWelcomeEmail` **nunca lanza**: captura el error y devuelve
`reason:"error"`. `sendPasswordResetCode` sí lanza (su llamador lo tolera).

## 5. Configuración (`backend/.env`)

```dotenv
MAIL_PROVIDER=ethereal        # ethereal | smtp | (vacío = sin correo)
MAIL_FROM="Formularios con IA <no-reply@…>"
MAIL_SEND_CREDENTIALS=false   # false = variante A (enlace); true = variante B
MAIL_ACTIVATION_TTL_HOURS=24
MAIL_TEMP_PASSWORD_TTL_HOURS=72

# smtp
SMTP_HOST=…
SMTP_PORT=587
SMTP_USER=…
SMTP_PASS=…
MAIL_SECURE=                  # vacío = se infiere del puerto (465 = TLS implícito)
```

`isMailConfigured()` es falso si: no hay `MAIL_PROVIDER`/es `none`, Ethereal en
producción, o SMTP sin host/usuario/contraseña. En ese caso el alta sigue
funcionando y `mail.reason === "disabled"`.

## 6. Auditoría

Eventos `auditNow`:
- `user.create` (siempre), `user.create.email_sent` / `user.create.email_failed`.
- `user.welcome.resend` / `user.welcome.resend_failed`.
- `auth.local.temp_password_expired` (variante B, acceso con temporal caducada).

## 7. Cambio forzado (variante B)

- Columna `users.must_change_password` (+ `temp_password_expires_at`).
- `localLogin`: si `mustChangePassword` y la temporal caducó → `401`
  «Tu contraseña temporal caducó; solicita un nuevo acceso».
- `GET /auth/me` propaga `mustChangePassword` (vía `mapUser`).
- Frontend: `RoleRoute` intercepta cualquier URL del panel y monta
  `pages/ForcePasswordChange.jsx`, que llama a `POST /settings/password` y
  limpia la marca con `updateUser`. `settings.repo.setPassword` ya limpia
  `must_change_password`/`temp_password_expires_at` y resetea bloqueos.

## 8. Plantillas (`mail.templates.js`)

`welcomeEmail({ mode: "activation" | "credentials", language, logoUrl, name,
entityName, role, username, email, password, url, activationUrl, ttlHours })`
y `resetEmail({ language, code, ttlMinutes })` devuelven `{ subject, text, html }`.

Diseño «premium» basado en el color de marca (`--color-brand-500 #00D2FF`) y su
rampa: héroe oscuro con acento cyan, cabecera con barra de degradado de marca, el
**favicon del sitio** a la izquierda del héroe (sobre una pastilla blanca),
botón con `linear-gradient(145deg, brand-300 → brand-500 → brand-700)` y panel
de datos con fondo `brandSoft`. `brandColors` es la única fuente de verdad de los
hex (espeja `src/index.css` @theme); los estilos van en línea (tablas
`role="presentation"`, 600px) con `background-color` de respaldo para los
degradados. Incluye *preheader* oculto, ES/EN, `escapeHtml` en todo dato dinámico
y modo oscuro vía `<meta color-scheme>` + `@media (prefers-color-scheme)`.

En la variante A, el cuerpo se organiza en secciones rotuladas: **Apertura**,
**Contexto de la cuenta**, **Llamada a la acción** (botón «Establecer mi
contraseña» + URL de respaldo), **Detalles de acceso** (URL de acceso y usuario)
y **Recomendación de seguridad**.

## 9. Notas

- `localRegisterByAccess` (auto-registro abierto por `/a/<slug>`) **no** envía
  correo: el usuario elige su propia contraseña en ese momento.
- El logo del correo es el **favicon del sitio** (`frontend/AIFormBuilder/public/favicon.png`).
  Se inserta como adjunto **en línea (`cid:`)** para que se renderice en cualquier
  buzón sin depender de una URL pública (Gmail no descarga imágenes de IPs
  privadas). Si no se encuentra el archivo, se cae a `${FRONTEND_URL}/favicon.png`.
  Ruta configurable con `MAIL_LOGO_PATH`.
- Las URLs de acceso/activación se construyen con `FRONTEND_URL` (base única);
  `CLIENT_URL` puede ser una lista de orígenes (solo para CORS).
