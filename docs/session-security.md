# Seguridad de sesiones

Documento de referencia del endurecimiento de sesiones (Tier 1 + Tier 2, puntos P1–P15).
Estado: **P1–P4 y P6 implementados y verificados**.

> **Cambio de política (2026-10-13):** se eliminó la **reautenticación de acciones críticas**
> (`requireReauth` + `POST /api/auth/reauth` + modal `ReauthHost`) y el **aviso proactivo** de
> expiración (`SessionExpiryWarning`). Al expirar la sesión (inactividad o vida absoluta) se cierra
> **automáticamente y en silencio**, sin pedir la contraseña ni mostrar ningún modal.

## 1. Objetivo

Reducir la ventana de abuso de una sesión robada o abandonada mediante:

- **Doble control de expiración:** inactividad (idle) **y** vida absoluta por rol.
- **Invalidación global** ante cambio de contraseña, cambio de rol/entidad o desactivación de cuenta.
- **Cierre automático** de la sesión al expirar (sin modales).
- **Límite de sesiones concurrentes** por usuario.
- **Auditoría** de todos los eventos de sesión.

## 2. Política por rol

Todas las ventanas de tiempo se configuran en `backend/config/env.js` y se resuelven en un único
lugar, `backend/utils/sessionPolicy.js` (fuente de verdad).

| Rol | Idle | Vida absoluta | Máx. sesiones |
|-----|------|---------------|---------------|
| `super_admin` | 15 min | 8 h | 3 |
| `entity_admin` | 30 min | 8 h | 5 |
| `form_creator` | 60 min | 8 h | 5 |
| (sin rol / default) | 60 min | 8 h | 5 |

Notas:

- **Idle** se mide contra `last_user_activity` (última **interacción real** del usuario: ratón, teclado,
  scroll), no contra `last_active` (último request, que incluye sondeos automáticos y SSE).
- **Vida absoluta** se mide contra `absolute_expires_at` (o `created_at + sessionAbsoluteMinutes` si
  aún no se ha fijado el valor). Aunque el usuario esté activo, la sesión muere al cumplirse.

### Variables de entorno (`backend/config/env.js`)

```
SESSION_IDLE_SUPER_MINUTES   = 15
SESSION_IDLE_ENTITY_MINUTES  = 30
SESSION_IDLE_CREATOR_MINUTES = 60
SESSION_IDLE_DEFAULT_MINUTES = 60
SESSION_ABSOLUTE_MINUTES     = 480
SESSION_MAX_CONCURRENT_SUPER = 3
SESSION_MAX_CONCURRENT_ENTITY= 5
SESSION_MAX_CONCURRENT_CREATOR=5
SESSION_MAX_CONCURRENT_DEFAULT=5
```

## 3. Esquema de datos

Migración idempotente en `backend/config/db.js` (`migrate()`) y reflejada en `backend/db/schema.sql`.

Tabla `user_sessions`:

- `last_user_activity` (`timestamptz NOT NULL`): última interacción real (mide la inactividad).
- `absolute_expires_at` (`timestamptz NULL`): techo duro de la sesión.
- `last_reauth_at` (`timestamptz NULL`): **obsoleta**; se conserva por compatibilidad de esquema (ya
  no se escribe ni se lee).
- Índice `idx_user_sessions_expiry`.

## 4. Validación en cada request (`backend/middleware/auth.js` → `protect`)

1. Verifica el JWT y busca al usuario.
2. Rechaza si `isActive === false`.
3. **Vida absoluta:** `absolute_expires_at` / `created_at + absoluteMs` → si caducó, desactiva y
   audita `session.absolute_expired`.
4. **Expiración de token:** `expires_at`.
5. **Idle:** `now - last_user_activity > idleMsForRole(role)` → desactiva y audita `session.idle_expired`.
6. Expone `req.session` y `req.sessionPolicy`; refresca `last_active` de forma asíncrona.

## 5. Reautenticación de acciones críticas

**Eliminada.** Las acciones críticas (borrados, regeneración de URLs/portal) solo requieren el rol
adecuado: no piden contraseña ni 2FA. Ya no existen `backend/middleware/reauth.js`,
`POST /api/auth/reauth` ni el estado `last_reauth_at`.

## 6. Invalidación global

- **Contraseña:** `PATCH /api/settings/.../password` revoca las demás sesiones del usuario
  (`deactivateAllExcept`/`deactivateAllByUser`) y audita `auth.password.changed`.
- **Rol/entidad o `isActive`:** `admin.controller.updateUser` y `entityAdmin.controller.updateUser`
  revocan las demás sesiones y auditan `session.revoked`.

## 7. Expiración en el cliente (`AuthContext`)

- Mide la **interactividad real** (ratón/teclado/scroll) y envía un heartbeat (`POST /api/auth/activity`)
  con un tope de 60 s.
- Un vigilante cada 5 s compara el idle y la vida absoluta del rol; al agotarse, **cierra la sesión
  automáticamente** (`logout()`), sin aviso previo.

## 8. Eventos de auditoría

`session.absolute_expired`, `session.idle_expired`, `session.concurrency_evicted` (evicción por tope),
`auth.password.changed`, `session.revoked`.

## 9. Endpoints de sesión

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/sessions` | Sesiones activas del usuario. |
| GET | `/api/auth/sessions/current` | Estado de la sesión actual + política del rol (`idleMs`, `absoluteMs`, `maxConcurrent`). |
| POST | `/api/auth/activity` | Heartbeat de interacción (limiter `sessionLimiter`). |
| POST | `/api/auth/sessions/logout` | Cierra la sesión actual. |

## 10. Archivos clave

**Backend**

- `backend/utils/sessionPolicy.js` — minutos por rol (idle, absoluto, concurrentes) en un único lugar.
- `backend/middleware/auth.js` — validación idle + absoluta en cada request.
- `backend/repositories/session.repo.js` — `touchUserActivity`, `deactivateOldestBeyond`, etc.
- `backend/config/db.js` + `backend/db/schema.sql` — columnas de la tabla `user_sessions`.

**Frontend**

- `src/lib/api.js` — interceptor 401 (respeta `__noLogout` para las puertas y las pruebas de sesión).
- `src/contexts/AuthContext.jsx` — vigilante de sesión (idle + absoluto) → cierre automático.
- `src/services/index.js` — `authApi.currentSession()`, `authApi.activity()`.

## 11. Pendiente / futuro

- Pruebas E2E de expiración (idle + absoluta) y de aislamiento por realm.
- Rotación de token y evicción por dispositivo.
