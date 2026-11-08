# Correo transaccional en producción — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar correo Gmail SMTP en Render para recuperar contraseñas y activar cuentas nuevas, sin exponer códigos, tokens ni credenciales.

**Architecture:** Extraer las decisiones SMTP y de disponibilidad a utilidades puras testeables, conservar `mail.service.js` como adaptador Nodemailer, y declarar valores no secretos en el blueprint de Render mientras las credenciales se cargan manualmente como secretos.

**Tech Stack:** Node.js ESM, Nodemailer, `node:test`, Render Blueprint y Gmail SMTP.

**Spec:** `docs/superpowers/specs/2026-11-05-production-email-design.md`

## Global Constraints

- Producción usa `MAIL_PROVIDER=smtp`, `smtp.gmail.com:465` y `MAIL_SECURE=true`; 465 usa TLS inmediato y 587 usa STARTTLS.
- `SMTP_USER` y `SMTP_PASS` se guardan en Render como secretos no sincronizados por Git; nunca se leen para mostrarlos, se imprimen ni se añaden al repositorio.
- Mantener `MAIL_SEND_CREDENTIALS=false`: las altas envían enlace de activación, nunca contraseñas.
- Mantener respuesta anti-enumeración y no devolver ni registrar códigos/tokens de recuperación en producción.
- Los tests automatizados no conectan a Gmail ni envían correo real; la prueba real controlada ocurre después de configurar Render.
- Ejecutar comandos `git` desde la raíz del repositorio y los comandos npm desde `backend`.
- Antes de cada commit, inspeccionar el diff y stagear solo cambios propios de esa tarea; preservar cambios ajenos del worktree.

## Review Focus

- `MAIL_PROVIDER=ethereal` o secretos incompletos no deben presentarse como transporte SMTP funcional: cubrir proveedor, entorno y credenciales requeridas.
- Diferencia entre TLS implícito/STARTTLS: probar puertos 465 y 587 por separado.
- Fallo del SMTP al pedir recuperación: probar respuesta neutral, código ausente de la respuesta y de logs de producción.
- Alta con correo deshabilitado o fallido: mantener éxito del alta y `mail.sent=false`/`mail.reason` para diagnóstico sin credenciales/tokens en logs.
- Dominio de activación: verificar que el enlace apunta a `https://gestion-formularios.onrender.com`, no a un host de servicio distinto.

---

### Task 1: Añadir pruebas puras para configuración SMTP

**Files:**
- Create: `backend/utils/mailConfiguration.js`
- Create: `backend/qa/mail-config.test.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produce `isMailConfigured({ mailProvider, nodeEnv, smtpHost, smtpUser, smtpPass })`.
- Produce `createSmtpTransportOptions({ smtpHost, smtpPort, mailSecure, smtpUser, smtpPass })`, con `port` numérico y `auth: { user, pass }`.
- Produce `safeMailErrorCode(error)`: devuelve solo códigos de transporte permitidos (`EAUTH`, `ECONNECTION`, `ECONNREFUSED`, `ENOTFOUND`, `EMESSAGE`, `EENVELOPE`, `ESOCKET`, `ESTREAM`, `ETIMEDOUT`); cualquier otro valor devuelve `MAIL_TRANSPORT_ERROR`.

- [ ] **Step 1: Write failing tests**

En `mail-config.test.js`, comprobar: provider vacío, `none` y provider desconocido no configurados; Ethereal en producción deshabilitado; SMTP sin host/usuario/contraseña deshabilitado; SMTP completo habilitado; puerto 465 produce `secure: true`; puerto 587 produce `secure: false`; opciones explícitas coherentes con cada puerto se preservan y las contradictorias no prevalecen; `safeMailErrorCode` conserva un código permitido pero nunca devuelve `error.message` ni valores no permitidos.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test qa/mail-config.test.js` desde `backend`.
Expected: FAIL porque `utils/mailConfiguration.js` aún no existe.

- [ ] **Step 3: Implement the pure configuration helpers**

Implementar las tres funciones sin leer `process.env` ni abrir sockets. Usar `mailSecure` cuando no contradiga el puerto; si falta, inferir `secure` únicamente de `port === 465`. La función de diagnóstico debe devolver exclusivamente un código de la lista permitida o `MAIL_TRANSPORT_ERROR`, nunca el texto del error.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test qa/mail-config.test.js`.
Expected: todos los escenarios de provider, credenciales y TLS pasan.

- [ ] **Step 5: Add the test command and commit**

Añadir `test:mail` a `backend/package.json` con `node --test qa/mail-config.test.js`.

```bash
git add backend/utils/mailConfiguration.js backend/qa/mail-config.test.js backend/package.json
git commit -m "test: cubrir configuracion smtp"
```

### Task 2: Conectar Nodemailer y definir variables de Render

**Files:**
- Modify: `backend/services/mail.service.js`
- Modify: `render.yaml`
- Modify: `backend/qa/mail-config.test.js`
- Modify: `docs/MAIL_SERVICE.md`

**Interfaces:**
- `mail.service.js` conserva sus exports públicos `isMailConfigured`, `sendPasswordResetCode` y `sendUserWelcomeEmail`; delega opciones al helper de Task 1.
- El test de blueprint solo verifica nombres/valores no secretos y que los dos valores SMTP confidenciales declaren `sync: false`.

- [ ] **Step 1: Write a failing blueprint configuration test**

Añadir una prueba que lea el bloque del servicio `gestion-formularios-backend` en `render.yaml` y verifique: `MAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `MAIL_SECURE=true`, `MAIL_SEND_CREDENTIALS=false`, `SMTP_USER` y `SMTP_PASS` con `sync: false`, y `FRONTEND_URL=https://gestion-formularios.onrender.com`. Usar una comprobación acotada al bloque y sin nuevas dependencias YAML; no comprobar ni copiar ningún valor secreto.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test qa/mail-config.test.js` desde `backend`.
Expected: FAIL porque el blueprint declara actualmente Ethereal y no tiene variables SMTP.

- [ ] **Step 3: Wire the SMTP helpers and Render settings**

Hacer que `isMailConfigured()` use el helper puro y que `getTransporter()` configure Nodemailer con sus opciones. En fallos SMTP, sustituir el `error.message` crudo que actualmente se registra o devuelve por `safeMailErrorCode(error)`; conservar `reason: "error"` y un diagnóstico acotado sin valores arbitrarios. Cambiar solo las variables de correo del backend y el `FRONTEND_URL` en `render.yaml`; mantener el servicio frontend y el resto de variables intactos. Actualizar `docs/MAIL_SERVICE.md` con los pasos para cargar el App Password directamente en Render.

- [ ] **Step 4: Run configuration tests**

Run: `node --test qa/mail-config.test.js`.
Expected: pasan las pruebas del helper y del blueprint sin acceso a las credenciales reales.

- [ ] **Step 5: Commit**

```bash
git add backend/services/mail.service.js render.yaml backend/qa/mail-config.test.js docs/MAIL_SERVICE.md
git commit -m "fix: configurar gmail smtp para render"
```

### Task 3: Impedir que recuperación registre códigos en producción

**Files:**
- Create: `backend/utils/recoveryPolicy.js`
- Create: `backend/qa/recovery-code-logging.test.js`
- Modify: `backend/controllers/localAuth.controller.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produce `recoveryCodeLogMessage({ nodeEnv, email, code })`: devuelve `null` en producción y el mensaje de diagnóstico solo en desarrollo.

- [ ] **Step 1: Write failing tests**

Comprobar que producción devuelve `null` aunque reciba correo y código, y que desarrollo conserva un mensaje utilizable para la prueba local. No usar credenciales reales.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test qa/recovery-code-logging.test.js` desde `backend`.
Expected: FAIL porque el helper aún no existe.

- [ ] **Step 3: Implement the helper and wire `localForgot`**

Reemplazar el log incondicional del código por el helper; registrar el resultado solo cuando no sea `null`. Conservar la respuesta anti-enumeración, la persistencia del código, su TTL y el comportamiento de desarrollo.

- [ ] **Step 4: Run focused tests and audit the response**

Run: `node --test qa/recovery-code-logging.test.js qa/mail-config.test.js`.
Expected: códigos de recuperación no aparecen en mensajes de producción; proveedor y rutas SMTP siguen correctos.

- [ ] **Step 5: Update the focused test command and commit**

Actualizar `test:mail` en `backend/package.json` a `node --test qa/mail-config.test.js qa/recovery-code-logging.test.js`.

```bash
git add backend/utils/recoveryPolicy.js backend/qa/recovery-code-logging.test.js backend/controllers/localAuth.controller.js backend/package.json
git commit -m "fix: no registrar codigos de recuperacion en produccion"
```

### Task 4: Verificar los contratos de recuperación y activación

**Files:**
- Modify: `backend/qa/recovery-code-logging.test.js`
- No cambiar `backend/services/mail.templates.js` ni la variante de credenciales si no hay una regresión reproducible.

**Interfaces:**
- Mantener `localForgot` con respuesta neutral y `sendWelcomeForNewUser` con `activationUrlFor(FRONTEND_URL, token)`.
- Mantener el token de activación de un solo uso y la política best-effort de alta.
- Produce `recoveryResponseData({ nodeEnv, code, mailed })`: devuelve `{}` en producción y `{ code, mailed }` en desarrollo.
- La prueba del enlace importa `activationUrlFor` desde `backend/services/welcome.service.js`; la prueba no ejecuta operaciones de base de datos ni de correo.

- [ ] **Step 1: Add failing regression tests for the production response and activation link**

Cubrir que `recoveryResponseData` omite `code` en producción y conserva `{ code, mailed }` en desarrollo, y que `activationUrlFor("https://gestion-formularios.onrender.com", "test-token")` produce `https://gestion-formularios.onrender.com/activar?token=test-token`.

- [ ] **Step 2: Run the targeted tests to verify the new response test fails**

Run: `node --test qa/recovery-code-logging.test.js` desde `backend`.
Expected: FAIL porque `recoveryResponseData` aún no está implementado. El test del enlace debe pasar contra el helper puro ya existente; no conectar a la base de datos ni enviar correo.

- [ ] **Step 3: Implement the response helper and wire `localForgot`**

Implementar `recoveryResponseData` en `utils/recoveryPolicy.js` y usarlo para formar `data` en `localForgot`. No cambiar el texto neutral, la consulta del usuario ni el helper de activación si ya satisfacen la prueba.

- [ ] **Step 4: Run contract tests**

Run: `node --test qa/mail-config.test.js qa/recovery-code-logging.test.js`.
Expected: recuperación sin código en producción y URL canónica de activación; no enviar mensajes.

- [ ] **Step 5: Review and commit**

```bash
git diff -- backend/qa/recovery-code-logging.test.js backend/utils/recoveryPolicy.js backend/controllers/localAuth.controller.js
git add backend/qa/recovery-code-logging.test.js backend/utils/recoveryPolicy.js backend/controllers/localAuth.controller.js
git commit -m "test: verificar contratos de recuperacion y activacion"
```

### Task 5: Configurar y comprobar el servicio publicado

**Files:**
- Operación manual del propietario: variables secretas del servicio backend en Render.
- Modify: `docs/MAIL_SERVICE.md` solo si el flujo de configuración del Dashboard difiere del documentado.

**Interfaces:**
- Render recibe `SMTP_USER` y `SMTP_PASS` como secretos. El App Password se copia de forma privada directamente al Dashboard, nunca a Git o a esta conversación.

- [ ] **Step 1: Configure secrets and deploy backend**

Configurar `SMTP_USER` y `SMTP_PASS` en Render como secretos, sin copiarlos a archivos o logs; sincronizar el blueprint y desplegar `gestion-formularios-backend`. Antes de probar, confirmar que las variables existen sin revelar sus valores.

- [ ] **Step 2: Perform controlled recovery tests**

Solicitar recuperación para una cuenta de prueba controlada y para una dirección inexistente; comparar que ambas respuestas HTTP sean neutrales. Confirmar que el código llega solo al buzón controlado, completar el cambio de contraseña y verificar en logs que no aparecen el código ni el token.

- [ ] **Step 3: Perform a controlled activation test**

Crear una cuenta de prueba, confirmar la llegada del enlace al dominio canónico, abrirlo, establecer la contraseña y entrar por la puerta correspondiente.

- [ ] **Step 4: Verify operational result**

Confirmar `mail.sent=true` en altas, proveedor configurado y ausencia de errores de autenticación/transporte. Si Gmail o Render no acepta la conexión, guardar el mensaje operativo sin secretos y no declarar el flujo productivo verificado.

- [ ] **Step 5: Commit directly related documentation only if it changed**

Revisar el diff de `docs/MAIL_SERVICE.md`; solo si Task 5 lo modificó, stagear ese archivo exacto y crear el commit `docs: documentar verificacion de correo en render`.
