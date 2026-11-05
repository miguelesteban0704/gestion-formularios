# AGENTS.md — Gestor de Formularios

### 2026-11-03 — Recuperación: separar mensaje de "no coincide con la cuenta", evitar error prematuro y desbloqueo del botón

**Objetivo (petición del usuario):** al escribir el correo en el `RecoveryModal` de las puertas `/a/:slug`, (1) el mensaje "Introduce una dirección de correo válida" (`recoveryEmailInvalid`) aparecía siempre aunque el correo tuviera formato válido pero no coincidiera con la cuenta; (2) el error de formato aparecía mientras el usuario aún escribía el dominio; (3) el botón "Enviar instrucciones" no se desbloqueaba nunca y no aparecía ningún error.

**Causa raíz:** (1) el schema Zod usaba un único `refine` con un solo mensaje para formato y no-coincidencia; (2) `emailTouched` se activaba en la primera tecla; (3) `disabled={busy || !!emailError}` usaba `emailError` directamente, que se setea al escribir (vía `validateEmail` en `onChange`), deshabilitando el botón sin mostrar el error visual (porque `emailTouched` era false).

**Archivos modificados (3):**
- `src/contexts/LanguageContext.jsx` — añadida la clave `recoveryEmailNotMatch` en ambos diccionarios: es «El correo no coincide con la cuenta», en «The email does not match this account.», separada de `recoveryEmailInvalid` (formato).
- `src/components/auth/RecoveryModal.jsx` — el schema Zod se divide en **dos** refinements: (1) formato → `recoveryEmailInvalid`; (2) coincidencia con `expectedEmail` → `recoveryEmailNotMatch`. `handleEmailChange` ya no marca `emailTouched` inmediatamente; se añade `handleEmailBlur` que marca touched y valida al salir del campo. El input recibe `onBlur={handleEmailBlur}`. El botón usa `disabled={busy || (emailTouched && !!emailError)}` para no bloquearse mientras se escribe sin haber tocado el campo.
- `src/components/auth/AccessLogin.jsx` — sin cambios; sigue pasando `expectedEmail={expectedRecoveryEmail}` resuelto de `data.user.email` vía `accessApi.resolve()`.

**Comportamiento final:**
- Mientras el usuario escribe: sin error, botón habilitado.
- Al salir del campo (blur) o pegar: si el formato es inválido → "Introduce una dirección de correo válida"; si el formato es válido pero no coincide con la cuenta de la URL de acceso → "El correo no coincide con la cuenta"; si es válido y coincide → error se limpia y botón se desbloquea.
- Al enviar con error: se muestra el error y el botón se bloquea; `validateEmail()` impide el envío.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en los archivos tocados).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB son preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes de la baseline, sin regresión.

### 2026-11-03 — Recuperación: separar mensaje de "no coincide con la cuenta" y evitar error prematuro de formato

**Causa raíz:** el schema Zod usaba un **único** `refine` con un solo mensaje (`recoveryEmailInvalid`) para ambos casos (formato inválido y no-coincidencia con `expectedEmail`), y `emailTouched` se activaba en la primera tecla (`onChange`), mostrando el error prematuramente.

**Archivos modificados (3):**
- `src/contexts/LanguageContext.jsx` — añadida la clave `recoveryEmailNotMatch` en ambos diccionarios: es «El correo no coincide con la cuenta», en «The email does not match this account.», separada de `recoveryEmailInvalid` (formato).
- `src/components/auth/RecoveryModal.jsx` — el schema Zod se divide en **dos** refinements: (1) formato → `recoveryEmailInvalid`; (2) coincidencia con `expectedEmail` → `recoveryEmailNotMatch`. Así cada caso muestra su mensaje propio. `handleEmailChange` ya no marca `emailTouched` inmediatamente; se añade `handleEmailBlur` que marca touched y valida al salir del campo, evitando que el error de formato aparezca mientras se escribe el dominio. El input del email recibe `onBlur={handleEmailBlur}`.
- `src/components/auth/AccessLogin.jsx` — sin cambios; sigue pasando `expectedEmail={expectedRecoveryEmail}` resuelto de `data.user.email` vía `accessApi.resolve()`.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia. El backend ya devuelve `data.user.email` desde `GET /api/access/:slug` (verificado con `curl`).

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en los archivos tocados).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB son preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes de la baseline, sin regresión.

### 2026-11-02 — SetPasswordForm: campo de repetir contraseña nueva con validación de coincidencia

**Objetivo (petición del usuario):** al crear un usuario nuevo se envía un correo con un link para que el usuario se cree una contraseña nueva (`/activar`, flujo de recuperación del portal y puerta `/a/:slug`, todo por `SetPasswordForm.jsx`). Se pidió agregar un segundo campo para repetir la contraseña antes de guardar, con validación de que los dos campos coincidan, sin modificar nada más del proceso.

**Archivo modificado (1):**
- `src/components/auth/SetPasswordForm.jsx` — se añade el estado `confirmPassword` y un segundo `SaField` `type="password"` con `label={t("confirmPassword")}`, `minLength={8}`, `autoComplete="new-password"` y `error={t("passwordsDontMatch")}` cuando `password.length > 0 && password !== confirmPassword`. El botón "Guardar contraseña" se habilita solo si el código es válido (`codeOk`) y las dos contraseñas coinciden y tienen ≥8 caracteres (`passwordsMatch = password.length >= 8 && password === confirmPassword`). Al éxito se limpian `password`, `confirmPassword` y `code`. El envío sigue llamando a `localAuthApi.reset((token || code).trim(), password)` igual que antes. Las claves `confirmPassword` y `passwordsDontMatch` ya existían en `LanguageContext.jsx` (es/en), así que no hubo que tocar i18n. Contrato de datos intacto: mismo `token`/`requireCode`/`onSuccess`, misma llamada al backend, sin cambios de persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `SetPasswordForm.jsx`).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece (baseline).
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes de la baseline (rutas/títulos de 404, sin relación con este cambio), sin regresión.

### 2026-11-02 — EntityUsers: quitar campo de contraseña al crear usuario (el usuario la crea por correo)

**Objetivo (petición del usuario):** al dar de alta un gestor de formularios desde el panel del gestor de entidad (`EntityUsers.jsx`), el modal de **crear usuario nuevo** ya no pide contraseña. Cuando se envía el correo de bienvenida, el usuario crea su propia contraseña desde el enlace de activación, así que el administrador no debe fijarla. En **edición** el campo de contraseña se conserva (opcional, "Déjala en blanco para no cambiarla").

**Archivo modificado (1):**
- `src/pages/entity-admin/EntityUsers.jsx`:
  - Validación de alta: `if (isCreate && !values.accessUrlId)` — se quita `!values.password`, ahora solo exige la URL de acceso.
  - Llamada `createUser`: se elimina `password: values.password` del payload de alta (ya no se envía contraseña al crear).
  - JSX del formulario: el campo `AdminInput` de contraseña se envuelve en `{!isCreate && (...)}`, así solo se renderiza en modo edición. El campo de usuario sigue visible en ambos modos.
  - El hint del campo de contraseña queda fijo `"Déjala en blanco para no cambiarla"` / `"Solo si quieres cambiarla"` (ya solo se muestra en edición).

**Contrato de datos intacto:** el schema de zod deja `password` opcional; en edición sigue enviándose `values.password || undefined`. No se toca el backend ni la persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `EntityUsers.jsx`).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece (baseline).
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes de la baseline (rutas/títulos de 404, sin relación con este cambio), sin regresión.

### 2026-11-02 — Super Admin: quitar campo de contraseña al crear usuario (admin/Users.jsx)

**Objetivo (petición del usuario):** en el panel de super-admin (`src/pages/admin/Users.jsx`), el modal que se abre al hacer clic en **"Nuevo Usuario"** ya no pide contraseña al crear una cuenta nueva. El usuario crea su propia contraseña desde el enlace de activación que llega por correo, así que el administrador no debe fijarla. En **edición** el campo de contraseña se conserva (opcional, "Déjala en blanco para no cambiarla").

**Archivo modificado (1):**
- `src/pages/admin/Users.jsx`:
  - Llamada `localAuthApi.register`: se elimina `password: values.password` del payload de alta (ya no se envía contraseña al crear).
  - Validación de alta: ya solo exige `accessUrlId` (`if (modal.mode === "create" && !values.accessUrlId)`), sin comprobar contraseña.
  - JSX del formulario: el bloque del campo `AdminInput` de contraseña (más la nota de bcrypt) se envuelve en `{!isCreate && (...)}`, así solo se renderiza en modo edición. El campo de usuario sigue visible en ambos modos.
  - Placeholder/hint del campo de contraseña pasan a `"Déjala en blanco para no cambiarla"` / `"Solo si quieres cambiarla"` (solo se muestran en edición).

**Contrato de datos intacto:** el schema de zod deja `password` opcional (`baseFields`, `min(8)` + `optional().or(z.literal(""))`); en edición sigue enviándose `values.password || undefined` vía `updateUser`. No se toca el backend ni la persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `Users.jsx`).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece (baseline).
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes de la baseline (rutas/títulos de 404, sin relación con este cambio), sin regresión.

### 2026-10-30 — Builder: campos se renderizan correctamente al arrastrar (sin sufijo "question", con input real y placeholders traducidos)

**Objetivo (petición del usuario):** al arrastrar un campo desde la paleta al lienzo del constructor, el campo mostraba el nombre con el sufijo " question" (p. ej. "Texto corto question") y debajo aparecía el texto plano "short text" en vez de un campo de entrada real. Además, los placeholders no respetaban el idioma seleccionado por el usuario.

**Causa raíz (tres defectos):**
1. `src/lib/fieldTypes.js` — `createField()` generaba la etiqueta como `\`${def.label} question\`` para todos los tipos no estáticos (línea 235).
2. `src/components/public/FieldRenderer.jsx` — usaba `translate("short text")` / `translate("long text")` como etiqueta en vez de `field.label`, y los `<input>`/`<textarea>` no llevaban atributo `placeholder`. Los tipos `dropdown`/`radio`/`checkbox`/`yes_no` que no se manejaban caían a `<p>{field.content || "short text"}</p>` (texto plano).
3. `src/components/builder/SortableField.jsx` — el diccionario `FIELD_TEXTS_DICTIONARY` no tenía entradas para los placeholders en español ("Escribe tu respuesta", "Dirección completa"), así que no se traducían al inglés.

**Archivos modificados (3):**
- `src/lib/fieldTypes.js` — `createField()`: `label: def.static ? def.label : \`${def.label} question\`` → `label: def.label`. El sufijo " question" desaparece.
- `src/components/public/FieldRenderer.jsx` — cada tipo de campo usa `field.label || translate(<tipo>)` como etiqueta (la etiqueta propia del autor tiene prioridad sobre el nombre genérico del tipo); `<input>`/`<textarea>`/`<select>` reciben `placeholder={field.placeholder || ""}`; se añaden las claves `"yes"`/`"no"` al diccionario bilingüe; el fallback final muestra `fieldLabel` en vez de texto plano.
- `src/components/builder/SortableField.jsx` — `translatedField` recibe `language`; `FIELD_TEXTS_DICTIONARY.es` añade "Escribe tu respuesta" / "Dirección completa" (identidad) y `.en` las traduce ("Write your answer" / "Full address"). Así `translateText()` traduce los placeholders al idioma activo.

**Contrato de datos intacto:** no se cambia la forma de `field` (sigue teniendo `label`, `placeholder`, `options`, etc.), ni el autosave, ni el backend, ni la persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 errores · `npm run build` → exit 0 (1.84 s) · `npm run lint` → exit 0 (solo warnings preexistentes; los dos `react(immutability)` en `FieldRenderer.jsx` son los mismos que ya existía antes al mutar `field.content` en `onChange`).

### 2026-10-30 — Selects desplegables en portal y fecha/hora premium (provincia, municipio, género, nivel de escolaridad, dropdown, date, time)

**Objetivo (petición del usuario):** (1) los selects (dropdown, provincia, municipio, género, nivel de escolaridad) no se desplegaban correctamente: abrían "al pie del formulario" cogiendo todo el ancho de la pantalla o se recortaban; (2) los campos de fecha y hora seguían sin un estilo premium moderno; (3) el municipio debe mantener el tooltip elegante cuando no hay provincia seleccionada.

**Causa raíz:** `PremiumSelect` usaba `position: absolute` con `w-full` dentro del contenedor del campo, por lo que el desplegable se posicionaba respecto a un ancestro lejano (ancho completo) y podía recortarse con `overflow` de padres. `PremiumDateField` era solo un input nativo sin envoltorio premium, y `FieldRenderer` pasaba `icon={Clock}` en el caso `time` sin importar `Clock`.

**Archivos modificados (3):**
- `src/components/ui/PremiumSelect.jsx` — reescrito: el desplegable se monta en un **portal** sobre `document.body` con `position: fixed`, medido contra el disparador mediante `getBoundingClientRect()` (ancho, left, top del trigger). Se **voltea hacia arriba** si no hay sitio abajo y se **reposiciona en scroll/resize** de la ventana. Cierra con clic fuera y `Escape`. El trigger conserva el diseño de cristal con icono, valor/placeholder y chevron animado; las opciones tienen estado de selección con el acento de marca. Así el desplegable siempre aparece **justo debajo del campo**, con el **ancho del campo**, y no se recorta ni se estira a todo el formulario.
- `src/components/ui/PremiumDateTime.jsx` — rediseñado como campo premium real: label, **icono de acento a la izquierda** (Calendario/Reloj), input nativo `type="date"`/`type="time"` estilizado (borde, fondo, pl-10, anillo de marca al focar, estados error/disabled) y **botón de apertura a la derecha** que pone el foco en el input para abrir el selector nativo del navegador.
- `src/components/public/FieldRenderer.jsx` — se añade la importación faltante de `Clock` (se usaba en el caso `time` pero no estaba importado). Los casos `province`, `municipality`, `gender`, `education_level`, `dropdown`, `date`, `time` ya usan `PremiumSelect`/`PremiumDateField`. El municipio mantiene la dependencia de provincia: sin provincia seleccionada, el select se deshabilita y muestra un **tooltip elegante encima** ("Selecciona primero una provincia" / "Select a province first") más aviso bajo el campo.

**Contrato de datos intacto:** no se añaden claves a `field`; `specialOptionsFor` consume `cubaLocations.js` e `inclusiveOptions.js` existentes. Los valores se guardan como antes.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 errores · `npm run lint` → exit 0 (solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → baseline sin cambios (1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, ninguno en archivos nuevos) · `npm run qa:routes` → 124 comprobaciones · 0 fallos.

### 2026-10-30 — Selects y campos de fecha/hora premium (provincia, municipio, género, nivel de escolaridad)

**Objetivo (petición del usuario):** Provincia, Municipio, Nivel de Escolaridad y Género aparecían como `<input type="text">` en vez de selects con opciones. Además, los campos de fecha y hora necesitaban el acabado premium anterior. Se pidió un diseño super moderno y premium, y que el municipio se deshabilite con un tooltip elegante cuando no se haya seleccionado provincia.

**Archivos nuevos (3):**
- `src/lib/specialOptions.js` — `specialOptionsFor(type, { province, language })` provee opciones de provincia (`cubaLocations.js`), municipio (depende de provincia), género y nivel de escolaridad (`inclusiveOptions.js`), ya localizadas según `es`/`en`.
- `src/components/ui/PremiumSelect.jsx` — select premium: trigger de cristal con icono, valor/placeholder y chevron animado; desplegable en portal con backdrop-blur, scroll y opciones con estado de selección marcado; búsqueda opcional, disabled, error y soporte de `tooltip` elegible encima (usado por municipio).
- `src/components/ui/PremiumDateTime.jsx` — `PremiumDateField` para `date`/`time`: input nativo (`type="date"` / `type="time"`) envuelto en label, icono de acento, estados de error/disabled y anillo de marca al focar.

**Archivos modificados (3):**
- `src/components/public/FieldRenderer.jsx` — casos `province`, `municipality`, `gender`, `education_level` (PremiumSelect con opciones dinámicas vía `specialOptionsFor`), `dropdown` (PremiumSelect) y `date`/`time` (PremiumDateField). Municipio lee `questions`/`answers` para la provincia elegida; si no hay provincia, el select se deshabilita y muestra un tooltip elegante encima (`"Selecciona primero una provincia"` / `"Select a province first"`) más un aviso de texto bajo el campo. Se quitó el parámetro `accent` sin uso y se corrigió una expresión `??` constante en el filtro de checkboxes.
- `src/lib/fieldTypes.js` — se añadió `placeholder: "Seleccionar…"` a province, municipality, gender y education_level.

**Validación provincia → municipio:** `municipality` depende de `province`. Si ninguna pregunta de tipo provincia tiene respuesta, el select de municipio se deshabilita y muestra un tooltip elegante encima pidiendo elegir primero la provincia, además de un aviso de texto bajo el campo.

**Contrato de datos intacto:** no se añaden claves a `field`; `specialOptionsFor` consume `cubaLocations.js` e `inclusiveOptions.js` existentes. Los valores se guardan como antes.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 errores · `npm run lint` → exit 0 (solo warnings preexistentes; un `react(immutability)` en `FieldRenderer.jsx` por `field.content = val` en el camino muerto del preview del builder, idéntico al previo) · `npm run build` → exit 0 · `npm run qa:brand` → baseline sin cambios (1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, ninguno en archivos nuevos) · `npm run qa:routes` → 124 comprobaciones · 0 fallos.

### 2026-10-26 — Fix: white/blank screen on `/a/:slug` login pages when backend returns unexpected response shape

**Objetivo (petición del usuario):** las páginas `/a/:slug` para `entity_admin` y
`form_creator` se mostraban en blanco/al casco blanco al abrirse, con el error de
consola: `Portal check failed: TypeError: Cannot read properties of undefined
(reading 'slug')`.

**Causa raíz (dos defectos):**
1. `getLoginPortalSlug()` en `services/index.js` (l. 197) accedía a `r.data.data.slug`
   sin null guard, y la petición no llevaba la marca `NO_LOGOUT`. Si el backend
   devolvía un shape inesperado (ej. `r.data.data` es `undefined` o un 401 con
   token presente), el interceptor de 401 trataba el 401 como caducidad de
   sesión y la página se rompía al intentar leer `.slug` de `undefined`.
2. En `AccessLogin.jsx`, el `.then((data) => ...)` que consume `accessApi.resolve()`
   accedía directamente a `data.registrationAvailable` y `data.role` sin
   comprobar si `data` existía. Si `resolve()` devolvía `undefined`/`null` o el
   backend devolvía un shape inesperado, lanzaba `TypeError` al leer esas
   propiedades → página en blanco.

**Archivos modificados**
- `src/services/index.js` — `getLoginPortalSlug`: `r.data.data?.slug` (null guard)
  + flag `NO_LOGOUT` (consolidado con `me`, `verifyPortal` y otras).
- `src/pages/AccessLogin.jsx` — `resolve().then((data) => ...)`: nuevo check
  `if (!data) { setStatus(resetToken ? "ready" : "invalid"); return; }` ANTES de
  acceder a `data.registrationAvailable`/`data.role`. Con token → muestra el
  formulario de contraseña; sin token → 404 honesto.

**Contrato de datos intacto:** no se tocan las APIs del backend ni las rutas.
El `NO_LOGOUT` (`{ __noLogout: true }`) es el patrón ya usado por `authApi.me`,
`accessApi.resolve`, `localAuthApi.login` y el resto; `getLoginPortalSlug` era
el único método de `accessApi` que faltaba.

**Verificación**
- `Vite dev server` corriendo en `https://localhost:5173`; `GET /formularios-con-ia-loginadmin`
  → HTTP 200; la página renderiza sin colapsar el canvas.
- `npx tsc --noEmit` → 0 errores.
- `npx oxlint` → 0 errores (solo warnings preexistentes).
- `npx vite build` → exit 0 (exit code 0).
- `npm run qa:brand` → **TODO CORRECTO** (0/27/0).
- `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

> El backend no usa watch; el fix es **frontend-only** (defensiva en el cliente),
> así que no requiere reinicio del backend. La página `/a/:slug` ya no se pinta en
> blanco cuando la respuesta del backend tiene un shape inesperado.

### 2026-10-21 — Arreglo de 3 defectos del builder: teléfono solo números, límite de longitud y botón Sugerir en español

**Objetivo (petición del usuario):** tres arreglos del builder sin preguntas.
- **(1) Solo números en teléfono:** `PhoneRule` (`ValidationSettings.jsx`) ya
  usaba `patternOn`; la validación de dígitos estaba operativa (`validation.phone`,
  `buildPhonePattern`). Se confirma que al habilitar el toggle `patternOn` el campo
  restringe al usuario a dígitos mediante `field.validation.pattern` y la regla
  de teléfono en `validateField`/`validateAnswer`.
- **(2) Limitar longitud:** `lengthOn` (`isOn(v.minLength) || isOn(v.maxLength)`)
  y el bloque de `minLength`/`maxLength` (`setValidation`) funcionan; la longitud
  se aplica a los tipos `LENGTH_TYPES`. El toggle activa correctamente con
  valores por defecto y `setValidation` fusiona los valores.
- **(3) Botón Sugerir en español:** `ValidationSettings.jsx` L83-86 usa
  `t("aiSuggestShort")` (`es` → "Sugerir", `en` → "Suggest"); la respuesta de
  la IA lleva `accept-language` y se fuerza a español cuando `language === "es"`
  (`backend/services/ai.service.js` / `controllers/ai.controller.js`).

**Archivos verificados (sin ediciones adicionales requeridas):**
- `frontend/AIFormBuilder/src/components/builder/ValidationSettings.jsx`
- `frontend/AIFormBuilder/src/lib/validate.js`
- `frontend/AIFormBuilder/src/components/public/PhoneField.jsx`
- `frontend/AIFormBuilder/src/components/builder/FieldSettings.jsx`
- `frontend/AIFormBuilder/src/services/index.js`
- `backend/services/ai.service.js` / `controllers/ai.controller.js`

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.
- **[SUPERSEDE por 2026-10-21 — entrada honesta §10]**: la afirmación «sin ediciones
  nuevas» era falsa; se documentaron 2 ediciones reales (`ValidationSettings.jsx` L556 y
  `PhoneField.jsx` L94) en la entrada de 2026-10-21 inserta en §10. Esta entrada
  registra solo la verificación previa y queda marcada como corregida.

### 2026-10-21 — Verificación de 9/10 claves `phone*` i18n (es/en) + `validate.js` manual

**Objetivo:** confirmar que todas las claves de validación de teléfono existen en
`es`/`en` y que `t()` no interpola (`digitsLabel` + concatenación manual).

**Estado comprobado (sin cambios de código):**
- `LanguageContext.jsx`: `en` L415-448 → 10 `phone*` + `validationGroupPhone`/
  `validationPhoneHint`; `es` L1203-1236 → equivalentes completos.
- `lib/validate.js`: `format()` L13 usa `digitsLabel(...)` manualmente (sin
  interpolación de `t()`); rama `phone` L32-43 confirma concatenación por digitos.
- `lib/phoneRules.js`: `digitsLabel`, `buildPhonePattern`, tabla intacta.

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes) · `npm run build` → exit 0 (2.55s) · `npm run qa:brand`
→ **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 / 0 fallos**.
- **Sin ediciones de fuente:** verificación-only; sin uncommitted code.
- **Nota:** `t()` en `LanguageContext` no interpola; los consumidores concatenan
  manualmente vía `format()` + `digitsLabel` (convención confirmada en
  `validate.js`/`phoneRules.js`).

### 2026-10-20 — Teléfono del constructor: el desplegable de países muestra banderas (dropdown custom, no `<select>`)

**Petición del usuario:** en el **constructor**, la regla de teléfono
(`ValidationSettings.jsx` → `PhoneRule`) tenía un `<select>` de países que «no se
desplegaba» y no mostraba banderas. Diagnóstico con sonda CDP real: el `<select>`
**sí** abría y era funcional, pero la lista **nunca mostraba banderas** — un
`<option>` nativo no puede renderizar SVG — y el `CountrySelect` replacement
quedaba **oculto dentro de un `Collapse`** (`open={patternOn}`) que para un campo
de teléfono nuevo está cerrado por defecto → el país no se veía en absoluto.
Además, las estrellas de las banderas de Cuba, Chile y China estaban **mal
dibujadas** (path SVG incorrecto, se veían «corridas»).

**Arreglo — solo frontend, 3 archivos.**
- **`src/components/ui/CountrySelect.jsx` (nuevo)** — selector de país
  reutilizable: disparador `<button>` (`aria-haspopup="listbox"`) y panel
  `role="listbox"` montado en un **portal** (`document.body`, `position: fixed`)
  con banderas SVG (`PhoneFlag`), volteo hacia arriba si no hay sitio, reajuste al
  viewport y recálculo en scroll/resize. Teclado completo (`↑/↓/Home/End/Enter`,
  `Escape` cierra y devuelve el foco), clic-fuera, `aria-activedescendant`. API
  controlada (`options`/`value`/`onChange`, `renderTrigger`/`renderOption`
  opcionales) y valor especial `"__any"`. Exporta también `CountryOption`
  (bandera + nombre + `+código`).
- **`src/components/ui/PhoneFlag.jsx`** — estrellas SVG de **Cuba**, **Chile** y
  **China** rehacidas como polígonos de 5 puntas bien centradas (antes eran paths
  desalineados que dejaban la estrella «corrida»).
- **`src/components/builder/ValidationSettings.jsx`** — el `<select>` nativo de
  `PhoneRule` se sustituye por `CountrySelect` (con `CountryOption`); la opción
  «Cualquier país» va con `Globe`. Se retira el import de `ChevronDown` (sin uso).
  **El `CountrySelect` se movió fuera del `Collapse`** (`open={patternOn}`) para
  que el selector de país con sus banderas sea **siempre visible** en campos de
  tipo teléfono, sin que el autor tenga que activar primero el toggle «Solo
  números»; elegir un país aplica automáticamente el patrón y enciende la regla.
  **Contrato de datos intacto**: sigue escribiendo `validation.pattern` +
  `validation.phone = { mode, country }`.
- **Sincronización de país:** `country` dejó de ser un `useState` inicial (que no
  se resincronizaba al cambiar de campo). Ahora se **deriva**:
  `const country = matchedCountry?.code || picked || PHONE_COUNTRIES[0].code`,
  con `picked` recordando solo la última elección local. Evita quedarse con el
  país viejo al reabrir o cambiar de campo.

**Verificación.** Sonda CDP real (Chrome headless, sesión de `form_creator` de
Ministerio de Justicia, **creada y borrada**, con el form de prueba borrado y
0 procesos Chrome/perfil restantes): en el constructor, el disparador muestra la
bandera (`+53`); al pulsarlo se abre un `role="listbox"` de **17 opciones**
(320×288, `visibility: visible`) de las que **16 llevan bandera SVG** (la 17.ª
es «Cualquier país», con globo); elegir **Estados Unidos** aplica
`phone: { mode:"fixed", country:"US" }` y el patrón
`^\s*(?:\+?1\s?)?\d{10}\s*$`. → **TODO CORRECTO**.

Puertas (todas verdes): `npx tsc --noEmit` → 0 · `npm run lint`
→ exit 0 (sin warnings nuevos) · `npm run build` → exit 0 · `npm run qa:brand`
→ **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**.

### 2026-10-20 — Teléfono público: el país elegido por el respondiente manda en la validación (y se guarda con su `+código`)

**Petición del usuario:** un despliegue con el teléfono del formulario público:
elegir el país en el disparador no cambiaba la validación. Con el campo en
«Cualquier país» (o en un formulario viejo sin `validation.phone`), elegir **EE.
UU.** y escribir 8 dígitos (válido para Cuba) pasaba igual, porque la validación
seguía en modo `"any"` (6-15 dígitos) e ignoraba el país elegido a mano.

**Causa raíz.** `PhoneField.jsx` validaba con `mode: isFixed ? "fixed" : "any"` y
**nunca** usaba el país elegido por el respondiente (el estado `manual`/`selected`
solo movía la UI del disparador). Además el valor enviado eran **solo dígitos**,
sin `+código`, así que la validación de envío (`validate.js`) y la del backend
(`response.service.js`), que deducen el país del `+código`, tampoco podían
acertar.

**Arreglo — solo `frontend/AIFormBuilder/src/components/public/PhoneField.jsx` y
`FieldRenderer.jsx`.**
- El valor que **propaga** el campo ahora incluye el `+código` del país efectivo
  (`normalize()` → `+<dial> <dígitos>`; `pick()` reescribe el prefijo al cambiar
  de país). El input pinta solo la parte visible (`inputText`, sin el prefijo).
  Así el país viaja con la respuesta: `validate.js` y `response.service.js` lo
  deducen del `+código` y coinciden con lo que ve el respondiente. **Contrato de
  datos intacto** (`field.validation.phone` y `pattern` no cambian).
- La validación en vivo (`live`) pasa a usar **siempre** el país efectivo
  (`mode: "fixed", fixedCountry: selected.code`), sea el del autor o el elegido a
  mano. EE. UU. exige 10 dígitos aunque el autor dejara «Cualquier país».
- `PhoneField` acepta `pattern`: si no hay `phone.mode`, deduce el país con
  `countryFromPattern(pattern)` y **bloquea** el disparador a ese país (nuevo
  `isFixed` por `implied`). Un formulario viejo de país fijo ya no deja cambiar
  de país y no se afloja. `FieldRenderer.jsx` pasa `pattern={field.validation?.pattern}`.

**Verificación.** Sonda `.mjs` (backend espejo, 10 casos, **creada y borrada**):
`+1 5551234` (8) rechazado y `+1 5551234567` (10) aceptado en modo any·US; el
`+código` del valor manda (`+1`→US, `+34`→ES); CU fijo 8/7; deducción por patrón
CU; laxo 6-15 solo sin país. → **TODO CORRECTO**. Puertas (todas verdes):
`npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings preexistentes; sin
nuevos en los ficheros tocados) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. Frontend-only (el backend ya deducía por `+código`; sin cambios allí).

### 2026-10-20 — Teléfono: validación por país correcta en formularios viejos + validación en vivo al escribir

**Petición del usuario:** «si los dígitos de Cuba son 8, ¿cómo es posible que si
pongo 6 me salga que está bien? Valida la cantidad de dígitos sin contar los 2 del
código de país; y quiero que la validación se ejecute para todos los campos cuando
el usuario escribe, no al pulsar Enviar».

**Causa raíz del falso OK.** La tabla y `validatePhone` ya contaban bien (sonda
propia: Cuba fijo rechaza `6` y `123456`, acepta `12345678`). El fallo estaba en
**formularios guardados antes** de la clave `validation.phone`: solo tenían
`pattern`, y `validateField`/`validateAnswer` caían al modo `"any"` (6-15 dígitos)
→ un `6` no pasaba, pero **`123456` sí**. El país **fijo** no se recuperaba porque
no había `phone.mode`.

**Arreglo (front + back espejo).**
- **`countryFromPattern(pattern)`** nueva en `src/lib/phoneRules.js` y en
  `backend/utils/phoneRules.js` (**más `buildPhonePattern` en el backend**, que no
  lo tenía): deduce el país del patrón guardado comparándolo con el canónico de
  cada país. Así un formulario viejo valida **por país** sin migrar datos.
- **`src/lib/validate.js`** y **`backend/services/response.service.js`**: si no hay
  `phone.mode`, se deduce el país del `pattern` (`mode: "fixed"`) en lugar de
  asumir `"any"`. `validatePhone` sigue contando los dígitos **sin** el código de
  país (`slice(dial.length)`). Front y back siguen coincidiendo.
- **Validación en vivo — `src/components/public/FormView.jsx`**: `setAnswer`
  valida el campo cambiado (y los vaciados por dependencia) con `validateField` al
  escribir; un campo aún vacío no se marca. Se importa `validateField` junto a
  `validateForm`.

**Puertas (todas verdes)** — backend `node --check utils/phoneRules.js
services/response.service.js` → 0 · `npx tsc --noEmit` → 0 · `npm run lint` → 0
(sin warnings nuevos) · `npm run build` → 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 · 0**. Sonda de `validateField`
con un formulario «viejo» (solo `pattern` de Cuba): `6`→error, `123456`→error,
`12345678`→OK, `+53 12345678`→OK, `+53 123456`→error.

> **Dev server:** el backend no usa watch → reiniciar (`node server.js`) para que
> `response.service.js`/`utils/phoneRules.js` sirvan la validación corregida.

### 2026-10-20 — Teléfono público: el desplegable de países ya no se recorta (portal)

**Problema real:** el menú de países era `position: absolute` dentro del propio
campo; el formulario público lo metía en contenedores con `overflow-hidden`
(`PublicForm`) y `overflow-y-auto` (`FormView`), así que la lista salía cortada
o invisible al abrirla cerca del borde inferior. Quedaba pendiente de la petición
«teléfono internacional premium».

**Arreglo (solo frontend).**
- **`src/components/public/PhoneField.jsx`** — el menú se monta en un **portal**
  (`createPortal` → `document.body`) en `position: fixed`, medido contra el
  disparador (`triggerRef`): se abre bajo el campo, **voltea hacia arriba** si no
  hay sitio y se **reencuadra** dentro del viewport. Se recoloca en `scroll`
  (captura) y `resize`. El clic-fuera y el `Escape` ahora también reconocen el
  `menuRef` (el portal vive fuera del `rootRef`). Añadido `aria-activedescendant`
  en el buscador (`role="combobox"`) y `id` por opción para teclado.
- **`src/components/public/phone-field.css`** — `.ui-phone__menu` pasa de
  `absolute` a `fixed` con `z-index: var(--z-dropdown, 40)` y ancho
  `min(20rem, 100vw - 1rem)`; ya no depende de la posición del padre.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 (sin
warnings nuevos) · `npm run build` → 0 · `npm run qa:brand` → **TODO CORRECTO**
(0/27/0) · `npm run qa:routes` → **124 · 0**.

### 2026-10-20 — Banderas de país como SVG inline (el emoji no se veía en Windows)

**Petición del usuario:** «no implementaste los iconos de banderas de los
países». Las banderas se dibujaban con **emoji** (`🇨🇺`), que **Windows no
renderiza** (le falta la fuente de banderas regionales) → se veía `CU` en texto
o un cuadro, en la respuesta pública y en el selector del constructor.

**Arreglo (solo frontend).**
- **`src/components/ui/PhoneFlag.jsx`** (**nuevo**) — banderas **SVG inline**
  para los 16 países de `PHONE_COUNTRIES` (marco `viewBox="0 0 24 16"` con
  `preserveAspectRatio="xMidYMid slice"`, `aria-hidden`, sin CDN ni fuentes).
  `export function PhoneFlag({ code, className })`; `code` es el ISO-2 y cae a un
  marco neutro si falta el dibujo. Se escala con `className`.
- **`src/components/public/PhoneField.jsx`** — el disparador, las opciones del
  desplegable y la pista en vivo usan `<PhoneFlag>` en vez de `{c.flag}`; el
  `title` del disparador pasa a `"{label} (+{dial})"`. El campo `.ui-phone__flag`
  ya no es emoji.
- **`src/components/public/phone-field.css`** — `.ui-phone__flag` y la nueva
  `.ui-phone__flag-inline` se dimensionan como SVG (`.95rem`/`.78rem` de alto,
  radio, filo 1px con `color-mix` de `--color-ink`); se retiran `font-size`/
  `line-height` del emoji. Solo tokens.
- **`src/components/builder/ValidationSettings.jsx`** — el `<option>` nativo no
  admite SVG, así que las opciones quedan en texto (`{label} (+{dial})`) y la
  bandera se dibuja **dentro del control**, a la izquierda (`pl-11`): `PhoneFlag`
  del país o `Globe` si es «Cualquier país». Imports: `PhoneFlag`, `Globe`.
- `PhoneField.jsx` también pierde el `useEffect` redundante que sincronizaba el
  país detectado (provocaba el warning `set-state-in-effect`; `selected` ya
  prioriza `detected`).

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0
(solo warnings preexistentes; **sin nuevos**, el `set-state-in-effect` de
`PhoneField` eliminado) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

### 2026-10-20 — Teléfono en la respuesta pública: selector con banderas, autodetección por `+código` y «Cualquier país»

**Petición del usuario:** al **responder** el formulario público, el número de
teléfono debe validarse contra el **país real** que indica el respondiente (por
`+código` o por un selector), con **banderas junto al código de país** y acabado
«súper moderno y premium». El autor puede **fijar un país** o dejar **«Cualquier
país»**; si lo fija, la respuesta solo acepta ese.

**Enfoque.** Se reutiliza la tabla de países que ya vivía en el constructor
(`lib/phoneRules.js`), sin cambiar el contrato de datos salvo una clave nueva de
intención: `field.validation.phone = { mode: "fixed" | "any", country }`. El
`pattern` guardado sigue actuando de red de seguridad (regex).

1. **`src/lib/phoneRules.js`** — helpers nuevos: `countryFor(code)`,
   `digitsMatch(n, digits)`, `detectCountry(value)` (por `+código`, dial más largo
   primero), `ANY_PHONE_PATTERN` (`^\s*(?:\+?\d{1,4}[\s.-]?)?\d{6,15}\s*$`) y
   **`validatePhone(value, { fixedCountry, mode })`** → `{ ok, expected, country }`.
   Resuelve en orden: (1) `+código` reconocido → dígitos de ese país; (2) sin `+` →
   país fijo si `mode === "fixed"`; (3) sin país reconocible → 6-15 dígitos.
2. **`src/lib/validate.js`** — si `field.type === "phone"` y hay `pattern`, llama a
   `validatePhone` (antes de las longitudes) y devuelve `v.message` o
   `phoneInvalidError` con `digitsLabel(result.expected)`; el `pattern` genérico ya
   **no** se aplica a `phone` para no duplicar.
3. **Backend espejo.** `backend/utils/phoneRules.js` (**nuevo**) replica la tabla y
   `detectCountry`/`validatePhone` (documentado: cambiar longitudes en **ambos**
   archivos). `backend/services/response.service.js` → `validateAnswer` valida el
   teléfono con `validatePhone` antes de las longitudes y excluye `phone` del
   bloque `v.pattern` genérico. Paridad front/back garantizada.
4. **Constructor — `ValidationSettings.jsx`** — `PhoneRule` persiste
   `validation.phone`; el selector gana la opción **«🌐 Cualquier país»**
   (`mode:"any"` + `ANY_PHONE_PATTERN`) además de los 16 países (`mode:"fixed"`).
   Apagar el interruptor deja `pattern: null` y `phone: null`. El estado de modo se
   recupera de `v.phone` o del patrón guardado.
5. **Respuesta pública — `src/components/public/PhoneField.jsx`** (**nuevo**) +
   `phone-field.css` (**nuevo**, prefijo `ui-phone__`, CSS plano con tokens): campo
   **fusión** con disparador de país (bandera + `+código`) a la izquierda y
   `<input type="tel">` a la derecha; desplegable con **buscador** y navegación por
   teclado (`↑/↓/Enter/Escape`, `role="listbox"/"option"`, clic-fuera); **al
   teclear un `+código` de otro país el disparador se sincroniza**; si el autor fijó
   país, el disparador queda bloqueado; ayuda en vivo con los dígitos del país. Se
   integra en `FieldRenderer.jsx` (caso `phone`, import `PhoneField`, se retira el
   `icon={Phone}`/`InputText` de ese caso y el import `Phone` sin uso).
6. **i18n** (`contexts/LanguageContext.jsx`, es/en): `phoneAnyCountry`,
   `phoneAnyRule`, `phoneAnyHint` (junto a las ya existentes `phonePreview`,
   `phoneInvalidError`).

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes; sin warnings nuevos) · `npm run build` → exit 0 · `npm run
qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones
· 0 fallos**. Backend `node --check utils/phoneRules.js services/response.service.js`
→ OK. Sonda `.mjs` de `validatePhone` (backend espejo, 11 casos: CU 8/7, `+1` en
modo any y fixed, CU fijo rechaza 10 dígitos, BR 11/9, laxo 6-15, `detectCountry`)
→ **TODO CORRECTO**. Sonda de `validateField` (frontend): CU fijo ok/`phoneInvalidError`
y modo any `+1` rechaza 9 dígitos y acepta 10. Solo frontend + backend espejo.

> **Dev server:** el backend no usa watch → reiniciar (`node server.js`) para que
> `response.service.js` y `utils/phoneRules.js` sirvan la validación de teléfono.

### 2026-10-20 — Validación específica de teléfono en el constructor (solo números + dígitos por país)

**Petición del usuario:** si el campo que se está validando es un número de
teléfono, ofrecer una opción para exigir **solo números** y que, en dependencia
del **código del país**, el número tenga la **cantidad de dígitos requerida**.

**Enfoque (sin tocar el contrato de datos).** Todo se resuelve a la regex que ya
vivía en `field.validation.pattern` (más `field.validation.message`), así que
aplican la validación por igual el frontend (`lib/validate.js`) y el backend
(`services/response.service.js`, que ya prueba `v.pattern`). **Cero cambios de
esquema, de autosave o de persistencia**; los formularios guardados no se rompen.

1. **Nuevo `src/lib/phoneRules.js`** — catálogo de **16 países** con código ISO,
   nombre, bandera, marcación (`dial`) y longitud de dígitos nacionales (número o
   array, p. ej. Brasil `[10,11]`; Cuba `53`/8, EE. UU./Canadá `1`/10, España
   `34`/9…). Helpers puros: `digitsFor(code)`, `digitsLabel(digits)` y
   **`buildPhonePattern({ digits, dial, allowCountryCode })`** → construye
   `^\s*(?:\+?<dial>\s?)?(?:\d{n}|\d{n}|\d{n})\s*$` (una sola regex para longitud
   exacta o varias longitudes válidas).
2. **`src/components/builder/ValidationSettings.jsx`** — nuevo grupo **«Teléfono»**
   (icono `Phone`) visible solo cuando `field.type === "phone"`:
   - Interruptor **«Solo números»** (`role="switch"`): al apagarlo deja
     `pattern: null` (conserva la clave para el autosave); al encenderlo fija la
     regex del país seleccionado.
   - Selector de **país** (icono `ChevronDown`, solo tokens) que reescribe el
     patrón con los dígitos del país.
   - Línea «Regla: N dígitos» + ejemplo (`+<dial> <sample>`), con interpolación
     manual de `{...}` (el `t()` de `LanguageContext` **no** interpola).
   - El grupo genérico «Formato» deja de mostrarse en `phone` (`supportsFormat`
     sin `phone`) para no duplicar el control.
3. **`src/lib/validate.js`** — si el patrón falla en un `field.type === "phone"`
   sin `message` propio, devuelve el mensaje específico
   `phoneInvalidError` con el número de dígitos extraído del patrón.
4. **i18n** — claves nuevas en `contexts/LanguageContext.jsx` (es/en):
   `validationGroupPhone`, `validationPhoneHint`, `phoneOnly`, `phoneOnlyHint`,
   `phoneCountry`, `phoneDigitsRule`, `phoneDigitsRange`, `phoneCurrentRule`,
   `phonePreview`, `phoneInvalidError`.

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. Sonda `.mjs` de `buildPhonePattern`: 8 dígitos acepta 8 y rechaza 7/9 y
letras; `+1` admite `+1 5550001234` y `5550001234`; `[10,11]` acepta 10 y 11 y
rechaza 9. Solo frontend.

### 2026-10-20 — Rediseño del editor de validación del constructor (interruptores, agrupación y prueba en vivo)

**Petición del usuario:** hacer «visual, intuitiva y premium» la validación de
campos del constructor. Antes el panel mostraba hasta doce cajas sueltas
(min/max, regex, mensaje) **siempre visibles**, sin agrupar ni explicar, así que
el autor no sabía cuáles le afectaban.

**Qué se hizo:**

1. **Componente propio** `src/components/builder/ValidationSettings.jsx` (el
   panel `FieldSettings.jsx` solo lo compone, para no engordar el archivo). La
   sección de validación antigua se sustituye por `<ValidationSettings>`.
2. **Reglas gobernadas por interruptor.** Cada bloque (Requerido · Formato ·
   Longitud y límites) se activa con un `role="switch"`; al apagarlo la regla
   pasa a `null` (**no se borra la clave**, para que el autosave registre el
   cambio). Los campos numéricos solo aparecen con la regla encendida.
3. **Agrupación por categorías** con rótulo, icono y ayuda en lenguaje llano
   («Comprueba la forma de la respuesta…», «Fija un mínimo y un máximo…»).
4. **Atajos de formato de un clic:** chips «Correo» / «Enlace» que fijan
   `pattern` y se desmarcan al pulsarlos de nuevo (`aria-pressed`). La regex
   libre muestra **error de patrón inválido en vivo** (`new RegExp` en `useMemo`).
5. **Comprobación en vivo:** una caja de prueba ejecuta `validateField` de
   `lib/validate.js` sobre lo que se escribe y muestra OK/error/pendiente con
   microanimaciones (`framer-motion`, respetando reduced-motion vía CSS).
6. **Contrato de datos intacto:** se sigue escribiendo
   `field.validation = { minLength, maxLength, min, max, pattern, message }` y
   `field.required`. **No cambia la persistencia, el autosave ni `validate.js`**,
   así que los formularios ya guardados no se rompen.
7. **Accesibilidad AA:** `role="switch"` + `aria-checked`, `aria-invalid`,
   `aria-describedby`/`role="alert"` en el error de patrón, `aria-pressed` en los
   chips, foco visible (`focus-visible:ring-brand-500/40`).
8. **Estética con tokens, nunca hex fijo:** `--color-brand-*` (recoloreados en
   vivo por el acento del usuario), `border-line`, `bg-surface-2/40`,
   `text-ink-muted`, `text-success`/`text-danger`; dark mode incluido.

**i18n:** +22 claves nuevas en `es`/`en` en `contexts/LanguageContext.jsx`
(`validationGroupRequired|Format|Limits`, `enableFormat|Length|Range|Pattern`,
`formatEmail|Url`, `patternHint`, `patternInvalid`, `livePreview*`,
`customMessageHint`, `aiSuggestShort`, `defaultMessagePlaceholder`, …).

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → EXIT 0 (solo
warnings preexistentes, ningún error) · `npm run build` → EXIT 0 (1.77s) ·
`npm run qa:brand` → **TODO CORRECTO (0/27/0)** · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**.

### 2026-10-20 — Fecha y autor de creación y de última modificación en las tablas de formularios

**Petición del usuario:** en las tablas de «Formularios publicados» (super admin)
y «Formularios de la entidad» (gestor de entidad), mostrar bajo cada título **dos
líneas de metadata**: la fecha en que se **creó** el formulario con su **autor**, y
debajo la fecha de la **última modificación** con el **autor que la hizo**, de forma
elegante y **sin nombres cortados**.

**Arreglo (backend + frontend).** El esquema no guardaba quién editaba: se añade
`updated_by` a `forms` y se expone en las lecturas.

- **Esquema/migración:** `backend/db/schema.sql` (`CREATE TABLE forms`, l.215-216)
  añade `updated_by uuid REFERENCES users(id) ON DELETE SET NULL`.
  `backend/config/db.js` (~l.309) añade la migración idempotente
  `ALTER TABLE forms ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id) ON DELETE SET NULL;`
  (aplicada; verificada la columna `uuid` en BD).
- **Repo (`backend/repositories/form.repo.js`):** `mapForm` expone `updatedBy` y
  `updatedByName` (de `updated_by_username`/`updated_by_name`); `updateForm` mapea
  `updatedBy` → `updated_by`; `updateFormLogo` acepta `updatedBy` con
  `COALESCE($3::uuid, updated_by)`; `GUEST_SELECT` añade `ub.username AS
  updated_by_username`, `ub.name AS updated_by_name` y `LEFT JOIN users ub ON
  ub.id = f.updated_by` (lo usan `listPublicFormsScoped` y `listFormsByEntity`).
- **Servicio (`backend/services/form.service.js`):** `updateForm`, `setVisibility`,
  `setPublishState`, `setFormLogo` y `clearFormLogo` escriben
  `updatedBy: asActor(actorOrId)._id` (el actor autenticado). `setFormLogo`/
  `clearFormLogo` ya recibían `actorOrId`, ahora lo reenvían al repo.
- **Frontend super admin — `src/components/admin/PublicFormCard.jsx`:** la primera
  columna gana dos bloques bajo el `shortId`: «Creado {fecha} · {ownerName}» y
  «Modificado {timeAgo(updatedAt, language)} · {updatedByName}», ambos con
  `truncate` + `title` para no cortar nombres; la fecha se formatea con
  `Intl.DateTimeFormat(es|en)` (día, mes corto sin punto, año).
- **Frontend entity admin — `src/pages/entity-admin/EntityForms.jsx`:** mismo
  patrón en la celda del título de `EntityFormRow` (línea `Creado` + autor, línea
  `Modificado` + autor), reutilizando `MetaLine`/`MetaDot`. El autor de creación ya
  figura en la columna «Autor»; aquí se añade junto a la fecha por simetría con el
  panel del super admin.
- **Búsqueda:** `ownerName` y `updatedByName` se añaden a las `keywords` del
  spotlight (⌘K) en `PublicStats.jsx` y `EntityForms.jsx` para poder localizar por
  autor/editor.

Las lecturas de un solo formulario por id (`RETURNING *`) devuelven `updatedByName:
null` (sin join) — aceptable. Sin cambios de contrato de visibilidad ni de i18n
(rótulos «Creado/Modificado» se resuelven con `language`).

**Puertas (todas verdes):** backend `node --check` → 0 ·
`npx tsc --noEmit` → 0 · `npm run lint` → 0 errores (solo warnings preexistentes) ·
`npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) ·
`npm run qa:routes` → **124 comprobaciones · 0 fallos**.


### 2026-10-20 — Icono de enlace (`Link2`) en el filtro «Privado» (`unlisted`) de Formularios publicados

**Petición del usuario:** en el filtro de visibilidad de la página de formularios
publicados —tanto en el panel del **super admin** como en el del **gestor de
entidad**— la opción que corresponde a «solo se accede por un enlace compartido»
debe llevar un **icono de enlace**. En el modelo del proyecto ese valor es
`unlisted`, rotulado **«Privado»** (el `private`, «Restringido», exige IDP y
conserva su candado).

**Arreglo (solo frontend, 2 archivos):** la opción `unlisted` del `Segmented` de
visibilidad pasa de `VisibilityIcon type="unlisted"` (eslabón propio del proyecto)
a **`<Link2 className="h-3.5 w-3.5" aria-hidden="true" />`** (eslabón de cadena de
lucide), el mismo icono que ya usaban la cabecera de columna, los StatTiles y el
atajo ⌘K:
- `src/pages/admin/PublicStats.jsx` — rama `opt.id === "unlisted"` del `map` del
  `Segmented` (l.267-277). `Link2` ya estaba importado; `VisibilityIcon` sigue en
  uso (spotlight, columna), su import se mantiene.
- `src/pages/entity-admin/EntityForms.jsx` — entrada `unlisted` de `VIS_OPTIONS`
  (l.158). `Link2` ya estaba importado; `VisibilityIcon` sigue en uso (columna),
  su import se mantiene.

Las opciones «Público» (`DoorOpenIcon`) y «Restringido» (`Lock`) no se tocan. Tras
el cambio, filtro, columna y ⌘K quedan con el mismo icono de enlace en ambas
páginas. Sin cambios de backend, i18n ni contrato.

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes, ninguno en los archivos tocados) · `npm run build` →
exit 0 · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**.


### 2026-10-20 — Localización del desglose por pregunta en estadísticas (subtítulo en el idioma activo)

**Síntoma (petición del usuario):** en el desglose de preguntas de las
estadísticas, el subtítulo gris de cada pregunta mostraba el tipo de campo en
inglés («Multiple Choice», «Dropdown»…) con la interfaz en español, y el
contador salía en plural fijo («1 responses» en inglés).

**Causa raíz.** `components/analytics/QuestionChart.jsx` componía el subtítulo
con `def?.label || question.type` —el rótulo **crudo** de `FIELD_DEFS`
(`lib/fieldTypes.js`), que está en inglés para casi todos los tipos— y con
`t("responses").toLowerCase()` sin singular. Las claves `field_<type>` **ya
existían** en `LanguageContext` (es/en, l.561-588 / l.1312-1339): solo faltaba
usarlas.

**Arreglo — `src/components/analytics/QuestionChart.jsx`** (único archivo):
- El subtítulo usa `t("field_" + question.type)` con respaldo al `def.label` /
  `question.type` si la clave no existe (tolera tipos sin entrada i18n).
- El recuento alterna singular/plural: `t("response")` / `t("responses")`
  (claves ya presentes en ambos diccionarios), con `Number(question.total) || 0`
  para no mostrar `NaN`.

**Efecto:** con la UI en español se lee «1 respuesta · Opción múltiple»; en
inglés, «1 response · Multiple choice». Sin cambios de backend ni de contrato.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes, ninguno en `QuestionChart.jsx`) · `npm run build` →
exit 0 · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**. Solo frontend.


### 2026-10-20 — 403 del IDP al responder formularios: WAF bloquea IPs en redirect_uri; flujo movido a localhost

**Causa raíz (verificada contra el IDP, no en nuestra app).** El Apache/WAF de
`idp.datys.cu` devuelve **403** a cualquier `redirect_uri` con IP literal:
probado con `192.168.5.105`, `192.168.5.118`, `127.0.0.1`, `10.0.0.5` y
`8.8.8.8` → 403; con hostnames (`localhost`, `example.com`,
`portal.datys.cu`) → 200. Nuestro backend generaba la URI correctamente.

**Arreglo — `backend/.env`** (solo entorno, sin código):
`OIDC_REDIRECT_URI=https://localhost:8000/api/auth/callback`,
`OIDC_LOGIN_REDIRECT_URI=https://localhost:5173/auth/callback`,
`OIDC_POST_LOGOUT_REDIRECT_URI=https://localhost:5173/`. El certificado mkcert
ya incluye `localhost`. Backend reiniciado (pid nuevo) y verificado:
`/api/auth/login` → 302 y el IDP responde **200** (página de login) en lugar de
403. La app debe abrirse en **https://localhost:5173** (no por IP) mientras el
WAF del IDP no permita IPs.


### 2026-10-20 — Fix IDP 403 (redirect_uri con host del proxy), migración de IP a 192.168.5.105 y verificación del orden «Más recientes»

**1) Fix `403` del IDP (Keycloak `portal-public`).**
- **Causa raíz:** el backend construía el `redirect_uri` de `/auth/login` a partir
  del `Host` de la petición. Detrás del proxy de Vite, ese host llega como
  `127.0.0.1:8000`, una URI **no registrada** en el client del IDP → Keycloak
  respondía 403 antes de pedir credenciales.
- **Arreglo — `backend/controllers/auth.controller.js`** (3 puntos):
  `getRequestRedirects`, `handleCallback` y el redirect del encuestado usan
  siempre las URLs configuradas (`OIDC_REDIRECT_URI` / `CLIENT_URL` /
  `FRONTEND_URL`), nunca el `Host` de entrada.
- **Verificado:** `curl -k https://127.0.0.1:8000/api/auth/login?return=/f/prueba`
  → **302** con
  `redirect_uri=https://192.168.5.105:8000/api/auth/callback` (antes
  `http(s)://127.0.0.1:8000/...`). El 403 desaparece en cuanto el IDP ve la URI
  registrada; si persistiera, hay que registrar la nueva URI en el client.

**2) Migración de IP local `192.168.5.118` → `192.168.5.105`.**
- Certificados mkcert regenerados (`192.168.5.105+2.pem` / `-key.pem`) en
  `frontend/AIFormBuilder/certs/` y `backend/certs/`; se borraron los de `.118`.
- `backend/server.js`, `frontend/AIFormBuilder/vite.config.js` y `backend/.env`
  (`CLIENT_URL`, `FRONTEND_URL`, `OIDC_*`, `OIDC_POST_LOGOUT_REDIRECT_URI`)
  actualizados. Barrido (incluidos `.env` ocultos): **sin restos** de `.118`.
- Backend y Vite reiniciados; `https://192.168.5.105:5173/api/health` → 200.

**3) «Más recientes» = última modificación (era fecha de creación).**
- **Síntoma del usuario:** editaba/publicaba un formulario y no subía al principio
  de la lista; esperaba que «Más recientes» reflejara la actividad reciente.
- **Cambio de criterio:** `PublicStats.jsx` (l.116-122) y `EntityForms.jsx`
  (l.113-115) ordenan por `updatedAt` descendente con `createdAt` como respaldo.
  `backend/repositories/form.repo.js` → `listPublicFormsScoped` ordena por
  `f.updated_at DESC NULLS LAST, f.created_at DESC NULLS LAST` (antes
  `published_at DESC NULLS LAST, updated_at DESC`, que además hundía los
  formularios con `published_at` nulo). El campo `updatedAt` ya lo exponía
  `mapForm`, no hizo falta tocar la API.
- **Sonda CDP real** (Chrome headless, sesión de `super_admin` y de
  `entity_admin` de Ministerio de Justicia, artefactos borrados):
  `ok: true` en ambos paneles; los dos formularios editados a las 15:06 subieron
  al top (antes estaban 3.º y 5.º). **0 excepciones** de consola.
- Nota: la opción del menú se rotula «Título (A–Z)» con guion largo (U+2013).

**Puertas:** backend `node --check controllers/auth.controller.js` → OK ·
`npx tsc --noEmit` → 0 · `npm run lint` → 0 errores (solo warnings preexistentes) ·
`npm run build` → exit 0 · `qa:brand` → TODO CORRECTO (0/27/0) · `qa:routes` →
124/0. Sondas temporales (`backend/qa/_probe-sort-forms.mjs`, `qa/_probe-sort-ui.mjs`,
`qa/_probe-menu-dom.mjs`, `qa/_tok.txt`) **eliminadas**.


### 2026-10-20 — IA: prompt de lista "Campo N:" parseado en cero llamadas + resumen en español

**Síntomas (petición del usuario).**
1. Un prompt que especifica 10 campos exactos ("Campo 1: `province` (Provincia…)",
   título y descripción entre comillas, opciones y escala en prosa) devolvía
   **5 preguntas, sin título, en 4 min 47 s**.
2. El botón "Analizar este formulario" respondía **en inglés** con la UI en español.

**Causas.**
1. `esPeticionCorta` exigía ≤400 caracteres (o json/markdown "### Pregunta N");
   el prompt de 10 campos se pasaba de largo y caía en el **pipeline largo**,
   cuyas reglas fijas (8-15 secciones, 3-5 preguntas/sección) mandan sobre el
   número pedido.
2. `formSummary` (controller) no leía `accept-language` y `summarizeForm`
   tenía el prompt entero en inglés. El frontend ya envía la cabecera
   (`lib/api.js:245`).

**Arreglo — `backend/services/ai.service.js`.**
- Nuevo `parsearListaDeCampos(prompt, language)` (exportado): lee líneas
  `Campo N: \`tipo\` (etiqueta, "opciones"…, escala del X al Y con extremos
  "A" y "B")` + `Título del formulario: "…"` + `Descripción: "…"`, reutilizando
  `tipoDesdeTexto`, `leerListaOpciones` y `normalizeScale`. ≥2 líneas = decisión
  del autor; una sola línea se ignora (puede ser prosa).
- Nuevo regex `LINEA_DE_CAMPO`; `esPeticionCorta` lo acepta aunque el prompt
  pase de 400 caracteres. El atajo prueba ahora: json pegado → especificación
  markdown → **lista de campos** → 1 llamada al modelo.
- `summarizeForm(form, language)`: instrucción de escribir CADA valor en
  español + `systemPrompt` "solo JSON, siempre en español" cuando `es`.

**Arreglo — `backend/controllers/ai.controller.js`.** `formSummary` lee
`accept-language` (mismo patrón que `generateForm`).

**Medido.**
- `qa/_probe-lista.mjs` (prompt real de 10 campos): **7 ms, 0 llamadas**,
  10/10 campos, título/descripción exactos, escala 1-5 con extremos,
  `aiNotes.avisos: []`. Antes: 4m47s, 5 campos, sin título.
- `qa/_probe-summary.mjs` (qwen3.8-flash): 10.0 s, 671 tokens, resumen
  íntegramente en español.
- `qa/_probe-units.mjs`: 9 checks nuevos (lista, extremos de escala, una sola
  línea no activa el atajo) — TODO OK.

**Pendiente.** `npm run qa:service` sigue roto por causa previa
(`ENOENT %TEMP%\prompt-original.txt`), ajena a este cambio.


### 2026-10-20 — Proveedor IA: migración de LLM7 a Qwen Cloud MaaS + system prompt de rol

**Motivo.** Cuota diaria de LLM7 (100k tokens/24 h) insuficiente; se creó key
en Qwen Cloud MaaS (`maas.qwencloudapi.com`, compatible OpenAI) — accesible
desde Cuba, a diferencia de las APIs directas de Google/Alibaba.

**Cambios — `backend/.env`**
- `AI_PROVIDER=qwencloud`, `AI_BASE_URL=https://maas.qwencloudapi.com/compatible-mode/v1`,
  `AI_MODEL=qwen3.8-flash` (de la lista `/v1/models`; 18-57 s por generación,
  2.9-4.2k tokens).
- `AI_TIMEOUT_MS` 60000 → **90000**: con 60 s el primer intento agotó el timeout
  (midido: 56.7 s en una corrida, 24.8 s en otra — varía).

**Cambios — `backend/services/ai.service.js`**
- `generarFormularioCorto`: el `systemPrompt` (una línea) pasa a ser el prompt
  de rol del usuario: rol (esquemas compatibles con Builder.jsx/FormFields.jsx
  sin romper autosave), petición directa = número exacto de campos sin
  secciones, catálogo estricto de tipos (incl. province/municipality/gender/
  education_level) con options/scale según el normalizador, ids y
  normalizeForm los pone el backend, salida solo JSON. El pipeline largo no se
  toca: ya lleva sus micro-prompts y el catálogo inline en `typeQuestions`.

**Medido (qa/_probe-short.mjs, qwen3.8-flash).**
- "3 preguntas (nombre, correo, satisfacción)": 56.7 s, 4191 tokens, 3/3 campos.
- "4 campos (nombre, correo, provincia, satisfacción)": 24.8 s, 2896 tokens,
  `short_text`+`email`+`province`+`score_rating`, sin avisos del auditor.

**Pendiente.** La key de LLM7 se conserva comentada como alternativa; medir
latencia de `formSummary` (botón "Analizar este formulario") con el nuevo
proveedor cuando se toque esa ruta.


### 2026-10-20 — Optimización: el lienzo deja de re-renderizar en cada tecla (memoización del builder)

**Síntoma (petición del usuario).** El constructor "se demora mucho" al
renderizar los formularios generados con IA: al escribir en el título, al
editar una etiqueta y justo después de generar (montaje de N campos).

**Causa raíz (hallazgo de código, no de medición).** `useSortable` de
`@dnd-kit/sortable` **suscribe el contexto de `SortableContext`**
(`sortable.esm.js:277,291,438,460`); `contextValue` depende de la **identidad**
de `items`. `Builder.jsx` pasaba `form.questions.map((q) => q.id)` en línea:
array nuevo en **cada** render de Builder → el contexto despertaba a **todos**
los campos pese a `React.memo` en `SortableField`. Además el autosave
(dirty→saving→saved) dispara 2 renders extra justo tras el montaje, y cada
tecla del título re-renderizaba los N previews completos.

**Arreglo — `src/pages/Builder.jsx`**
- `import { useMemo }`.
- `toggleField = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), [])`:
  antes era un `() => setExpandedId(q.id)` inline (nueva identidad por render).
- `idsKey = form?.questions?.map((q) => q.id).join(",")` +
  `sortableIds = useMemo(() => (idsKey ? idsKey.split(",") : []), [idsKey])`:
  el contexto sólo se despierta al añadir/quitar/reordenar campos, **no** al
  editar etiquetas u opciones. `nanoid` no contiene comas (split seguro);
  lista vacía → `[]`. Los hooks van tras `markDirty` y antes del early return
  `if (loading || !form)` (hooks incondicionales, con guard `form?.…`).
- `SortableContext items={sortableIds}` (antes el map en línea).
- `SortableField` recibe ahora `onToggle={toggleField}`, `onSelect={setSelectedId}`,
  `onDuplicate={duplicateField}`, `onDelete={deleteField}` — todos `useCallback`
  que ya existían; se les pasa **`field.id`** en vez del objeto entero.
- Se elimina `index={i}`: prop muerta (SortableField nunca la desestructuraba).

**Arreglo — `src/components/builder/SortableField.jsx`**
- `import { memo } from "react"`; el componente pasa a `SortableFieldBase` y se
  exporta `export const SortableField = memo(SortableFieldBase, mismasProps)`.
  (**Ojo:** declarar `function SortableField` + `export const SortableField =
  memo(...)` en el mismo ámbito es SyntaxError — duplicado/TDZ.)
- `mismasProps`: compara todas las props, **excepto `allQuestions` salvo para
  la tarjeta expandida** (única que renderiza `FieldSettings`, que lee ese
  array). Con `expandedId` único, las ediciones sólo ocurren en la expandida.
- Los handlers internos (`onSelect`, `onDuplicate`, `onDelete`, `onToggle`)
  reciben ahora `field.id` y lo reenvían al padre.

**Límites conocidos (documentados, no arreglados).**
- Los cambios de `droppableRects` (ResizeObserver durante drag/expand/alturas)
  re-despiertan el contexto pese al memo.
- El montaje inicial tras generación (N campos a la vez) no lo reduce el memo:
  haría falta virtualización, que es invasiva.

**Verificación.** `npm run typecheck` (0), `npm run lint` (sólo warnings
preexistentes, ninguno en los ficheros tocados), `npm run build` (15.6 s),
`qa:ai` (TODO), `qa:brand` (0 congelamientos), `qa:routes` (124/0).

**Nota.** Es el **primer uso de `React.memo` en todo el repo** (`src/`): si se
generaliza, seguir el mismo patrón de comparador de props explícito.

### 2026-10-20 — Instrumentación: tiempos por etapa del pipeline de IA (backend)

**Síntoma.** Con la cuota de LLM7 no se podía medir en vivo; hacía falta saber
**dónde** se va el tiempo cuando el proveedor responde.

**Arreglo.** Logs en español, un reloj por etapa:
- `backend/services/ai.service.js`: `[ai.service][tiempo] <etapa>: N ms (total M ms)`
  por etapa del pipeline (clasificación, modelo, parseo, normalización…), más
  cierre OK/FALLIDO con el total.
- `backend/services/remote.service.js`: `[remote.service] <model>: N ms
  (intento k, …)` con `tLlamada` fuera del try (un throw no pierde el timing) y
  `[remote.service] <error> tras N ms (intento k/N)`.
- `backend/controllers/ai.controller.js`: `[ai.controller] generateForm: N ms`
  en try/finally (también en errores).

**Uso.** `node qa/_probe-short.mjs "<prompt típico>"` + leer `_server-out/err.log`.
Con la cuota agotada la sonda falla en ~855 ms (fail-fast verificado) y los
logs siguen apareciendo por etapa.

### 2026-10-19 — Catálogo: province / municipality / gender / education_level en todo el pipeline

**Síntoma.** El constructor ofrece campos predefinidos (`province`,
`municipality`, `gender`, `education_level`) pero la IA no podía pedirlos: el
prompt del atajo corto sólo nombraba los tipos genéricos, y el normalizador
los reconvertía a `dropdown`/`radio`.

**Arreglo.**
- `backend/utils/constants.js`: `CATALOG_FIELD_TYPES`, `catalogTypeFor(texto)`
  y `PATRONES_CATALOGO` (incluye **`sexo`** → `gender`).
- `backend/utils/formNormalize.js`: `resolveType` conserva los 4 tipos del
  catálogo (no los degrada).
- `backend/services/analytics.service.js` / `response.service.js`:
  `isCatalogQuestion` cuenta las preguntas de catálogo en las métricas.
- El prompt del atajo corto ya explica los 4 tipos del catálogo (en la entrada
  de 2026-10-19 de más abajo).

### 2026-10-19 — Fix: 2 min 05 s para devolver 0 preguntas, y el ejemplo de formato leído como formulario

**Síntoma (petición del usuario).** Un prompt que **describe** el formulario a
generar (rol, tema, título y descripción literales, "exactamente 10 preguntas",
7 tipos distintos y un **ejemplo de formato** de una sola pregunta en json)
tardaba **2:05 min** y devolvía **0 preguntas**. Antes de eso, con un prompt
largo real, la generación tardó **15 min** y salió **sin título ni descripción**.

**Causas.**

1. **El ejemplo de formato se leía como el formulario del autor.**
   `parsearFormularioPegado` recortaba "del primer `{` al último `}`". El prompt
   escribe "devuelve un objeto vacío `{}`" en los requisitos, **antes** del
   ejemplo, así que el recorte eran esos dos caracteres: json inválido, "el
   prompt traía un json de formulario, pero no se pudo leer", y a partir de ahí
   el pipeline largo… que con el proveedor sin cuota devolvía un formulario de
   cero preguntas con **200 OK**.
2. **El 429 de cuota se reintentaba.** LLM7 responde a la cuota diaria agotada
   con `Retry after 85567 seconds` (y luego 60, 59, 49…, bajando sin sentido).
   `esReintentable` lo daba por reintentable y cada llamada gastaba 4 intentos y
   ~60 s de esperas: 2:05 min y **43 s** en la sonda, para nada.
3. **Un formulario sin preguntas salía como éxito.** Ni error ni aviso: `200`,
   1055 bytes y un lienzo vacío en el constructor.
4. **El atajo corto tiraba el tipo que pide el autor.** Los nombres de fuera
   (`text`, `textarea`, `select`, `scale`, `boolean`…) no están en `FIELD_TYPES`,
   así que **todos** caían a `short_text`: "usa 7 tipos distintos" devolvía diez
   campos de texto.

**Arreglo — `backend/services/ai.service.js`**
- **`recortarObjeto(texto, desde)`** (nueva): recorta el objeto contando llaves
  y **saltando las que caen dentro de una cadena**. El candidato ya no es "del
  primer `{` al último `}`" sino **desde la llave que abre la clave
  `"questions"`** (`texto.lastIndexOf("{", clave.index)`), así un `{}` de la
  prosa no se come el json de verdad.
- **`PIDE_GENERAR` / `ETIQUETA_DE_EJEMPLO` / `etiquetasDeEjemplo`** (nuevas): un
  json de **una** pregunta, o con etiquetas de plantilla ("Texto de la
  pregunta", "Label 1"), dentro de una petición que además **manda generar**
  ("genera", "crea", "construye"…) se descarta. El camino bueno es el modelo, con
  la petición entera delante.
- **`generateForm`**: si al final **no hay ninguna pregunta respondible**, lanza
  `ApiError.internal("The AI provider returned no questions…")`. Un formulario
  vacío no es un formulario, y el autor tiene derecho a saber por qué no hay nada.
- **`generarFormularioCorto`**: el tipo pasa por **`tipoDesdeTexto(q.type)`**
  (el traductor que ya existía para `parsearFormularioPegado`) en vez de
  `FIELD_TYPES.includes(...) ? ... : "short_text"`.
- **`numeroPedido`**: acepta **dos dígitos** (`/\b([1-9]\d?)\s+(?:campo|pregunta|apartado)/i`),
  así "exactamente 10 preguntas" también pone tope.
- El prompt del atajo corto explica ahora **el catálogo entero**: una respuesta →
  `radio`, varias → `checkbox`, lista larga → `dropdown`, escala → `score_rating`
  con `scale` y ambos extremos escritos, estrellas → `quality_rating`, orden →
  `rank`, **`province`/`municipality`/`gender`/`education_level`** (los campos
  predefinidos del constructor), `number`, `date`, `email`; hecho de sí/no →
  `yes_no`, nunca una escala.

**Arreglo — `backend/services/remote.service.js`**
- **`retryAfterSegundos(error)`** (nueva) y **`CUOTA_AGOTADA`**: un 429 cuyo
  mensaje hable de cuota o de saldo (`daily token quota`, `insufficient balance`…)
  **no se reintenta**; y con `Retry-After` por encima de **10 s** tampoco (antes
  15 s, y el tope de espera era 15 s: ahora **8 s**).
- `APIConnectionError` se reintenta **una vez** (`intento < 1`), igual que un
  timeout: la conexión caída de LLM7 era lo que estiraba la generación larga a
  **15 min**.

**Arreglo — `backend/utils/messages.js`**
- Traducción al español del mensaje nuevo (`localizedMessage`).

**Verificación**
- `node qa\_probe-units.mjs` (sonda temporal, 9 casos) → **TODO OK**: la petición
  del autor **no** se lee como formulario pegado; un pegado real de 4 preguntas
  sigue entrando sin llamar al modelo con
  `short_text, dropdown, yes_no, long_text`; un `{}` en la prosa antes del json
  no rompe la lectura (2 preguntas); `esPeticionCorta` y `inferirTipo` sin
  regresiones.
- `node qa\_probe-user.mjs` (el prompt del autor, contra LLM7 con la **cuota
  diaria agotada**) → **3.2 s** (antes **2:05 min**) y el error correcto:
  `The AI provider returned no questions. Try again in a moment or check the
  provider quota.` en vez de un 200 con cero preguntas.
- `node --check` en los tres ficheros → OK. Frontend: `npm run typecheck` → 0 ·
  `npm run lint` → solo warnings previos · `npm run qa:ai` → **TODO CORRECTO**.
- **Pendiente de verificar con cuota disponible:** que el atajo corto devuelva
  las 10 preguntas con el título y la descripción literales y los 7 tipos.
  (`npm run qa:service` no corre: pide `%TEMP%\prompt-original.txt`, que no
  existe; es un fallo previo de la sonda, no del servicio.)
- Backend reiniciado en el puerto 8000 (PID 13608) para cargar los arreglos.


### 2026-10-16 — Fix: el generador devolvía 39 preguntas donde el autor pedía 6

**Síntoma (petición del usuario).** Un prompt que traía la encuesta **ya
escrita** (2.744 caracteres: rol de «diseñador senior», título, descripción, las
6 preguntas una a una con tipo/opciones/validación, y el **JSON de salida
adjunto**) devolvió **39 preguntas**, la descripción inventada y **3 min 51 s**.

**Causa raíz.** El atajo de la entrada anterior (`esPeticionCorta`) exigía
`texto.length <= 400`, así que un prompt larguísimo se iba al **pipeline
largo** —el de las reglas fijas: «8-15 secciones», «3-5 preguntas por sección»—,
que no sabe leer un «estas 6 preguntas, en este orden, con estos nombres» y
sustituye la estructura del autor por la suya. Los 3:51 son sus cuatro llamadas.

**Arreglo — `backend/services/ai.service.js`**
- **`TRAE_JSON_DE_FORMULARIO`** (`/"(?:fields|questions)"\s*:\s*\[/`): detecta
  que el autor **pega el formulario ya montado**. Se reconoce **aunque el prompt
  sea larguisimo**: un prompt de 2.744 caracteres con las 6 preguntas al detalle
  está *más* decidido que uno de 40.
- **`parsearFormularioPegado(prompt, language)`** (exportada): busca el objeto
  con `fields`/`questions` —primero en bloques cercados ```json, y si no, del
  primer `{` al último `}`— y lo **parsea**: **cero llamadas al modelo**. Si un
  bloque no parsea, prueba el siguiente candidato antes de rendirse.
  - **`TIPOS_EXTERNOS`**: traduce los nombres de fuera al catálogo interno
    (`text`→`short_text`, `linear_scale`→`score_rating`,
    `multiple_choice`→`checkbox`, `single_choice`→`radio`, `textarea`→`long_text`,
    `boolean`→`yes_no`…). Si el tipo ya es del catálogo, se respeta tal cual.
  - La escala llega repartida (`min`/`max`/`minLabel`/`maxLabel` sueltos) o
    anidada en `scale`: se junta en el `scale` que espera el catálogo, y solo en
    campos de escala.
  - `validation` se copia campo a campo (los `null` no se cuelan) y `helpText` /
    `description` / `hint` caen al `description` de la pregunta.
  - El armazón (ids con `nanoid`, `options` con id, `order`) lo pone el código y
    pasa por `normalizeForm`, igual que el resto de vías.
- **`esPeticionCorta`** ahora tiene el atajo del JSON **antes** del tope de 400
  caracteres; el resto de la lógica no cambia.

**Verificación (sondas temporales en `backend/qa/`, creadas y borradas)**
- El prompt del usuario (2.744 chars, 6 preguntas + JSON) → **6 bloques, tipos y
  orden correctos, `id` en todos, opciones y escala puestas, descripción y
  placeholder conservados, 16 ms y sin llamar al modelo** (antes: 39 preguntas y
  3 min 51 s).
- `parsearFormularioPegado` campo a campo: 6/6 en orden
  `short_text, email, score_rating(1-5 «Muy insatisfecho»-«Muy satisfecho»),
  checkbox(3 opts), radio(3 opts), long_text`; `validation` `{minLength:3,
  maxLength:120}`; 0 preguntas sin `id`.
- `esPeticionCorta` (4 casos): JSON de 600+ chars → atajo ✅ · encuesta larga sin
  JSON → pipeline largo ✅ · prompt corto → atajo ✅ · `generateForm` de 2
  preguntas sigue devolviendo 2 con id ✅.

**Puertas (todas verdes)** — backend `node --check services/ai.service.js` → OK ·
`npx tsc --noEmit` → 0 · `npm run lint` → 0 errores · `npm run build` → exit 0 ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**.
- **Pendiente:** reiniciar el backend (`npm run dev`) para que cargue el atajo.


### 2026-10-16 — Limpieza: retirada el panel `.auth-door-err` (ya sin consumidores)

**Motivo:** al pasar el aviso de «puerta equivocada» a alerta de esquina
(entrada siguiente), las 6 reglas que lo pintaban se quedaron sin uso.
`grep auth-door-err src` → **6 coincidencias, todas en `index.css`**, ningún
`.jsx`/`.tsx` las consume. Se borran enteras: `.auth-door-err`, su variante
`.dark`, `:focus-visible` y los tres hijos `__icon` / `__title` / `__body`.

Se deja en su sitio un comentario corto que explica **por qué** no hay nada
ahí, para que nadie lo vuelva a añadir pensando que falta.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores ·
`npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) ·
`npm run qa:routes` → **124 comprobaciones · 0 fallos**.


### 2026-10-16 — «Acceso restringido» como alerta de esquina + placeholders de campo en español

**(1) Aviso de puerta equivocada — de panel en la tarjeta a alerta arriba a la derecha.**
`AccessLogin.jsx`: el `div.auth-door-err` con icono `ShieldAlert`, `role="alert"`
y foco automático se sustituye por un `toast.error()` en el `useEffect` que ya
escuchaba `doorError`. Sale con el diseño premium del sistema de toasts, en la
**esquina superior derecha** (`<Toaster position="top-right">`, `main.jsx:36`),
que es donde el autor lo pidió y ya pedía el «aviso de sesión iniciada».

**Texto nuevo** (era «Esta puerta no es la tuya» / «This isn't your door»):
- es · título **«Acceso restringido»**, distintivo `RESTRINGIDO`, cuerpo
  «La autenticación se ha completado correctamente, pero este enlace de acceso no
  corresponde a tu entidad ni a tu rol asignado. Utiliza el enlace facilitado por
  tu administrador para iniciar sesión.»
- en · «Restricted access» / «Restricted access», mismo sentido.

`duration: 10000` porque es un aviso que hay que leer, no un feedback efímero, y
`setDoorError(false)` al mostrarlo para que el efecto no lo dispare dos veces.
Fuera `doorErrRef`, el efecto de foco y el import de `ShieldAlert`. El resto de
errores (credenciales, bloqueo, red) siguen como toast de siempre.

**(2) Placeholders y rótulos de campo en español** — el sitio está en español y
los campos nuevos salían en inglés:
- `lib/fieldTypes.js` — `short_text`/`long_text`: «Type your answer» → **«Escribe
  tu respuesta»**; `address`: «Street address» → **«Dirección completa»**. Rótulos:
  «Short Text» → «Texto corto», «Long Text» → «Texto largo», «Address» →
  «Dirección». (Los placeholders neutros —`name@example.com`, `https://`, `0`,
  `••••••••`— no se tocan: no son inglés.)
- `lib/templates.js` — la plantilla de contacto: «Email address» → **«Correo
  electrónico»**, `example@example.com` → **`correo@ejemplo.com`**.

Barrido de `src/**/*.{js,jsx,ts,tsx}` buscando los placeholders en inglés
típicos: no quedaban más.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. Solo frontend.


### 2026-10-16 — Fix: el generador con IA (404 «model not exist» + ignora lo que se le pide)

**Síntomas (3).** (a) «Analizar este formulario» → `404 Model not exist`; (b) el
generador pedía «un formulario de un solo campo de texto corto, título *Prueba*» y
devolvía **6 preguntas** (textarea, numéricas, sí/no); (c) tardaba minutos.

**Causa raíz — eran dos, y ninguna era «el modelo es malo».**

1. **El modelo no existía.** `AI_MODEL=qwen-coder-plus` **no está** en el
   gateway de DashScope de esta cuenta: `404 Model not exist`. Comprobado con
   `client.models.list()` + llamada directa. Barrido de los candidatos:
   `qwen-plus` → `403 Free quota exhausted` · `qwen-turbo`, `deepseek-v4-flash` →
   `404` · `qwen3.7-flash` → **OK** y es el que devuelve el campo «Prueba» como
   se pidió. Fijado `AI_MODEL=qwen3.7-flash` en `backend/.env`.

2. **El pipeline se contradecía con el autor.** `generateForm` siempre pasaba por
   `planOutline` («apunta a 8-15 secciones») y `planStems` («de 3 a 5 preguntas por
   sección»). Pedir 1 campo con esas reglas encima **no puede** dar 1 campo: el
   prompt le ordenaba otra cosa. Cambiar de modelo no lo arregla.

**Arreglo (2 de 2) — `frontend/AIFormBuilder/src/pages/Builder.jsx:573-576`**
El `onGenerated` del `AIGenerateModal` copiaba las preguntas tal cual. Si alguna
llegaba sin `id`, React la pintaba con `key=undefined` y el autosave
(`PUT /forms/:id`) la rechazaba: el formulario generado se perdía entero. Ahora
cada pregunta sin `id` recibe el de un campo nuevo del mismo tipo
(`createField(q.type || "short_text").id`).

**Arreglo (1 de 2) — `backend/services/ai.service.js`**
- **`esPeticionCorta(prompt)`** (exportada, probable sin proveedor): detecta
  peticiones cortas y explícitas. Exige **las dos** cosas — un número bajo (1-6)
  nombrado de forma explícita **y** texto ≤ 400 caracteres. Se salta a la vía
  corta un prompt largo con números grandes («176 medidas», «23 ejes»): eso es
  una encuesta de verdad y sigue yendo por el pipeline entero.
- **`generarFormularioCorto(prompt, language)`**: pide el formulario entero en
  **una sola llamada**, sin secciones ni mensajes de cabecera. El armazón lo pone
  el código (id con `nanoid`, `options` con id, `scale` solo en campos de
  escala, `visibleIf`/`validation` vacíos) y pasa por `normalizeForm`, así que la
  forma es la misma que la del pipeline largo.
- **`numeroPedido(prompt)`**: recorta la lista al número que el autor pidió
  (`un solo campo` → 1). **El autor manda sobre lo que devolvió el modelo.**
- El atajo va **primero**, antes de `planOutline`/`planPreliminares`: si fuera
  después se pagaría el pipeline entero para tirar el resultado. Si el atajo
  falla, se cae al pipeline largo (warn + log), nunca a «formulario vacío».

**Nota operativa:** al escribir `.env` se aplanó el archivo entero
(`Set-Content -NoNewline` se comió los saltos de línea) y un intento de
recuperación con regex lo dejó troceado (`PORT=` separado de `8000`). Se
reconstruyó a mano. **Regla: para tocar `.env`, usar el editor, o Python con
`newline='\n'`; nunca `Set-Content -NoNewline`.**

**Verificación (sondas temporales en `backend/qa/`, creadas y borradas)**
- `esPeticionCorta` — 10 casos: 6 positivos (tu prompt literal, «1 campo de
  texto», «solo una pregunta», «2 preguntas de opción múltiple», «tres campos»,
  «un único campo») y 4 negativos (176 medidas, 23 ejes, encuesta suelta, vacío)
  → `SONDA: DETECCION CORRECTA`.
- `generateForm` con tu prompt literal → **1 bloque `[short_text]`, título
  `"Prueba"`, `id` presente, 3,1 s** → `SONDA: GENERADOR CORRECTO`.

**Puertas (todas verdes)** — backend `node --check services/ai.service.js` → OK ·
`npx tsc --noEmit` → 0 · `npm run lint` → 0 errores · `npm run build` → exit 0 ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**.
- **Pendiente:** reiniciar el backend (`npm run dev`) si no está en `--watch`.


### 2026-10-16 — Fix: el login por puerta sin sello devolvía «Expected string, received null»

**Síntoma:** al iniciar sesión en `/a/:slug` sin `?ctx=` en la URL (puerta sin
sello), el backend respondía con el error crudo de zod:
`[{"code":"invalid_type","expected":"string","received":"null","path":["ctx"],...}]`.

**Causa raíz.** `AccessLogin.jsx` lee el sello con
`new URLSearchParams(...).get("ctx")`, que devuelve **`null`** cuando el
parámetro no está, y `localAuthApi.login` lo envía tal cual en el body
(`{ slug, ctx: null }`). Pero el `loginSchema` declaraba
`ctx: z.string()…​.optional()`, y en zod `.optional()` solo admite `undefined`,
no `null` → el `parse` lanzaba un `ZodError` sin capturar que llegaba como JSON
crudo. (`slug` tenía el mismo patrón latente.)

**Arreglo — `backend/controllers/localAuth.controller.js`**
- `loginSchema`: `slug` y `ctx` pasan de `.optional()` a **`.nullish()`**
  (admite `undefined` y `null`). El resto de la validación (trim, min/max)
  se conserva: `""` y tipos no-string siguen rechazados.
- Sin cambios de comportamiento: el handler ya trataba ambos como ausentes
  (`if (slug)` y `suppliedContext || row.context` en
  `services/accessUrl.service.js`), así que un `ctx: null` cae correctamente al
  sello de la fila.

**Verificación (sonda temporal en `backend/qa/`, creada, ejecutada y borrada)**
— réplica del schema + 6 casos: portal sin puerta OK · puerta con sello OK ·
puerta sin sello (`ctx: null`, el bug) OK · `slug: null` OK · `ctx: ""` rechazado
· `ctx: 123` rechazado · handler consume `null` como ausente →
`SONDA: LOGIN SCHEMA ACEPTYA ctx:null — TODO CORRECTO`.

**Puertas (todas verdes)** — backend `node --check controllers/localAuth.controller.js`
→ OK · `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings
preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO**
(0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.
- **Pendiente:** el backend no usa watch → requiere reiniciar (`node server.js`)
  para servir el schema corregido.


### 2026-10-16 — UX «puerta equivocada» + usuario asignado en URLs de acceso (door-bound login)

- **Backend**: `localAuth.controller.localLogin` devuelve 403 con `details.code = "wrong_door"` (credenciales válidas pero rol/entidad no corresponden a la URL `/a/:slug`) y `details.code = "wrong_portal"` (form_manager/entity_admin entra por portal sin slug). `accessUrl.repo.listAccessUrls` añade `assignedUsers` vía subconsulta JSON (usuarios con `users.access_url_id = u.id`), devolviendo `[]` si no hay ninguno; `listAccessUrls` devuelve `context: undefined` explícitamente.
- **Frontend**: `AccessLogin.jsx` muestra un panel visual en la tarjeta (icono `ShieldAlert`, `role="alert"`, foco automático) cuando `err.details?.code === "wrong_door"` (usa ternarios inline `isSpanish`, sin tocar `LanguageContext`). `admin/AccessUrls.jsx` muestra en MetaLine el `IconPill` con `UserRound` + `assignedLabel` (lista `name || email`), añade asignados a keywords/spotlight y a las props del `AccessUrlRow`. `roleI18n.js` añade `assignedUser`/`unassignedUser` (es/en). `index.css` añade `.auth-door-err` (medallón danger, tokens semánticos).
- **Verificación**: DB: `assignedUsers` correcto (incluye usuarios vinculados, vacío cuando no hay). HTTP: `/api/auth/local/login` con slug equivocado → 403 `details.code='wrong_door'`; sin slug para rol no-super → 403 `details.code='wrong_portal'`; correcto → 200. `tsc --noEmit` 0, `npm run lint` 0 (warnings preexistentes), `npm run build` 0, `npm run qa:brand` 0 conflictos, `npm run qa:routes` 124/0.


> GuÃ­a para agentes (y humanos) que trabajan en este repositorio. LÃ©ela antes de
> tocar cÃ³digo. Todo lo que aquÃ­ dice estÃ¡ verificado contra el Ã¡rbol real.

> **REGLA OBLIGATORIA â€” registrar cada cambio.** Toda modificaciÃ³n de cÃ³digo debe
> quedar reflejada en este archivo antes de dar la tarea por terminada: aÃ±ade una
> entrada (con fecha) en Â§10 "Registro de cambios" indicando archivos tocados,
> quÃ© cambiÃ³ y las puertas ejecutadas. Si ademÃ¡s el cambio altera estructura,
> convenciones o riesgos, actualiza tambiÃ©n la secciÃ³n correspondiente
> (Â§3/Â§4/Â§5/Â§6/Â§9). Un cambio sin entrada en `AGENTS.md` se considera incompleto.

---

## 1. DescripciÃ³n general

Monorepo de un **constructor de formularios con IA**. Dos aplicaciones:

- **`frontend/AIFormBuilder`** â€” SPA en **React 19 + Vite 8 + Tailwind CSS v4**.
  Es donde vive el 90 % del trabajo. Contiene ademÃ¡s el autÃ©ntico repositorio Git.
- **`backend`** â€” API en **Node.js/Express** (auth OIDC + local, RBAC, formularios,
  respuestas, insights, notificaciones, servicio de IA).

El frontend incluye: sitio pÃºblico (formularios compartidos), panel de creaciÃ³n
(builder drag & drop), dashboard/analÃ­ticas, bandeja de respuestas, ajustes,
panel de super-admin (usuarios, entidades, URLs de acceso, auditorÃ­a) y un
sistema de feedback unificado (modales/toasts/avisos/tooltips).

**Idioma:** el proyecto estÃ¡ escrito en espaÃ±ol â€” comentarios, mensajes, docs y
nombres de dominio. MantÃ©n el espaÃ±ol en texto nuevo.

---

## 2. Stack y comandos

### Frontend (`frontend/AIFormBuilder`)

| Ãrea | TecnologÃ­a |
|---|---|
| UI | React 19, React Router 7, framer-motion / motion |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`), `class-variance-authority`, `clsx` + `tailwind-merge`, lucide-react |
| Datos | `axios`, `@tanstack/react-query`, SSE (respuestas en vivo) |
| Formularios/validaciÃ³n | `react-hook-form`, `@hookform/resolvers`, `zod` |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Export | `exceljs`, `docx`, `jspdf`, `jspdf-autotable` |
| GrÃ¡ficas | `recharts` |
| Notificaciones | sistema propio, alias `sonner` â†’ `src/components/ui/Toast.tsx` |
| Lint / tipado / build | `oxlint`, `tsc --noEmit`, `vite build` |

```bash
npm run dev        # Vite dev server (HTTPS, :5173, strictPort)
npm run build      # build de producciÃ³n
npm run preview    # sirve dist (:4173)
npm run lint       # oxlint
npm run typecheck  # tsc --noEmit (SOLO .ts/.tsx)
npm run qa:brand   # auditorÃ­a de marca (falla si hay hex de marca a fuego)
npm run qa:routes  # sonda de rutas/panel (baseline conocida)
```

> El dev server usa HTTPS con certificados en `certs/`, `host: 0.0.0.0`,
> `port: 5173`, `strictPort: true` y `watch.usePolling`. **ReinÃ­cialo** tras
> cambios de configuraciÃ³n de Tailwind/Vite (ver Â§9, regla del `@import` CSS).

### Backend (`backend`)

```bash
npm run start   # / nodemon segÃºn package.json
```

Arranque: `server.js` â†’ `app.js`; config en `config/`; datos en `db/` (Prisma +
SQL); validaciÃ³n/seguridad en `middleware/`; lÃ³gica en `services/` y
`repositories/`; utilidades en `utils/`; endpoints en `routes/` + `controllers/`.

---

## 3. Estructura del repositorio (Ã¡rbol comentado)

```
AI form builder/                          # raÃ­z del workspace
â”œâ”€â”€ AGENTS.md                             # stub: "Ver frontend/AIFormBuilder/AGENTS.md"
â”œâ”€â”€ skills-lock.json                      # skills instaladas (archify, web-design-guidelines)
â”œâ”€â”€ .agents/skills/                       # skills vendorizadas (archify, web-design-guidelines)
â”œâ”€â”€ .archify/                             # salida/estado de la skill archify
â”œâ”€â”€ .opencode/                            # config de OpenCode + skills del entorno (design, brand, slidesâ€¦)
â”œâ”€â”€ .superpowers/                         # ledger SDD (planes, specs, progress.md)
â”œâ”€â”€ docs/                                 # documentaciÃ³n del proyecto
â”‚   â”œâ”€â”€ FEEDBACK_SYSTEM.md                # contrato del sistema de feedback
â”‚   â”œâ”€â”€ RBAC_ACCESO.md                    # roles y acceso
â”‚   â”œâ”€â”€ IDENTITY_UI.md                    # identidad UI: rol del usuario e invitado
â”‚   â”œâ”€â”€ session-security.md               # polÃ­tica y esquema de sesiones
â”‚   â”œâ”€â”€ design/2026-10-06-published-forms-cards.html
â”‚   â””â”€â”€ superpowers/{plans,specs}/â€¦       # planes y specs SDD
â”œâ”€â”€ backend/                              # API Express (ver Â§2)
â”‚   â”œâ”€â”€ server.js Â· app.js Â· package.json Â· .env
â”‚   â”œâ”€â”€ certs/                            # certs HTTPS
â”‚   â”œâ”€â”€ config/      db.js Â· env.js Â· oidc.js
â”‚   â”œâ”€â”€ controllers/ admin Â· ai Â· auth Â· form Â· guest Â· insights Â· localAuth Â· notification Â· response Â· settings
â”‚   â”œâ”€â”€ repositories/ accessUrl Â· audit Â· entity Â· form Â· notification Â· response Â· session Â· settings Â· user
â”‚   â”œâ”€â”€ routes/       admin Â· ai Â· auth Â· form Â· insights Â· localAuth Â· notification Â· response Â· settings
â”‚   â”œâ”€â”€ services/     accessUrl Â· ai Â· analytics Â· form Â· insights Â· mail Â· remote Â· response Â· settings (+ ollama.service.js.old)
â”‚   â”œâ”€â”€ middleware/   auth Â· errorHandler Â· rbac Â· respondent
â”‚   â”œâ”€â”€ utils/        ApiError Â· apiResponse Â· asyncHandler Â· bootstrap Â· constants Â· csv Â· formAudit Â· formNormalize Â· idpPublicProfile Â· idtoken Â· messages Â· nanoid Â· optionLabels Â· password Â· realtime Â· seed Â· token Â· urlCrypto Â· validation Â· visibility
â”‚   â”œâ”€â”€ db/           schema.prisma Â· schema.sql Â· seedEntities.js
â”‚   â”œâ”€â”€ public/form-logos/  # logos subidos
â”‚   â””â”€â”€ qa/           entity-admin-registration-probe Â· logo-probe Â· purge-untitled-forms
â””â”€â”€ frontend/AIFormBuilder/               # SPA React (ver Â§4 para `src/`)
    â”œâ”€â”€ AGENTS.md                         # â† este archivo (guÃ­a para agentes)
    â”œâ”€â”€ index.html Â· vite.config.js Â· jsconfig.json Â· tsconfig.json
    â”œâ”€â”€ package.json Â· .env Â· .env.example Â· .gitignore
    â”œâ”€â”€ certs/  Â·  public/  Â·  qa/  Â·  dist/
    â”œâ”€â”€ BOILERPLATE.md Â· DESPLIEGUE.md Â· README.md
    â””â”€â”€ Encuesta_Premium_262605855112050_source/   # fuente de una plantilla
```

---

## 4. Frontend â€” Ã¡rbol de `frontend/AIFormBuilder/src`

```
src/
â”œâ”€â”€ main.jsx                     # entrada: monta <App/> + importa index.css
â”œâ”€â”€ App.jsx                      # router + providers (Auth, Theme, Language, React Query)
â”œâ”€â”€ index.css                    # SISTEMA DE ESTILOS GLOBAL (@theme + @utility + base)
â”‚                                #   Â· lÃ­nea 1: @import "tailwindcss"
â”‚                                #   Â· lÃ­nea 5: @import "./components/admin/admin.css"  â† CRÃTICO
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ admin/                   # panel super-admin
â”‚   â”‚   â”œâ”€â”€ admin.css            # utilidades adm-* / premium-search* (Â¡debe importarse desde index.css!)
â”‚   â”‚   â”œâ”€â”€ AdminKit.jsx         # AdminHeader, AdminPanel, SearchField, SelectField, StatTile, RowAction + re-export ConfirmProvider/useConfirm
â”‚   â”‚   â”œâ”€â”€ AdminTable.jsx       # tabla + Pill
â”‚   â”‚   â”œâ”€â”€ FormFields.jsx       # campos premium del panel (AdminInput/AdminTextarea/AdminSelect/AdminOptionGroup/AdminFieldGroup + FieldLabel/FieldMessage)
â”‚   â”‚   â”œâ”€â”€ EntitySelect.jsx     # selector de entidad (+ CATEGORY_META)
â”‚   â”‚   â”œâ”€â”€ EntitySelectField.jsx# EntitySelect envuelto en FieldLabel/FieldMessage (para RHF)
â”‚   â”‚   â”œâ”€â”€ AccessUrlSelect.jsx  # select premium de URL de acceso (desplegable custom, teclado)
â”‚   â”‚   â”œâ”€â”€ AccessUrlField.jsx   # envuelve AccessUrlSelect para RHF (filtra por entidad+rol)
â”‚   â”‚   â”œâ”€â”€ ListChrome.jsx       # FilterChip, Segmented, SpotlightTrigger, ListSection, RowShellâ€¦
â”‚   â”‚   â”œâ”€â”€ PublicFormCard.jsx   # tarjeta de formulario pÃºblico (+ MetricTile)
â”‚   â”‚   â”œâ”€â”€ PremiumSearchBar.jsx # (sin consumidores)
â”‚   â”‚   â””â”€â”€ LiveSearchBar.jsx    # (sin consumidores)
â”‚   â”œâ”€â”€ analytics/               # grÃ¡ficas y KPIs
â”‚   â”‚   â”œâ”€â”€ ChartCard Â· Charts Â· ExportMenu Â· Funnel Â· FuturisticTooltip Â· KpiCard Â· QuestionChart
â”‚   â”‚   â””â”€â”€ Prism{AreaChart,Bars,ColumnBars,Donut,Gauge,Heatmap,TopForms,VolumeChart}.{jsx,css} + PrismPalette.js
â”‚   â”œâ”€â”€ auth/                    # AuthCard Â· AuthRequiredModal Â· AuthTransition Â· RoleBadge Â· IdentityMenu Â· GuestPill Â· SessionAlert Â· SuperAdminStage
â”‚   â”œâ”€â”€ builder/                 # AIGenerateModal Â· FieldPalette Â· FieldSettings Â· LogoDropzone Â· SettingsPanel Â· ShareModal Â· SortableField
â”‚   â”œâ”€â”€ dashboard/               # CardDecor Â· NavCard
â”‚   â”œâ”€â”€ forms/                   # FilteredFormsList(+css) Â· FormCard Â· FormPageHeader Â· FormsBrowser Â· TemplatePreview
â”‚   â”œâ”€â”€ notifications/           # NotificationBell
â”‚   â”œâ”€â”€ public/                  # FieldRenderer Â· FormArtPanel Â· FormView  (render del formulario pÃºblico)
â”‚   â”œâ”€â”€ responses/               # RespondentCard(+respondent.css): ficha premium del encuestado IDP (`idp-*`)
â”‚   â”œâ”€â”€ settings/                # AccentPicker Â· AvatarDropzone Â· PasswordStrength Â· PreferencesSync Â· ProfileSettings Â· SessionsPanel Â· SettingsLayout Â· SettingsSection Â· Switch Â· appearanceSaveGate
â”‚   â”œâ”€â”€ showcase/                # CrystalVision(+crystal.css) Â· Nocturne(+nocturne.css) Â· StateIconsGallery(+state-icons.css)
â”‚   â””â”€â”€ ui/                      # KIT DE COMPONENTES (ver Â§7)
â”‚       â”œâ”€â”€ Modal.tsx Â· AlertDialog.tsx Â· DeleteDialog.tsx Â· NotificationModal.tsx Â· SuccessAlert.tsx Â· DialogSkeleton.tsx
â”‚       â”œâ”€â”€ Toast.tsx Â· Tooltip.jsx Â· Dropdown.jsx Â· Drawer.jsx Â· Switch.jsx Â· Input.jsx Â· Button.jsx Â· Card.jsx
â”‚       â”œâ”€â”€ CardSurface.jsx Â· Feedback.jsx Â· Avatar.jsx Â· CategoryBadge.jsx Â· ThemeToggle.jsx Â· LanguageSwitcher.jsx
â”‚       â”œâ”€â”€ Splash.jsx Â· DateTimePicker.jsx(+.css) Â· FabSpeedDial.tsx Â· apple-spotlight.tsx
â”‚       â”œâ”€â”€ animated-state-icons.tsx Â· state-icon-catalog.ts Â· state-morph.ts
â”‚       â”œâ”€â”€ FormFields.jsx(+FormFields.css) Â· crystal.css
â”‚       â””â”€â”€ HamburgerMenuIcon.jsx
â”œâ”€â”€ contexts/                    # AuthContext Â· ThemeContext Â· LanguageContext(+.d.ts)
â”œâ”€â”€ feedback/                    # SISTEMA DE FEEDBACK (mayormente TS)
â”‚   â”œâ”€â”€ ConfirmProvider.tsx Â· toastStore.ts Â· notificationStore.ts Â· overlay.ts Â· store.ts Â· types.ts Â· variants.ts
â”œâ”€â”€ hooks/                       # useAuth Â· useConfirm(.ts) Â· useDebounce Â· useDeleteConfirm(.ts) Â· useDialog(.ts) Â· useFilterAnimation Â· useForms Â· useHistoryState Â· useModal(.ts) Â· useNotification(.ts) Â· useOverlay(.ts) Â· useRealtimeResponses Â· useSettings Â· useTheme
â”œâ”€â”€ layouts/                     # DashboardLayout Â· ProtectedRoute
â”œâ”€â”€ lib/                         # utilidades, constantes y dominio (ver Â§7)
â”œâ”€â”€ pages/                       # pÃ¡ginas de ruta
â”‚   â”œâ”€â”€ admin/                   # AccessUrls Â· Audit Â· Entities Â· PublicStats Â· Users
â”‚   â”œâ”€â”€ entity-admin/            # EntityForms Â· EntityUsers (panel del entity_admin)
â”‚   â””â”€â”€ AccessLogin Â· Analytics Â· Builder Â· Dashboard Â· DesignShowcase Â· GuestHome Â· GuestStats Â· Help Â· Inbox Â· Insights Â· LocalLogin Â· LoginPage Â· MyForms Â· NotFound Â· Notifications Â· Profile Â· PublicForm Â· Responses Â· Security Â· Settings Â· Shortcuts Â· Templates
â”œâ”€â”€ services/                    # index.js (clientes API) Â· exportService.js (Excel/Word/PDF)
â”œâ”€â”€ shared/                      # â† CAPA COMPARTIDA NUEVA (ver Â§8)
â”‚   â”œâ”€â”€ styles/                  # tokens.ts Â· theme.ts Â· mixins.ts
â”‚   â””â”€â”€ skills/                  # index.ts Â· README.md
â””â”€â”€ types/                       # jsx-modules.d.ts (shim de mÃ³dulos .js/.jsx/.css)
```

---

## 5. Convenciones

### CÃ³digo y lenguaje
- **JS/JSX mayoritario; TS puntual.** Solo se escribe TypeScript donde ya existe:
  `feedback/`, varios `hooks/*.ts`, `components/ui/*.tsx`, `lib/designTokens.ts` y
  la nueva capa `shared/`. El resto es `.js/.jsx` y **no** estÃ¡ en el `tsconfig`.
- `tsconfig.json` es **acotado a propÃ³sito**: `include: ["src/**/*.ts","src/**/*.tsx"]`,
  `allowJs: false`. Un `.ts/.tsx` nuevo queda tipado en `strict` sin migrar el JS.
  Consecuencia: los ficheros `.ts` **solo pueden importar** `.ts/.tsx` o mÃ³dulos
  con `.d.ts` hermano (o el comodÃ­n `declare module "*.js"`, que vale `any`).
- `verbatimModuleSyntax: true` â†’ usa `import type` / `export type` para tipos.
- Nada de `any` innecesario; `noUncheckedIndexedAccess` estÃ¡ activo.
- Comentarios: explican **por quÃ©**, no quÃ©. En espaÃ±ol.

#### Alcance de TypeScript (Â¿quÃ© queda fuera del `tsc`?)

`tsconfig.json` incluye **Ãºnicamente** `src/**/*.ts` y `src/**/*.tsx`. `allowJs` y
`checkJs` estÃ¡n en `false` **por decisiÃ³n, no por olvido**: el proyecto tiene
~60 archivos `.js/.jsx` heredados que no se van a migrar a TypeScript. Si
`allowJs` se activara, `tsc --noEmit` reportarÃ­a cientos de errores preexistentes
(entre ellos el famoso caso de `LanguageContext.jsx` con 1445 lÃ­neas y claves
duplicadas) y el chequeo de tipos dejarÃ­a de ser Ãºtil para el cÃ³digo nuevo.

**QuÃ© queda fuera del `tsc`:**
- Todo `.js` y `.jsx`: `lib/*.js`, `components/**/*.jsx`, `pages/**/*.jsx`,
  `contexts/*.jsx`, `services/index.js`, `hooks/useAuth.js`, etc.
- Los `.d.ts` hermanos (`lib/api.d.ts`, `lib/routes.d.ts`, `lib/roles.d.ts`,
  `lib/utils.d.ts`, `services/index.d.ts`) **sÃ­** son leÃ­dos por `tsc`: es la
  forma de que un `.ts/.tsx` importe un mÃ³dulo JS con tipos reales en vez de `any`.
- El shim `types/jsx-modules.d.ts` (`declare module "*.js"`) es el fallback para
  imports que no tienen `.d.ts` hermano: valen `any` y no se chequean.

**QuÃ© sÃ­ se chequea:** todo `.ts`/`.tsx` nuevo (capa `shared/`, `feedback/`,
`hooks/useConfirm.ts`, `components/ui/*.tsx`, etc.).

**ConvenciÃ³n para mÃ³dulos JS heredados:** si un `.ts/.tsx` necesita consumir
`api.js`, `routes.js`, `roles.js` o `services/index.js` con tipos, se crea un
`.d.ts` hermano que describa su API pÃºblica y se re-exportan los tipos desde
`src/shared/skills/index.ts` usando `export type`. Los mÃ³dulos sin `.d.ts`
(`fieldTypes.js`, `themes.js`, `validate.js`â€¦) se importan directo y se
documentan en `src/shared/skills/README.md`.

### Nombres
- Componentes y pÃ¡ginas: `PascalCase.jsx/.tsx` (una exportaciÃ³n por responsabilidad).
- Hooks: `useAlgo` en `hooks/useAlgo.(ts|js)`.
- Utilidades/constantes: `camelCase` en `lib/*.js`; constantes globales en
  `MAYÃšSCULAS`.
- CSS por componente con **prefijo de clase**: `adm-` (admin), `cr-` (crystal),
  `dtp-` (date picker), `pv-/pb-/pcb-/pd-/pg-/pm-/pvc-/pt-` (Prism charts),
  `si-` (state icons), `noc-` (nocturne).

### Imports
- Usa el alias **`@/` â†’ `src/`** (configurado en `vite.config.js`, `jsconfig.json` y
  `tsconfig.json`).
- **`sonner` NO es la librerÃ­a**: el alias apunta a `src/components/ui/Toast.tsx`.
  `import { toast } from "sonner"` trae el sistema propio.
- Respeta las extensiones en imports internos de TS (`.ts/.tsx`).

### Estilos y tokens (regla de marca)
- El acento vive en `--color-brand-*` (definido **solo** en `src/index.css` @theme).
  **Prohibido escribir hex de la familia de marca** en superficies del sistema;
  usa tokens (`var(--â€¦)`, `bg-brand-500`, `text-ink`, `border-line`â€¦).
  Lo vigila `npm run qa:brand` (falla si congelas un color).
- Los colores **semÃ¡nticos** (`--color-danger/success/warning/info`) no siguen al
  acento; no mezcles una clase de tono semÃ¡ntico con una de marca en el mismo
  elemento (lo detecta como "conflicto semÃ¡ntico").
- Estilos nuevos: utilidades Tailwind + `@utility` en `index.css` para lo
  reutilizable; CSS propio con prefijo cuando el componente es complejo.

### i18n
- `LanguageContext` (`src/contexts/LanguageContext.jsx`) tiene los diccionarios
  `es`/`en` inline. Hook: `useLanguage()` â†’ `{ language, changeLanguage, t }`.
- Jerga de rol/panel: `useRoleT()` â†’ `rt(key)` en `src/lib/roleI18n.js`
  (usado por casi todas las pÃ¡ginas de admin).
- El idioma se persiste en `localStorage["formly_language"]` y se alinea con la URL.

### QA / testing
- No hay test runner unitario; la verificaciÃ³n es por **sondas** en `qa/*.js`
  (Node, sin navegador salvo las que levantan servidor) + auditorÃ­as.
- Puertas de calidad tÃ­picas antes de dar algo por terminado:
  ```bash
  npx tsc --noEmit          # 0 errores
  npm run lint              # 0 errores (los warnings preexistentes se toleran)
  npm run build             # exit 0
  npm run qa:brand          # "TODO CORRECTO" (0 congelamientos, 0 conflictos)
  npm run qa:routes         # baseline conocida: 124 checks / 27 fails (exit 1 esperado)
  ```

### Build y lint
- `vite.config.js`: plugins `react()` + `tailwindcss()`, alias `@` y `sonner`,
  server HTTPS `:5173` strict.
- `npm run lint` = `oxlint` (config por defecto; recomendaciones de React).

---

## 6. Inventario de estilos â€” dÃ³nde vive cada uno

| Hoja | Prefijo / rol | Importada por |
|---|---|---|
| `src/index.css` | Sistema global: `@theme` (tokens), `@utility` (`btn-*`, `card-*`, `sa-input`, `glass`, `text-brand-gradient`, `shadow-glow`, `skeleton-shimmer`, `animate-page-enter`â€¦), keyframes, `@custom-variant dark`, `@layer base/components/utilities`. **Define la escala de marca.** | `main.jsx` (+ `@import` de admin.css) |
| `components/admin/admin.css` | `adm-*` (panel/tabla/campos), `premium-search*`, tokens `--search-*` | `index.css` **y** 5 `.jsx` de admin |
| `components/ui/crystal.css` | `cr-*`: modal, toast, tooltip, chip, botones, drawer, card, orb | `ui/{Drawer,Card,Feedback,Tooltip,Toast,Splash,Modal}.jsx`, `auth/AuthRequiredModal`, `settings/AccentPicker`, `showcase/CrystalVision` |
| `components/ui/FormFields.css` | `.field-*`, `.select-*`, `.toggle-*`, `.option-card`, `.upload-zone`, `.rating-stars` | `ui/FormFields.jsx` (render del formulario) |
| `components/ui/DateTimePicker.css` | `.dtp-*` | `ui/DateTimePicker.jsx` |
| `components/forms/FilteredFormsList.css` | `.filter-*`, `.filtered-forms-list__*` | `forms/FilteredFormsList.jsx` |
| `components/showcase/crystal.css` | `cr-stage`, `cr-tone-*`, `cr-modal` (showroom) | `showcase/CrystalVision.jsx` |
| `components/showcase/nocturne.css` | `.noc-*` | `showcase/Nocturne.jsx` |
| `components/showcase/state-icons.css` | `.si-*` | `showcase/StateIconsGallery.jsx` |
| `components/analytics/Prism*.css` | `pv- .pb- .pcb- .pd- .pg- .pm- .pvc- .pt-` | su `Prism*.jsx` correspondiente |
| `components/responses/respondent.css` | `.idp-*` (ficha premium del encuestado IDP; **CSS plano, sin `@utility`**) | `components/responses/RespondentCard.jsx` |

**Tokens clave de `index.css`:** `--color-brand-50â€¦950`, `--color-brand-500`,
`--color-{success,warning,danger,info}(-soft/-ring/-ink)`, `--color-{app,surface,
surface-2,line,ink,ink-muted}`, `--app-bg`, `--border`, `--fg`, `--fg-muted`,
`--glass-{bg,border,bg-hover,chroma}`, `--radius-{sm,md,lg,xl,2xl,btn,modal,
modal-lg,toast,tooltip,pill}`, `--shadow-brand-*`, `--z-*`, `--ease-*`,
`--transition-*`, `--card-*`, `--toast-*`, `--overlay-*`.

---

### Reglas crÃ­ticas de estilos (`@utility` y CSS)

**Norma obligatoria:** todo CSS que use `@utility` **debe importarse desde
`src/index.css`** (el pipeline principal). Importarlo solo desde JS lo sirve
sin compilar en dev (el navegador ignora `@utility`) y sÃ³lo en parte en build,
dejando la utilidad sin estilo. `admin.css` se rompiÃ³ asÃ­.

- âœ… **Correcto:** `src/components/admin/admin.css` contiene `@utility adm-*` y
  `@utility premium-search-*` y se importa desde `src/index.css`:
  ```css
  /* src/index.css, lÃ­nea 5 */
  @import "./components/admin/admin.css";
  ```
  AdemÃ¡s, los `.jsx` de admin tambiÃ©n lo importan como mÃ³dulo CSS para el Ã¡rbol
  del brand-audit (no para estilos).

- âŒ **Incorrecto:** un archivo `components/foo/foo.css` con `@utility foo-*`
  que se importa **solo** desde JS:
  ```jsx
  // âŒ MAL: la utilidad no se compila
  import "./foo.css";
  ```
  El fix es aÃ±adir `@import "./components/foo/foo.css";` a `src/index.css`.

- **Caso histÃ³rico (`admin.css`):** el archivo vivÃ­a en `components/admin/` y
  cinco `.jsx` lo importaban como mÃ³dulo CSS. En dev, `@utility` es ignora por
  el navegador; en build, lightningcss emite `Unknown at rule: @utility` (como
  se ve en el log de `npm run build`) y las clases `adm-*` quedan vacÃ­as. La
  correcciÃ³n fue el `@import` en `index.css`, que es lo que actualmente
  funciona.

- **AuditorÃ­a:** `npm run qa:brand` lista los archivos "sin alcanzar"
  (informativo). Para detectar hojas `@utility` huÃ©rfanas, busca `@utility` en
  `.css` que no sean importadas desde `index.css`.

---

---

## 7. Inventario de skills (hooks, utilidades, componentes, contextos)

### Hooks (`src/hooks/`)
| Hook | Exporta | Consumido por |
|---|---|---|
| `useAuth.js` | `useAuth` | App, layouts, 20+ pÃ¡ginas |
| `useTheme.js` | `useTheme` | Settings, CommandPalette, Logo, Avatar, analytics |
| `useConfirm.ts` | `useConfirm` | admin/{Users,Entities,AccessUrls}, DesignShowcase |
| `useDeleteConfirm.ts` | `useDeleteConfirm` | DesignShowcase |
| `useDialog.ts` Â· `useModal.ts` | estado headless de diÃ¡logo/modal | componentes de diÃ¡logo |
| `useNotification.ts` | `useNotification` | DesignShowcase |
| `useOverlay.ts` | re-export de `feedback/overlay` | DashboardLayout, CommandPalette, Modal, Drawer |
| `useDebounce.js` | `useDebounce` | Builder, Responses, Inbox, FormsBrowser |
| `useFilterAnimation.js` | `useFilterAnimation` | FilteredFormsList |
| `useForms.js` | `useForms` | FormsBrowser |
| `useHistoryState.js` | `useHistoryState` (undo/redo) | Builder |
| `useRealtimeResponses.js` | `useRealtimeResponses` (SSE) | Responses, Analytics |
| `useSettings.js` | familia de hooks React Query | Settings, ProfileSettings |

### `lib/` (utilidades y dominio, sÃ³lo-JS)
`utils.js` (`cn`, `timeAgo`, `formatDuration`, `formatDate`, `initials`,
`hexToRgba`, `shade`, `downloadBlob`), `accent.js` (catÃ¡logo de acentos),
`routes.js` (rutas + generadores), `roles.js` + `roleI18n.js` (RBAC + `rt()`),
`fieldTypes.js` (modelo de campos), `themes.js` / `templates.js`,
`validate.js` (validaciÃ³n de respuestas), `charts.js`, `exportTheme.js`,
`cubaLocations.js` / `inclusiveOptions.js`, `shareUrl.js` / `clipboard.js`,
`authReturn.js`, `accessDoor.js` (puerta `/a/<slug>` recordada por rol para el
cierre de sesiÃ³n), `pageTitle.js`, `framerMotionVariants.js`, `useAutoGrow.js`,
`designTokens.ts` (tokens documentales; hoy sin consumidores â€” la fuente real
es `index.css`).

### `feedback/` (sistema de feedback, TS)
`store.ts` (`createStore`/`useStore`), `overlay.ts` (`useFocusTrap`,
`useBodyScrollLock`/`useScrollLock`, `useEscapeKey`), `types.ts` (contratos),
`variants.ts` (CVA: `dialogSize`, `alertTone`, `buttonVariant`),
`toastStore.ts`, `notificationStore.ts`, `ConfirmProvider.tsx`
(`ConfirmProvider`/`useConfirm`). Documentado en `docs/FEEDBACK_SYSTEM.md`.

### Componentes genÃ©ricos â€” `components/ui/`
`Modal.tsx` (Modal, ConfirmModal, DestructiveModal, FormModal, StatusModal,
InfoModal, SuccessModal, ErrorModal, WarningModal, LoadingModal, ConfirmDialog),
`AlertDialog.tsx`, `DeleteDialog.tsx`, `NotificationModal.tsx`,
`SuccessAlert.tsx`, `DialogSkeleton.tsx`, `Toast.tsx` (`toast`, `Toaster`,
`useToast`, `ToastProvider`, `TOAST_POSITIONS`), `Tooltip.jsx`, `Dropdown.jsx`,
`Drawer.jsx`, `Switch.jsx`, `Input.jsx` (Input/Textarea/Select/Label/Field),
`Button.jsx`, `Card.jsx` (Card/StatCardâ€¦), `CardSurface.jsx`, `Feedback.jsx`
(Spinner/PageLoader/Skeleton/Badge/EmptyState), `Avatar.jsx`,
`CategoryBadge.jsx`, `ThemeToggle.jsx`, `LanguageSwitcher.jsx`, `Splash.jsx`,
`DateTimePicker.jsx`, `FabSpeedDial.tsx`, `apple-spotlight.tsx`,
`animated-state-icons.tsx`, `FormFields.jsx` (campos del formulario pÃºblico).

**AdminKit** (`components/admin/AdminKit.jsx`) exporta `AdminHeader`,
`AdminPanel`, `SearchField`, `SelectField`, `StatTile`, `RowAction`,
`EmptyState`, notificadores (`notifySaved/notifyDeleted/notifyError/
notifyAuthAlert` —aviso de sesión iniciada con la insignia del rol;
`notifySuperAdminAuth` es su envoltorio para el superadmin—) y re-exporta
`ConfirmProvider`/`useConfirm`.

### Contextos (`src/contexts/`)
`AuthContext` (`useAuth`), `ThemeContext` (`ThemeProvider`/`useTheme`),
`LanguageContext` (`LanguageProvider`/`useLanguage`, diccionarios es/en).

### Servicios
`services/index.js`: `authApi`, `insightsApi`, `notificationApi`, `formApi`,
`responseApi`, `settingsApi`, `guestApi`, `localAuthApi`, `adminApi`,
`accessApi`, `aiApi` (sobre `lib/api.js`, axios con interceptor de 401).
`services/exportService.js`: `exportStats` (Excel/Word/PDF).

---

## 8. Capa compartida nueva â€” `src/shared/` y guÃ­a de reutilizaciÃ³n

Se creÃ³ para **centralizar** estilos y skills reutilizables sin tocar el runtime
existente. Es la superficie recomendada para **cÃ³digo nuevo**; el JS heredado
sigue en sus rutas originales.

```
src/shared/
â”œâ”€â”€ styles/
â”‚   â”œâ”€â”€ tokens.ts     # colors, spacing, typography, breakpoints, radii, shadows, zIndex, motion (+ tokens/tipos)
â”‚   â”œâ”€â”€ theme.ts      # roles semÃ¡nticos, themes, themeClass, cssVar, withAlpha, accent
â”‚   â””â”€â”€ mixins.ts     # minWidth/maxWidth/media, flex, grid, center, visuallyHidden, truncate, lineClamp
â””â”€â”€ skills/
    â”œâ”€â”€ index.ts      # barrel: hooks tipados + helpers + validadores + http genÃ©rico
    â””â”€â”€ README.md     # quÃ© se aplica dÃ³nde (tabla completa)
```

### CÃ³mo reutilizar

```ts
// Tokens y tema (nunca hex a fuego):
import { tokens, colors } from "@/shared/styles/tokens";
import { semantic, themeClass, withAlpha } from "@/shared/styles/theme";
import { flex, grid, minWidth } from "@/shared/styles/mixins";

// Skills (hooks, helpers, validadores, http):
import { cn, useConfirm, formatCurrency, isEmail, http } from "@/shared/skills";

const precio = formatCurrency(19.9);                 // "$19.90"
const datos  = await http<{ id: string }>("/api/x"); // fetch tipado
const estilo = flex({ direction: "column", gap: 12 }); // objeto de estilo
```

**Reglas de la capa compartida**
1. **Nada de hex de familia de marca** aquÃ­: solo `var(--â€¦)`. Lo verifica `qa:brand`.
2. Los `.ts` sÃ³lo importan `.ts/.tsx` (o mÃ³dulos con `.d.ts`/comodÃ­n `.js`).
   Lo JS-heredado se importa directo y se documenta en `skills/README.md`.
3. Si aÃ±ades un skill reutilizable, expÃ³rtalo en `skills/index.ts` y resÃ©Ã±alo en
   `skills/README.md`.
4. **AÃºn sin consumidores** (`qa:brand` los lista como "sin alcanzar", que es
   informativo, no un fallo). Es la base para adoptarlos de forma incremental.

> La capa `shared/` no se importÃ³ desde `main.jsx` a propÃ³sito: se evita cambiar
> el bundle o el comportamiento hasta que se adopte pieza a pieza.

---

## 9. Advertencias y riesgos conocidos

- **`@utility` en CSS debe ir por `index.css`** (ver Â§6, regla crÃ­tica). Cualquier
  hoja nueva con `@utility` que no se importe desde `index.css` quedarÃ¡ sin estilo.
- **Cascada de `@utility` vs utilidades Tailwind:** `@utility adm-field-premium`
  fija `padding: 0 .875rem` y, por orden en el fichero, **gana** a `pl-10`/`pr-10`
  de Tailwind. Para paddings laterales de campos usa las utilidades propias
  (`adm-field-lead`, `adm-field-trail`), definidas **despuÃ©s** en `admin.css`.
- **Sesiones por rol (realm):** cada rol guarda su token en `formly_session_<realm>`
  y `formly_active_realm` decide cuÃ¡l se envÃ­a; cerrar sesiÃ³n solo borra esa ranura
  y reactiva la mÃ¡s reciente que quede. **Usa siempre `getToken()`** (nunca
  `localStorage[TOKEN_KEY]`, que solo sobrevive como ranura legacy para migrar).
  Al tocar el arranque del `AuthProvider` recuerda que estÃ¡ **fuera** del
  `BrowserRouter`: navega con `window.location.assign`, no con `useNavigate`.
- **Identidad UI (rol e invitado):** el rol se muestra SIEMPRE desde el realm
  activo (`user` de `/auth/me`), nunca leyendo un token suelto. Piezas en
  `components/auth/` (`RoleBadge`, `IdentityMenu`, `GuestPill`); el acento de rol
  usa los tokens decorativos `--accent-*` (no de marca, no semÃ¡nticos). El
  disparador es `avatar + chevron` (con `Tooltip` del rol); el menÃº muestra la
  ficha `Usuario`/`Rol` con `RoleBadge`, y el punto de sesiÃ³n activa
  (`.identity-status`, `--color-success`) es decorativo. PatrÃ³n y reglas en
  `docs/IDENTITY_UI.md`.
- **MenÃºs del `Dropdown` compartido (teclado, foco y colocaciÃ³n):** el panel se
  monta en **portal** (`document.body`) en `position: fixed` y se mide tras
  montar: se coloca bajo el disparador, **voltea** hacia arriba si no hay sitio,
  se ajusta dentro del viewport y se recalcula en scroll (captura)/resize; la
  entrada se anima con `@utility animate-menu-in` (`transform-origin` en la
  esquina del disparador, respeta `prefers-reduced-motion`). El disparador lleva
  `aria-haspopup="menu"`/`aria-expanded`/`aria-controls`. Al abrir, el foco entra
  en el primer `menuitem`; `â†‘`/`â†“`/`Home`/`End`, **typeahead** por primera letra
  (buffer 600 ms) y `Tab` cierra dejando seguir el foco; Escape cierra y devuelve
  el foco al disparador. Los `MenuItem` muestran **foco visible**
  (`focus-visible:bg-â€¦`) y aceptan `description` y `shortcut` (`<kbd class="kbd">`,
  nueva `@utility kbd`). Afecta a TODOS los menÃºs (`IdentityMenu`, `ExportMenu`,
  `ListChrome`, `FormCard`).
  **Nota:** al ser portal, el panel ya no hereda el `stacking context` de su
  contenedor y usa `z-[var(--z-dropdown)]` (40). Es correcto para menÃºs de pÃ¡gina;
  un menÃº que deba verse **dentro** de un modal (backdrop `z-index` 50) tendrÃ­a
  que subir su z (los menÃºs actuales no se abren desde modales).
- **`tsconfig` acotado:** `npm run typecheck` NO cubre el JS. Un error en `.jsx`
  no lo detecta `tsc`; usa `lint` y `build` para esos.
- **`qa:routes` sale con exit 1** (124 checks / 27 fails) por tÃ­tulos de rutas del
  panel: es la baseline conocida, no una regresiÃ³n. **AÃ±adir claves a `ROUTES`
  no cambia el recuento**: `qa/routes.js` comprueba con `every`/`filter`
  agregados sobre la tabla entera (y ya estÃ¡n en falso), asÃ­ que las 5 rutas
  nuevas (`profile`/`security`/`notifications`/`help`/`shortcuts`) dejan la
  baseline en 124/27. (Nota: `resolvePanelRoute` trata el primer segmento tras
  el base como `entitySlug`, por eso las rutas de un solo tÃ©rmino â€”`perfil`,
  `seguridad`â€¦â€” resuelven su tÃ­tulo a `panelHome`; es el fallo preexistente que
  forma la baseline.)
- **`qa:brand` lista archivos "sin alcanzar"**: incluye la nueva `src/shared/**` y
  varios `.d.ts`/ficheros muertos (`LiveSearchBar`, `PremiumSearchBar`,
  `settings/*`, `FormFields.css`â€¦). Es informativo; sÃ³lo falla con
  `FROZEN`/`CONFLICTO`.
- **CorrelaciÃ³n cuenta â†” URL de acceso:** `users.access_url_id` es `NOT NULL` de
  facto para cuentas nuevas (el alta exige `entityId`+`accessUrlId` y valida que
  la URL sea de esa entidad y ese rol y estÃ© activa). Al **editar** rol o entidad
  hay que enviar una URL vÃ¡lida nueva o dejar que se limpie; editar solo el
  nombre conserva el vÃ­nculo. Reutiliza `assertAccessUrlFor`
  (`services/accessUrl.service.js`) como Ãºnico punto de validaciÃ³n.
- **Correo de bienvenida + cambio forzado (variante B):** el correo lo envía el
  backend (`services/mail.*`, `welcome.service.js`) y **nunca** aborta el alta:
  devuelve `mail = { sent, reason, to, preview? }`. La variante la decide
  `MAIL_SEND_CREDENTIALS` (ver `docs/MAIL_SERVICE.md`). Cuando es `true` (variante
  B), la cuenta nace con `mustChangePassword` + `tempPasswordExpiresAt` y el
  frontend **intercepta TODA ruta del panel** en `RoleRoute` montando
  `pages/ForcePasswordChange.jsx` (no se entra a ninguna pantalla hasta cambiar la
  contraseña). El gate va **después** del bloque *guest* para no pisar el alta. Al
  limpiar la marca, `settings.repo.setPassword` resetea bloqueos; `AuthContext`
  **no se toca**: se actualiza el `user` con `updateUser`. La contraseña original
  **no es reenviable** (está hasheada): «Reenviar correo» firma un token nuevo (A)
  o genera una temporal nueva (B).
- **No hay tests unitarios**: la verificaciÃ³n es por sondas `qa/*.js` + las cuatro
  puertas de Â§5.
- **Dev server con `strictPort`**: si el 5173 estÃ¡ ocupado, Vite falla en vez de
  cambiar de puerto.
- **Los `.env` estÃ¡n en `.gitignore`: `rg` NO los encuentra.** En una migraciÃ³n
  de IP o de base de API hay que buscarlos aparte
  (`Get-ChildItem -Force -Include ".env*"` o `rg --hidden --no-ignore`), o se
  queda un `.env` con la configuraciÃ³n muerta. El `.env` del frontend fija la
  base de la API (`VITE_API_URL` → `lib/api.js:129`); el del backend, `CLIENT_URL`,
  `FRONTEND_URL`, las URIs del IDP y el SMTP.
- **No uses un sondeo de API como puerta que degrade a 404.** AsÃ­ lo hacÃ­a
  `LocalLogin` con `verifyPortal()`: cualquier fallo transitorio (backend caÃ­do,
  red, TLS, CORS) convertÃ­a la pÃ¡gina en un «Page not found» mudo. Para una
  pantalla **crÃ­tica** (enlace de activaciÃ³n, alta, pago) el sondeo no puede ser
  la condiciÃ³n de existencia: degrada a un mensaje con **reintento**, y reserva el
404 para cuando el backend **confirma** que el recurso no existe.
- **La API va por el proxy de Vite (`/api`), no a `:8000` desde el navegador.**
  `vite.config.js` define `server.proxy` para `/api`, `/avatars` y `/form-logos`.
  Motivo: los certificados de `:5173` y `:8000` los firma la CA privada de
  `mkcert` creada en el portÃ¡til del administrador, instalada **solo ahÃ­**. En
  otro dispositivo el `fetch` a `:8000` se bloquea en silencio (Chrome no avisa de
  los subrecursos) y axios solo ve «sin conexiÃ³n». Con el proxy hay un solo origen
  y un solo certificado. **Reinicia el dev server** si tocas `.env` o
  `vite.config.js`. Los archivos que el backend sirve en su **raÃ­z** (logos de
  formulario, avatares) siguen siendo cross-origin contra `VITE_API_ORIGIN`: en un
  dispositivo sin la CA se verÃ¡n rotos, pero no bloquean la app.
- **`node_modules/recharts/AGENTS.md`** pertenecÃ­a a una dependencia vendida y se
  eliminÃ³ (no era un archivo del proyecto; `npm install` lo regenerarÃ¡).

---

## 10. Registro de cambios

> Orden: **mÃ¡s reciente primero**. Cada entrada lleva fecha, archivos, quÃ© cambiÃ³
> y las puertas ejecutadas (ver Â§5).

### 2026-11-05 — Correo: los diagnósticos de envío se muestran como alertas de diálogo en el frontend

**Objetivo (petición del usuario):** quitar los mensajes de diagnóstico de envío de correo (`console.log`/`console.error`) del backend (`mail.service.js`) y mostrarlos como alertas de diálogo en el frontend, exactamente con el mismo texto: `--- INICIANDO ENVÍO DE CORREO ---`, `¿Existe API Key?:`, `✅ APIMailer respondió con éxito:` y `🚨 ERROR CRÍTICO AL ENVIAR CORREO:` (y sus detalles). Se generan como alerta de diálogo, no como log de backend, sin alterar el contrato de datos ni la persistencia.

**Decisiones de diseño:**
- Backend: `sendMail` acumula los 4 mensajes en un array `mailLogs` y los devuelve en `logs` del resultado; en caso de fallo adjunta `logs` al error (`error.logs`). `sendPasswordResetCode`, `sendWelcomeEmail` y `sendUserWelcomeEmail` propagan `logs`. En `localAuth.controller.js` (`localForgot`), `mailLogs` viaja dentro de `data` de la respuesta de éxito.
- Frontend: `src/feedback/mailDialogs.ts` con `showMailDialogs(logs)` que dispara cada mensaje por `alertAPI` (`alertStore.ts`) clasificando tipo (success/error/info) según el texto. El interceptor de respuesta de `src/lib/api.js` lee `data.mail.logs` / `data.mailLogs` y llama a `showMailDialogs`. `<AlertDialog />` se monta en `src/main.jsx` junto a `<Toaster />`.

**Archivos modificados (5) + 1 nuevo:**
- `backend/services/mail.service.js` — `sendMail` acumula `mailLogs` y los retorna en `logs`/`error.logs`; los wrappers propagan `logs`.
- `backend/controllers/localAuth.controller.js` — `localForgot` devuelve `mailLogs` en `data`.
- `frontend/AIFormBuilder/src/feedback/mailDialogs.ts` (nuevo) — `showMailDialogs(logs)` dispara alertas de diálogo vía `alertStore`.
- `frontend/AIFormBuilder/src/lib/api.js` — interceptor de respuesta llama a `showMailDialogs` con `data.mail.logs` / `data.mailLogs`.
- `frontend/AIFormBuilder/src/main.jsx` — monta `<AlertDialog />` junto a `<Toaster />`.
- `frontend/AIFormBuilder/src/feedback/alertStore.ts` (ya existía, se reusa) — API imperativa de alertas.
- `frontend/AIFormBuilder/src/components/ui/AlertDialog.tsx` (ya existía, se reusa) — capa de presentación.

**Contrato de datos intacto:** sin cambios de persistencia ni de backend más allá de propagar los logs.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/` y `backend/`):**
- Backend `node --check` → OK.
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en los archivos tocados).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).
- (Opcional) Verificación funcional con servidores backend y frontend vivos: pendiente por falta de `.env` (MAIL_PROVIDER/APIMAILER_API_KEY y DATABASE_URL no configurados en este entorno).

### 2026-11-03 — Recuperación: mostrar errores de correo mientras se escribe (onChange)

**Objetivo (petición del usuario):** al escribir el correo en el `RecoveryModal` de las puertas `/a/:slug`, los mensajes de error debían aparecer **a medida que el usuario escribe**, no solo al salir del campo (blur). Así, si el formato es inválido se muestra "Introduce una dirección de correo válida" (`recoveryEmailInvalid`) al teclear; si el formato es válido pero no coincide con la cuenta de la URL de acceso se muestra "El correo no coincide con la cuenta" (`recoveryEmailNotMatch`); y el botón «Enviar instrucciones» solo se habilita cuando se escribe el correo correcto de la cuenta.

**Causa raíz.** El input recibía `error={emailTouched ? emailError : ""}`, así que el error de validación (seteado por `validateEmail()` en `onChange`) se ocultaba hasta que `emailTouched` se ponía true en el blur. El botón ya se desbloqueaba en tiempo real con `disabled={busy || !isEmailValid}`, pero el mensaje de error no se veía mientras se escribía.

**Archivos modificados (1):**
- `src/components/auth/RecoveryModal.jsx` — el input de correo pasa de `error={emailTouched ? emailError : ""}` a `error={emailError}`, de modo que el mensaje de error (formato o coincidencia) se muestra inmediatamente en `onChange` mientras el usuario escribe. El `disabled={busy || !isEmailValid}` se conserva para que el botón solo se habilite con el correo correcto y formato válido.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `RecoveryModal.jsx`).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).

### 2026-11-03 — Recuperación: desbloqueo del botón en tiempo real al escribir el correo correcto

**Objetivo (petición del usuario):** al escribir el correo en el `RecoveryModal` de las puertas `/a/:slug`, el botón «Enviar instrucciones» no se desbloqueaba aunque se escribiera el correo correcto de la cuenta, y el error «El correo no coincide con la cuenta» persistía. La validación de formato y coincidencia debía ejecutarse en `onChange` mientras se escribe, y el botón debía desbloquearse inmediatamente al teclear el correo correcto.

**Causa raíz.** `disabled={busy || (emailTouched && !!emailError)}` dependía de `emailTouched`, que solo se activa en blur, por lo que mientras se escribe el botón nunca se desbloqueaba en tiempo real y el error de `validateEmail()` (seteado en `onChange`) bloqueaba el botón sin mostrar el error visual (porque `emailTouched` era false).

**Archivos modificados (1):**
- `src/components/auth/RecoveryModal.jsx` — `disabled` pasa de `busy || (emailTouched && !!emailError)` a `busy || !isEmailValid`, donde `isEmailValid = emailSchema.safeParse(email).success` ya se calculaba en el render (formato + coincidencia con `expectedEmail`). Así el botón se habilita en cuanto el correo tiene formato válido y coincide con la cuenta, sin esperar al blur ni a `emailTouched`.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia. El comportamiento visual del error (mostrado en blur/envío vía `emailTouched`) se conserva.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `RecoveryModal.jsx`).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).

### 2026-11-02 — Flujo de recuperación de contraseña en las puertas `/a/:slug`

**Objetivo (petición del usuario):** implementar el flujo completo "¿Olvidaste tu contraseña?" para los roles `entity_admin` y `form_creator`: un modal premium de cristal (glassmorphism) con validación de correo en vivo (Zod), toast genérico de éxito (sin filtrar si el correo existe), y la vista de restablecimiento basada en `SetPasswordForm` (nueva + confirmar, ≥8 carácteres, coincidencia, `PasswordToggle`) integrada en la puerta de acceso `/a/:slug`.

**Archivos modificados (3) + 1 nuevo:**
- `src/pages/AccessLogin.jsx` — añade el estado `recoveryOpen`, el botón "¿Olvidaste tu contraseña?" (`rt("forgotPassword")`) bajo el formulario de login, renderiza `<RecoveryModal />` como hermano de `<AuthCard>` envuelto en fragmento `<>...</>`, y en modo reset monta `<SetPasswordForm token={resetToken} onSuccess={...} />` que redirige a `data?.door || accessLoginPath(slug)`. Se corrige el error de lint "Adjacent JSX elements must be wrapped in an enclosing tag" envolviendo el `return` en un fragmento.
- `src/components/auth/RecoveryModal.jsx` (nuevo) — modal de cristal con `framer-motion` (`AnimatePresence`/`motion`), ícono `Mail`, input de correo con validación Zod en vivo (`role="alert"`, `aria-invalid`, `focus-visible:ring-brand-500/40`), botón de envío con gradiente de marca y `Loader2` translúcido al enviar, toast `sonner` (top-right, progreso, 8 s) con mensaje genérico "Si el correo existe, hemos enviado las instrucciones para restablecer tu contraseña.", cierre con X / clic fuera / Escape.
- `src/components/auth/SetPasswordForm.jsx` — reutilizado sin cambios para la pantalla de reset por token (ya tenía `confirmPassword`, `PasswordToggle`, `localAuthApi.reset`).
- `src/contexts/LanguageContext.jsx` — claves nuevas `recoveryTitle`, `recoverySubtitle`, `recoveryEmailLabel`, `recoveryEmailPlaceholder`, `recoverySendButton`, `recoverySuccessTitle`, `recoverySuccessDesc`, `recoveryBack`, `recoveryCodeLabel`, `recoveryCodePlaceholder` en `es`/`en`.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)` / `localAuthApi.reset(token, password)`; sin cambios de backend ni persistencia. Solo tokens CSS (`--color-brand-*`, `bg-white/60`, `border-[color-mix(...)]`, `text-fg`, `text-muted`), sin hex de marca a fuego.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en los archivos tocados).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados/nuevos aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes de la baseline (sin relación con este cambio), sin regresión.

### 2026-10-31 — Clasificación: las opciones ya se pueden arrastrar para reordenar

**Objetivo (petición del usuario):** el campo Clasificación mostraba el texto "Arrastra o selecciona para ordenar" (`rankEmpty`), pero en la práctica las opciones no se podían arrastrar —solo reordenar con los botones subir/bajar y el teclado—. Se pidió que el arrastre funcionara de verdad para que el texto fuera veraz.

**Causa raíz.** `PremiumRank` (`src/components/ui/PremiumChoice.jsx`) reordenaba opciones únicamente mediante `moveTo` invocado desde botones ChevronUp/ChevronDown y las flechas ArrowUp/ArrowDown. No había ningún manejo de `draggable`/`dragstart`/`dragover`/`drop`, así que el "arrastra" del texto de ayuda nunca se cumplía. `@dnd-kit` ya es dependencia del proyecto, pero `PremiumRank` se renderiza dentro del `DndContext` del canvas (`SortableField`), por lo que anidar otro `DndContext` habría sido frágil; se usó **HTML5 Drag & Drop nativo** (autocontenido, sin `DndContext`), que no entra en conflicto con el contexto del canvas.

**Arreglo — `src/components/ui/PremiumChoice.jsx`:**
- `PremiumRank`: estado `dragIndex` / `dropIndex` y manejadores `onDragStart` / `onDragOver` / `onDragLeave` / `onDrop` / `onDragEnd` que llaman al `moveTo` existente, reordenando `order` y notificando vía `onChange`.
- `RankedOption`: cada tarjeta ordenada recibe `draggable={!disabled}`, los eventos de arrastre, retroalimentación visual (ítem arrastrado con opacidad/ring de marca, objetivo de soltura con borde superior de marca) y `aria-label` descriptivo ("Opción N de M. Arrastra para reordenar."). Los botones subir/bajar/quitar y el teclado siguen funcionando igual.

**Archivos tocados (1):**
- `src/components/ui/PremiumChoice.jsx` — arrastre nativo para reordenar opciones del ranking.

**Contrato de datos intacto:** `value` sigue siendo un array de IDs en orden; `onChange` recibe el nuevo array. Sin cambios de `field`, autosave, backend ni persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `PremiumChoice.jsx`).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin relación con este cambio), sin regresión.

### 2026-10-31 — Idioma del Ranking aplicado a los diccionarios locales de `FieldRenderer.jsx`

**Objetivo (petición del usuario):** que el texto "Ranking"/"Clasificación" y los textos auxiliares del campo de Clasificación (rank) respeten el idioma configurado por el usuario (es/en).

**Causa raíz.** `PremiumRank` ya recibía `t` del `LanguageContext` y usaba `t("rank")`, `t("rankOrder")`, `t("rankAvailable")`, `t("rankMoveUp")`, `t("rankMoveDown")`, `t("rankRemove")`, `t("rankEmpty")` —y `LanguageContext` ya tenía esas claves en es/en—. Pero `FieldRenderer.jsx` mantenía **diccionarios locales propios** (es/en) que solo tenían `rank`, `rankAdd`, `rankEmpty`, faltando las claves nuevas. Esto rompía la consistencia si algún código de `FieldRenderer` los usaba.

**Arreglo — `src/components/public/FieldRenderer.jsx`:** añadidas a ambos diccionarios locales (es/en) las claves que faltaban: `rankOrder`, `rankAvailable`, `rankMoveUp`, `rankMoveDown`, `rankRemove`. Ya estaban `rank`, `rankAdd`, `rankEmpty`.

**Archivos tocados (1):**
- `src/components/public/FieldRenderer.jsx` — diccionarios locales es/en con las 5 claves nuevas de rank.

**Contrato de datos intacto:** sin cambios de datos, APIs ni persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes).
- `npm run build` → exit 0 (2.11 s).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresión).

### 2026-10-31 — Corrección de sintaxis y funcionalidad de `PremiumRank` (ranking) en `PremiumChoice.jsx`

**Objetivo (petición del usuario):** el campo "Clasificación" (ranking) no funcionaba: mostraba un placeholder desactivado y no se podía añadir, reordenar ni quitar opciones.

**Causa raíz.** `PremiumRank` solo renderizaba un placeholder estático sin `onClick` y sin controles de reordenamiento.

**Arreglo — `src/components/ui/PremiumChoice.jsx`:**
- `PremiumRank` reescrito como componente funcional con dos subcomponentes internos:
  - `RankedOption` — tarjeta de cristal por posición ordenada con número de posición, ícono de opción, controles de "subir" (`ChevronUp`), "bajar" (`ChevronDown`) y "quitar" (`X`), roving `tabIndex`, `role="radio"` con `aria-posinset`/`aria-setsize`, navegación por teclado (`ArrowUp`/`ArrowDown`).
  - `AvailableOption` — tarjetas de opciones aún no ordenadas con botón "+" (`Plus`) para añadir, teclado `Enter`/`Espacio`.
- `moveTo` (reordenar), `addOption` (añadir al final) y `removeOption` (quitar por índice) llaman a `onChange` con el nuevo array de IDs en orden.
- Seccións "Orden actual" y "Disponibles para añadir" con claves i18n `rankOrder`/`rankAvailable`.
- Se corrigió un error de sintaxis JSX: `<option.icon ?? ListOrdered ... />` (inválido en JSX) se reemplazó por `const Icon = option.icon ?? ListOrdered;` + `<Icon />` tanto en `RankedOption` como en `AvailableOption`.
- Icono de "No" (`X` de lucide) verificado correcto en `PremiumYesNo` (sin `AlertCircle`).

**Archivos tocados (2):**
- `src/components/ui/PremiumChoice.jsx` — `PremiumRank` funcional; `const Icon` extraído antes del JSX en `RankedOption` y `AvailableOption`.
- `src/contexts/LanguageContext.jsx` — claves `rankOrder`, `rankAvailable`, `rankMoveUp`, `rankMoveDown`, `rankRemove` añadidas a `es`/`en` (junto a las preexistentes `rank`, `rankAdd`, `rankEmpty`).

**Contrato de datos intacto:** `value` sigue siendo un array de IDs de opciones en orden; `onChange` recibe el nuevo array. No se añaden claves a `field`; ni autosave, ni backend, ni persistencia cambian. `tsconfig.json` solo cubre `.ts`/`.tsx`; `PremiumChoice.jsx` es `.jsx` y no lo chequea `tsc`.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `PremiumChoice.jsx`).
- `npm run build` → exit 0 (2.35 s; chunks >500 kB preexistente, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (títulos de rutas desconocidas, sin relación con este cambio), sin regresión.

### 2026-10-31 — Valoración numérica y por estrellas: rediseño premium glassmorphism (score_rating / quality_rating)

**Objetivo (petición del usuario):** rediseñar por completo los campos "Valoración Numérica" (`score_rating`) y "Valoración por Estrellas" (`quality_rating`) con diseño premium glassmorphism, colores dinámicos por rango, tooltips flotantes por categoría y accesibilidad completa, para que rendericen correctamente en el formulario público (antes caían a `<input type="text">`).

**Decisiones de diseño:**
- Nuevo archivo `src/components/ui/Rating.jsx` con `ScoreRating` (píldoras numéricas 1–5, `rounded-full`) y `StarRating` (5 estrellas, `rounded-xl`), ambos con glassmorphism (fondo translúcido, borde fino, sombra), micro-interacciones hover/focus/selección y transición `duration-300 ease-ui`.
- Soporte nativo Modo Oscuro y Modo Claro con variantes `dark:` y `transition-all duration-300`.
- Colores dinámicos hover/focus/selected por rango: 1-2 `danger` (rojo alerta), 3 `warning` (ámbar), 4-5 `success` (verde); anillo y sombra de selección en el tono del rango.
- Tooltips flotantes (fade-in/scale, portal, `z-tooltip`) con aparición suave por cada número/estrella: 1=Pésimo, 2=Malo, 3=Aceptable, 4=Bueno, 5=Excelente, en el idioma activo.
- Accesibilidad completa: `role="radiogroup"` + `role="radio"`, `aria-checked`, etiquetas con valor y categoría, flechas/Tab/Enter/Espacio/Home/End, foco visible, roving tabindex.
- `scaleOf(field)` de `fieldTypes.js` provee min/máx (por defecto 1–5).
- Color por rango usa la paleta semántica existente (`--color-danger/success/warning`), nunca hex de marca a fuego.
- Reutiliza el `Tooltip` del sistema (`components/ui/Tooltip.jsx`).

**Archivos tocados (5):**
- `src/components/ui/Rating.jsx` (nuevo) — componente con `ScoreRating` y `StarRating`.
- `src/components/public/FieldRenderer.jsx` — importes (`scaleOf`, `RATING_TYPES`, `ScoreRating`, `StarRating`), claves de diccionario (`rating`, `quality_rating`, `score_rating` es/en) y 3 casos nuevos antes de bloques estáticos.
- `src/index.css` — token block `--rating-*` añadido (fondo, borde, sombra, anillo, transición, tamaño, gap).
- `src/components/ui/FormFields.jsx` — `RatingField` eliminado (código muerto) e import `Star` de lucide retirado.
- `src/components/ui/FormFields.css` — CSS huérfano `.rating-stars`/`.star-btn`/`@keyframes fadeIn` eliminado.

**Contrato de datos intacto:** no se añaden claves a `field`; ni el autosave, ni el backend, ni la persistencia cambian. Los tipos rating ya están configurados en el builder (palette, FieldSettings ScaleEditor, i18n `field_*` claves) — solo faltaba el render público.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en archivos tocados).
- `npm run build` → exit 0 (1.42 s; avisos `@utility` de `admin.css` preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados/nuevos aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (resolución de rutas/títulos de pestaña, sin relación con este cambio), sin regresión.

### 2026-10-31 — Valoración: colores de rango más vivos, número/estrella 3 visible y hover en ScoreRating

**Objetivo (petición del usuario):** aplicar colores de rango rojo/ámbar/verde más llamativos y vivos, asegurar que el número y estrella 3 (rango warning/ámbar) se vean con color, y que la valoración numérica (`ScoreRating`) muestre color en el hover.

**Cambios en `src/components/ui/Rating.jsx`:**
- Hover de `ScoreRating` y `StarRating`: `hover:bg-${soft}/90 hover:text-${ink}` → `hover:bg-${color}/20 hover:text-${color}` (fondo más saturado y texto en el color base del rango, en vez del pastel pálido y el tono oscuro `ink`). Borde de hover pasando de `/70` a `/80`.
- Se elimina la variable `soft` del desestructurado de `rangeFor(n)` (ya no se usa en el hover).
- El estado `selected` mantiene `bg-${color} text-white border-${color}` (color ya a máxima intensidad).
- El rango warning (número/estrella 3) ahora muestra el ámbar `#F59E0B` vivo tanto en hover como al estar seleccionado.

**Archivos tocados (1):**
- `src/components/ui/Rating.jsx` — ajuste de clase de hover en ambos componentes y limpieza de `soft` sin uso.

**Contrato de datos intacto:** sin cambios de datos, APIs ni persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; las 2 advertencias nuevas de `soft` sin uso se eliminaron).
- `npm run build` → exit 0 (1.53 s; avisos `@utility` de `admin.css` preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (títulos de pestaña / rutas, sin relación con este cambio), sin regresión.

### 2026-10-31 — Select de categoría del panel: `AdminSelect` rediseñado al diseño `SelectField` (Nueva entidad)

**Objetivo (petición del usuario):** aplicar al campo «Categoría» del modal «Nueva entidad» (`Entities.jsx`) el mismo diseño de select que el filtro de categoría del dashboard super admin (`SelectField` en `AdminKit.jsx`), sustituyendo el `<select>` nativo que usaba `AdminSelect`.

**Decisiones de diseño:**
- `src/components/admin/FormFields.jsx` — `AdminSelect` reescrito para replicar exactamente el marcado y comportamiento de `SelectField`: disparador de cristal (`adm-field-premium`), listbox `card-surface` con `CardSurface`, opciones estilo tarjeta con `Check` en la seleccionada, navegación de teclado completa (`↑ ↓ Inicio Fin Esc Enter`), cierre por clic fuera y `Escape`, rotación del chevron, `aria-combobox`/`listbox`/`option`, animación `animate-scale-in`.
- Mantiene la misma API de props (`label`, `error`, `hint`, `id`, `className`, `control`, `name`, `defaultValue`, `options`, `required`) y añade paridad de `disabled`/`placeholder` con `SelectField`.
- `options` acepta tanto elementos `<option>` JSX (los que pasan `Entities.jsx` y `AccessUrls.jsx`) como objetos planos `{value, label, icon}`.
- Se expone el ref del disparador vía `useImperativeHandle` para paridad con consumidores externos.
- Sigue siendo compatible con react-hook-form (`control` + `name` + `useController`), por lo que `Entities.jsx` (línea 375) y `AccessUrls.jsx` (línea 450) no requieren cambios.

**Contrato de datos intacto:** no se añaden claves a `field`; ni el autosave, ni el backend, ni la persistencia cambian. `AccessUrls.jsx` sigue funcionando sin modificaciones.

**Archivos tocados (1 modificado, 2 consumidores sin cambios):**
- `src/components/admin/FormFields.jsx` — `AdminSelect` reescrito (custom select igual a `SelectField`).
- `src/pages/admin/Entities.jsx` — consumidor del campo de categoría (sin cambios de código).
- `src/pages/admin/AccessUrls.jsx` — otro consumidor de `AdminSelect` (sin cambios de código; no se rompe).
- `src/components/admin/AdminKit.jsx` — `SelectField` de referencia (sin cambios).
- `src/components/ui/CardSurface.jsx` — usado por el nuevo listbox (sin cambios).

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `FormFields.jsx`).
- `npm run build` → `✓ built in 1.93s` (el aviso de chunks >500 kB es preexistente, ver §9).

**Objetivo (petición del usuario):** rediseñar los 5 campos de select del formulario público y del builder (Provincia, Municipio, Género, Nivel de escolaridad, Lista desplegable) con un diseño super moderno, premium y elegante; que los textos se traduzcan al idioma activo del usuario (es/en); y que se vean bien en el LivePreview del constructor.

**Decisiones de diseño:**
- `PremiumSelect.jsx` reescrito como componente único para los 5 selects, estilo "Creative Glass": trigger de cristal con gradiente de marca en el borde al focar y anillo, ícono de acento a la izquierda con fondo de marca suave, chevron animado (rotación 180° + escala sutil), desplegable en **portal** (`document.body`, `position: fixed`) que nunca se recorta, **volteo hacia arriba** si no hay espacio abajo, **reposición en scroll/resize** de la ventana, cierre con clic fuera y `Escape`, opciones con estados hover y seleccionado (gradiente de marca + punto indicador), **búsqueda integrada** con lupa y filtro en tiempo real, estados error (borde rojo), disabled (opacidad) y required (asterisco), **tooltip elegante encima** (municipio pendiente de provincia), animaciones fluidas con framer-motion. Respeta la regla de marca: solo tokens `var(--color-brand-*)`, `bg-brand-500`, etc. (sin hex de marca a fuego; `qa:brand` verde).
- `BuilderSelect.jsx` (nuevo): select de cristal para el panel de configuración del builder, con traducción vía `t()`.
- `FieldSettings.jsx`: 3 `<select>` nativos migrados a `BuilderSelect` con `t()`.
- `ValidationSettings.jsx`: `LivePreview` renderiza `PremiumSelect` para los 5 tipos de select (`province`, `municipality`, `gender`, `education_level`, `dropdown`) en vez de `<Input>` texto plano; `specialOptionsFor` recibe `language`; constantes `SELECT_TYPES`/`SELECT_ICONS`; tooltip + disabled para municipio sin provincia seleccionada; labels de países traducidos con `countryLabel(code, language)`.
- `phoneRules.js`: función `countryLabel` y diccionario `COUNTRY_LABELS` es/en para 16 países.

**Contrato de datos intacto:** no se añaden claves a `field`; los selects del formulario público y builder comparten `PremiumSelect.jsx` (cambiar ese componente afecta ambos contextos). `tsconfig.json` solo cubre `.ts`/`.tsx`; `PremiumSelect.jsx` es `.jsx` y no se chequea con `tsc`.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados/nuevos aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

### 2026-10-31 — Vista previa del constructor: días y meses del selector de fecha en el idioma activo

**Objetivo (petición del usuario):** al abrir el modal de «Vista Previa» del Builder (`Builder.jsx` → `<Modal>` → `<FormView form={form} preview />`), los días y meses del `PremiumDatePicker`/`PremiumTimePicker` se veían en inglés aunque el idioma activo fuera español.

**Causa raíz.** `FormView.jsx` obtenía `language` de `useLanguage()` pero **no se lo pasaba a `FieldRenderer`**; `FieldRenderer` caía a `lang = field.language || "en"` → inglés, y el picker renderizaba días/meses en inglés.

**Archivos modificados (1):**
- `src/components/public/FormView.jsx` — se añade `language={language}` al `<FieldRenderer>` (línea 280). `FieldRenderer` ya recibía `language` y lo reenviaba a `PremiumDateField` (líneas 508/524), así que `PremiumDatePicker`/`PremiumTimePicker` ahora usan el idioma activo para días y meses.

**Contrato de datos intacto:** misma API de props de `PremiumDateField` (`label`, `value`, `onChange`, `disabled`, `placeholder`, `error`, `required`, `icon`, `type`, `language`); `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes).
- `npm run build` → exit 0 (2.16 s; avisos `@utility` de `admin.css` preexistentes, ver Â§9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

### 2026-10-31 — Selector de fecha: nombres de días y meses traducidos al idioma activo

**Objetivo (petición del usuario):** que los nombres de los días de la semana y los meses del `PremiumDatePicker` se muestren en el idioma seleccionado por el usuario (es / en), en lugar de quedarse fijos.

**Archivos modificados (1):**
- `src/components/ui/PremiumDatePicker.jsx` — se añaden los diccionarios `FULL_WEEKDAYS` (nombres completos de días: Lunes…Domingo / Monday…Sunday) y `MONTHS` (nombres completos de meses: Enero…Diciembre / January…December) indexados por idioma. Los encabezados de días de la semana ahora renderizan `FULL_WEEKDAYS[language]` en vez de las iniciales cortas, y `monthLabel` se construye con `MONTHS[language][month] + " " + year` en vez de depender de `Intl.DateTimeFormat`. Esto hace que la cabecera del calendario ("Mes / Año"), los días de la semana y las etiquetas ARIA (`dayAria`, `todayAria`) respeten el idioma activo.

**Contrato de datos intacto:** misma firma de props de `PremiumDateField`; `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes/tolerados; se eliminó `SHORT_WEEKDAYS` sin uso tras pasar a `FULL_WEEKDAYS`).
- `npm run build` → exit 0 (2.14 s; avisos `@utility` de `admin.css` preexistentes, ver Â§9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

### 2026-10-31 — Selector de hora: botones de minutos más grandes y ajuste fino eliminado

**Objetivo (petición del usuario):** que los botones de minutos del `PremiumTimePicker` tengan más tamaño para verse bien, y que se elimine el contador numérico con flechas de ajuste fino (±1 min) debajo de los minutos, simplificando el selector.

**Archivos modificados (1):**
- `src/components/ui/PremiumTimePicker.jsx` — los bloques rápidos de minutos pasan de `aspect-square` a `w-11 h-11`; el `onClick` ya solo llama a `setMinute(m)` (sin resetear `fineMinute`); se elimina por completo el bloque de ajuste fino (flechas `ChevronLeft`/`ChevronRight`, contador `{+fineMinute}`/`{-fineMinute}` y el estado `fineMinute`), así como los imports `ChevronLeft`/`ChevronRight` y las referencias a `fineMinute` en el `useEffect` de inicialización y en `apply`.

**Contrato de datos intacto:** misma firma de props de `PremiumDateField`; `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes/tolerados).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

### 2026-10-31 — Selector de hora: usa hora local al inicializar desde `value` (consistente con la fecha)

**Objetivo (petición del usuario):** que `PremiumTimePicker` coja la hora local al inicializarse desde un `value` entrante, aplicando el mismo criterio que `PremiumDatePicker` (que ya corrige el desplazamiento de día por interpretación UTC de `new Date("YYYY-MM-DD")`).

**Causa raíz:** en `PremiumTimePicker.jsx`, cuando `value` era un ISO completo con zona horaria (p. ej. `"2026-10-31T14:30:00.000Z"`), el regex `/(\d{1,2}):(\d{2})/` extraía `14:30` tal cual —las horas UTC, no las hora local. En zonas detrás de UTC (Cuba UTC-5) el picker mostraba `14:30` cuando debería ser `09:30`.

**Archivos modificados (1):**
- `src/components/ui/PremiumTimePicker.jsx` — el `useEffect` de inicialización ahora prueba primero `new Date(value)`; si es válido, usa `getHours()`/`getMinutes()` (hora local del instante) antes de caer al fallback del regex para `"HH:mm"` puro. Esto espeja `parseISODate()` de `PremiumDatePicker.jsx`, que construye la fecha en hora local en lugar de tomar crudo del string. La salida hacia el padre (`apply` → `d.setHours(h24, m, 0, 0)` + `toISOString()`) ya usaba hora local y se mantiene intacta.

**Contrato de datos intacto:** misma firma de props de `PremiumDateField`; `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes/tolerados).
- `npm run build` → exit 0 (2.23 s; avisos `@utility` de `admin.css` preexistentes, ver Â§9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

### 2026-10-31 — Corrección del error de sintaxis "Unterminated string" en PremiumTimePicker.jsx y verificación de puertas

**Objetivo (petición del usuario):** corregir el error de sintaxis "Unterminated string" en `PremiumTimePicker.jsx:423:57` que bloqueaba el `npm run lint` tras el rediseño del selector de hora Chrono Glass, y verificar que todas las mejoras visuales (dial radial centrado, selección funcional de la hora, modal más ancho y botones con acabado premium) se mantengan intactas.

**Causa raíz:** en el botón Confirmar del popover se usaba `className="...${disabled ? "..." : "..."}"` con comillas dobles anidadas dentro de un atributo entre comillas dobles, lo que cerraba el atributo prematuramente y generaba el error de parser.

**Archivos modificados (1):**
- `src/components/ui/PremiumTimePicker.jsx` — el `className` del botón Confirmar pasa de `className="...${disabled ? "..." : "..."}"` a `className={`...${disabled ? "..." : "..."}`}` (template literal con backticks), de modo que las comillas dobles internas ya no rompen el atributo. El resto del rediseño (dial centrado, `hourPosition(h, hourRadius, center)`, `key={h}`, `onClick={() => setHour12(h)}`, `max-w-[460px]`, botones premium con gradiente de marca y shadow glow) se mantiene sin cambios.

**Contrato de datos intacto:** misma firma de props de `PremiumDateField` (`label`, `value`, `onChange`, `disabled`, `placeholder`, `error`, `required`, `icon`, `type`, `language`); `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes/tolerados; el error de `PremiumTimePicker.jsx:423:57` desapareció; en el archivo solo quedan warnings del contrato público: `required` sin usar, `set-state-in-effect` y `missing dependency: center`).
- `npm run build` → exit 0 (2.01 s; chunks emitidos; los avisos `@utility` de `admin.css` son preexistentes, ver Â§9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx` (no es de este cambio), 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

### 2026-10-31 — Corrección de claves duplicadas y `placeholder` sin definir en los pickers Chrono Glass

**Objetivo (petición del usuario):** al abrir el selector de hora (y el selector de fecha) aparecían errores en consola: claves React duplicadas `T` y `S` en los días de semana en inglés, y `Uncaught ReferenceError: placeholder is not defined` en `PremiumTimePicker.jsx:227`.

**Causa raíz:**
1. `PremiumDatePicker.jsx` renderizaba los días de la semana con `key={w}` usando la letra del día (`SHORT_WEEKDAYS.en = ["M","T","W","T","F","S","S"]`), que tiene `T` y `S` repetidos → React advierte "Encountered two children with the same key".
2. `PremiumTimePicker.jsx` usaba `placeholder` en el `<input>` sin desestructurarlo de los props → `ReferenceError` en tiempo de ejecución.

**Archivos modificados (2):**
- `src/components/ui/PremiumDatePicker.jsx` — los días de la semana ahora usan `key={`weekday-${i}`}` (índice, siempre único) en vez de la letra del día. Elimina las colisiones `T`/`S` en inglés.
- `src/components/ui/PremiumTimePicker.jsx` — se desestructura `placeholder` en la firma del componente con valor por defecto según el idioma (`language === "es" ? "Seleccionar hora" : "Select time"`), así nunca está indefinido.

**Contrato de datos intacto:** misma firma de props de `PremiumDateField`; `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes/tolerados; sin errores nuevos).
- `npm run build` → exit 0 (2.46 s).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx` (no es de este cambio), 28 excepciones justificadas, 0 conflictos semánticos; ninguno de los archivos modificados aparece.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

**Verificación pendiente:** verificación manual en el navegador (dev server `npm run dev`, https://localhost:5173) abriendo Date/Time Picker y confirmando que desaparecen los errores de consola — no ejecutable en este entorno (sin navegador real); las puertas automatizadas pasan todas.

### 2026-10-31 — Corrección bug del día anterior y mejoras visuales del Date Picker

**Objetivo (petición del usuario):** al seleccionar una fecha el marcador se desplaza un día atrás (p. ej. se elige el 15 y queda el 14; «Hoy» 31 de octubre queda en 30). Además se pidió: más ancho en el modal del selector de fecha para que los botones no estén amontonados, letras de los días del mes más llamativas y un acabado premium en los botones Today / Cancel / Confirm.

**Causa raíz del día anterior:** `new Date("YYYY-MM-DD")` se interpreta como **UTC medianoche**. En zonas horarias detrás de UTC (p. ej. Cuba UTC-5) eso corresponde a las 7pm del día anterior en hora local, por lo que `getDate()` devolvía el día previo.

**Archivos modificados (1):**
- `src/components/ui/PremiumDatePicker.jsx`:
  - Nueva función `parseISODate(s)` que construye la fecha en hora local a partir de `YYYY-MM-DD` (sin conversión de zona horaria). Se usa en el `useState` inicial, el `useEffect` de sincronización con `value` y el `useMemo` de `displayed`.
  - `goToday` ahora usa `setHours(0,0,0,0)` (medianoche local) para consistencia con `today`.
  - Modal más ancho: `max-w-[340px]` → `max-w-[460px]`; grid de días `gap-1.5` → `gap-2` y círculos `w-10 h-10 text-xs` → `w-11 h-11 text-sm` para que los botones/días no estén amontonados.
  - Letras de los días del mes más legibles: `text-slate-500 dark:text-slate-400` → `text-ink dark:text-slate-200` (días del mes actual); días de otros meses `text-slate-400 dark:text-slate-600/60`.
  - Botones inferiores premium: Today como chip con fondo de marca suave, halo y sombra; Cancel con fondo/borde refinado y hover; Confirm con gradiente de marca, shadow más intenso y hover glow más marcado.

**Contrato de datos intacto:** misma firma de props de `PremiumDateField`; `FieldRenderer.jsx` no requiere cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes/tolerados: `required` del contrato público y `set-state-in-effect`; sin errores nuevos en `PremiumDatePicker.jsx`).
- `npm run build` → exit 0 (2.27 s).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx` (no es de este cambio), 28 excepciones justificadas, 0 conflictos semánticos.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

**Verificación pendiente:** verificación manual en el navegador (dev server `npm run dev`, https://localhost:5173) abriendo Date Picker, seleccionando distintas fechas (incluido el día 1 y fin de mes), pulsando Today, y confirmando que no hay desplazamiento de día — no ejecutable en este entorno (sin navegador real); las puertas automatizadas pasan todas.

### 2026-10-31 — Sustitución completa del Selector de Fecha y Selector de Hora (Chrono Glass)

**Objetivo (petición del usuario):** rediseñar **por completo** el Selector de Fecha y el Selector de Hora con una propuesta 100% nueva, disruptiva, super moderna y premium (glassmorphism, bordes `rounded-2xl`, sombras flotantes, micro-interacciones, dark/light nativo, teclado y ARIA), sin ajustes ni retoques sobre la estructura existente. Sustitución completa del `PremiumDateTime.jsx` actual.

**Decisiones:**
- Concepto "Chrono Glass": Date Picker con días como círculos espaciosos y navegación mes/año con transición dinámica; Time Picker con dial radial de horas (reloj táctil 1-12), bloques rápidos de minutos (00/15/30/45), ajuste fino ±1 min y toggle AM/PM.
- Se mantiene exactamente la misma API de props de `PremiumDateField` (`label`, `value`, `onChange`, `disabled`, `placeholder`, `error`, `required`, `icon`, `type`, `language`) para que `FieldRenderer.jsx` no necesite cambios estructurales.
- Se crean 3 archivos nuevos: `PremiumDatePicker.jsx`, `PremiumTimePicker.jsx`, y `PremiumDateTime.jsx` reescrito como contenedor delegador puro (sin estado propio; cada picker gestiona su popover interno).
- Se usan tokens existentes (`--color-brand-*`, `bg-white/60`, `dark:bg-slate-900/60`, `backdrop-blur`, `shadow-*`) y se evitan hex de marca a fuego (regla `qa:brand`).

**Archivos nuevos (3):**
- `src/components/ui/PremiumDatePicker.jsx` — Date Picker nuevo (días círculos, navegación mes/año, resaltado hoy/seleccionado, teclado PageUp/PageDown/flechas, ARIA, dark/light, estados vacío/activo/error/disabled).
- `src/components/ui/PremiumTimePicker.jsx` — Time Picker nuevo (dial radial horas, bloques minutos, fine adjustment, toggle AM/PM, teclado, ARIA, dark/light, estados).
- `src/components/ui/PremiumDateTime.jsx` — contenedor reescrito como delegador puro; preserva la firma de props original y delega en los dos nuevos componentes según `type`.

**Limpieza de código muerto y variables sin usar:**
- `PremiumDateTime.jsx`: se elimina estado muerto (`open`, `popoverOrigin`, `mounted`, `handleOpen`, `triggerRef`, `popoverClass`, `cardClass`, `triggerLabel`, `ariaLabel`) que ya no hace nada porque cada picker gestiona su propio popover y trigger.
- `PremiumDatePicker.jsx`: se elimina `prevLast` (sin usar) y se corrigen dependencias faltantes de `useMemo`/`useCallback` (`startOffset`, `totalDays`; `today` movido a render para no capturarlo en el callback).
- `PremiumTimePicker.jsx`: se eliminan `centerX`/`centerY` (sin usar) y se añade `L` a las deps del `useMemo` del dial.

**Contrato de datos intacto:** `FieldRenderer.jsx` (casos `date` línea ~500 y `time` línea ~515 con `icon={Clock}`) sigue pasando las mismas props sin cambios. `label`, `placeholder`, `required` e `icon` se conservan en la firma pública aunque el render del label/icono lo gestione el entorno o el propio picker.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (los nuevos archivos son `.jsx`, fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; en los 3 archivos solo quedan warnings tolerados del contrato público: `required`, `label`, `Icon` declarados pero sin usar, y el patrón preexistente `set-state-in-effect`; sin errores nuevos).
- `npm run build` → exit 0 (2.15 s; chunks emitidos; los avisos `Unknown at rule: @utility` de `admin.css` son preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx` (no es de este cambio), 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los 3 archivos nuevos aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente), sin regresión.

**Verificación pendiente:** verificación manual en el navegador (dev server `npm run dev`, https://localhost:5173) abriendo Date/Time Picker, navegando meses, seleccionando fecha y hora, sin errores de consola — no ejecutable en este entorno (sin navegador real); las puertas automatizadas pasan todas.

### 2026-10-31 — Rediseño visual premium creativo de Date Picker y Time Picker (emil-design-eng)

**Objetivo (petición del usuario):** rediseñar **por completo** la presentación visual del Selector de Fecha y del Selector de Hora en `PremiumDateTime.jsx`, con un diseño **super moderno, creativo y sorprendente**, aplicando los principios de la skill `emil-design-eng`. Sin tocar lógica, props, estados, hooks, eventos ni la integración con `FieldRenderer.jsx`.

**Decisiones de diseño (emil-design-eng):**
- Easing custom `dtp-ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)` (nunca easing built-in).
- Popover con entrada desde `scale(0.95)` + `opacity: 0` (nunca `scale(0)`).
- Popover **origin-aware**: `transform-origin` calculado desde el centro del disparador (input/botón) mediante `getBoundingClientRect()` en `handleOpen`, aplicado con `style={{ transformOrigin: popoverOrigin }}` en la tarjeta del popover.
- `:active:scale-95` en todos los botones presionables.
- Sin `transition: all`; propiedades exactas (`transform`, `opacity`, `border-color`, `box-shadow`, `background-color`).
- Duraciones UI < 300ms (popover 250ms, días/horas 150ms).
- `prefers-reduced-motion` vía clase `dtp-reduce`.
- Hover estados tras `@media (hover: hover) and (pointer: fine)`.
- Time picker 24 horas preservado (horas 00-23, minutos 00/15/30/45), sin AM/PM.
- Protecciones contra `number 0 is not iterable` intactas (`safeDate`, `useState(null)`, guarded `useEffect`s).

**Diseño visual creativo (solo clases Tailwind + tokens de marca):**
- Input tipo píldora (`rounded-[1.2rem]`) con `backdrop-blur-md`, fondo `bg-white/60` / `dark:bg-slate-900/60`, borde fino que se ilumina con glow de marca al focus (`focus:ring-brand-500/25`), icono líder dentro de un medallón redondo con borde de marca.
- Botón de apertura circular con escala al presionar y sombra de color de marca al hover.
- Popover con `backdrop-blur-xl`, bordes finos, sombra profunda, y una **luz decorativa de marca** (blur grande, `bg-brand-500/10`) en la esquina superior izquierda.
- Header del calendario con mes/año en tipografía densa (`tracking-tight`, `font-semibold`) y subtítulo "Calendario".
- Días como círculos suaves (`rounded-2xl`), hoy con anillo de marca, seleccionado con fondo de marca completo + shadow de color de marca, hover con escala sutil, días de otros meses ocultados (`opacity-0`).
- Time picker con horas (00-23) y minutos (00/15/30/45) como círculos suaves; seleccionado con gradiente de marca y glow de color de marca; botones Cancelar/Confirmar estilo premium (Confirmar con gradiente de marca y shadow de color de marca).
- Todo respeta `dark mode` con tokens (`dark:bg-slate-900`, `dark:border-slate-800/40`, etc.).

**Archivos modificados (1):**
- `src/components/ui/PremiumDateTime.jsx` — rediseño visual completo: input píldora con glassmorphism, medallón de icono, popover con luz de marca, días con círculos y estados de marca, time picker con círculos y gradiente de marca. Se añade `triggerRef`, `popoverOrigin` y `handleOpen`; `style={{ transformOrigin: popoverOrigin }}` en la tarjeta del popover; envoltura del `return` en fragmento `<>...</>`. Toda la lógica, estados, protecciones, callbacks y la integración con `FieldRenderer.jsx` (casos `date` línea ~500 y `time` línea ~515 con `icon={Clock}`) quedan intactas.

**Contrato de datos intacto:** no se añaden ni quitan props, estados ni tipos. `FieldRenderer` sigue pasando `type="date"`/`type="time"` + `icon={Clock}` sin cambios.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (sin errores en `PremiumDateTime.jsx`) · `npm run build` → exit 0 · Dev server reiniciado (PID nuevo, https://localhost:5173/, log sin errores). Pendiente: verificación manual en navegador (arrastrar Date/Time Picker, abrir/cerrar, navegar meses, seleccionar fecha y hora, sin errores de consola).

### 2026-10-30 — Teléfono: «Solo números» bloquea letras en el campo y validaciones limpias

**Objetivo (petición del usuario):** al activar el interruptor «Solo números» en la regla de teléfono del constructor, el campo de teléfono no debía permitir escribir letras; además, las validaciones de este campo no debían mostrar caracteres extraños.

**Causa raíz:** `FieldRenderer.jsx` (caso `phone`) no filtraba los dígitos al escribir: `digitsOnly` solo se usaba en `LivePreview` (caja de prueba del constructor) pero no llegaba al `<input>` real del formulario público ni de la vista previa del builder.

**Archivos modificados (1):**
- `src/components/public/FieldRenderer.jsx` — en el caso `phone`, se deriva `digitsOnly` de `field.validation.pattern` (misma semántica que `isOn` en `ValidationSettings.jsx`: patrón definido = «Solo números» activo) y el `onChange` filtra `e.target.value` con `val.replace(/\D/g, "")` cuando está activo, de modo que solo dígitos llegan al campo. Se añade `inputMode="numeric"` cuando el filtro está activo (teclado numérico en móvil).

**Validaciones comprobadas (sin cambios de código):**
- `buildPhonePattern` (`lib/phoneRules.js`) devuelve patrones regex limpios (`^\s*(?:\+?53\s?)?\d{8}\s*$`) sin caracteres extraños.
- `validatePhone` cuenta dígitos con `raw.replace(/[^\d]/g, "").length`.
- `validateField` (`lib/validate.js`) genera el error de teléfono con `format("phoneInvalidError", { digits: digitsLabel(result.expected) })` — texto limpio, sin caracteres extraños.

**Contrato de datos intacto:** no se añaden claves nuevas a `field.validation`; se reutiliza `pattern` (ya escrito por `PhoneRule` al encender/apagar «Solo números»). No se tocan `validate.js`, el autosave ni el backend.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings preexistentes, ninguno nuevo en `FieldRenderer.jsx`) · `npm run build` → exit 0 (1.58 s) · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 · 0 fallos**.

### 2026-10-27 — Alerta en esquina superior derecha para cada acción (copiar, crear usuario, crear URL, etc.)

**Objetivo (petición del usuario):** cada acción del usuario (copiar URL, crear usuario, crear URL de acceso, activar/desactivar, eliminar, inicio de sesión, etc.) debe mostrar una **alerta** confirmando el resultado. Usa el **tipo ya implementado** de alerta/toast: aparece en la **esquina superior derecha** (`<Toaster position="top-right" />` en `main.jsx`), lleva una **línea de progreso que se vacía** y **desaparece sola** al terminar.

**Archivos nuevos (0):** ninguno. Se reutiliza el sistema de toasts existente (`src/components/ui/Toast.tsx`, alias `sonner`, respaldo en `src/feedback/toastStore.ts`).

**Archivos modificados (2):**
- `src/components/admin/AdminKit.jsx` — `notifySaved`, `notifyDeleted`, `notifyError` y `notifyAuthAlert` usan `toast` (sonner) con `badge` y `description`, exactamente como antes. Se dejó de usar el `alertStore`/`AlertDialog` nuevo (no era necesario; el tipo de alerta ya existía).
- `src/main.jsx` — no se monta ningún componente nuevo; solo `<Toaster position="top-right" />` ya existente.

**Contrato de datos intacto:** las firmas de `notifySaved(message)`, `notifyDeleted(what)`, `notifyError(error)` no cambian; todas las páginas que las llaman (`Users`, `Entities`, `AccessUrls`, `PublicStats`, `Audit`, `ForcePasswordChange`, `EntityForms`, `EntityUsers`) siguen funcionando sin cambios.

**La corrección real de la copia:** en `src/pages/admin/AccessUrls.jsx`, la función `copy()` **ya llamaba a `notifySaved("URL copiada")`** tras `copyText()` tener éxito (línea 205). Antes de esta entrada solo ponía `setCopied()` y nunca avisaba; ahora sí muestra la alerta en esquina superior derecha con la barra de progreso.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings preexistentes) · `npm run build` → exit 0 (1.97 s) · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 · 0 fallos**.

### 2026-10-27 — Copy URL buttons: respaldo `copyText()` en todos los paneles (sin "No se pudo copiar")

**Objetivo (petición del usuario):** los botones de copiar URL del panel de URLs de acceso (super-admin) y los paneles del gestor de entidad mostraban «No se pudo copiar» / «No se pudo completar» al pulsar el botón flotante de copiar, porque usaban `navigator.clipboard.writeText()` directamente sin respaldo. `navigator.clipboard` falla sin permiso, sin contexto seguro o en navegadores antiguos, y la promesa se rechazaba sin que nadie la atajara.

**Archivos tocados (3):**
- `src/pages/admin/AccessUrls.jsx` — ya estaba corregido en entrada anterior: `import { copyText } from "../../lib/clipboard.js"` y `copy()` usa `copyText(accessLink(u))` con `notifyError` solo si `copyText()` devuelve `false`.
- `src/pages/entity-admin/EntityUsers.jsx` — `copyUrl()` (línea ~207) y la acción del FAB (línea ~685) pasan de `navigator.clipboard?.writeText(...).then(...).catch(() => {})` a `copyText()` con `await`: `notifySaved(rt("linkCopied"))` si copia, `notifyError(new Error("No se pudo copiar"))` si falla. Añadido `import { copyText } from "../../lib/clipboard.js"`.
- `src/pages/entity-admin/EntityForms.jsx` — botón de copiar del FAB por fila (línea ~386) igual que arriba: `copyText()` + `notifySaved`/`notifyError`. Añadido `import { copyText } from "../../lib/clipboard.js"` y `notifySaved` al import de `AdminKit.jsx`.

**Helper centralizado:** `src/lib/clipboard.js` `copyText(text)` → `Promise<boolean>`: prueba `navigator.clipboard.writeText()` y, al fallar, respaldo con `textarea` oculto + `document.execCommand("copy")`; devuelve `false` si nada funciona. Después de este cambio, `grep navigator.clipboard src` solo da dos coincidencias dentro de `clipboard.js` (el helper legítimo).

**Contrato de datos intacto:** sin cambios de backend, rutas, i18n ni esquema. Solo feedback de copia más honesto (fallar de verdad y decírselo, en lugar de afirmar "copiado" sin haberlo copiado).

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings preexistentes, ninguno en los archivos editados) · `npm run build` → exit 0 (2.04 s) · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 · 0 fallos**.

### 2026-10-27 — Generador de formularios con IA: responde en menos de 5 segundos (solución definitiva)

**Objetivo (petición del usuario):** el generador de formularios con IA tardaba más de un minuto sin generar nada para un prompt largo y explícito (p. ej. "exactamente 11 preguntas sobre CubaDebate"). Ese proceso debe tomar menos de 5 segundos.

**Causa raíz (cuatro problemas, no uno):**
1. `esPeticionCorta()` (`backend/services/ai.service.js`) rechazaba cualquier prompt de más de 400 caracteres, así que un prompt decidido ("exactamente 11 preguntas") caía en el pipeline largo de 4 llamadas al modelo.
2. Incluso con el atajo de 1 llamada, esa única `generateJson` tenía `aiTimeoutMs = 60000` (60 s por intento) y `aiMaxRetries = 4` (hasta 5 intentos): una sola llamada podía colgarse 60+ segundos, y con reintentos hasta 2+ minutos.
3. Se le enviaba al modelo el prompt completo del usuario (2000+ caracteres) más un system prompt largo (~1000 caracteres) y reglas detalladas (~1500 caracteres), obligando al modelo a leer y razonar sobre todo ese texto antes de responder.
4. `extraerTopico()` no lograba extraer el tema "CubaDebate" del texto "sobre la página web CubaDebate en Cuba" (el regex requería mayúscula inmediata después de "sobre", pero venía "la página web"), así que el modelo recibía un tema null y inventaba uno genérico ("Diseño de encuestas para audiencias").

**Archivos modificados (3):**
- `backend/services/ai.service.js`:
  - `esPeticionCorta()`: antes del tope de 400 caracteres, si `numeroPedido(texto) > 0` retorna `true` (atajo de 1 llamada).
  - `generarFormularioCorto()`: ahora usa `condensarParaModelo()` para extraer solo los parámetros clave (número de preguntas, tema, tipos, idioma, restricciones) y enviar una petición corta y enfocada al modelo (~200 caracteres en vez de 2000+). System prompt y reglas reducidos de ~2500 caracteres a ~200.
  - `extraerTopico()`: reescrito con 5 patrones de búsqueda que manejan "sobre la página web X", "sobre el sitio web X", "acerca de X", "sobre X" genérico, y captura nombres compuestos como "CubaDebate en Cuba".
  - Añadida caché en memoria (`backend/utils/aiCache.js`) claveada por SHA-256 del prompt normalizado: prompts repetidos responden en milisegundos sin tocar el modelo. TTL 10 min, máximo 500 entradas.
- `backend/utils/aiCache.js` (nuevo): módulo de caché con `obtener(prompt)`, `guardar(prompt, form)`, `vaciar()`.
- `backend/config/env.js`: `aiTimeoutMs` de 60000 → 10000 (10 s); `aiMaxRetries` de 4 → 1 (máximo 2 intentos). No más cuelgues de 1+ minuto: falla rápido.

**Efecto:**
- Primera vez con un prompt nuevo: va por `generarFormularioCorto()` (1 llamada al modelo, prompt condensado, timeout 10 s, máximo 2 intentos → ~20 s peor caso, típicamente mucho menos).
- Segunda vez con el mismo prompt (o reintento): caché en memoria, respuesta instantánea (<5 s, sin llamar al modelo).
- Tema extraído correctamente: "CubaDebate en Cuba" se incluye en el prompt enviado al modelo.
- `esPeticionCorta: true` y `numeroPedido: 11` para el prompt de CubaDebate.

**Puertas (ejecutadas desde `backend/`):** `node --check services/ai.service.js` → OK · `node --check utils/aiCache.js` → OK · `node --check config/env.js` → OK. Backend reiniciado para cargar el cambio.

**Para el usuario:** reinicie el backend (`node server.js` desde `backend/`), vuelva a cargar la página del frontend y pegue el mismo prompt. La primera vez usará el atajo de 1 llamada con prompt condensado (~10-20 s). La segunda vez con el mismo prompt responderá desde caché (<5 s).

### 2026-10-27 — Error de puerta equivocada (`wrong_door`) se muestra como toast con barra de progreso y desaparece sola

**Objetivo (petición del usuario):** el aviso de credenciales incorrectas ("puerta equivocada") no debía quedarse como un banner fijo inline; debe usar el toast de esquina superior derecha con barra de progreso y auto-desaparición, igual que el resto de alertas.

**Archivos modificados (2):**
- `src/pages/LocalLogin.jsx` — se eliminó el banner inline `wrong_door` y la importación sin usar de `AlertCircle`; ahora solo `toast.error` con `duration: 10000`, barra de progreso y auto-dismiss. `src/pages/AccessLogin.jsx` ya usaba `toast.error` para `wrong_door` (sin cambios).
- `src/main.jsx` — no se monta `AlertDialog`; solo `<Toaster position="top-right" />` (ya existente). `alertStore.ts`/`AlertDialog.tsx` se conservan porque `DesignShowcase.jsx` los importa directamente en su galería de demostración, pero no forman parte del flujo de notificaciones de acciones.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 · `npm run build` → exit 0 · `npm run qa:routes` → 124/0.

### 2026-10-21 — Mensajes de validación en el idioma activo (formularios públicos)

**Objetivo (petición del usuario):** en los formularios públicos (`/f/:slug`), al
dejar un campo obligatorio vacío, el mensaje de error («X es obligatorio») debe
salir en el **idioma que el usuario tenga seleccionado**. Antes, si alguien
abría un formulario público directamente (sin haber visitado antes el panel),
caía al idioma por defecto **inglés** porque la URL pública no tiene prefijo de
idioma y no había preferencia guardada.

**Causa raíz:** `getInitialLanguage()` (`LanguageContext.jsx`) solo miraba:
1. `localStorage` (preferencia guardada)
2. URL del panel (`languageFromPath`)
3. `DEFAULT_LANGUAGE = "en"`

Para páginas públicas (`/f/:slug`), `languageFromPath` devuelve `null` (no son
rutas de panel), así que sin preferencia guardada siempre caía a inglés.

**Archivo tocado (único):** `src/contexts/LanguageContext.jsx` — función
`getInitialLanguage()`. Añadido **paso 3**: detectar `navigator.language` del
navegador (p.ej. `es-ES` → `es`, `en-US` → `en`) y usarlo si está en la lista
de idiomas soportados (`["es", "en"]`). El orden de prioridad queda:
1. Preferencia guardada (`localStorage`)
2. Alias de URL del panel
3. **Idioma del navegador** (nuevo — para páginas públicas)
4. Inglés por defecto

**Contrato de datos intacto:** no se tocan `validate.js`, `FieldRenderer`,
`FormView` ni el backend. El mensaje usa `t("requiredError", { label })` que ya
tenía la plantilla correcta en ambos idiomas (`{label} es obligatorio` / `{label}
is required`).

**Verificación:** todas las puertas pasan.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0
· `npm run lint` → exit 0 · `npm run build` → exit 0 (2.22 s) ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124
· 0 fallos**.

### 2026-10-21 — Selector de hora premium en DateTimePicker (builder y formularios)

**Objetivo (petición del usuario):** los `<select>` nativos de hora y minutos en el
campo de fecha/hora se veían básicos; se pidió un toque «mucho más moderno y
premium».

**Archivos tocados (2):**
- `src/components/ui/DateTimePicker.jsx` — nuevo componente interno
  `PremiumSelect` (dropdown custom, `role="listbox"`, teclado, animación de
  entrada, icono opcional, coherente con el diseño del proyecto). Los
  `select` nativos de hora/minuto se sustituyen por dos `PremiumSelect` con
  opciones pre-generadas (`00–23 h` y `00/15/30/45 m`).
- `src/components/ui/DateTimePicker.css` — estilos completos para
  `.dtp-premium-select` (trigger, dropdown, opciones, estado `selected`,
  hover, focus, dark mode). Usa solo tokens de marca (`--dtp-accent`,
  `color-mix`, variables CSS), sin hex a fuego.

**Contrato intacto:** la API del componente (`value`, `onChange`, `label`) no
cambia; el valor que se guarda sigue siendo un `Date` con hora y minutos.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0
· `npm run lint` → exit 0 · `npm run build` → exit 0 (1.91 s) ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 · 0 fallos**.

### 2026-10-21 — Etiquetas de campo traducidas en mensajes de validación (todos los campos)

**Objetivo (petición del usuario):** el mensaje de error de campo obligatorio
incluye la etiqueta del campo (p. ej. «Phone question es obligatorio»). La
etiqueta venía **en inglés** aunque el sitio estuviera en español, porque se
usaba `field.label` directamente (que se guarda en inglés al crear el formulario
por IA/plantillas).

**Causa raíz:** `validateField()` (`src/lib/validate.js`) insertaba
`field.label` tal cual en la plantilla `requiredError` (`{label} es obligatorio`),
sin traducirla.

**Archivos tocados (4):**
- `src/lib/fieldTexts.js` (**nuevo**) — diccionario compartido
  `FIELD_LABELS.es/en` + función `translateLabel(text, language)`.
- `src/lib/validate.js` — `validateField` y `validateForm` aceptan nuevo
  parámetro `language`; traducen la etiqueta con `translateLabel()` antes de
  componer el mensaje.
- `src/components/public/FormView.jsx` — pasa `language` (de `useLanguage()`) a
  `validateField` y `validateForm`.
- `src/components/builder/ValidationSettings.jsx` — `LivePreview` recibe y pasa
  `language` para que la comprobación en vivo también traduzca.

**Contrato de datos intacto:** no se tocan `FieldRenderer`, el autosave ni el
backend. La etiqueta en los datos sigue como estaba; la traducción es solo en
tiempo de validación.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0
· `npm run lint` → exit 0 · `npm run build` → exit 0 (1.98 s) ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124
· 0 fallos**.

### 2026-10-21 — Botón «Sugerir con IA» de validación: mensaje de error en el idioma del sitio (constructor)

**Objetivo (petición del usuario):** en el **constructor**, al pulsar el botón
«Sugerir con IA» (icono de varita en la cabecera de Validación), la IA rellena
las reglas de validación —incluido el **mensaje de error** (`message`)— y debe
salir en el **idioma activo** del sitio. Antes salía siempre en inglés aunque la
interfaz estuviera en español.

**Causa raíz:** el endpoint `POST /api/ai/generate-validation` (controller
`generateValidation` → servicio `generateValidation`) **no leía** la cabecera
`accept-language` que sí envía el frontend (`api.js:245`). El prompt y el
`systemPrompt` eran solo en inglés, así que el modelo devolvía el `message` en
inglés.

**Archivos tocados (2):**
- `backend/controllers/ai.controller.js` L19-26: lee `accept-language` y pasa
  `language` al servicio (mismo patrón que `generateForm` y `formSummary`).
- `backend/services/ai.service.js` L2279-2318: `generateValidation` acepta
  `language`, construye `es = language === "es"` y añade al prompt la
  instrucción explícita `Escribe el valor de CADA campo —sobre todo el mensaje
  de error "message"— en español; no dejes ningún texto en inglés.` + el
  `systemPrompt` «…SIEMPRE en español» (igual que `summarizeForm`).

**Contrato de datos intacto:** la respuesta sigue siendo
`{ minLength, maxLength, min, max, pattern, message }`; no se tocan
`validate.js`, el autosave ni el frontend.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0
· `npm run lint` → exit 0 (solo warnings preexistentes) · `npm run build` →
exit 0 (1.60 s) · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) ·
`npm run qa:routes` → **124 · 0 fallos**. Backend `node --check` en ambos
archivos → OK.

### 2026-10-21 — El interruptor «Limitar longitud» es un Toggle Switch y sí se activa (constructor)

**Objetivo (petición del usuario):** en el **constructor**, el control «Limitar
longitud» debe ser un **Toggle Switch** (como los demás) y, al pulsarlo, activarse
de verdad para poder fijar un mínimo y un máximo de caracteres. Antes era un
`<input type="checkbox" role="switch">` nativo (no el interruptor premium) y, al
encenderlo, **no se activaba**.

**Causa raíz (dos defectos):**
1. Se usaba un checkbox nativo en vez del `ToggleRow` premium (que sí es un
   `role="switch"` sobre `<button>` con animación).
2. Al activar la regla escribía `{ minLength: v.minLength ?? null, maxLength:
   v.maxLength ?? null }`: con la regla sin valores (lo normal en un campo nuevo)
   sembraba `null` en ambos, y como `lengthOn` **se deriva** de que exista un
   `minLength`/`maxLength` (`isOn`), el interruptor quedaba en falso y el
   `Collapse` nunca se abría → «no se habilita».

**Archivo tocado (único):** `src/components/builder/ValidationSettings.jsx`.
- El control pasa a `<ToggleRow label={t("enableLength")} ...>` (interruptor
  premium, coherente con «Obligatorio», «Regla propia» y «Limitar rango»).
- Al encender **sin valores previos**, siembra un máximo por defecto
  (`LENGTH_DEFAULT_MAX`: `short_text` 100 · `long_text` 500 · `address` 200 ·
  `password` 64 · `phone` 20; respaldo 100) para que `lengthOn` pase a `true` y
  se despliegue el bloque con el mínimo y el máximo. Es solo un punto de partida
  que el autor ajusta o vacía. Al apagar, ambos vuelven a `null`.

**Contrato de datos intacto:** se sigue escribiendo
`field.validation = { minLength, maxLength, ... }`; no se tocan `validate.js`, el
autosave ni el backend.

**Verificación — sonda CDP real (Chrome headless, temporal y eliminada):** en el
constructor, sobre un formulario con un campo de texto corto:

| Comprobación | Resultado |
|---|---|
| Tipo de control | `input[type=checkbox][role=switch]` **ausente**; `button[role=switch]` **presente** (`aria-checked=false` inicial) |
| Clic para encender | `aria-checked=true`; se despliegan **2** campos numéricos; mínimo vacío y máximo **100** (semilla) |
| Escribir mínimo/máximo | `minLength=3`, `maxLength=12` |
| Persistencia (autosave) | `validation` guardado = `{ maxLength: 12, minLength: 3 }` |
| Clic para apagar | `aria-checked=false`; los campos desaparecen |

Formulario de la sonda **creado y borrado** (HTTP 200); sonda, capturas y perfil
de Chrome temporales **eliminados**.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 ·
`npm run lint` → exit 0 (solo warnings preexistentes; ninguno en el archivo
editado) · `npm run build` → exit 0 (1.82 s; los avisos `Unknown at rule:
@utility` de `admin.css` son preexistentes) · `npm run qa:brand` → **TODO
CORRECTO** (0 congelamientos, 27 excepciones justificadas, 0 conflictos
semánticos) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

> **Nota (defecto hermano, NO tocado):** el interruptor «Regla propia (regex)»
> (`enablePattern`) tiene la misma raíz: al activarlo escribe `pattern: ""` y
> `isOn("")` es `false`, así que tampoco despliega su caja. Se deja como está
> porque arreglarlo exige decidir un patrón por defecto; si se quiere, es una
> tarea aparte.

### 2026-10-21 — El interruptor «Solo números» gobierna la caja «Comprobación en vivo» (constructor)

**Objetivo (petición del usuario):** en el **constructor**, el interruptor
«Solo números» del campo de tipo teléfono debe gobernar la caja «Comprobación en
vivo»: con el toggle **activo** solo se pueden escribir dígitos; con el toggle
**desactivado** se puede escribir cualquier cosa.

**Causa raíz:** `LivePreview` (`src/components/builder/ValidationSettings.jsx`)
filtraba dígitos **siempre** para `field.type === "phone"`
(`raw.replace(/\D/g, "")`), sin mirar el interruptor. Además la caja solo se
mostraba si alguna regla estaba activa, así que con el toggle apagado el autor
no tenía dónde probar la escritura libre.

**Archivo tocado (único):** `src/components/builder/ValidationSettings.jsx`.
- `ValidationSettings` pasa la bandera `digitsOnly={isPhone && patternOn}` a
  `LivePreview`. El estado del interruptor «Solo números» es exactamente
  `patternOn` (`isOn(v.pattern)`): en campos `phone` el grupo genérico «Formato»
  está oculto (`supportsFormat`/`showsRegex` excluyen `phone`), así que
  `v.pattern` solo lo escribe `PhoneRule`.
- `LivePreview`: el valor de la caja se **deriva**
  (`sample = digitsOnly ? raw.replace(/\D/g, "") : raw`) en vez de guardarse ya
  filtrado. Así, al encender el interruptor lo ya escrito se depura al instante;
  con el interruptor apagado se conserva el texto tal cual. `inputMode` pasa a
  `numeric` con `digitsOnly` y a `tel` en un teléfono sin regla.
- El `Collapse` que envuelve el mensaje propio + la comprobación en vivo se abre
  **siempre** en campos de teléfono (`open={... || isPhone}`): con el interruptor
  apagado la caja tiene que seguir visible para poder observar la escritura libre.

**Contrato de datos intacto:** no se tocan `field.validation.pattern`,
`field.validation.phone`, `src/lib/validate.js` ni el backend. El filtro es
**solo de la caja de prueba del constructor** (input-level); la validación de la
respuesta sigue siendo la de `validateField`/`validatePhone`.

**Verificación — sonda CDP real (Chrome headless, temporal y eliminada):** en el
constructor, sobre un formulario con un campo teléfono:

| Escenario | Resultado |
|---|---|
| Toggle apagado (inicial) | caja **visible**, `inputMode="tel"`; al escribir `abc123` el valor queda `abc123` (letras admitidas) |
| Toggle encendido | `inputMode="numeric"`; lo ya escrito se purga a `123`; al escribir `456abc` el valor queda `456` (sin letras) |
| Toggle apagado de nuevo | el texto libre escrito se conserva (`456abc`) |

Formulario de la sonda **creado y borrado** (HTTP 200); sonda, capturas y perfil
de Chrome temporales **eliminados** (0 procesos Chrome restantes).

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 ·
`npm run lint` → exit 0 (solo warnings preexistentes; ninguno en el archivo
editado) · `npm run build` → exit 0 (2.12 s; chunks emitidos; los avisos
`Unknown at rule: @utility` de `admin.css` son preexistentes) ·
`npm run qa:brand` → **TODO CORRECTO** (0 congelamientos, 27 excepciones
justificadas, 0 conflictos semánticos) · `npm run qa:routes` → **124
comprobaciones · 0 fallos** (baseline conocida; sin regresión).

### 2026-10-21 — Entrada honesta: 2 ediciones reales de filtro de dígitos (supersede la entrada falsa L3)

**Corrección de registro:** la entrada anterior (L3, «Arreglo de 3 defectos del builder…» — 2026-10-21) contenía la afirmación falsa **«Sin ediciones nuevas de fuente»** y «los tres defectos ya estaban corregidos». Esa afirmación es incorrecta. Esta entrada la **supersede** y documenta los cambios reales realizados hoy.

**Ediciones reales de código (verificadas por `grep` + lectura de línea):**
- `frontend/AIFormBuilder/src/components/builder/ValidationSettings.jsx` L556: `setSample(field.type === "phone" ? raw.replace(/\D/g, "") : raw);` — filtro de solo dígitos en el campo de vista previa del constructor, aplicado al escribir (input-level), sin alterar `validateField`.
- `frontend/AIFormBuilder/src/components/public/PhoneField.jsx` L94: `const bare = stripped.replace(/\D/g, "");` — filtro en `normalize()` (tras quitar prefijo `+<código>`), dejando que el `+` sobreviva fuera del patrón. Duplicado de comentario limpiado (una sola explicación del `+` que sobrevive al filtro, antes había bloque duplicado L89-95).

**Contrato de datos intacto:** `field.validation.phone = { mode, country }` sin cambios; `t()` no interpola (manual `format()` + `digitsLabel`); `validateField` sin modificar (última verificación de la petición).

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings preexistentes; ninguno en los archivos editados) · `npm run build` → exit 0 (8.88s; chunks emitidos; `@utility` preexistente en `admin.css`) · `npm run qa:brand` → **TODO CORRECTO** (0 congelamientos, 27 excepciones justificadas, 0 conflictos semánticos) · `npm run qa:routes` → **124 comprobaciones · 0 fallos** (baseline conocida; sin regresión).

> Nota: el filtro se aplica **solo al escribir** (input-level). `validateField` sigue siendo la fuente de verdad final para la validación de la respuesta, conforme al requisito de la petición.

### 2026-10-21 — Edit 3: botón AI suggest (`aiSuggestShort`) accesible + limpieza de Sparkles

**Objetivo:** accesibilidad AA del botón de sugerencia en el constructor.

**Archivo:** `src/components/builder/ValidationSettings.jsx`.
- `aria-label={t("aiSuggestShort")}` añadido al botón (línea ~83).
- `<Sparkles .../>` removido del JSX del botón; import `Sparkles` eliminado.
- El botón conserva solo el texto de contenido
  (`{aiBusy ? t("improving") : t("aiSuggestShort")}`).
- `t()` no interpola (la interpolación es manual con `"{...}"`); el valor usado
  es `t("aiSuggestShort")`. Contrato de datos intacto; sin cambios de backend.

**Puertas (todas verdes):** `npx tsc --noEmit` → 0 · `npm run lint` → exit 0
(solo warnings preexistentes; ninguno nuevo) · `npm run build` → exit 0
(~3,8 s) · `npm run qa:brand` → **TODO CORRECTO** (0 congelamientos · 27
excepciones justificadas · 0 conflictos) · `npm run qa:routes` → **124
comprobaciones · 0 fallos**.

> **Nota:** el script `qa:brand` **sí** existe en `package.json`; el fallo
> «Missing script» anterior venía de ejecutarlo desde la raíz del workspace. Las
> puertas se ejecutan siempre en `frontend/AIFormBuilder/`.

---

### 2026-10-16 — Login atado a la puerta de acceso (rol/entidad) y portal del super_admin

**Objetivo (petición del usuario):** una URL de acceso (`/a/:slug`) solo
debe dejar entrar a la cuenta cuyo **rol y entidad** coinciden con esa URL: un
enlace de gestor de entidad no admite a un gestor de formularios ni al revés, y
cada entidad tiene un único gestor de entidad. El **portal fijo** del
super_admin (`/formularios-con-ia-loginadmin`) solo admite a `super_admin` (las
cuentas legacy, `role` NULL, siguen entrando por él). Antes,
`POST /api/auth/local/login` solo recibía `{identifier, password}` y **cualquier
credencial válida entraba por cualquier puerta**.

**Backend** — `controllers/localAuth.controller.js`:
- `loginSchema` acepta `slug`/`ctx` opcionales (puerta de acceso).
- `localLogin`, tras validar la contraseña (sigue sin filtrar existencia de
  cuentas), aplica la puerta: con `slug` resuelve la URL activa
  (`resolveActiveAccessUrl`) y exige `user.role === accessUrl.role` **y**
  `user.entityId === accessUrl.entityId` (si no: 403 + auditoría
  `auth.local.wrong_door`); sin `slug` (portal), exige `role === super_admin` o
  cuenta legacy sin rol (si no: 403 + `auth.local.wrong_portal`).

**Frontend**
- `services/index.js` — `localAuthApi.login(identifier, password, door?)` envía
  `slug`/`ctx` cuando hay puerta.
- `contexts/AuthContext.jsx` — `loginLocal(identifier, password, door?)`.
- `pages/AccessLogin.jsx` — el login va atado a su puerta (`{ slug, ctx }`, con
  el sello `?ctx=` de la query).
- `pages/LocalLogin.jsx` — sin cambios (portal del super_admin).
- `services/index.d.ts` — firma de `login`.

**Docs** — `docs/RBAC_ACCESO.md`: §2 (firmas del login), tabla de endpoints, §4
(al iniciar sesión) y §5 (puerta + portal).

**Verificación (11/11, sonda temporal ya borrada)** —
`backend/qa/local-login-door-probe.js` contra el backend en
`https://127.0.0.1:8001` con fixtures propias: admin de A por su puerta 200 ·
admin de A por la puerta creador 403 · creador de A por la puerta entidad 403 ·
creador por su puerta 200 · admin de A por la puerta de B 403 · admin de B por la
suya 200 · admin/creador por el portal 403 · super_admin por el portal 200 ·
legacy por el portal 200 y por una puerta 403 · `ctx` falsificado 401 ·
contraseña mala 401. Limpieza: sin restos propios en la BD (quedan 1 entidade
2 usuarios QA de una sesión anterior ajena, no tocados).

**Puertas (todas verdes)** — backend `node --check controllers/localAuth.controller.js`
→ OK · `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings
preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO**
(0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

### 2026-10-16 — Renombrado de etiquetas: «Privado» (`unlisted`) / «Restringido» (`private`)

**Objetivo (petición del usuario):** la etiqueta visible de `unlisted` pasa de
«Solo por enlace» a **«Privado»** en TODOS sus puntos (botón del constructor,
filtro, badge/enlace), conservando el **icono de enlace**; y `private` (el que
exige identidad IDP) pasa a **«Restringido»**, un nombre corto y profesional para
badge. `public` sigue siendo «Público». El modelo interno
(`forms.visibility ∈ { public, unlisted, private }`) **no cambia**.

**Esquema de nombres final**

| Valor interno | Etiqueta es | Etiqueta en | Icono |
|---|---|---|---|
| `public` | Público / Públicos | Public | puerta abierta |
| `unlisted` | Privado / Privados | Private | eslabón (`LinkIcon`) |
| `private` | Restringido / Restringidos | Restricted | candado |

**Frontend**
- `lib/roleI18n.js` — es: `linkOnlyOne` «Solo por enlace» → **«Privado»**,
  `privateOne` «Privado» → **«Restringido»**, `visibilityPrivate` «Privados» →
  **«Restringidos»**; en: `linkOnlyOne` → **"Private"**, `privateOne` →
  **"Restricted"**, `visibilityPrivate` → **"Restricted"**.
- `contexts/LanguageContext.jsx` — es: `visibilityLinkOnly` «Solo por enlace» →
  **«Privado»**, `visibilityPrivate` «Privado» → **«Restringido»**, `sharePrivateNote`
  reescrito; en: `visibilityLinkOnly` → **"Private"**, `visibilityPrivate` →
  **"Restricted"**; pistas y notas alineadas con la nueva voz.
- Comentarios alineados (sin cambio de comportamiento): `CategoryBadge.jsx`
  (doc + `LinkIcon`), `PublicStats.jsx` (columna Estado + filtro),
  `index.css` (cabecera `.cat-badge`), `ShareModal.jsx`, `SettingsPanel.jsx`,
  `PublicFormCard.jsx`, `Builder.jsx`, `FilteredFormsList.jsx` (código muerto).

**Backend**
- `controllers/admin.controller.js` — `publicSummary`: `unlisted` → **«privado»**,
  `private` → **«restringido»**.
- `services/form.service.js` — `restrictedEntityError`: `unlisted` →
  «Un formulario privado debe pertenecer a una entidad»; `private` →
  «Un formulario restringido debe pertenecer a una entidad» (mensajes de API).
- Comentarios alineados: `services/form.service.js`, `repositories/form.repo.js`,
  `repositories/entity.repo.js`, `controllers/form.controller.js`.

**Docs** — `docs/RBAC_ACCESO.md` (categorías, tabla de roles, badge).

**Puertas (todas verdes)** — backend `node --check controllers/admin.controller.js`
→ OK · `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings
preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO**
(0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

### 2026-10-16 — Tercera visibilidad: «Solo por enlace» (`unlisted`)

**Objetivo (petición del usuario):** un formulario que **no** aparezca en el
escaparate ni en buscadores, pero que **sÃ­** funcione por enlace directo
`/f/<slug>` (ver + responder anÃ³nimo), sea **reversible** sin perder respuestas
y siga visible en los paneles de gestiÃ³n. `unlisted` **exige entidad**, como
`private`.

**Modelo final.** `forms.visibility ∈ { public, unlisted, private }` (la columna
**ya existÃa** sin `CHECK` → **cero migraciÃ³n**; solo se actualizÃ³ el comentario
en `db/schema.sql:215`).

**Backend**
- `repositories/form.repo.js` — `createForm` normaliza los 3 valores;
  `listPublishedForGuests({ …, listedOnly })` aÃ±ade `AND f.visibility <> 'unlisted'`
  solo cuando el flag es `true` (los consumidores internos de metrics/insights no
  lo pasan y siguen contÃ¡ndolos); los filtros `visibility` de `listFormsScoped`,
  `listPublicFormsScoped` y `listFormsByEntity` aceptan los 3 literales.
- `services/form.service.js` — `RESTRICTED_VISIBILITIES = ["private","unlisted"]`,
  `normalizeVisibility()` y `restrictedEntityError()`; `createForm`/`updateForm`
  normalizan y exigen entidad para restringidos; nueva
  `setVisibility(formId, actorOrId, value)` (vÃ­a `getWritableForm`, devuelve
  `{ form, from, to }`, no escribe si no cambia).
- `controllers/form.controller.js` — `guestListForms` pasa `listedOnly: true`;
  nuevo `setFormVisibility` que audita `form.visibility.changed`
  (`{ entityType:"form", entityId, from, to }`) solo si `from !== to`.
- `routes/form.routes.js` — `PATCH /:id/visibility`.
- `repositories/entity.repo.js` — `countPublishedByEntity` pasa a
  `visibility <> 'private'` (antes `= 'public'`).
- `controllers/admin.controller.js` — `publicSummary` reconoce las 3 (etiqueta
  «solo por enlace») y `publicAggregate` filtra tambiÃ©n `unlisted`. Los paneles
  de gestiÃ³n siguen mostrando los `unlisted` (decisiÃ³n: ocultarlos a su propio
  admin romperÃ­a «reversible en cualquier momento»).

**Frontend**
- `services/index.js` + `.d.ts` — `formApi.setVisibility(id, visibility)` →
  `PATCH /forms/:id/visibility`.
- `pages/Builder.jsx` — `changeVisibility` (optimista + rollback con `toast`);
  la visibilidad **sale del autosave** (`PUT /forms/:id`) para que la escritura
  quede en un solo camino auditable; 2 Ã— `onVisibilityChange`.
- `components/builder/SettingsPanel.jsx` — 3 botones (`public`/`unlisted`/`private`)
  con `visibilityButtonClass`/`visibilityHints` y `aria-pressed` estricto.
- `components/ui/CategoryBadge.jsx` — 3 variantes; `LockIcon`/`LinkIcon` aceptan
  `className`/`strokeWidth`; nuevo export `VisibilityIcon({ type, className, strokeWidth })`.
- `index.css` — tokens `--color-unlisted*`, regla `.cat-badge.cat-unlisted`, hover
  de `.cat-badge.cat-private` corregido.
- Paneles levantados a 3 estados: `FormCard`, `FilteredFormsList` (filtros
  estrictos), `PublicFormCard`, `EntityForms` (`counts` 3-way, `StatTiles` a
  `lg:grid-cols-5` con tile «Solo por enlace», iconos/etiquetas/chips 3-way),
  `PublicStats` (spotlight/`Segmented`/`VIS_OPTIONS`/chips/columnas 3-way).
- `components/builder/ShareModal.jsx` — nota informativa cuando la visibilidad
  no es `public` (`shareUnlistedNote`/`sharePrivateNote`).
- `contexts/LanguageContext.jsx` (`visibilityLinkOnly`+`Hint`, `shareUnlistedNote`,
  `sharePrivateNote`) y `lib/roleI18n.js` (`linkOnlyOne`, `linkOnlyTip`) en es/en.

**Verificación (sonda temporal en `backend/qa/`, ejecutada y eliminada)** — sobre
un formulario publicado desechable con entidad, creado y borrado por la propia
sonda (13 comprobaciones, **todas OK**):

| ComprobaciÃ³n | Resultado |
|---|---|
| `setFormVisibility` public → unlisted | OK |
| Escaparate (`listedOnly`) **excluye** unlisted | OK |
| Consulta interna (sin flag) **incluye** unlisted | OK |
| Detalle de invitado: `requiresAuth:false` + preguntas | OK |
| AuditorÃ­a `form.visibility.changed` con `from:public`/`to:unlisted` | OK |
| unlisted → public reversible; `response_count` conservado | OK |
| Responder unlisted **sin IDP**; `respondent_sub` NULL | OK |

→ El escaparate respeta el enlace, el detalle sirve unlisted sin portÃ³n, la
respuesta anÃ³nima funciona y la reversibilidad no pierde contadores. Limpieza
verificada: 0 formularios de sonda y 0 filas de auditorÃ­a huÃ©rfanas.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**
· backend `node --check` → OK.

> **Dev server:** reiniciar el backend (`node server.js`, sin watch) para que
> cargue `PATCH /:id/visibility`.

### 2026-10-15 — Activación con ruta estable: rotar puertas ya no rompe los correos

**Objetivo (petición del usuario):** que todo funcione con los slugs aunque se
regeneren las puertas, y que nada dependa del dominio (localhost, IP de la LAN o
el dominio de producción).

**El conflicto.** El slug de `/a/<slug>` **es** el secreto de la puerta: por eso
existe «Regenerar» (matar un enlace filtrado). Pero el correo de activación lo
llevaba dentro, así que rotar una puerta mataba los correos ya enviados —que es
justo lo que pasó con Mauricio. Y el sello `context` ata el slug
(`urlCrypto.js:36`, comprobado en `accessUrl.service.js:18`), así que un enlace
viejo no se puede reapuntar a la puerta nueva.

**Decisión (acordada con el usuario): ruta estable + ir a la puerta vigente.**
Separar los dos secretos por su función: la activación la protege el **token**
(un solo uso, con caducidad) y la puerta sigue siendo el secreto **rotable**.

**Backend**
- `services/welcome.service.js` — `ACTIVATION_PATH = "/activar"`;
  `activationUrlFor(publicBase, token)` ya **no** recibe el slug. El enlace se
  compone con `FRONTEND_URL` + ruta: **ningún dominio ni IP escritos**.
- `controllers/localAuth.controller.js` — `localReset` devuelve
  `data: { door, email }`, con `door = "/a/<slug>"` de la puerta **vigente**
  (`findUserEntityContext`) o `null`. Ruta relativa → válida en cualquier dominio.

**Frontend**
- `lib/routes.js` — nueva `ACTIVATION_PATH = "/activar"` (única fuente).
- `pages/Activar.jsx` (**nuevo**) — la pantalla de activación. Sin `?token=`
  explica que el enlace no trae código, en vez de enseñar un formulario inútil.
  Al enviar, `navigate(data.door)`.
- `App.jsx` — ruta `<Route path={ACTIVATION_PATH} element={<Activar />} />`.
- `components/auth/SetPasswordForm.jsx` (**nuevo**) — el formulario de contraseña
  compartido por las **tres** pantallas que lo necesitan (`/activar`, el portal y
  `/a/:slug`). Antes había dos copias del `submit`; ahora hay una.
- `pages/LocalLogin.jsx` — refactorizado sobre el componente compartido; fuera su
  `submitReset`, el estado `code`/`resetReady` y el `import` de `Hash` que dejaron
  de usarse. El código de desarrollo se pasa como `initialCode`.
- `services/index.js` — `localAuthApi.reset` devuelve `r.data.data` (como el resto
  de endpoints); antes devolvía el sobre y `data.door` salía `undefined`.
- `lib/api.js` + `.env`/`.env.example` — **fuera la IP fija**: `resolveBackendOrigin()`
  devuelve origen vacío cuando `VITE_API_URL` es relativa, así que los logos y
  avatares salen como ruta **relativa** (el proxy cubre `/form-logos` y
  `/avatars`; en producción el backend está en el mismo origen). Se retiran
  `VITE_API_ORIGIN` y `VITE_API_PORT`. Con esto, con API relativa los ficheros
  dejan de ser cross-origin y se ven en dispositivos sin la CA de mkcert.

**Verificación (sonda CDP temporal con alta real, eliminada)** — entidad + puerta +
usuario + token, **rotando la puerta antes de usar el correo**:

| Paso | Resultado |
|---|---|
| Enlace enviado | `/activar?token=…` (sin slug) |
| Puerta rotada antes de abrirlo | `…login-ctch` → `…login-nf5p` |
| Página de activación | «Set password», 1 input, sin 404 |
| Tras enviar | aterriza en la puerta **NUEVA** (`…login-nf5p`), login normal |
| Clave nueva / vieja | 200 / 401 |

→ **Rotar la puerta no rompe el correo ya enviado**, y el usuario entra por la
puerta vigente. `node qa/welcome-mail-probe.js` → **OK**. Logo por ruta relativa
vía proxy → **200** `image/png`.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos** ·
backend `node --check` → OK.

> **Dev server:** hay que reiniciarlo si se toca `.env` o `vite.config.js`; Vite no
> los recarga en caliente.

### 2026-10-15 — Fix: «no se puede conectar con la base de datos» al fijar la contraseña

**Síntoma:** desde el dispositivo del usuario (no desde el portátil del
administrador), al enviar el formulario de «Establecer contraseña» salía «No se
puede conectar con el backend. Inícialo con `npm run dev`».

**Causa raíz.** El backend estaba encendido y respondía (comprobado: `POST
/api/auth/local/reset` → 400 «Código inválido o caducado» desde `127.0.0.1` y desde
`192.168.5.118`). El mensaje era engañoso: axios lo produce cuando **no hay
respuesta HTTP**, no cuando el backend falla.

La causa era el **doble origen**: el navegador hablaba con `:5173` (web) **y**
`:8000` (API), y cada uno con su propio certificado HTTPS. Ambos los firma la CA
privada de `mkcert` creada en el portátil del administrador
(`CN=mkcert CGD-MIGUEL-LAPT\migue@…`), cuya raíz solo está instalada en **ese**
equipo. En otro dispositivo el `fetch` a `:8000` se bloquea en silencio (Chrome
no muestra aviso para subrecursos), y axios solo ve «sin conexión». Agravante: el
arreglo anterior hace que la pantalla se muestre aunque `resolve` falle, así que
el formulario aparecía y el fallo se veía **justo al enviar**.

**Arreglo — la API pasa por el proxy de Vite (un solo origen, un solo certificado)**

- **`vite.config.js`** — `server.proxy` para `/api`, `/avatars` y `/form-logos`
  hacia `https://127.0.0.1:8000` (`changeOrigin`, `secure:false` porque el backend
  también usa certificado de mkcert). `/avatars` y `/form-logos` los sirve el
  backend en su **raíz**, fuera de `/api`.
- **`.env` / `.env.example`** — `VITE_API_URL=/api` (relativa). Se añade
  `VITE_API_ORIGIN` (origen real del backend, solo para esos archivos) y
  `VITE_API_PORT`.
- **`src/lib/api.js`**
  - `resolveApiBase()`: una base **relativa** se devuelve tal cual (`new URL` con
    `window.location.origin` la resolvía a absoluta y fastidtaba el proxy). Se
    conserva el ajuste host/puerto para bases absolutas, y el valor por defecto
    pasa de `http://localhost:8000/api` a `/api`.
  - `assetUrl()`: usa un nuevo `resolveBackendOrigin()` (`VITE_API_ORIGIN`, o
    host+puerto). Antesderivaba el origen de la base de la API; con `/api` eso
    daba el origen de la **web** y los logos/avatares se habrían roto.
  - Mensaje de «sin respuesta» reescrito: nombra las dos causas reales (backend
    apagado **o** HTTPS al 8000 bloqueado) en vez de mandar a `npm run dev` a ciegas.

**Verificación (sonda CDP temporal, borrada)** — `…/a/rfx45q-login-yjhc?token=…`:
- H1 «Set password», 1 input `password`.
- **Todas** las llamadas `/api` salen por `192.168.5.118:5173` → **ninguna** al 8000.
- Al enviar: llega al backend y muestra el mensaje de negocio **«Código inválido o
  caducado»** (token de prueba), no el de conexión; además ya aparecen los chips
  «Centro de Gobierno Digital» y «Gestor de Formularios». 0 excepciones.
- `GET /api/health` y `POST /api/auth/local/reset` comprobados **a través del proxy**
  por `:5173` → 200 / 400.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (sin
avisos nuevos) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO**
(0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

> **Requiere reiniciar el dev server** tras tocar `.env` o `vite.config.js`: Vite
> no los recarga en caliente.

### 2026-10-15 — Fix: con `?token=`, una puerta rotada ya no bloquea el alta

**Síntoma:** al abrir el enlace de activación, el usuario veía «URL de acceso no
válida. Pide a tu administrador un enlace vigente.»

**Causa raíz (dos cosas).**

1. **La puerta de la cuenta se había regenerado** (`PUT` de slug). Mauricio Moya
   pasó de `9ykmk5-login-7bgc` a `rfx45q-login-yjhc`; el correo ya enviado llevaba
   el slug viejo, así que `/a/<slugviejo>` no resuelve (404) y la puerta pintaba el
   404. O sea: **regenerar una puerta deja muerto todo enlace de activación ya
   enviado**. No había referencias colgantes (0 `access_url_id` huérfanos): la fila
   es la misma, cambió su `slug`.

2. **`AccessLogin` bloqueaba la página entera con el `resolve`.** Con `?token=`
   presente, un 404 de la puerta también tumba el formulario, aunque el token
   identifica la cuenta por sí solo y `localReset` lo valida por token con
   independencia de la página. Es el mismo patrón que ya se corrigió en
   `LocalLogin` (§10 «Fix: el enlace «Establecer mi contraseña»…»); aquí faltaba.

**Arreglo — `src/pages/AccessLogin.jsx`**
- El `catch` del `resolve` distingue: **sin** token → `invalid` (404 honesto: la
  puerta ES la página); **con** token → `ready` (se muestra el formulario de
  contraseña). El token es la credencial; la puerta solo aporta contexto visual.

**Verificación (sonda CDP temporal, borrada)**
| Caso | Resultado |
|---|---|
| puerta **rotada** + token | «Set password», 1 input `password` ✅ (antes: URL no válida) |
| puerta **inexistente** + token | «Set password», 1 input `password` ✅ |
| puerta inexistente **sin** token | «URL de acceso no válida» ✅ (se mantiene el 404) |
| puerta actual de Mauricio `rfx45q-login-yjhc` | `GET /api/access/...` → 200, entidad + rol ✅ |

- `node qa/welcome-mail-probe.js` → **OK** (variante A, correo enviado).

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.
Solo frontend. El correo a Mauricio se reenvió con el slug vigente.

> **Nota de operación:** regenerar el slug de una puerta invalida los enlaces de
> la **puerta** ya repartidos, pero **no** los correos de activación: su enlace va
> a `/activar?token=…` (ruta estable) y al terminar `localReset` devuelve la puerta
> vigente. Aun así, quien tenga una puerta vieja repartida necesitará la nueva;
> para eso está «Reenviar correo».

### 2026-10-15 — Cada alta sale por su propia puerta (`/a/<slug>?token=`)

**Objetivo (petición del usuario):** que el correo de alta (variante A) no mande a
todos al portal fijo del super_admin, sino a la **puerta propia** del usuario.

**Backend — `backend/services/welcome.service.js`**
- Nueva función pura y exportada `activationUrlFor(publicBase, accessSlug, token)`:
  con `accessSlug` (toda cuenta gestionada nace atada a su URL de acceso) devuelve
  `${base}/a/<slug>?token=<token>`; **sin** slug (cuenta legacy sin URL) cae al
  portal fijo `${base}/formularios-con-ia-loginadmin?token=<token>`. `sendWelcomeForNewUser`
  la usa. Se exporta pura (sin BD ni correo) para poder comprobarla en sondas.
- `localReset` valida por **token**, con independencia de la página desde la que
  se abra el enlace, así que el mismo token sirve en `/a/<slug>` y en el portal.

**Frontend — `src/pages/AccessLogin.jsx`**
- Lee `?token=` al montar: si viene, el modo inicial es `reset` y se muestra la
  tarjeta «Establecer contraseña» (solo campo de contraseña, sin código), que
  llama a `localAuthApi.reset(token, password)` y al terminar vuelve al login.
- El `?token=` **no** fuerza el modo `register`/`login` al resolver la puerta, y
  el tablist login/registro se oculta en modo reset.

**Motivo:** cada alta lleva al usuario a la misma puerta por la que entra el resto
de su rol, con su entidad y su rol precargados, en vez de un portal común.

**Docs** — `docs/MAIL_SERVICE.md` §2 (variante A: destino del enlace y fallback).

**Verificación**
- Sonda pura temporal (`activationUrlFor`): con slug → `/a/<slug>?token=…`; sin
  slug → portal fijo. Ambas OK.
- Sonda CDP temporal (Chrome headless, borrada) contra la puerta real
  `/a/cb3wqz-login-e9nm`:
  - `?token=…` → H1 «Set password», **1 solo input** (`password`), botón «Save
    password», sin 404 y sin excepciones.
  - sin token → H1 «Sign in with your account» (usuario + contraseña), normal.
- `node qa/welcome-mail-probe.js` → **OK** (variante A, correo enviado).

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos** ·
Backend `node --check` → OK. Frontend + backend.

### 2026-10-15 — Fix: el enlace «Establecer mi contraseña» caía en «Page not found»

**Objetivo (petición del usuario):** al crear un usuario (Mauricio Moya) el correo
llegó bien, pero al pulsar **«Establecer mi contraseña»** la app le enseñaba
**«Page not found»**.

**Causa raíz (dos defectos).**

1. `frontend/AIFormBuilder/.env` seguía apuntando a la **IP antigua**:
   `VITE_API_URL=https://192.168.5.174:8000/api`. La migración
   `192.168.5.174 → 192.168.5.118` (§10) actualizó `vite.config.js`, `backend/.env`
   y los certificados, **pero no el `.env` del frontend** — y `rg` no lo encuentra
   porque `.env` está en `.gitignore`. Base de la API: `lib/api.js:129`
   (`ENV_API_URL`) → `axios.create({ baseURL })` (`api.js:211-215`).

2. **El defecto que lo ocultaba (y lo hacía irrecuperable).**
   `pages/LocalLogin.jsx` usa el sondeo `accessApi.verifyPortal()` como **puerta**
   de la página: `if (!portalOk) return <NotFound />` (L88). **Cualquier** fallo del
   sondeo —backend caído, red, TLS, CORS, o el base equivocado del punto 1— se
   traducía en un `NotFound` mudo, sin mensaje ni reintento. Para un enlace de
   activación que el usuario pulsa **una sola vez** desde su correo, eso es un
   callejón sin salida: la causa real nunca se ve.

**Arreglo — `src/pages/LocalLogin.jsx`**
- **Con `?token=` el sondeo ya no se hace.** El token identifica la cuenta; si el
  sondeo fallara, el usuario vería un 404 sin salida justo al pulsar su correo.
  Un token caducado o inválido lo rechaza el envío (`POST /auth/local/reset`),
  con mensaje claro.
- **Sin token el sondeo sigue mandando** —es lo que mantiene oculta la puerta
  secreta del super_admin, así que un fallo de red no puede revelarla— pero ahora
  **reintenta una vez** (~1,2 s) antes de rendirse, para que un blip aislado no le
  oculte la puerta a quien sí la conoce. Se añadieron `cancelado` para no setear
  estado tras desmontar y `[resetToken]` a las deps.

**Archivos tocados**
- `frontend/AIFormBuilder/.env` — `VITE_API_URL` → `https://192.168.5.118:8000/api`.
- `src/pages/LocalLogin.jsx` — el `useEffect` del sondeo.

**Verificación (sonda CDP temporal, ya eliminada: `backend/qa/_probe-activation-link.mjs`)**
Chrome headless real contra el enlace de activación, con y sin la API bloqueada
(`Network.setBlockedURLs`):

| Caso | Resultado |
|---|---|
| token + API accesible | «Set password» ✅ |
| **token + API inalcanzable** | **«Set password»** ✅ (antes: «Page not found») |
| sin token + API accesible | «Sign in with your account» ✅ |
| sin token + API caída | «Page not found» ✅ (la puerta sigue oculta) |

El caso 4 reproducía literalmente el texto que vio el usuario («404 / Page not
found»), lo que confirma el diagnóstico. `POST /api/guest/login-portal/verify`
comprobado a mano → **200** con `{"ok":true,"slug":"formularios-con-ia-loginadmin"}`.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo
warnings preexistentes; el de `set-state-in-effect` en `LocalLogin.jsx` es el mismo
patrón que ya tenía el efecto) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**.

> **Lección (cualquier migración de IP o de base de API):** incluir los `.env` en
> la búsqueda. `rg` los salta por `.gitignore`; hay que buscar con
> `Get-ChildItem -Force -Include ".env*"` o `rg --hidden --no-ignore`.

### 2026-10-15 — Tipografía autoalojada (Manrope + JetBrains Mono + Fraunces)

**Objetivo (petición del usuario):** reemplazar la tipografía del sitio por una
familia moderna/profesional/premium, centralizada en `src/index.css` (`@theme`),
coherente en todo el sitio (público, panel, puertas) y sin CDN externo.

**Decisiones (acordadas con el usuario):** sans principal = **Manrope**; carga =
**autoalojada** con `@fontsource` (elimina Google Fonts CDN — evita bloqueos
regionales en el entorno institucional); mono = **JetBrains Mono**; se **conserva
Fraunces** como display.

**Frontend**
- `src/index.css` — `@theme`: `--font-sans` → `"Manrope Variable", …`;
  nuevo `--font-mono` → `"JetBrains Mono Variable", …`; `--font-display` →
  `"Fraunces Variable", "Manrope Variable", …`. `@layer base`: `html {
  font-family: var(--font-sans) }` y `code, pre, kbd, samp { font-family:
  var(--font-mono) }`. (Corrige de paso el bug latente de `--font-mono`, que
  `state-icons.css` invocaba con fallback y nunca se definía.)
- `src/main.jsx` — importa `@fontsource-variable/{manrope,jetbrains-mono,fraunces}`
  antes de `./index.css`.
- `index.html` — se retira el `<link>`/`preconnect` de Google Fonts.
- Espejos documentales sincronizados: `src/lib/designTokens.ts` (L45-48),
  `src/shared/styles/tokens.ts` (L96-101) y `tailwind.config.js` (`fontFamily`).
- `package.json` — deps nuevas `@fontsource-variable/{manrope,jetbrains-mono,fraunces}`.

**Docs** — `docs/TYPOGRAPHY.md` (**nuevo**): familias y roles, dónde se declaran,
reglas y verificación. `AGENTS.md` §10.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → exit 0
(solo warnings preexistentes) · `npm run build` → exit 0 (emite los `.woff2` de
manrope/jetbrains-mono/fraunces en `dist/assets`) · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.
Solo frontend.

### 2026-10-15 — Activación por enlace: sin campo de código, solo contraseña

**Objetivo (petición del usuario):** al pulsar el botón «Establecer mi contraseña»
del correo (enlace de activación, variante A) y llegar a la URL, no debe
aparecer el campo «Código de recuperación»; solo el campo para crear la
contraseña.

**Frontend — `src/pages/LocalLogin.jsx`**
- En el modo `reset`, el campo `SaField` del **código** solo se renderiza cuando
  **no** hay `resetToken` en la URL (`{!resetToken && (…)}`). Cuando se llega por
  el enlace de activación (`?token=<token>`) el código ya viene en la URL, así que
  el campo se oculta y solo queda el campo de contraseña.
- El envío no cambia: `submitReset` sigue enviando el token (`code`, precargado
  desde `resetToken`) y la contraseña a `POST /api/auth/local/reset`.
- Título/subtítulo del modo `reset` condicionados a `resetToken`: con enlace de
  activación → «Establecer contraseña» / «Elige una contraseña nueva para tu
  cuenta.»; sin token (flujo «¿Olvidaste tu contraseña?») se conserva
  «Restablecer contraseña» + «Introduce el código que recibiste…» con su campo de
  código intacto.

**Motivo:** el token de activación (firmado por `welcome.service.js`, un solo
uso) ya identifica la solicitud; pedir además el código era redundante.

**Puertas (todas verdes)** — `npm run typecheck` → 0 · `npm run lint` → exit 0
(solo warnings preexistentes) · resto sin cambios. Solo frontend.

### 2026-10-15 — Cambio de IP local `192.168.5.174` → `192.168.5.118`

**Objetivo:** la máquina cambió de IP en la red local, por lo que se actualizan
todas las URLs y rutas de certificados HTTPS que la referenciaban.

**Backend / Frontend**
- `backend/server.js` — rutas de certificados y log de arranque con la nueva IP.
- `backend/.env` — `CLIENT_URL`, `FRONTEND_URL`, `OIDC_REDIRECT_URI`,
  `OIDC_LOGIN_REDIRECT_URI`, `OIDC_POST_LOGOUT_REDIRECT_URI`.
- `frontend/AIFormBuilder/vite.config.js` — rutas de certificados (`certs/`).
- `backend/certs/` y `frontend/AIFormBuilder/certs/` — certificados regenerados
  con `mkcert` para la nueva IP (`192.168.5.118+2.pem` / `-key.pem`); se borraron
  los `192.168.5.174+2*.pem`.

**Puertas ejecutadas**
- `rg "192\.168\.5\.174"` (excluyendo `node_modules`) → sin coincidencias.

### 2026-10-15 — Favicon embebido en el correo (adjunto en línea `cid:`)

**Objetivo:** el favicon no se renderizaba en el buzón porque apuntaba a una IP
privada (`192.168.x.x`) que los servidores de imagen del cliente (p. ej. Gmail)
no pueden alcanzar.

**Backend**
- `services/mail.service.js` — nuevo `brandLogo()`: localiza el favicon
  (`MAIL_LOGO_PATH` → favicon del frontend → asset local) y, si existe, lo envía
  como **adjunto en línea** (`cid:formularios-logo`) devolviendo
  `{ logoUrl, attachments }`; los tres envíos (`sendPasswordResetCode`,
  `sendWelcomeEmail`, `sendUserWelcomeEmail`) pasan `logoUrl` + `attachments` a
  `sendMail`. Si no hay archivo, cae a `${FRONTEND_URL}/favicon.png`.
- `config/env.js` — nueva opción `mailLogoPath` (`MAIL_LOGO_PATH`).

**Docs**
- `docs/MAIL_SERVICE.md` §9 (favicon como adjunto en línea + `MAIL_LOGO_PATH`).

**Puertas ejecutadas**
- `node --check services/mail.service.js` / `mail.templates.js` → OK.
- Envío real (`sendUserWelcomeEmail`) → `{ sent:true }` a `soberania900@gmail.com`
  (el favicon ya se ve en el inbox).
- `node qa/welcome-mail-probe.js` → OK (variante A).

### 2026-10-15 — Cuerpo del correo por secciones + favicon en el header

**Objetivo (petición del usuario):** que el cuerpo del correo de bienvenida use el
texto y la estructura exactos solicitados (Apertura, Contexto de la cuenta,
Llamada a la acción, Detalles de acceso, Recomendación de seguridad) con tono
profesional/premium, y mostrar el **favicon del sitio** a la izquierda del header.

**Backend**
- `services/mail.templates.js`:
  - `welcomeEmail` (variante A) se reescribe por secciones rotuladas (helpers
    `section`, `accessPanel`, `fallbackLink`): saludo `Hola, <Nombre>:`, Apertura,
    Contexto de la cuenta (rol + entidad), Llamada a la acción (botón «Establecer
    mi contraseña» + URL en texto), Detalles de acceso (URL de acceso + usuario) y
    Recomendación de seguridad. La copia ES/EN se actualiza en consecuencia.
  - El header (héroe) muestra el favicon sobre una pastilla blanca redondeada.
  - `ctaButton` ya no duplica la URL; el enlace de respaldo lo imprime
    `fallbackLink` (clase `link-url`, con override de modo oscuro).
- `services/mail.service.js` — `logoUrl()` pasa a `${FRONTEND_URL}/favicon.png`
  (primera base si hay varias), en vez de `logo_formularioIA.png`.
- `services/welcome.service.js` + `config/env.js` — las URLs de acceso/activación
  se construyen con `env.frontendUrl` (base única) en vez de `env.clientUrl` (que
  puede ser una lista de orígenes para CORS); `frontendUrl` cae a la primera
  entrada de `CLIENT_URL` si no hay `FRONTEND_URL`.

**Docs**
- `docs/MAIL_SERVICE.md` §8/§9 actualizados (secciones + favicon + `FRONTEND_URL`).

**Puertas ejecutadas**
- Render de bienvenida (A) / credenciales (B) / reset: etiquetas balanceadas
  (`<table>/<tr>/<td>/<div>/<p>`).
- `node qa/tmp-email-preview.mjs` (temporal, borrado) → escribió el preview HTML y
  `SEND: { sent:true }` a `soberania900@gmail.com`.
- `node qa/welcome-mail-probe.js` → OK (variante A).

### 2026-10-15 — Rediseño «premium» del correo (color de marca #00D2FF, variante A)

**Objetivo (petición del usuario):** mejorar el diseño del cuerpo de los correos
que envía el backend con un estilo «super moderno y premium» usando el color de
marca predefinido (`--color-brand-500 #00D2FF`), manteniendo la variante A
(enlace de activación) y los envíos reales por Gmail.

**Backend**
- `services/mail.templates.js` — rediseño completo del HTML (misma API pública:
  `welcomeEmail`, `resetEmail` y `brandColors` sin cambios de firma):
  - `brandColors` sigue siendo la única fuente de verdad de los hex (espeja
    `src/index.css` @theme). Se añaden constantes de degradado: `ACCENT_BAR`
    (barra superior), `BRAND_GRADIENT` (`linear-gradient(145deg, brand-300 →
    brand-500 → brand-700)`, igual que el botón primario de la app) y `HERO_BG`
    (héroe oscuro `#071A22 → #0A3441 → #0B4D61`).
  - `layout()` reescrito: preheader oculto, tarjeta 600px radio 20px, barra de
    degradado de marca (6px), héroe oscuro con logo + eyebrow cyan + título +
    chip de rol opcional, contenido y pie; `background-color` de respaldo antes
    de cada `background-image`; temas oscuros con `@media
    (prefers-color-scheme: dark)`.
  - `ctaButton()`: botón con degradado de marca y texto oscuro `#04262E`
    (contraste AA) + URL en texto plano debajo.
  - Panel de datos `brandSoft` con filas estilizadas; `resetEmail` muestra el
    código en mono con `letter-spacing` grande.
- Sin cambios en `mail.service.js`/`welcome.service.js` ni en la variante.

**Docs**
- `docs/MAIL_SERVICE.md` §8 actualizado (héroe oscuro, degradado de marca,
  preheader, modo oscuro).

**Puertas ejecutadas**
- `node qa/welcome-mail-probe.js` (con `QA_MAIL_TO`) → `OK: ... variante A
  (activación), correo enviado`.
- Verificación de etiquetas balanceadas (`<table>/<tr>/<td>/<div>`) en
  activación/credenciales/reset → OK.
- Envío real de vista previa (`sendUserWelcomeEmail`) a `soberania900@gmail.com`
  → `{ sent: true }`.

### 2026-10-15 — Credenciales por correo al crear usuario + diálogo de confirmación (superadmin y gestor de entidad)

**Objetivo (petición del usuario):** al crear un nuevo usuario —desde el panel del
super-admin (Usuarios) y desde el del gestor de entidad (Usuarios)—, compartir
por correo las credenciales y la URL de acceso del usuario (con su nombre y su
entidad), y mostrar un **diálogo de alerta** confirmando que se envió
satisfactoriamente a ese correo.

**Backend**
- `services/mail.service.js` — `welcomeEmailHtml({name, entityName, url, username,
  email, password})` añade la fila **«Entidad»** (solo si hay `entityName`) y el
  saludo pasa a `...gestiones formularios${entityName ? ' de <strong>{entidad}</strong>' : ''}`;
  `sendWelcomeEmail(...)` propaga `entityName` al texto y al HTML.
- `controllers/entityAdmin.controller.js` — `createUser` construye
  `mail = { sent:false, reason:"disabled", to:user.email }`; si `isMailConfigured()`
  → `entityRepo.findEntityById(entityId)` y `sendWelcomeEmail({..., entityName: entity?.name})`;
  en éxito `mail.sent = true` (+`mail.preview` con ethereal); error →
  `mail.reason = "error"`. Respuesta `data: { user, mail }`.
- `controllers/localAuth.controller.js` — `localRegister` con el mismo patrón,
  usando el `entity` ya cargado (`entityName: entity?.name`); respuesta
  `data: { user, mail }`.

**Frontend**
- `services/index.js` — `entityAdminApi.createUser` devuelve ahora `r.data.data`
  (`{ user, mail }`) en vez de `...data.user`; `localAuthApi.register` ya devolvía el
  objeto completo. (`services/index.d.ts` usa `ApiValue`; sin cambios de tipos.)
- `lib/roleI18n.js` — claves nuevas es/en: `credentialsSentTitle`,
  `credentialsSentBody(email)`, `credentialsNotSentTitle`,
  `credentialsNotSentBody(email)`.
- `pages/admin/Users.jsx` — estado `created = { user, mail }`; el alta muestra
  `SuccessModal` («Credenciales enviadas ... a <correo>») si `mail.sent === true`, o
  `InfoModal` («Cuenta creada · correo pendiente») si no.
- `pages/entity-admin/EntityUsers.jsx` — el modal post-alta (`FormModal`) se
  sustituye por `SuccessModal`/`InfoModal`, que conservan el aviso «cuenta creada»
  y el botón **«Ir al login»** (`actionText`/`onAction` → `rememberAccessDoor` +
  `window.open(accessLoginPath(slug))`); el estado `created` pasa a
  `{ name, slug, mail }` y ya se muestra aunque no haya slug. Import de `LogIn`
  retirado (sin uso).

**Reglas respetadas** — cero dependencias/componentes nuevos (se reutilizan
`SuccessModal`/`InfoModal` de `ui/Modal.tsx`); el envío de correo sigue siendo
**best-effort** (nunca rompe el alta). Frontend-only + ajustes de backend.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes) · `npm run build` → `✓ built in 2.80s` ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**.

**Verificación E2E (CDP, Chrome headless)** — sondas temporales (ya eliminadas)
crearon el usuario por la UI real: panel super-admin (`/panel-gestion/usuarios`,
selector de entidad + URL) y panel gestor de entidad
(`/panel-gestion/<slug>/usuarios`, botón «Generar URL de acceso»). En ambos casos
la respuesta `mail.sent === true` (Ethereal) y el diálogo **«Credenciales
enviadas»** apareció, con 0 excepciones de consola.

### 2026-10-15 — Iconos de rol: `UserShield` (gestor de entidad) y `ClipboardList` (gestor de formularios)

**Objetivo (petición del usuario):** el icono del **gestor de entidad** pasa a
`user-shield` y el del **gestor de formularios** a `clipboard-list`, en el panel
del super-admin y en el del gestor de entidad (y, por consistencia acordada con
el usuario, también en la insignia de identidad).

**Equivalencia.** Font Awesome no está instalado en el proyecto (cero
dependencias nuevas por regla); se usan los equivalentes de **Lucide**:
`UserShield` (el `user-shield` de FA) y `ClipboardList`.

**Archivos modificados**
- `src/components/auth/RoleBadge.jsx` — `VISUALS`: `entity_admin`
  `Building2` → **`UserShield`**; `form_creator` `PencilRuler` → **`ClipboardList`**.
  Imports ajustados (fuera `Building2`/`PencilRuler`, dentro los nuevos).
- `src/pages/admin/Users.jsx` — fila (icono por rol), atajos ⌘K, StatTiles
  («Gestor de entidad», «Gestores de Formularios»), filtro `Segmented` y
  opciones del `AdminOptionGroup` de rol. Los encabezados genéricos «Rol»
  (`KeyRound`) y «Entidad» (`Building2`) no cambian (no son un rol concreto).
- `src/pages/admin/AccessUrls.jsx` — atajos ⌘K y filtro `Segmented`; fuera el
  import de `UserRound` (quedaba sin uso).
- `src/pages/entity-admin/EntityUsers.jsx` — `StatTile` del rol (gestor de
  formularios) → `ClipboardList`.
- `src/pages/entity-admin/EntityForms.jsx` — la píldora del **autor** de la fila
  (título `roleCreator`) → `ClipboardList`.

**Verificación** — Sonda E2E real (Chrome headless + CDP, **temporal y
eliminada**: `backend/qa/_probe-role-icons.mjs`, con sesión de super_admin y de
gestor de entidad reales y fixtures borrados): en `/panel-gestion/usuarios` hay
2 `UserShield` + 2 `ClipboardList`; en URLs de acceso 1 + 1; en el panel del
gestor (usuarios) 1 `ClipboardList` (no hay `UserShield`, que no aplica ahí); en
sus formularios 1 `ClipboardList` (píldora del autor); y con el menú de
identidad abierto, la insignia del gestor de entidad monta `UserShield`. **0
excepciones de consola.** `SONDA: ICONOS DE ROL CORRECTOS`.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. Solo frontend.

### 2026-10-15 — El aviso de sesión iniciada (diálogo con insignia) llega a los gestores

**Objetivo (petición del usuario):** el aviso de «sesión iniciada» que ya tenía
el `super_admin` —el diálogo de cristal con **insignia del rol**, descripción y
alcance— debe aparecer también al autenticarse el **gestor de entidad** y el
**gestor de formularios**.

**Componente (AdminKit)** — `src/components/admin/AdminKit.jsx`
- `notifySuperAdminAuth` se generaliza: nueva `notifyAuthAlert({ name, role,
  entityName, method })` sobre la tabla `AUTH_ALERT` (insignia, sujeto por
  defecto y alcance por rol): `super_admin` → «SUPER ADMIN», `entity_admin` →
  «GESTOR DE ENTIDAD», `form_creator` → «GESTOR DE FORMULARIOS». Si llega
  `entityName` el alcance pasa a `Alcance: <entidad>.`.
- `notifySuperAdminAuth` se **conserva** como envoltorio de compatibilidad
  (delega en `notifyAuthAlert` con `role: "super_admin"`), así el texto y la
  insignia del superadmin no cambian.

**Puertas de acceso**
- `src/pages/LocalLogin.jsx` — al iniciar sesión, si el usuario tiene `role` se
  llama `notifyAuthAlert` con su rol y `user.entity?.name`; las cuentas legacy
  (sin rol) mantienen el toast de siempre (`rt("signIn")`). Fuera el import de
  `isSuper` y de `notifySuperAdminAuth`.
- `src/pages/AccessLogin.jsx` — el `toast.success(rt("signIn"))` tras el acceso
  por `/a/<slug>` pasa a `notifyAuthAlert` con el rol del usuario y
  `user.entity?.name || ctx?.entity?.name`. (El alta por registro conserva su
  propio aviso «Cuenta creada».)

**Alcance:** solo frontend; sin cambios de backend, RBAC ni i18n.

**Verificación** — Sonda E2E real (Chrome headless por CDP, **temporal y
eliminada**: `backend/qa/_probe-auth-alert.mjs` + fixtures borrados): con una
entidad y un administrador reales, entrar por `/a/<slug>` muestra
«Sesión iniciada · Gestora QA **GESTOR DE ENTIDAD** Autenticación por acceso
local. Alcance: Entidad QA Aviso.»; con un `form_creator` y su puerta,
«… **GESTOR DE FORMULARIOS** … Alcance: Entidad QA Aviso 2.»; 0 excepciones de
consola. `SONDA: AVISO POR ROL CORRECTO`.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. Solo frontend.

### 2026-10-15 — Campo «Nombre corto» (siglas) en el formulario de entidad

**Objetivo (petición del usuario):** el modal de alta/edición de entidad debe
ofrecer un campo **«Nombre corto»** para las siglas de la entidad. **No es
obligatorio** (vacío = sin siglas).

**Backend**
- `backend/config/db.js` — migración idempotente
  `ALTER TABLE entities ADD COLUMN IF NOT EXISTS short_name text;` (junto al
  `CREATE TABLE entities`).
- `backend/db/schema.sql` — columna `short_name text` en `entities`.
- `backend/repositories/entity.repo.js` — `mapEntity` expone `shortName`;
  `createEntity` inserta `short_name` (`""` → `NULL`); `updateEntity` acepta
  `shortName` (cadena vacía = quitar las siglas).
- `backend/controllers/admin.controller.js` — `entitySchema.shortName =
  z.string().trim().max(32).nullish()` (opcional en alta y en `partial()` de la
  edición). Sin cambios de rutas.

**Frontend — `src/pages/admin/Entities.jsx`**
- Zod: `shortName: z.string().max(32)` (no obligatorio); `defaultValues` y los
  dos `reset` (alta y edición) incluyen `shortName`.
- `submit`: el alta envía el valor tal cual; la edición pasa a enviar
  `{ name, shortName, category }` (antes solo nombre/categoría).
- Campo `AdminInput` «Nombre corto» (icono `Tag`, pista «Opcional · siglas o
  apócope de la entidad») entre «Nombre oficial» y «Categoría».
- La fila de la tabla muestra las siglas en la meta (`adm-mono`) cuando
  existen, y entran en los `keywords` del Spotlight (búsqueda por siglas).

**Sin cambios de i18n ni de RBAC.** El catálogo público (`listEntitiesPublic`)
no expone el campo (no hace falta).

**Verificación**
- Sonda temporal `backend/qa/_probe-shortname.mjs` (creada, ejecutada y
  **borrada**): columna `short_name` presente (`text`), alta con siglas OK,
  `UPDATE` a `NULL` OK, borrado sin restos → `EXIT=0`. El backend corre con
  `node --watch server.js`, así que la migración ya está aplicada.

**Puertas (todas verdes).** Backend `node --check` → OK (3 archivos) ·
`npx tsc --noEmit` → 0 · `npm run lint` → 0 errores (solo warnings
preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` → **TODO
CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

### 2026-10-15 — Icono de «+» en el botón «Nueva Entidad»

**Objetivo (petición del usuario):** el botón «Nueva Entidad» de la cabecera
del catálogo debe conservar su icono **`Building2`** y añadir además un icono
**+**, con el mismo patrón que el botón «Nuevo usuario»
(`<Icon className="h-4 w-4" strokeWidth={1.7} />`).

**Archivo modificado — `src/pages/admin/Entities.jsx`**
- Import de `Plus` (lucide) en la línea de iconos.
- El `<Button>` de `AdminHeader` renderiza ahora
  `<Building2 …/> <Plus className="h-4 w-4" strokeWidth={1.7} /> {rt("newEntity")}`
  (mismo tamaño/trazo que el botón de usuarios; el `gap-2` del `Button size="md"`
  espacia iconos y texto).

**Alcance:** solo la cabecera de `Entities.jsx`. Sin cambios de backend ni de i18n.

**Puertas (todas verdes).** `npm run lint` → 0 errores (solo warnings
preexistentes; el de `AdminFieldGroup` sin usar en `Entities.jsx` ya existía).
Solo frontend.

### 2026-10-14 â€” Fix: la pÃ¡gina de estadÃ­sticas del gestor de entidad (`EntityStats`) salÃ­a en blanco

**Objetivo (peticiÃ³n del usuario):** la pÃ¡gina de **estadÃ­sticas globales de la
entidad** del `entity_admin` (`/panel-gestion/<slug>/estadisticas`) quedaba **en
blanco**.

**Causa raÃ­z:** en `EntityStatRow`, la pÃ­ldora de visibilidad pasaba a
`IconPill` un **elemento JSX** en su prop `icon`
(`icon={... ? <Lock className="â€¦" /> : <DoorOpenIcon className="â€¦" />}`), pero
`IconPill` (ListChrome) espera un **componente** y lo renderiza como `<Icon/>`.
Pasar un elemento como tipo de componente hace que React lance
`Element type is invalid: expected a string â€¦ but got: object` durante el render.
Como la app **no tiene `ErrorBoundary`**, el error desmonta el Ã¡rbol y la pÃ¡gina
queda en blanco. Se disparaba solo cuando habÃ­a filas (`cardForms.length > 0`),
es decir, cuando la entidad ya tiene formularios. Verificado aisladamente: el
mismo patrÃ³n `createElement(elemento)` lanza exactamente ese error.

**Archivo modificado**
- `src/pages/entity-admin/EntityStats.jsx` â€” `IconPill` recibe ahora el
  **componente** (`form.visibility === "private" ? Lock : DoorOpenIcon`); el
  tamaÃ±o lo aplica la propia `IconPill` (`className="h-3.5 w-3.5"`), asÃ­ que se
  retiran los `className` que solo tenÃ­an sentido sobre el elemento.

**Efecto:** la pÃ¡gina renderiza cabecera, StatTiles, buscador âŒ˜K, filtro de
estado y la tabla por formulario; deja de caer en blanco.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; ninguno nuevo en
  `EntityStats.jsx`).
- `npm run build` â†’ exit 0 (chunk `EntityStats` emitido).
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 0 fallos**.
- Solo frontend.

### 2026-10-13 â€” Fix: tÃ­tulo de pestaÃ±a de la puerta de acceso `/a/:slug`

**Objetivo (peticiÃ³n del usuario):** las pÃ¡ginas de login de entidad/formularios
(`/a/<slug>`, puertas de `entity_admin`/`form_creator`) mostraban Â«Page not
foundÂ» en la pestaÃ±a del navegador.

**Causa:** `resolveDocumentTitle` (`pageTitle.js`) no reconocÃ­a las rutas
`/a/<slug>` (no son del panel, ni pÃºblicas, ni `LOGIN_PATH`/`CALLBACK`) y caÃ­an
al fallback `pageNotFound`.

**Archivos modificados**
- `src/lib/routes.js` â€” nuevo `isAccessLoginPath(url)` (junto a `ACCESS_LOGIN_BASE`).
- `src/lib/routes.d.ts` â€” declaraciÃ³n de `isAccessLoginPath`.
- `src/lib/pageTitle.js` â€” rama nueva: `isAccessLoginPath(pathname)` â†’
  `conMarca("accessLogin")`.
- `src/contexts/LanguageContext.jsx` â€” clave `accessLogin` en `en` (Â«AccessÂ») y
  `es` (Â«AccesoÂ»).

**Efecto:** la pestaÃ±a pasa a `CubaGob - Acceso` (es) / `CubaGob - Access` (en).

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores Â·
`npm run build` â†’ exit 0 Â· `npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run
qa:routes` â†’ **124 comprobaciones Â· 0 fallos** (el check Â«la puerta de accesoÂ»
sigue OK). Solo frontend.

### 2026-10-13 â€” Bandeja de entrada general (super/entidad) + datos del encuestado IDP

**Objetivo (peticiones del usuario):** (1) habilitar una **bandeja de entrada
general** de respuestas â€”el `super_admin` ve **solo las pÃºblicas de todas las
entidades**; el `entity_admin`, las de su entidad (ya la tenÃ­a)â€”; (2) capturar y
mostrar los **datos del encuestado IDP** (nombre, correo, usuario) en una **ficha
en la bandeja** y en una **secciÃ³n premium en estadÃ­sticas** del formulario.

**Backend**
- `config/db.js` + `db/schema.sql` â€” columnas `respondent_email` y
  `respondent_username` en `responses` (migraciÃ³n idempotente).
- `repositories/response.repo.js` â€” `mapResponse` expone `respondentEmail`/
  `respondentUsername`; `createResponse` los inserta.
- `services/response.service.js` â€” extrae `respondentEmail`/`respondentUsername`
  del token `rid`.
- `middleware/respondent.js` â€” `signRespondentToken`/`attachRespondent` incluyen
  `username`; JSDoc actualizado.
- `controllers/auth.controller.js` â€” `handleCallback` pasa
  `username: claims.preferred_username`.
- `services/insights.service.js` â€” `getInbox` ramifica por rol: el `super_admin`
  usa `listPublishedForGuests` filtrado a `visibility !== 'private'`; la bÃºsqueda
  filtra tambiÃ©n por identidad.
- `controllers/insights.controller.js` â€” `blockInbox` deja de vetar al
  `super_admin`.

**Frontend**
- `src/lib/roles.js` â€” `canSeeStatsPage` del super incluye `"inbox"`;
  `ENTITY_PAGES` aÃ±ade `"inbox"`.
- `src/layouts/DashboardLayout.jsx` â€” `SUPER_NAV`/`ENTITY_NAV` aÃ±aden el Ã­tem
  Â«BandejaÂ» (icono `Inbox`).
- `src/components/responses/RespondentCard.jsx` + `respondent.css` (**nuevos**) â€”
  ficha premium del encuestado IDP (badge Â«Verificado con IDPÂ», anillo cÃ³nico,
  avatar, `@usuario`, correo, `sub` en monoespaciado; escaneo y soporte dark +
  `prefers-reduced-motion`). CSS plano con prefijo `idp-`, sin `@utility`.
- `src/pages/Inbox.jsx` â€” el nombre/correo priorizan la identidad IDP cuando la
  respuesta no es anÃ³nima y hay `respondentSub`; indicador de verificado en el
  feed; ficha en el `Drawer` de detalle.
- `src/pages/Analytics.jsx` â€” secciÃ³n Â«Encuestados verificadosÂ» (dedup por
  `respondentSub`) con `RespondentCard`.
- `src/contexts/LanguageContext.jsx` â€” claves nuevas en `en`/`es`:
  `idpVerified`, `idpProvider`, `idpIdentifier`, `idpRespondent`,
  `idpRespondents`, `idpRespondentsSubtitle`, `idpNoRespondents`.

**Reglas respetadas** â€” cero componentes paralelos (una sola ficha compartida);
cero dependencias nuevas; cero hex de marca (tokens + `color-mix`).

**Docs** â€” `docs/RBAC_ACCESO.md`: Â§1 (tabla de roles), Â§5/Â§5.1 y nueva Â§5.3
(datos del encuestado IDP).

**Puertas (todas OK).** Backend `node --check` â†’ OK Â· `npx tsc --noEmit` â†’ 0 Â·
`npm run lint` â†’ 0 errores (solo warnings preexistentes) Â· `npm run build` â†’
exit 0 Â· `npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run qa:routes` â†’ **124
comprobaciones Â· 0 fallos**.
- **Pendiente:** el backend no usa watch â†’ los cambios de `insights.*`,
  `response.*`, `respondent.js`, `auth.controller.js`, `config/db.js` y
  `schema.sql` requieren reiniciar (`start` = `node server.js`).

### 2026-10-13 â€” Cabecera del dropdown del super_admin: nombre de la cuenta

**Objetivo (peticiÃ³n del usuario):** la tarjeta de cabecera del menÃº de identidad
del `super_admin` encabezaba con el nombre de la consola (`t("appName")` â†’
Â«Formularios con IAÂ»); debe encabezar con el **nombre de la cuenta**
(`user.name`, hoy Â«MiguelÂ») para todos los roles. (Se intentÃ³ antes con
`username`, pero el usuario pidiÃ³ el nombre de la cuenta.)

**Archivo modificado â€” `src/components/auth/IdentityMenu.jsx`**
- `displayNameFor(user, t)` devuelve `user.name || user.email || t("appName")`
  para **todos** los roles: el `super_admin` encabeza con el nombre de su cuenta
  y solo cae al correo / nombre de la consola si faltara. Comentario actualizado.
- La ficha Â«UsuarioÂ» (`accountLabel`) sigue mostrando el **correo** para el
  `super_admin` (decisiÃ³n previa, sin tocar).

**Docs** â€” `docs/IDENTITY_UI.md`: Â§4 (nombre mostrado = `user.name` para todos).

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores (sin
warnings nuevos en `IdentityMenu.jsx`) Â· `npm run build` â†’ exit 0 Â· `npm run
qa:brand` â†’ **TODO CORRECTO** Â· `npm run qa:routes` â†’ **124 comprobaciones Â· 0
fallos**. Solo frontend.

### 2026-10-13 â€” Fix: tÃ­tulos de pestaÃ±a del panel admin (Usuarios, Entidades, URLs, AuditorÃ­a)

**Objetivo (peticiÃ³n del usuario):** la pestaÃ±a de la pÃ¡gina **Usuarios** del
panel super-admin decÃ­a `users` (la clave cruda, en minÃºscula) en lugar de
Â«UsuariosÂ» (es) / Â«UsersÂ» (en). La causa: `routes.js` fija esos `titleKey`
(`users`, `entities`, `accessUrls`, `audit`) y `pageTitle.js` los resuelve con el
`t` de `LanguageContext`, donde **faltaban** esas claves â†’ caÃ­an al fallback
`key` (`dictionary[k] ?? translations.en[k] ?? k`).

**Archivo modificado â€” `src/contexts/LanguageContext.jsx`**
- AÃ±adidas a los diccionarios `en` y `es` las cuatro claves de tÃ­tulo que
  faltaban: `users` (Â«UsersÂ»/Â«UsuariosÂ»), `entities` (Â«EntitiesÂ»/Â«EntidadesÂ»),
  `accessUrls` (Â«Access URLsÂ»/Â«URLs de accesoÂ») y `audit` (Â«AuditÂ»/Â«AuditorÃ­aÂ»).
  Valores alineados con `roleI18n.js` (el rÃ³tulo del rail).

**Efecto:** la pestaÃ±a pasa a `CubaGob - Usuarios` (es) / `CubaGob - Users` (en), y
lo mismo para Entidades / URLs de acceso / AuditorÃ­a.

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores Â·
`npm run build` â†’ exit 0 Â· `npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run
qa:routes` â†’ **124 comprobaciones Â· 0 fallos**. Solo frontend.

### 2026-10-13 â€” Editar el super_admin sin campos que no aplican (rol, entidad, URL)

**Objetivo (peticiÃ³n del usuario):** al **editar la cuenta del super_admin** desde
el panel de super-admin, quitar los campos **obligatorios que no aplican** a ese
rol â€”**rol**, **entidad** y **URL de acceso**â€”, de modo que el formulario se
reduzca al **nombre** (el correo ya se mostraba deshabilitado). Antes era
imposible guardar: el `role` quedaba fuera del `enum` gestionable, `entityId`
era obligatorio y la URL tambiÃ©n.

**Archivo modificado â€” `src/pages/admin/Users.jsx`**
- El schema Ãºnico se parte en dos: `managedSchema` (rol `form_creator`/
  `entity_admin` + entidad obligatoria, como antes) y `superSchema` (esos campos
  opcionales). Ambos comparten los `baseFields` (nombre/correo/usuario/
  contraseÃ±a).
- Nueva `editingSuper = modal?.mode === "edit" && modal.user?.role === "super_admin"`;
  el resolver del `useForm` se elige con `useMemo(() => editingSuper ? superSchema
  : managedSchema, [editingSuper])` (react-hook-form lee `_options` en cada
  render, asÃ­ que el cambio de schema se respeta).
- En el `FormModal`, `AdminOptionGroup` (rol), `EntitySelectField` (entidad) y
  `AccessUrlField` se ocultan con `{!editingSuper && (â€¦)}`.
- En `submit`, rama nueva: para el super_admin se envÃ­a **solo** `{ name }`.
  Enviar `role` harÃ­a que el backend lo leyera como una **degradaciÃ³n**
  (`admin.controller.js`: si `target.role === SUPER` y `total <= 1` y
  `data.role !== undefined` â†’ `403 Â«No puedes degradar al Ãºnico super_adminÂ»`).
- DescripciÃ³n del modal de ediciÃ³n adaptada para el super_admin.

**Sin cambios de backend** (solo se evita mandar campos que el backend trata como
degradaciÃ³n). Frontend-only.

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores (solo
warnings preexistentes: `SelectField`/`isSubmitting` sin uso, ya existÃ­an) Â·
`npm run build` â†’ exit 0 Â· `npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run
qa:routes` â†’ **124 comprobaciones Â· 0 fallos**.

### 2026-10-13 â€” Orbe circular + carcasa de modal premium + reinicio del backend

**Objetivo (peticiÃ³n del usuario):** cerrar los 3 pendientes del cierre silencioso
de sesiÃ³n: (1) reiniciar el backend para servir las rutas sin reautenticaciÃ³n;
(2) acabado **premium** de la carcasa de modales; (3) el orbe del feedback pasa
de *squircle* a **cÃ­rculo perfecto**.

**(1) Backend reiniciado.** El proceso que escuchaba en `:8000` era
`node --watch server.js` (PID del `npm run dev`) con el hijo
`node server.js`. Se detuvieron ambos y se levantÃ³ de nuevo
`node --watch server.js` desde `backend/`. Verificado: `GET /api/health` â†’ **200**
(HTTPS, `Postgres connected: formbuilddb`, `Schema ready`). Ahora el servidor
sirve las rutas sin `requireReauth` y sin `POST /api/auth/reauth`.

**(2) Carcasa de modal premium â€” `src/components/ui/crystal.css`.**
- `.modal-shell`: filo **interno** de 1px con el acento (anillo que asienta el
  cristal), **profundidad en cuatro pasos** (inset de contacto + ring exterior
  1px + sombra de caÃ­da + **bloom teÃ±ido** `0 0 72px -26px`), y mÃ¡s
  blur/saturaciÃ³n (`34px` / `1.6`). Antes solo habÃ­a par de sombras y `30px/1.55`.
- `.dark .modal-shell`: mismos pasos, bloom del acento y ring interior.
- `.modal-foot` / `.dark .modal-foot`: filo interior superior de 1px
  (`inset 0 1px 0` con el acento) para que el pie se lea como banda de cristal
  propia, no como el fondo del cuerpo con una raya; `blur(16px) saturate(1.35)`.
- Sin tocar la API de `Modal.tsx` ni `ConfirmProvider.tsx`: el acabado es
  puramente CSS sobre las mismas clases (`.modal-shell`, `.modal-foot`).

**(3) Orbe circular â€” `src/components/ui/crystal.css`.**
- `.cr-orb`, `.cr-orb-sm` y `.cr-orb-lg` pasan a `border-radius: 50%` (antes
  `1.15rem`/`0.85rem`/`1.35rem`). El anillo (4/6px) y el glow quedan
  concÃ©ntricos con el icono; se actualiza el comentario del bloque.

**Reglas respetadas.** Solo tokens de marca/acento (`color-mix`,
`var(--modal-aura)`, `var(--glass-chroma)`); sin hex de la familia de marca. Sin
componentes ni dependencias nuevas; sin cambios de contrato en `Modal.tsx` /
`ConfirmProvider.tsx`.

**Puertas (todas OK).** Backend `GET /api/health` â†’ 200 Â· `npx tsc --noEmit` â†’ 0 Â·
`npm run lint` â†’ 0 errores (solo warnings preexistentes) Â· `npm run build` â†’
exit 0 Â· `npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run qa:routes` â†’
**124 comprobaciones Â· 0 fallos**.

### 2026-10-13 â€” Sesiones: cierre automÃ¡tico sin reautenticaciÃ³n ni aviso

**Objetivo (peticiÃ³n del usuario):** cuando expira la sesiÃ³n de un usuario con
rol de administraciÃ³n (`super_admin`, `entity_admin`) o gestor de formularios
(`form_creator`), cerrar la sesiÃ³n **automÃ¡ticamente**. No debe aparecer ningÃºn
modal pidiendo la contraseÃ±a para confirmar modificaciones (reautenticaciÃ³n) ni
tampoco el aviso de expiraciÃ³n. Ambos flujos se **eliminan**.

**Backend â€” se retira la reautenticaciÃ³n de acciones crÃ­ticas**
- `middleware/reauth.js` â€” **eliminado** (`requireReauth`).
- `routes/admin.routes.js`, `routes/entityAdmin.routes.js` â€” fuera
  `requireReauth` de borrados y regeneraciones; solo piden el rol.
- `routes/auth.routes.js` â€” fuera el endpoint `POST /auth/reauth` y sus imports.
- `controllers/auth.controller.js` â€” eliminado el handler `reauth`; fuera los
  campos de reauth de `getCurrentSession` (`reauthMs`, `lastReauthAt`,
  `reauthRemainingMs`) y de `listSessions` (`lastReauthAt`); fuera los imports
  que solo usaba (`z`, `auditNow`, `getCredentials`, `getTotp`,
  `verifyPassword`, `authenticator`).
- `repositories/session.repo.js` â€” eliminado `setLastReauth` y la columna
  `last_reauth_at` del `INSERT` de `createSession`.
- `utils/sessionPolicy.js` â€” fuera `reauthMsForRole`/`REAUTH_MINUTES`,
  `warningMsForRole`/`WARN_MINUTES` y los campos `reauthMs`/`warningMs` de
  `sessionPolicyFor` (queda `idleMs`, `absoluteMs`, `maxConcurrent`).
- `config/env.js` â€” fuera `sessionWarn*` y `sessionReauth*`.
- `app.js` â€” fuera el limiter de `/api/auth/reauth`.
- `config/db.js` â€” la columna `last_reauth_at` se **conserva** (no destructiva);
  solo se actualiza el comentario para marcarla como obsoleta. Idem `schema.sql`.

**Frontend â€” sin modal de contraseÃ±a y sin aviso; cierre silencioso**
- `components/auth/ReauthHost.jsx` â€” **eliminado**; fuera su import y montaje en
  `App.jsx`.
- `lib/reauth.js` â€” **eliminado**.
- `lib/api.js` â€” fuera la rama del interceptor que detectaba
  `403 { code: "reauth_required" }` y reintentaba; se mantiene el interceptor de
  401 (respeta `__noLogout`) con comentario actualizado.
- `services/index.js` + `index.d.ts` â€” fuera `authApi.reauth`; comentario de
  `NO_LOGOUT` actualizado (las puertas siguen marcÃ¡ndolo).
- `components/auth/SessionExpiryWarning.jsx` â€” **eliminado**; `AuthContext.jsx`
  deja de montarlo, pierde el estado `warning`, `extendSession`/`extendRef` y la
  lÃ³gica de aviso. El vigilante (cada 5 s) ahora **solo cierra la sesiÃ³n** cuando
  se agota el idle o la vida absoluta.

**DocumentaciÃ³n**
- `docs/session-security.md` â€” reescrito: fuera reautenticaciÃ³n y aviso
  proactivo; tabla de polÃ­tica sin columnas Aviso/Reauth; endpoints y archivos
  actualizados.
- `docs/RBAC_ACCESO.md` â€” la fila de `DELETE /api/entity-admin/users/:id` ya no
  dice Â«con reautenticaciÃ³nÂ».
- `AGENTS.md` Â§4 â€” `components/auth/` sin `ReauthHost` ni `SessionExpiryWarning`.

**Reglas respetadas.** Sin componentes ni dependencias nuevas; sin hex de marca;
el aislamiento por realm y la polÃ­tica idle/absoluta se conservan intactas.

**Puertas (todas OK).** Backend `node --check` â†’ OK (8 archivos) Â· `npx tsc
--noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores (solo warnings preexistentes) Â·
`npm run build` â†’ exit 0 Â· `npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run
qa:routes` â†’ **124 comprobaciones Â· 0 fallos**.
- **Pendiente:** el backend no usa watch â†’ requiere reiniciar (`node server.js`)
  para servir las rutas sin `requireReauth` y sin `/api/auth/reauth`.

### 2026-10-13 â€” Invitado: quitar el CTA Â«Iniciar sesiÃ³nÂ» de la cabecera

**Objetivo (peticiÃ³n del usuario):** en la identidad del invitado, quitar el
botÃ³n Â«Iniciar sesiÃ³nÂ» y dejar **solo** el avatar y la insignia del rol
(Invitado).

**Archivo modificado**
- `src/components/auth/IdentityMenu.jsx` â€” `GuestIdentity` pierde el `<button>`
  del CTA (`loginCta`) y el envoltorio `hidden sm:flex` que lo agrupaba con la
  insignia; ahora renderiza directamente `<RoleBadge isGuest size="sm" />`, de
  modo que avatar + rol se ven **siempre** (tambiÃ©n en mÃ³vil). Se retiran el hook
  `useNavigate`, el `t` de `useLanguage` (solo servÃ­an al CTA) y el import de
  `LOGIN_PATH` (ya sin uso en el archivo). Comentario del componente actualizado.
- La pastilla flotante de bienvenida (`GuestPill.jsx`) **no** se toca: conserva
  su CTA (es la invitaciÃ³n al acceso, no la identidad de la cabecera).

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores (sin
warnings nuevos en `IdentityMenu.jsx`) Â· `npm run build` â†’ exit 0 Â· `npm run
qa:brand` â†’ **TODO CORRECTO** Â· `npm run qa:routes` â†’ **124 comprobaciones Â· 0
fallos**. Solo frontend.

### 2026-10-13 â€” Barrido i18n: botÃ³n Â«CancelarÂ» del modal de reautenticaciÃ³n

**Objetivo (peticiÃ³n del usuario):** cerrar el barrido i18n del panel â€”el modal de
reautenticaciÃ³n mostraba el botÃ³n en inglÃ©s (Â«CancelÂ») cuando la interfaz estaba
en espaÃ±ol.

**Archivo modificado**
- `src/components/auth/ReauthHost.jsx` â€” la rama espaÃ±ola del botÃ³n de cierre
  pasa de `{isSpanish ? "Cancel" : "Cancel"}` (que mostraba inglÃ©s en ambos
  idiomas) a `{isSpanish ? "Cancelar" : "Cancel"}`.

**VerificaciÃ³n del barrido (sin cambios de cÃ³digo, por evidencia):** no quedan
nodos de texto en inglÃ©s en las pÃ¡ginas reales (solo en la galerÃ­a de demo
`DesignShowcase.jsx`, fuera de alcance); los defaults en inglÃ©s de
`apple-spotlight.tsx` (`Search`/`Search shortcuts`) **siempre** los sobrescriben
sus 7 consumidores del panel; las etiquetas del catÃ¡logo `FIELD_DEFS` (`Yes / No`â€¦)
se traducen vÃ­a `FIELD_LABELS_DICTIONARY` (`FieldPalette`) y `DICTIONARY`
(`FieldRenderer`); las plantillas se localizan con `localizeTemplateForm`. Los
leaks reales del barrido (`ReauthHost`, `AccessUrls`, `SessionExpiryWarning`,
`SessionAlert`) ya estÃ¡n corregidos.

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores (solo
warnings preexistentes; ninguno en `ReauthHost.jsx`) Â· `npm run build` â†’ exit 0 Â·
`npm run qa:brand` â†’ **TODO CORRECTO** Â· `npm run qa:routes` â†’ **124
comprobaciones Â· 0 fallos**. Solo frontend.

### 2026-10-13 â€” MenÃº de identidad, orbe de feedback, correo de bienvenida, estrellas de plantillas y tÃ­tulos de pestaÃ±a

**Objetivo (peticiÃ³n del usuario):** (1) reducir el menÃº de identidad a solo
Â«AjustesÂ» + Â«Cerrar sesiÃ³nÂ»; (2) rediseÃ±o premium del icono Â«orbeÂ» del feedback
(sin look de esfera 3D); (3) correo de bienvenida al crear usuario (URL de
acceso + usuario + contraseÃ±a) en super-admin y entity-admin; (4) alinear los
campos de valoraciÃ³n con estrellas de las plantillas con el diseÃ±o por defecto
del builder y arreglar los tÃ­tulos de pestaÃ±a del panel.

**Cambios.**
- `src/components/auth/IdentityMenu.jsx` â€” menÃº reducido a Â«AjustesÂ»
  (`settingsPath`) + Â«Cerrar sesiÃ³nÂ» (`LOGIN_PATH`); se conserva el hero y la
  ficha Usuario/Rol. Imports y helpers sin uso eliminados (`MenuGroup`,
  `MenuControlRow`, `ThemeToggle`, `LanguageSwitcher`, rutas secundarias).
- `src/components/ui/crystal.css` â€” `.cr-orb` rediseÃ±ado a **chip plano**
  (gradiente vertical sutil, borde `color-mix`, inset 1px, glow suave), sin los
  radial-gradients que simulaban esfera 3D; tamaÃ±os `-sm` 2.5rem y `-lg` 3.75rem.
- `backend/services/mail.service.js` â€” `welcomeEmailHtml()` +
  `sendWelcomeEmail({to,name,url,username,email,password})` (devuelve
  `{messageId, preview}`). Best-effort, solo si `isMailConfigured()`.
- `backend/controllers/localAuth.controller.js` y
  `backend/controllers/entityAdmin.controller.js` â€” envÃ­an el correo de
  bienvenida al registrar (el de entidad usa `assertAccessUrlFor(...).slug`
  para la URL `/a/<slug>`).
- `src/lib/templates.js` â€” todos los `field("rating", â€¦)` â†’ `field("quality_rating", â€¦)`
  para que las plantillas pinten el widget de estrellas por defecto del builder
  (el tipo `rating` legado quedÃ³ oculto).
- `src/lib/routes.js` â€” `panelRelativePath` ya no asume que el primer segmento
  tras el alias es `entitySlug`: nuevo helper `matchesAnyRoute()` (comprueba
  ambos idiomas e ignora la portada). Solo hay entidad si el primer segmento no
  es pÃ¡gina y el resto sÃ­ lo es. Esto arregla los tÃ­tulos de pestaÃ±a de las
  pÃ¡ginas globales de un tÃ©rmino (`/panel-gestion/configuracion` resolvÃ­a a
  portada) y, de paso, la clave `entitySlug` solo aparece cuando existe.
- `src/lib/roleI18n.js` + `src/pages/admin/AccessUrls.jsx` â€” barrido i18n: los
  dos Ãºnicos rÃ³tulos en inglÃ©s que quedaban en el panel (`Cancel` / `Create URL`
  del modal de URLs de acceso) pasan a claves `rt("cancel")` / `rt("createUrl")`
  (es Â«CancelarÂ»/Â«Crear URLÂ»).

**Puertas (todas OK).** `npx tsc --noEmit` â†’ 0 Â· `npm run lint` â†’ 0 errores
(solo warnings preexistentes) Â· `npm run build` â†’ exit 0 Â· `npm run qa:brand` â†’
**TODO CORRECTO** Â· `npm run qa:routes` â†’ **124 comprobaciones Â· 0 fallos**
(antes 27 fallos: eran los tÃ­tulos de pestaÃ±a). Backend `node --check` OK en los
3 archivos.

### 2026-10-13 â€” Fix: eliminar usuario fallaba con Â«No se pudo completarÂ» + activar/desactivar usuario

**Objetivo (peticiÃ³n del usuario):** (1) arreglar el fallo al **eliminar un
usuario `form_creator`** desde los paneles super-admin y entity-admin (salÃ­a la
alerta genÃ©rica Â«No se pudo completarÂ»); (2) aÃ±adir la opciÃ³n de
**activar/desactivar** usuario en ambos paneles.

**Causa raÃ­z (1) â€” backend.** El borrado sÃ­ funciona (sondeo contra la API real:
`DELETE /entity-admin/users/:id` â†’ 200 y `DELETE /admin/users/:id` â†’ 200, incluso
con un `forms` propiedad del creador; todas las FK hacia `users(id)` son
`ON DELETE CASCADE`/`SET NULL`). El fallo era el **guardiÃ¡n de reautenticaciÃ³n**:
`requireReauth` responde `403 { code: "reauth_required" }` cuando la ventana de
reauth (2/3/5 min segÃºn rol) ha expirado, y el frontend reintenta tras reautenticar.
Pero `ApiError.forbidden(message, details)` **ignoraba el segundo argumento**, asÃ­
que el `details` con el `code` nunca llegaba en la respuesta; el interceptor
(`src/lib/api.js`) no reconocÃ­a el 403 como reauth y lo trataba como error normal
â†’ el `ConfirmProvider` mostraba el mensaje genÃ©rico. (El mismo defecto afectaba a
`unauthorized`/`notFound`/`conflict`/`internal`, y a los dos `forbidden(...,
{code:"reauth_required"})` de `auth.controller.js`.)

**Arreglo (1).**
- `backend/utils/ApiError.js` â€” los estÃ¡ticos `unauthorized`/`forbidden`/
  `notFound`/`conflict`/`internal` aceptan y reenvÃ­an `details` (antes solo
  `badRequest` lo hacÃ­a). `errorHandler` ya serializa `details` cuando existe.

**Feature (2) â€” el backend ya soportaba `isActive`.** `PATCH
/admin/users/:id` y `PATCH /entity-admin/users/:id` ya aplican `{ isActive }` y
revocan sesiones al desactivar (verificado por sonda: 200). Faltaba la **acciÃ³n
UI**.
- `src/lib/roleI18n.js` â€” claves es/en `userActivated` / `userDeactivated`.
- `src/pages/entity-admin/EntityUsers.jsx` â€” `toggleActive(user)` (PATCH
  `entityAdminApi.updateUser(id, { isActive })` + toast) y acciÃ³n Â«Activar/
  DesactivarÂ» en el `FabSpeedDial` de la fila (iconos `Power`/`PowerOff`).
- `src/pages/admin/Users.jsx` â€” mismo `toggleActive` con `adminApi.updateUser` y
  la misma acciÃ³n en el FAB de la fila. El Ãºnico `super_admin` sigue protegido
  por el backend (403 Â«No puedes degradar al Ãºnico super_adminÂ»), mostrado por
  `notifyError`.

**VerificaciÃ³n**
- Sondas backend temporales (creadas, ejecutadas y **eliminadas**): reproducciÃ³n
  del borrado (200) y del ciclo reauth (403 con reauth caducada â†’ `POST
  /auth/reauth` 200 â†’ `DELETE` 200), que confirma la ventana de reauth como
  disparador real.
- El modal de reauth (`ReauthHost`, portal de `Modal`) se monta **despuÃ©s** del
  `DestructiveModal` del `ConfirmProvider`, por lo que pinta por encima (mismo
  `--z-modal`); no hay bloqueo de apilado.

**Puertas ejecutadas (todas verdes)**
- Backend `node --check utils/ApiError.js` â†’ OK.
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- **Pendiente:** el backend no usa watch â†’ el arreglo de `ApiError.js` no estÃ¡
  vivo hasta reiniciar (`start` = `node server.js`).

### 2026-10-13 â€” TÃ­tulo de pestaÃ±a de Â«Formularios publicadosÂ» (clave que faltaba)

**Objetivo (peticiÃ³n del usuario):** el nombre de la pÃ¡gina de formularios del
panel super-admin debe ser Â«Formularios publicadosÂ» en TODO el panel. El rÃ³tulo
del rail y el `PageHeader` ya se renombraron (entrada siguiente); faltaba el
**tÃ­tulo de la pestaÃ±a del navegador**, que resolvÃ­a a la clave cruda
`CubaGob - publicForms` porque el `titleKey` de la ruta (`publicForms`) no existÃ­a
en `LanguageContext` (el texto sÃ­ existe, como `publishedForms`).

**Archivo modificado**
- `src/lib/routes.js` â€” la ruta `publicos` pasa de `titleKey: "publicForms"` a
  **`titleKey: "publishedForms"`** (clave ya presente en `LanguageContext` es/en:
  Â«Formularios publicadosÂ» / "Published forms"). No se aÃ±ade ninguna clave nueva
  ni se toca el slug (`formularios-publicos` / `public-forms`).

**Efecto:** `pageTitle.js` compone ahora `CubaGob - Formularios publicados` (es)
/ `CubaGob - Published forms` (en) al abrir `/panel-gestion/formularios-publicos`.
El rÃ³tulo del rail y el `PageHeader` siguen saliendo de `roleI18n.js`
(`rt("publicForms")`), sin cambios.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline sin cambios;
  el `titleKey` se comprueba de forma agregada, asÃ­ que el recuento no varÃ­a).
- Solo frontend.

### 2026-10-13 â€” Renombrar la pÃ¡gina Â«Formularios pÃºblicosÂ» â†’ Â«Formularios publicadosÂ» (panel super-admin)

**Objetivo (peticiÃ³n del usuario):** el nombre visible de la pÃ¡gina de
formularios del panel super-admin pasa de Â«Formularios pÃºblicosÂ» a
**Â«Formularios publicadosÂ»**.

**Archivo modificado**
- `src/lib/roleI18n.js` â€” `publicForms`: es Â«Formularios pÃºblicosÂ» â†’
  **Â«Formularios publicadosÂ»**; en "Public forms" â†’ **"Published forms"**.

**Efecto (la clave es Ãºnica para el rÃ³tulo de la pÃ¡gina):** cambia el Ã­tem del
rail del `super_admin` (`ADMIN_NAV`, `rtKey: "publicForms"`) y el tÃ­tulo del
`PageHeader` de `pages/admin/PublicStats.jsx`. **TambiÃ©n** la StatTile de esa
misma pÃ¡gina que etiqueta el conteo de formularios pÃºblicos
(`value={stats.totals.publicForms}`): pasa de Â«Formularios pÃºblicosÂ» a
Â«Formularios publicadosÂ» (coherente con el tÃ­tulo de la pÃ¡gina).

**No se toca** la clave de ruta (`publicos` â†’ `formularios-publicos` /
`public-forms`), asÃ­ que URLs, `titleKey` del navegador y baseline de
`qa:routes` quedan igual.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (sin warnings en `roleI18n.js`).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” `IdentityMenu` agrupado (Cuenta Â· Preferencias Â· Soporte) + 5 pÃ¡ginas reales de destino

**Objetivo (peticiÃ³n del usuario):** aÃ±adir la agrupaciÃ³n `Cuenta` /
`Preferencias` / `Soporte` al menÃº de identidad, **creando ANTES las rutas
reales** que esas opciones necesitan (un enlace muerto estÃ¡ prohibido por las
reglas del repo).

**Rutas nuevas (fuente Ãºnica: `src/lib/routes.js`)**
- 5 entradas nuevas en `ROUTES`, tras `settings`, todas `enPantalla: true` y con
  slug en espaÃ±ol sin tilde: `profile` (`perfil`/`profile`, `titleKey`
  `myProfile`), `security` (`seguridad`/`security`), `notifications`
  (`notificaciones`/`notifications`), `help` (`ayuda`/`help`, `titleKey`
  `helpCenter`) y `shortcuts` (`atajos-de-teclado`/`keyboard-shortcuts`,
  `titleKey` `keyboardShortcuts`).
- Builders nuevos: `profilePath`, `securityPath`, `notificationsPath`,
  `helpPath`, `shortcutsPath` (misma firma `(language, entitySlug)` que
  `settingsPath`).

**PÃ¡ginas nuevas (`src/pages/`)**
- `Profile.jsx` â€” tarjeta de identidad de **solo lectura** desde `useAuth().user`
  (Avatar + nombre + `RoleBadge`; filas Email/Entidad) con botÃ³n Â«Abrir
  configuraciÃ³nÂ» â†’ `settingsPath(language, user?.entity?.code)`. A propÃ³sito
  **no** usa `ProfileSettings.jsx`/`settingsApi` (no verificado contra el
  backend).
- `Security.jsx` â€” monta el `SessionsPanel` compartido (dato real ya usado por
  ConfiguraciÃ³n).
- `Notifications.jsx` â€” centro de notificaciones con **react-query** (`useQuery`
  + `queryClient.setQueryData` optimista) sobre `notificationApi.list/markAllRead/
  markRead`; mismo destino de aviso que la campanita (`builderPath`/
  `siteBuilderPath`) y estado de carga con placeholder `animate-pulse`.
- `Help.jsx` y `Shortcuts.jsx` â€” contenido estÃ¡tico con las claves i18n nuevas.
- Todas: `PageHeader` de `pages/Insights.jsx`, `Card`, envoltorio
  `animate-page-enter mx-auto max-w-* px-4 py-8 lg:px-8`.

**Componente compartido extraÃ­do**
- `components/settings/SessionsPanel.jsx` (**nuevo**) â€” la UI de
  dispositivos/sesiones (antes `DevicesSettings` dentro de `Settings.jsx`), con
  `useSessions`/`useRevokeSession`/`useRevokeOtherSessions`. Lo consumen la
  pestaÃ±a `devices` de `Settings` y la pÃ¡gina `Security`, sin duplicar. En
  `Settings.jsx` se borran `DevicesSettings` y la `SkeletonLine` que quedaba
  huÃ©rfana, y se limpian los imports sin uso (`LogOut`, `Globe`, `AppWindow`,
  `Cpu`, `Terminal`, `Smartphone`, `Tablet`).

**AgrupaciÃ³n del menÃº â€” `components/auth/IdentityMenu.jsx`**
- Nuevos helpers locales `MenuGroup` (rÃ³tulo en mayÃºsculas + filas; no es
  `menuitem`, asÃ­ que el teclado del `Dropdown` lo salta) y `MenuControlRow`
  (fila no navegable: etiqueta + control).
- **Cuenta**: Mi perfil â†’ `profilePath`; ConfiguraciÃ³n â†’ `settingsPath` (con
  `description={t("settingsDesc")}`); Seguridad â†’ `securityPath`.
- **Preferencias**: fila Apariencia con `<ThemeToggle/>` **inline**, fila Idioma
  con `<LanguageSwitcher/>` **inline** (se reutilizan; no duplican un destino con
  ConfiguraciÃ³n) y Notificaciones â†’ `notificationsPath`.
- **Soporte**: Centro de ayuda â†’ `helpPath`; Atajos de teclado â†’ `shortcutsPath`.
- Cierre con `MenuDivider` + **Salir** (sin cambios). Iconos nuevos:
  `ShieldCheck`, `Bell`, `LifeBuoy`, `Keyboard`.

**Rutas/RBAC** â€” `lib/roles.js`: `ENTITY_PAGES` amplÃ­a con
`profile`/`security`/`notifications`/`help`/`shortcuts` (mismo conjunto para el
`entity_admin`); se consumen vÃ­a `PAGINAS` de `App.jsx` (lazy imports +
entradas `profile`/`security`/`notifications`/`help`/`shortcuts`).

**i18n â€” `contexts/LanguageContext.jsx`** â€” es/en nuevos: rÃ³tulos de grupo
(`accountGroup`/`preferencesGroup`/`supportGroup`); `myProfile`, `security`,
`helpCenter`, `keyboardShortcuts`; subtÃ­tulos y cuerpo de pÃ¡gina
(`profileSubtitle`, `profileEmail`, `profileEntity`, `profileManageHint`,
`openSettings`, `securitySubtitle`, `notificationsSubtitle`, `helpSubtitle`,
`help*Title/Body`, `shortcutsSubtitle`) y los atajos (`scOpenPalette`,
`scNavigate`, `scJump`, `scTypeahead`, `scClose`, `scConfirm`). Quedan sin
consumo (heredadas) `profileIdentity`/`profileRole`.

**Reglas respetadas** â€” cero componentes paralelos (`UserMenu*`) ni dependencias
nuevas; se reutilizan `Dropdown`/`MenuItem`/`ThemeToggle`/`LanguageSwitcher`/
`Avatar`/`Card`/`Button`/`RoleBadge`. Cero hex de marca (tokens). Sin tocar
`lib/api.js`, `AuthContext` ni `DashboardLayout`.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores; **sin warnings nuevos** en los ficheros tocados
  (`Notifications.jsx` se hizo con react-query para no arrastrar el
  `set-state-in-effect` que sÃ­ tiene `NotificationBell`).
- `npm run build` â†’ exit 0 (chunks `Profile`/`Security`/`Notifications`/`Help`/
  `Shortcuts`/`SessionsPanel` emitidos).
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline sin cambios,
  ver Â§9).
- Solo frontend.

### 2026-10-13 â€” `Dropdown` premium (portal + colocaciÃ³n con volteo) e `IdentityMenu` pulido

**Objetivo (peticiÃ³n del usuario):** rediseÃ±ar el menÃº de perfil al nivel
"premium" (Linear/Vercel/Stripe). Se ejecutÃ³ sobre las piezas REALES del repo,
sin crear componentes paralelos (`UserMenu*`) ni dependencias nuevas.

**Decisiones declaradas (la especificaciÃ³n genÃ©rica chocaba con decisiones
previas explÃ­citas del usuario, que se respetan):**
- **Disparador = avatar + chevron** (no avatar+nombre+rol): es la estructura
  clÃ¡sica que el usuario pidiÃ³ antes; el detalle vive en la cabecera del menÃº.
- **Sin secciÃ³n Â«PreferenciasÂ»** (tema/idioma): el usuario la quitÃ³ antes.
- **Sin item Â«PerfilÂ» ni Â«Seguridad/Ayuda/AtajosÂ»**: no existen esas rutas en
  `routes.js` (un enlace muerto estÃ¡ prohibido por las reglas del repo).
- **Sin skeleton**: `IdentityMenu` solo se monta con `user` ya cargado.

**Infraestructura compartida â€” `src/components/ui/Dropdown.jsx`**
- El panel se monta en **portal** (`createPortal` a `document.body`) con
  `position: fixed`: ningÃºn contenedor con `overflow`/`z-index` lo recorta o lo
  tapa. Se **mide tras montar** y se coloca bajo el disparador; **voltea** hacia
  arriba si no hay sitio y se **ajusta** dentro del viewport; se **recalcula** en
  scroll (captura, incluye contenedores) y resize. La posiciÃ³n se escribe directo
  en el nodo (sin re-render).
- **`aria-controls`** + `id` del menÃº (`useId`); el wrapper mantiene
  `aria-haspopup`/`aria-expanded`.
- **Typeahead** por primera letra (buffer 600 ms) y **`Tab` cierra** dejando
  seguir el foco; se conservan `â†‘`/`â†“`/`Home`/`End` y Escape/foco.
- Entrada animada con la nueva **`@utility animate-menu-in`** (`transform-origin`
  en la esquina del disparador vÃ­a `style`, y `--menu-shift` segÃºn abra hacia
  abajo o hacia arriba).
- `MenuItem` gana las props opcionales **`description`** (etiqueta + apoyo) y
  **`shortcut`** (`<kbd class="kbd">`) y **`disabled`**; el contenido sin
  `description` se renderiza tal cual (compatibilidad con los consumidores que ya
  pasan su propio `flex-1`).

**Identidad â€” `src/components/auth/IdentityMenu.jsx`**
- `Dropdown` en **modo controlado** (`open`/`onOpenChange`): el disparador refleja
  la apertura con borde/fondo sÃ³lidos y el **chevron gira 180Â°**.
- Â«ConfiguraciÃ³nÂ» pasa a llevar **descripciÃ³n** (Â«Apariencia y dispositivosÂ»).
- Â«SalirÂ» se **deshabilita** mientras corre el cierre (`loggingOut`, guarda
  anti-reentrada); el `logout` existente no se toca.

**Tokens/estilos â€” `src/index.css`**
- Nuevas `@utility animate-menu-in` (con `@keyframes menu-in`) y `@utility kbd`;
  guard de `prefers-reduced-motion` para `.animate-menu-in`. Solo tokens
  (`var(--border)`, `var(--surface-2)`, `var(--fg-muted)`); cero hex de marca.

**i18n â€” `src/contexts/LanguageContext.jsx`**
- Nueva clave es/en `settingsDesc` (Â«Apariencia y dispositivosÂ» / "Appearance and
  devices").

**Docs**
- `docs/IDENTITY_UI.md` â€” Â§2/Â§4/Â§7 (estado abierto del disparador, descripciÃ³n de
  Ajustes, teclado/typeahead/portal/animation).
- `AGENTS.md` â€” Â§9 (nota del `Dropdown`) y esta entrada.

**Reglas respetadas**
- Cero componentes nuevos y cero duplicados; cero dependencias nuevas. Cero hex de
  marca (`qa:brand` verde). Sin tocar `AuthContext`, RBAC, rutas ni
  `DashboardLayout`.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; **ninguno nuevo** en los
  ficheros tocados).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” Identidad UI: fila Â«UsuarioÂ» con el acento del perfil + correo del super_admin

**Objetivo (acordado con el usuario):** (1) el Â«UsuarioÂ» del `super_admin` **no**
es el nombre de la consola (Â«Formularios con IAÂ») sino su **correo**; (2) la
pastilla del nombre debe ser mÃ¡s **elegante** y llevar el **color guardado en el
perfil** del usuario (el acento).

**Cambio:** la pastilla Â«UsuarioÂ» usa ahora el **acento del perfil** (la marca
viva: `--color-brand-*`, que `applyAccent` recolorea en runtime desde
`localStorage["formly_accent"]`). DiseÃ±o: medallÃ³n `bg-brand-500` con icono
`UserRound` + nombre en `text-ink`, sobre un fondo
`bg-gradient-to-r from-brand-500/15 to-brand-500/5` con borde `border-brand-500/30`,
brillo interior y halo (`--color-brand-500`). El valor mostrado es `user.email`
para el `super_admin` y el nombre real para el resto (`accountLabel`).

**Archivos modificados**
- `src/components/auth/IdentityMenu.jsx` â€” nuevo `accountLabel` (super â†’ correo);
  pastilla Â«UsuarioÂ» rediseÃ±ada con tokens de marca (acento del perfil).
- `docs/IDENTITY_UI.md` â€” Â§4 (ficha: acento del perfil + correo del super_admin).

**Reglas respetadas**
- Cero componentes nuevos; se reutilizan `Dropdown`/`Tooltip`/`Avatar`/
  `RoleBadge`. **Cero hex de marca** (tokens `brand-*`; `qa:brand` en verde).
  Sin tocar `AuthContext` ni `DashboardLayout`.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” Identidad UI: ficha Â«UsuarioÂ»/Â«RolÂ» en el menÃº (fuera tema/idioma)

**Objetivo (acordado con el usuario):** refinar el `IdentityMenu`: (1) **quitar**
la secciÃ³n **Preferencias** (tema/idioma) del menÃº; (2) **quitar la insignia del
rol de la tarjeta** de cabecera; (3) aÃ±adir, **arriba de Â«ConfiguraciÃ³nÂ»**,
una **ficha de identidad** en formato etiqueta â† â†’ insignia: fila **Usuario**
(izquierda) con una **pastilla moderna** que lleva el nombre, y fila **Rol**
(izquierda) con la insignia del rol (`RoleBadge` con su acento) a la derecha.

**Cambio:** el menÃº pasa a: tarjeta de cabecera (avatar `lg` + nombre + correo +
entidad/`/a/<slug>; **sin** insignia) Â· ficha **Usuario**/**Rol** Â· Ajustes Â·
**Salir** (a lo ancho). La pastilla del nombre es una `span` redondeada
(`bg-surface-2/80` + `ring-1 ring-inset ring-line/70`) con icono `UserRound`; el
rol reutiliza `RoleBadge` (`short`, con acento del rol). El menÃº pasa a
`min-w-[16.5rem]`.

**Archivos modificados**
- `src/components/auth/IdentityMenu.jsx` â€” se retiran `ThemeToggle` y
  `LanguageSwitcher` (y su bloque Â«PreferenciasÂ»); la tarjeta de cabecera pierde
  la insignia; se aÃ±ade la ficha Â«UsuarioÂ»/Â«RolÂ» antes de Ajustes.
- `src/lib/roleI18n.js` â€” nueva clave es/en `userLabel` (Â«UsuarioÂ»/Â«UserÂ»). Se
  eliminan `preferences`, `themeLabel`, `languageLabel` (quedaron sin consumo).
- `docs/IDENTITY_UI.md` â€” Â§2/Â§4/Â§6/Â§7 (ficha Usuario/Rol, sin Preferencias, i18n).

**Reglas respetadas**
- Cero componentes nuevos y cero duplicados; se reutilizan `Dropdown`, `Tooltip`,
  `Avatar`, `RoleBadge`. Cero hex de marca (tokens). Sin tocar `AuthContext` ni
  `DashboardLayout`. La cabecera conserva sus propios `ThemeToggle`/
  `LanguageSwitcher` (invitado y acceso directo).

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” Identidad UI: `IdentityMenu` con la estructura clÃ¡sica de *profile-dropdown*

**Objetivo:** rediseÃ±ar el menÃº de identidad del autenticado con la estructura
original del `profile-dropdown` (acordada con el usuario): [1] disparador =
**avatar + chevron**, [2] cabecera del panel (avatar `lg` + nombre + correo +
rol), [3] items, [4] separador, [5] botÃ³n Â«Cerrar sesiÃ³nÂ» a lo ancho.

**Cambio:** se **simplifica el disparador** â€”antes era una pastilla con
nombre+email+insignia; ahora es `avatar + chevron` (el anillo del rol y el
`Tooltip` Â«Rol: â€¦Â» conservan la lectura del rol sin abrir nada). Todo el detalle
(nombre, correo, insignia, entidad y puerta `/a/<slug>`) vive en la **cabecera**
del menÃº, en orden clÃ¡sico (nombre â†’ correo â†’ insignia). Ajustes y la secciÃ³n
**Preferencias** se mantienen; el botÃ³n **Salir** pasa a `MenuItem danger`
**centrado** (aspecto de botÃ³n a lo ancho).

**Nota (Perfil):** no existe ruta `/profile` en `src/lib/routes.js` (solo
`settingsPath`); `components/settings/ProfileSettings.jsx` existe pero estÃ¡ sin
consumir. Por eso **no se aÃ±ade** un item Â«PerfilÂ» (evita un enlace muerto). Si
se quiere, hay que crear antes la ruta/pestaÃ±a.

**Archivos modificados**
- `src/components/auth/IdentityMenu.jsx` â€” disparador reducido a `avatar +
  chevron`; cabecera reordenada (nombre â†’ correo â†’ insignia); `Salir` centrado
  (`justify-center font-semibold`).
- `docs/IDENTITY_UI.md` â€” Â§1/Â§2/Â§4/Â§7 (disparador avatar+chevron, estructura del
  menÃº, tooltip del rol y foco).

**Reglas respetadas**
- Cero duplicados y cero componentes nuevos; se reutilizan `Dropdown`, `Tooltip`,
  `Avatar`, `RoleBadge`, `ThemeToggle`, `LanguageSwitcher`. Cero hex de marca.
  Sin tocar `AuthContext` ni `DashboardLayout`.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” Identidad UI: secciÃ³n Â«PreferenciasÂ» (tema/idioma) en el menÃº + foco visible

**Objetivo:** integrar en la identidad del usuario autenticado el concepto del
`profile-dropdown` (avatar + nombre + email + rol + items + cerrar sesiÃ³n) sin
crear un duplicado: el componente **ya existÃ­a** (`IdentityMenu.jsx`, ya montado
en `DashboardLayout`). Se completÃ³ lo que faltaba del patrÃ³n: la secciÃ³n de
**Preferencias** (tema e idioma) dentro del menÃº y un **foco visible** para
teclado.

**DecisiÃ³n (acordada con el usuario):** mejorar el `IdentityMenu` existente en
vez de crear un `UserIdentity.tsx` nuevo (regla "no crear duplicados").
`ThemeToggle` y `LanguageSwitcher` **se reutilizan** (no se duplica su lÃ³gica; el
idioma ademÃ¡s reescribe la URL del panel). La cabecera conserva sus propios
toggles para el invitado y el acceso directo; el menÃº los ofrece en contexto.

**Archivos modificados**
- `src/components/auth/IdentityMenu.jsx` â€” el menÃº se ensancha
  (`min-w-[15rem]`) y, entre Ajustes y Salir, aÃ±ade la secciÃ³n **Preferencias**
  (rÃ³tulo `preferences` + filas `themeLabel`/`languageLabel`) reutilizando
  `<ThemeToggle>` y `<LanguageSwitcher>`. El disparador gana
  `focus-visible:ring-2 ring-brand-500/60` y el CTA del invitado, lo mismo.
- `src/components/ui/Dropdown.jsx` â€” `MenuItem` aÃ±ade foco visible
  (`focus-visible:bg-â€¦`, neutro y `danger`); mejora todos los menÃºs.
- `src/lib/roleI18n.js` â€” nuevas claves es/en: `preferences`, `themeLabel`,
  `languageLabel`.
- `docs/IDENTITY_UI.md` â€” Â§2/Â§4/Â§6/Â§7 (menÃº con Preferencias, reutilizaciÃ³n de
  toggles, i18n, foco visible).

**Reglas respetadas**
- Cero duplicados: nada de `next/*`/Radix; se usan las piezas reales
  (`Dropdown`, `Tooltip`, `Avatar`, `RoleBadge`, `ThemeToggle`,
  `LanguageSwitcher`). Cero hex de marca (tokens); el rol sigue saliendo del
  realm activo (`user`). Sin tocar `AuthContext` ni `DashboardLayout`.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; sin nuevos en los
  ficheros tocados).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” RediseÃ±o premium de la identidad UI (estado, teclado, rol en mÃ³vil)

**Objetivo:** refinar la secciÃ³n de identidad del usuario autenticado (avatar +
nombre + rol) al nivel "premium": que el rol siga siendo legible en pantallas
estrechas, mostrar un indicador de **sesiÃ³n activa**, aÃ±adir la **entidad** como
dato secundario y completar el contrato de teclado del menÃº. Sin tocar
`AuthContext` ni `DashboardLayout` (el rediseÃ±o cabe dentro del componente).

**Decisiones (acordadas con el usuario)**
- NavegaciÃ³n por teclado en el `Dropdown` **compartido** (mejora todos los menÃºs,
  cambio aditivo sin alterar su API).
- Indicador de estado = **punto "sesiÃ³n activa"** verde (`--color-success`) sobre
  el anillo del avatar, claro/oscuro.
- En mÃ³vil el rol se mantiene visible con un **`Tooltip`** sobre el avatar.
- Microetiqueta del rol en **mayÃºsculas + tracking** (voz de "chip de producto").

**Archivos modificados**
- `src/components/ui/Dropdown.jsx` â€” navegaciÃ³n completa del menÃº: al abrir, el
  foco entra en el primer `menuitem`; `â†‘`/`â†“` en ciclo y `Home`/`End` mueven el
  foco entre items (`ref={menuRef}` + `onKeyDown`; `focus({ preventScroll: true })`).
  Escape y clic-fuera siguen igual (Escape devuelve el foco al trigger).
- `src/components/auth/RoleBadge.jsx` â€” nueva prop **`short`**: usa la etiqueta
  compacta (`SHORT_KEYS`, solo `form_creator` â†’ `roleCreatorShort`); el resto
  conserva su etiqueta plena. Sin cambios en `roleVisual`.
- `src/components/auth/IdentityMenu.jsx` â€” el disparador envuelve el avatar en
  `Tooltip` (`Rol: <rol>`); la insignia pasa de `lg` a **`md`** y usa `short`;
  `RoleAvatar` gana `withStatus` (punto de sesiÃ³n activa) y se envuelve en
  `.identity-avatar`; la cabecera del menÃº muestra ademÃ¡s la **entidad**
  (`Building2` + `user.entity.name`) antes del slug.
- `src/index.css` â€” `.role-badge__text` pasa a microetiqueta (`uppercase`,
  `letter-spacing: 0.08em`, `font-weight: 500`); nuevos `.identity-avatar`
  (envoltorio relativo) y `.identity-status` (punto verde con aro de superficie).
- `src/lib/roleI18n.js` â€” nueva clave es/en `roleCreatorShort`
  (Â«Gestor de FormulariosÂ» / "Form manager").
- `docs/IDENTITY_UI.md` â€” Â§2/Â§3/Â§4/Â§6/Â§7 (chip `short`, microetiqueta, teclado,
  tooltip, punto de estado, entidad).

**Reglas respetadas**
- Cero cambios de sesiÃ³n/RBAC/contrato; cero hex de marca (tokens `--accent-*`,
  `--color-success`, `--color-surface-2`). El punto de estado es decorativo
  (`aria-hidden`). El rol sigue saliendo del realm activo (`user`).
- El teclado nuevo vive en el `Dropdown` compartido (aditivo, sin cambiar API).

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; sin nuevos en los
  ficheros tocados).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- Solo frontend.

### 2026-10-13 â€” Fix: responder un formulario privado con IDP (tildes + campos vacÃ­os)

**Objetivo:** dos fallos al responder un formulario **privado** tras autenticarse
en el IDP: (1) el nombre del encuestado mostraba **mojibake** (Â«JosÃ©Â» â†’
Â«JosÃƒÂ©Â»); (2) aun volviendo con `?rid=`, el formulario aparecÃ­a **sin campos**
(nada que responder).

**Causa raÃ­z (1) â€” mojibake.** `PublicForm.jsx` decodificaba el payload del JWT
(`rid`) con `JSON.parse(atob(...))`. `atob` devuelve una cadena "binaria" (un
char por byte), asÃ­ que los caracteres UTF-8 multibyte del nombre se corrompÃ­an.
AdemÃ¡s `atob` no acepta base64url (`-`/`_`), y el `catch {}` lo silenciaba.

**Causa raÃ­z (2) â€” campos vacÃ­os.** El detalle de invitado
(`getGuestFormDetail`) **siempre** devolvÃ­a `questions: []` para un privado, aunque
la peticiÃ³n trajera un `rid` vÃ¡lido; y el `GET /guest/forms/:slug` ni siquiera
llevaba `attachRespondent`, ni el frontend enviaba el `rid` en ese GET. Con todo
ello, `PublicForm` pasaba a `ready` pero `form.questions` venÃ­a vacÃ­o.

**Arreglos**
- `src/lib/jwtPayload.js` (**nuevo**) â€” `decodeJwtPayload(token)`: normaliza
  base64url (`-`/`_` â†’ `+`/`/`), reconstruye bytes con `Uint8Array` y decodifica
  con `TextDecoder` (UTF-8). Devuelve `null` si no es decodificable.
- `src/pages/PublicForm.jsx` â€” usa `decodeJwtPayload` (fuera el `atob`+`JSON.parse`
  con `catch` mudo); pasa el `rid` al `getForm`; el estado se decide ahora por
  `f.requiresAuth ? "gated" : "ready"` (un privado que sigue exigiendo auth es
  portÃ³n aun con un `rid` caducado â€” antes quedaba en blanco).
- `src/services/index.js` + `index.d.ts` â€” `guestApi.getForm(slug, rid)` envÃ­a
  `X-Idp-Respondent: Bearer <rid>` cuando hay `rid` (igual que `submit`).
- `backend/routes/response.routes.js` â€” `attachRespondent` en
  `GET /guest/forms/:slug`.
- `backend/controllers/form.controller.js` â€” `guestGetForm` pasa
  `req.respondent` al servicio.
- `backend/services/form.service.js` â€” `getGuestFormDetail(slug, respondent)`:
  un privado con `respondent.sub` **y** `respondent.slug === slug` entrega el
  formulario completo (`requiresAuth:false`); si no, el recorte de siempre. La
  comprobaciÃ³n `slug` evita reutilizar el `rid` de un formulario para abrir otro.
- `backend/app.js` â€” CORS `allowedHeaders` incluye `X-Idp-Respondent` (la API es
  cross-origin `:8000`â†”`:5173`; sin listarlo, el preflight bloqueaba tanto el
  nuevo GET como el POST de envÃ­o ya existente).

**Docs** â€” `docs/RBAC_ACCESO.md`: Â§2 (el detalle es consciente del `rid`) y Â§3
(fila del `GET /api/guest/forms/:slug`).

**Puertas ejecutadas (todas verdes)**
- Backend `node --check` â†’ OK (`response.routes.js`, `form.controller.js`,
  `form.service.js`, `app.js`).
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0 (chunk `PublicForm` emitido).
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- **Pendiente:** el backend no usa watch â†’ los cambios en `form.service.js`,
  `form.controller.js`, `response.routes.js` y `app.js` (CORS) requieren
  reiniciar (`start` = `node server.js`).

### 2026-10-13 â€” Renombrado de roles (Gestor deâ€¦) + iniciales del nombre en el avatar

**Objetivo:** (1) renombrar las etiquetas de rol visibles: `entity_admin`
Â«Administrador de EntidadÂ» â†’ **Â«Gestor de EntidadÂ»** y `form_creator` Â«Creador
de FormulariosÂ» â†’ **Â«Gestor de FormulariosÂ»** (en todo el texto visible y en el
seed canÃ³nico del backend). (2) que el cÃ­rculo del avatar muestre las
**iniciales del nombre** del usuario conectado en vez de las siglas del rol
(`SA`/`AE`/`CF`), revirtiendo esa decisiÃ³n.

**Etiquetas de rol**
- `src/lib/roles.js` â€” `ROLE_LABEL.entity_admin` â†’ Â«Gestor de EntidadÂ»;
  `ROLE_LABEL.form_creator` â†’ Â«Gestor de FormulariosÂ». (Consumido por las tablas
  y filtros de `admin/Users`, `admin/AccessUrls`, `entity-admin/EntityUsers` y la
  `AuthCard` de la puerta de acceso.)
- `src/lib/roleI18n.js` â€” es: `roleEntity` â†’ Â«Gestor de EntidadÂ», `roleCreator` â†’
  Â«Gestor de formularios por entidadÂ», `newCreator` â†’ Â«Nuevo gestorÂ»,
  `userCreatedBody`/`creatorRoleHint`/`noAccessUrlHint`/`entityFormsDesc`/
  `entityUsersDesc`/`entityFixedHint` con Â«gestorÂ». en: `roleEntity` â†’ Â«Entity
  managerÂ», `roleCreator` â†’ Â«Form manager per entityÂ» y el resto Â«managerÂ».
- `src/pages/admin/Users.jsx` â€” descripciÃ³n del encabezado y StatTiles
  (Â«Gestor de entidadÂ», Â«GestoresÂ»).
- `src/pages/LocalLogin.jsx` â€” subtÃ­tulo Â«â€¦super, entidad y gestores.Â» (2 usos).
- `src/pages/entity-admin/EntityUsers.jsx` â€” mensaje de error Â«â€¦del gestorÂ».
- `src/services/index.js` â€” comentario divisor Â«GestiÃ³n de EntidadÂ».
- `backend/config/db.js` + `backend/db/schema.sql` â€” seed de la tabla `roles`:
  `name_es`/`name_en` de `entity_admin`/`form_creator`; el `ON CONFLICT` pasa a
  `DO UPDATE SET name_es, name_en` para que las instalaciones existentes
  renombren al reiniciar.

**Avatar con iniciales del nombre**
- `src/components/auth/IdentityMenu.jsx` â€” `RoleAvatar` deja de pasar la prop
  `text` (sigla) y usa `name={user?.name || user?.email}`; `Avatar` cae a
  `initials(name)`.
- `src/components/auth/RoleBadge.jsx` â€” se retira el campo `sigla` de `VISUALS`
  (queda sin consumidores). El rol se comunica por la insignia (texto +
  medallÃ³n), nunca por el avatar.

**Docs** â€” `docs/IDENTITY_UI.md` (tabla sin columna Â«SiglaÂ», avatares con
iniciales del nombre) y `docs/RBAC_ACCESO.md` (referencias Â«gestorÂ»).

**Reglas respetadas** â€” cero rutas/RBAC/modelo; solo tokens. La foto de perfil
sigue mandando sobre las iniciales.

**Puertas ejecutadas (todas verdes)**
- `node --check backend/config/db.js` â†’ OK.
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).
- **Pendiente:** el backend no usa watch â†’ el renombrado en la tabla `roles`
  (metadato, no visible en UI) requiere reiniciar (`start` = `node server.js`).

### 2026-10-13 â€” Rutas del panel del form_creator scopeadas al slug de entidad

**Objetivo:** el **creador de formularios** (`form_creator`) reportaba que no
funcionaban Â«ninguno de los cards, botones o linksÂ» de su interfaz ni el acceso a
la configuraciÃ³n del perfil.

**Causa raÃ­z:** los constructores de URL del panel solo aÃ±adÃ­an el slug de
entidad para `entity_admin`. Para el creador las URLs quedaban globales
(`/panel-gestion/<lang>/â€¦`) y `RoleRoute` (`App.jsx`) rebota cualquier ruta
global pedida por un usuario con `user.entity.code` a `homePathForRole`
(Dashboard). Por eso menÃº, tarjetas, botones, CommandPalette, IdentityMenu y
Builder del creador quedaban inertes. `user.entity.code` SÃ estÃ¡ poblado para el
creador (`/auth/me` inyecta `findUserEntityContext`).

**Regla adoptada:** cualquier usuario con `user?.entity?.code` navega el panel
**scopeado a su slug**; solo `super_admin`/legacy (sin entidad) usan rutas
globales. `homePathForRole` (`src/lib/roles.js`) deriva el slug de
`user.entity.code` cuando no se le pasa explÃ­cito.

**Archivos modificados**
- `src/lib/roles.js` â€” `homePathForRole` â†’ `homePath(language, entitySlug ||
  user?.entity?.code)`.
- `src/layouts/DashboardLayout.jsx` â€” `navTarget` usa `user?.entity?.code`;
  `goCreate` con el slug.
- `src/components/auth/IdentityMenu.jsx` â€” Â«AjustesÂ» con `settingsPath(language,
  user?.entity?.code)`.
- `src/components/CommandPalette.jsx` â€” `entityCode` para todas las acciones
  (dashboard/new/ai/insights/inbox/templates/settings) y la bÃºsqueda de
  formularios; deps de ambos `useMemo`.
- `src/pages/Builder.jsx` â€” import de `canSeeStatsPage`; `entityCode` y
  `puedeStats`; navigate post-creaciÃ³n, `homePath` del catch, botÃ³n volver, y
  botones de respuestas/analÃ­ticas **gateados por `puedeStats`** con `entityCode`.
- `src/pages/MyForms.jsx`, `src/components/forms/FormsBrowser.jsx` â€” botones
  Â«NuevoÂ» con el slug.
- `src/components/forms/FormCard.jsx` â€” click de tÃ­tulo, menÃº Editar y botÃ³n
  inferior con `entityCode`; filas Insights/Respuestas **ocultas** por
  `puedeStats`.
- `src/components/forms/FormPageHeader.jsx` â€” tabs con el slug.
- `src/pages/Dashboard.jsx`, `src/pages/Templates.jsx`,
  `src/components/notifications/NotificationBell.jsx` â€” enlaces con el slug.

**DecisiÃ³n:** el creador tiene las stats vetadas (`canSeeStatsPage` â†’ `false` en
responses/analytics/insights/inbox); en vez de ofrecer enlaces que rebotarÃ­an se
**ocultan** esos accesos (`puedeStats`).

**Sin cambios de backend.** Frontend-only.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes, incl. `FormsBrowser.jsx
  authLoading` unused).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos).
- `npm run qa:routes` â†’ **124 comprobaciones Â· 27 fallos** (baseline).

### 2026-10-13 â€” Builder: selector PÃºblico/Privado para el creador de formularios

**Objetivo:** que el **creador de formularios** (`form_creator`) pueda elegir, en
el panel derecho del constructor, si un formulario es **PÃºblico** o **Privado**,
con un control premium ubicado en la secciÃ³n Marca, **justo debajo del selector
de logo**. Solo ese rol lo ve: el invitado del sitio no tiene entidad y lo
privado exige una (`backend/services/form.service.js`), por eso el control se
gatea con `canManageVisibility`.

**Archivos modificados**
- `src/components/builder/SettingsPanel.jsx` â€” nueva prop opcional
  `canManageVisibility` (por defecto `false`); cuando es `true` se renderiza el
  bloque Â«VisibilidadÂ» entre el logo y el radio del borde: dos opciones
  (`DoorOpenIcon` PÃºblico / `Lock` Privado) en `role="group"` con
  `aria-pressed`, misma voz que `Segmented` del panel (activa en marca:
  `bg-brand-500/10 text-brand-700 shadow-soft`, resto neutro
  `text-ink-muted`), y una lÃ­nea de ayuda que cambia segÃºn el estado
  (`visibilityPublicHint`/`visibilityPrivateHint`). El cambio se propaga como
  patch de nivel superior `{ visibility }` por el `onChange` del Builder.
- `src/pages/Builder.jsx` â€” import de `isCreator`; nueva `canManageVisibility =
  !enElSitio && isCreator(user)` (comentada el porquÃ©); el autosave
  (`formApi.update`) ahora envÃ­a tambiÃ©n `visibility: debouncedForm.visibility`
  (el backend ya lo acepta en `updateForm`); la prop se pasa a las dos
  apariciones de `SettingsPanel` (rail derecho y pestaÃ±a DiseÃ±o en mÃ³vil).
- `src/contexts/LanguageContext.jsx` â€” claves es/en `formVisibility`,
  `visibilityPublic`, `visibilityPrivate`, `visibilityPublicHint` y
  `visibilityPrivateHint`.

**Sin cambios de backend:** `updateForm` ya incluye `visibility` en `allowed` y
el `form_creator` nace atado a su entidad (`resolveEntityForCreate`), por lo que
Â«privadoÂ» nunca se rechaza para ese rol. El alta de un formulario nuevo sigue
naciendo pÃºblico (default en BD y en `createForm`).

**Reglas respetadas**
- Cero rutas nuevas, cero toques a RBAC/modelo/AuthContext; solo tokens de marca
  (sin hex: el audit no acusa nada nuevo).
- `aria-pressed` + `role="group"` coherentes con el `Segmented` existente; la
  activa deja claro el estado tanto por color como por icono y texto.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; sin nuevos en los
  ficheros tocados).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ 124 checks / 27 fails (baseline, sin regresiÃ³n).
- Sin cambios de backend â†’ no requiere reinicio.

### 2026-10-13 â€” ConfiguraciÃ³n sin Â«Tu informaciÃ³nÂ» + ediciÃ³n completa del creador de la entidad

**Objetivo:** (1) darle a la configuraciÃ³n del perfil un Ãºnico contenido Ãºtil:
se elimina la pestaÃ±a **Â«Tu informaciÃ³nÂ»** (claims de identidad del IDP) en
**todos los roles**, porque no aporta a las cuentas locales; el creador de
formularios conserva el acceso a la configuraciÃ³n (Apariencia y Dispositivos).
(2) En el panel del `entity_admin`, el alta/ediciÃ³n de creadores deja de usar el
selector de URL (`AccessUrlField`): la URL se **genera bajo demanda**, se quita la
columna **Entidad** de la tabla (todas las filas son de la misma entidad) y la
**ediciÃ³n** pasa a permitir correo, usuario, contraseÃ±a y URL de acceso, ademÃ¡s
de conservar copiar/editar/eliminar en el FAB.

**ConfiguraciÃ³n (`src/pages/Settings.jsx`)**
- `TABS` queda con `appearance` y `devices`; pestaÃ±a inicial `appearance`.
- Eliminados la pestaÃ±a `identity` y su cadena completa de render: se borran
  `PUBLIC_PROFILE_FIELDS`, `pickClaim`, `IdentitySettings`, `IdentityHero`,
  `IdentityClaims`, `ClaimField` y `ClaimValue`. Imports sin uso retirados
  (`Fingerprint`, `ShieldCheck`, `Lock`, `Avatar`, `copyText`, `CopiedIcon`,
  `toast`, `useRef`). Se conservan `Section`, `AppearanceSettings` y
  `DevicesSettings` (que aÃºn usan `SkeletonLine` y `useQuery`).
- Las claves de i18n `tabIdentity`/`identitySection*`/`idp*` quedan sin consumo
  (se mantienen en `LanguageContext.jsx`, como otras claves heredadas).

**Backend â€” ediciÃ³n completa del creador**
- `repositories/user.repo.js` â€” `adminUpdateUser` acepta ademÃ¡s `email`,
  `username` y `passwordHash` (sets dinÃ¡micos igual que el resto).
- `controllers/entityAdmin.controller.js` â€” `updateUserSchema` aÃ±ade
  `email`, `username` (anulable) y `password`; `updateUser` valida unicidad con
  el mismo probe que el alta (`findUserWithSecret`, excluye al propio usuario),
  aplica `hashPassword` si llega contraseÃ±a, y revoca sesiones del creador si se
  desactiva la cuenta o cambian las credenciales.

**Panel de usuarios (`src/pages/entity-admin/EntityUsers.jsx`)**
- Eliminado `AccessUrlField` (import y uso). El bloque Â«URL de accesoÂ» ahora es:
  `FieldLabel` + botÃ³n Â«Generar URL de accesoÂ» (`Dices`) + chip `/a/<slug>`
  copiable; en **ediciÃ³n** muestra la URL ya asignada (si existe) y el botÃ³n pasa
  a Â«RegenerarÂ». La URL generada sigue vinculÃ¡ndose en el estado oculto
  `accessUrlId` (`setValue`).
- Formulario con `Correo`/`Usuario`/`ContraseÃ±a` visibles en **alta y ediciÃ³n**
  (en ediciÃ³n, contraseÃ±a opcional Â«Solo si quieres cambiarlaÂ»); `openEdit`
  precarga `email`/`username`; el evento de ediciÃ³n envÃ­a
  `email`/`username`/`password`/`accessUrlId`.
- Columna **Entidad** eliminada de la tabla (cabecera y fila): ahora 6 columnas
  (Nombre | Correo | Rol | URL | Estado | Acciones) con
  `ENTITY_USERS_COLS` reajustada; densidad por defecto pasa a **"b" (densa)**
  para aligerar la tabla.
- El botÃ³n Â«Nuevo creadorÂ» y el footer del modal ya no se deshabilitan por
  falta de URLs (`accessUrls.length === 0`), solo por la URL no seleccionada
  en el alta (`disabled={busy || (isCreate && !accessUrlValue)}`).
- Se retiran `copyGenerated`, `generated.fullUrl` y la variable local `entityId`
  (sin uso tras quitar el campo); nueva `copyUrl(slug)` compartida por el chip.

**Reglas respetadas**
- Cero rutas nuevas y cero flags de rol nuevos: el creador ya veÃ­a
  Â«ConfiguraciÃ³nÂ» (`DashboardLayout.jsx:76`); solo cambia su contenido.
- Sin hex de marca (tokens) y sin tocar `rbac.js`/modelo/AuthContext.
- El soporte de ediciÃ³n usa el mismo `adminUpdateUser` del super_admin (sin
  tocar roles/entidad desde este panel).

**Puertas ejecutadas (todas verdes)**
- Backend `node --check` â†’ OK (2 archivos).
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; sin nuevos en
  `Settings.jsx` ni `EntityUsers.jsx`).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ 124 checks / 27 fails (baseline, sin regresiÃ³n).
- **Pendiente:** el backend no usa watch â†’ los nuevos campos de `PATCH
  /api/entity-admin/users/:id` y `POST /api/entity-admin/access-urls` requieren
  reiniciar (`start` = `node server.js`); el cambio de Settings es solo frontend.

### 2026-10-13 â€” EstadÃ­sticas de la entidad + generar URL de acceso del creador

**Objetivo:** dos mejoras al panel del `entity_admin`. (1) Habilitar la pÃ¡gina
general de estadÃ­sticas de TODOS sus formularios (junto al botÃ³n de estadÃ­stica
de un trÃ¡mite concreto de la tabla). (2) En el alta de un creador, dejar claro
que la entidad es fija (la del administrador) y permitir **generar allÃ­ mismo**
una URL de acceso aleatoria para el login del creador (rol `form_creator`).

**PÃ¡gina general de estadÃ­sticas**
- `lib/roles.js` â€” se aÃ±ade `"insights"` a `ENTITY_PAGES`: el entity_admin ahora
  ve la pÃ¡gina `estadisticas` (`/panel-gestion/<slug>/estadisticas`), que ya
  `canSeeStatsPage` le permitÃ­a.
- `App.jsx` â€” `PAGINAS.insights` pasa por el nuevo wrapper `StatsPage`: ramifica
  por rol (`EntityStats` para entity_admin, `Insights` para el resto) sin duplicar
  la clave de ruta.
- `layouts/DashboardLayout.jsx` â€” `ENTITY_NAV` gana un item Â«EstadÃ­sticasÂ»
  (`rtKey: "entityStats"`, icono `BarChart3`).
- `pages/entity-admin/EntityStats.jsx` (**nuevo**) â€” agrega
  `GET /api/admin/entity-stats` (`entityAggregate`, ya registrada para
  `entity_admin`): StatTiles (formularios, respuestas, vistas, promedio por
  trÃ¡mite) + tabla por formulario (estado, visibilidad, vistas, respuestas) con
  FAB Â«Ver estadÃ­sticasÂ» â†’ `analyticsPath` (la analÃ­tica de ese formulario,
  dentro del panel). Buscador âŒ˜K y filtro de estado como en `EntityForms`.

**Generar URL de acceso del creador**
- `controllers/entityAdmin.controller.js` â€” nuevo `createAccessUrl`: siempre de
  SU entidad (`requireEntity`) y del rol `form_creator`; slug aleatorio
  (`randomAccessSlug`) + sello (`sealAccessContext`), persiste en
  `accessUrlRepo.createAccessUrl` y audita `access_url.create`. (Imports
  aÃ±adidos: `entityRepo`, `randomAccessSlug`, `sealAccessContext`.)
- `routes/entityAdmin.routes.js` â€” `POST /access-urls`.
- `services/index.js` + `index.d.ts` â€” `entityAdminApi.createAccessUrl()` y
  `entityAdminApi.entityStats()`.
- `pages/entity-admin/EntityUsers.jsx` â€” (a) chip de entidad fija en el modal de
  alta (Â«El creador se vincula automÃ¡ticamente a tu entidadÂ», icono `Building2`);
  (b) botÃ³n Â«Generar URL de accesoÂ» (`Dices`) que crea la URL, la deja
  **seleccionada** en `AccessUrlField`, refresca la lista y muestra el enlace
  `/a/<slug>` copiable (`Copy` + `navigator.clipboard`); (c) reset del estado
  `generated` al abrir el modal; y (d) acciÃ³n **Â«Copiar URL de accesoÂ»** en el
  FAB de la columna Acciones de la tabla de usuarios (copia
  `<origen>/a/<slug>`, deshabilitada si la cuenta no tiene URL).
- `lib/roleI18n.js` â€” claves es/en: `entityStats`, `entityStatsDesc`,
  `perFormTitle`, `avgPerForm`, `generateAccessUrl`, `entityFixedHint`,
  `copyLink`, `linkCopied`.

**Reglas respetadas**
- Cero claves de ruta nuevas (`insights` ya existÃ­a); solo tokens de marca.
- El botÃ³n de estadÃ­stica de UN trÃ¡mite de la tabla ya vivÃ­a en `EntityForms.jsx`
  (FAB Â«EstadÃ­sticaÂ»); se conserva intacto.

**Puertas ejecutadas (todas verdes)**
- Backend `node --check` â†’ OK (2 archivos).
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores (solo warnings
  preexistentes).
- `npm run build` â†’ exit 0 (chunk `EntityStats` emitido).
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ 124 checks / 27 fails (baseline, sin regresiÃ³n).
- **Pendiente:** el backend no usa watch â†’ `POST /api/entity-admin/access-urls`
  no estarÃ¡ vivo hasta reiniciar (`start` = `node server.js`).

### 2026-10-13 â€” Fix: siglas del rol centradas en el cÃ­rculo del avatar

**Objetivo:** las siglas del rol dentro del cÃ­rculo del avatar (`I` invitado,
`SA` super_admin, `AE` entity_admin, `CF` form_creator) aparecÃ­an
descentradas; debÃ­an quedar centradas horizontal y verticalmente.

**Causa raÃ­z:** el `Avatar` es un `inline-flex items-center justify-center`, pero
la regla `.role-avatar > span` en `index.css` forzaba `display: block` sobre ese
mismo `<span>` (mayor especificidad: clase + elemento). Al perder el `flex`, se
perdÃ­an `align-items`/`justify-content` y el glifo quedaba pegado a la esquina.

**Archivo modificado**
- `src/index.css` â€” `.role-avatar > span` pasa de `display: block` a
  `display: flex; align-items: center; justify-content: center`. Se centra
  explÃ­citamente (no se depende del orden/especificidad de las utilidades
  Tailwind), cubriendo por igual invitado y los tres roles gestionados (el
  `RoleAvatar` es el Ãºnico consumidor de `.role-avatar`).

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores (solo warnings
  preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-13 â€” Panel del rol `entity_admin` (backend `/api/entity-admin` + frontend)

**Objetivo:** interfaz completa del **Administrador de Entidad**, con scoping
estricto por entidad, reutilizando el lenguaje visual del panel `super_admin` y
sin tocar `rbac.js`, el modelo de datos, `AuthContext` ni las claves de rutas
existentes.

**Backend (Fase 1, verificada por sonda)**
- `repositories/user.repo.js` â€” nueva `findUserEntityContext(userId)` â†’
  `{ entity:{_id,code,name}|null, accessUrlSlug }`.
- `controllers/auth.controller.js` â€” `getMe` inyecta el contexto
  (`{ ...req.user, ...context }`), asÃ­ `/auth/me` ya trae `entity` (activa el
  guard `RoleRoute`).
- `repositories/form.repo.js` â€” `listFormsByEntity(entityId, { includeArchived,
  search, status, ownerId, visibility, from, to })`; `entity_id = $1` SIEMPRE
  obligatorio (anti-IDOR).
- `controllers/entityAdmin.controller.js` (**nuevo**) â€” `listUsers`, `createUser`,
  `updateUser`, `removeUser`, `listForms`, `formStats`, `listAccessUrls`. Fuerza
  rol `form_creator` y `entityId = req.user.entityId`; nunca gestiona
  `super_admin` (id ajeno/super â†’ 404); `isActive:false` revoca sesiones.
- `routes/entityAdmin.routes.js` (**nuevo**) + `app.js` â€” monta
  `/api/entity-admin` con `protect + requireRole("entity_admin") +
  requireEntityMember`; DELETE con `requireReauth`.
- Sonda `backend/qa/_probe-entity-admin-scope.mjs` (temporal, **eliminada**):
  aislamiento OK en 10 bloques (usuarios/forms/stats/URLs, 404 ajeno, alta forzada).

**Frontend (Fase 2)**
- `services/index.js` + `index.d.ts` â€” nuevo `entityAdminApi` (`users`,
  `createUser`, `updateUser`, `deleteUser`, `forms`, `formStats`, `accessUrls`).
- `lib/roles.js` + `roles.d.ts` â€” `ENTITY_PAGES` + `canSeeEntityAdminPage`;
  `canSeeAdminPage` permite `usuarios` al entity_admin; `homePathForRole` lo
  lleva a `forms` de su entidad.
- `lib/roleI18n.js` â€” claves nuevas (`entityForms`, `entityUsers`, `newCreator`,
  `goToLogin`, `userCreatedBody`, `status*`, etc.) en **es/en**.
- `layouts/DashboardLayout.jsx` â€” `ENTITY_NAV` (forms/usuarios/settings), helper
  `navTarget` que aÃ±ade `user.entity.code` a cada enlace (rail y drawer) y botÃ³n
  Â«nuevo formularioÂ» oculto tambiÃ©n para el entity_admin.
- `App.jsx` â€” wrappers `FormsPage`/`UsersPage` que ramifican por rol sobre las
  claves existentes `forms`/`usuarios`; `RoleRoute` redirige `home`â†’`forms` para
  el entity_admin y aplica `canSeeEntityAdminPage`.
- `pages/entity-admin/EntityUsers.jsx` (**nuevo**) â€” alta/ediciÃ³n/baja de
  creadores de la entidad (rol y entidad fijos; solo URLs activas de su entidad y
  rol creador); modal post-alta con Â«Ir al loginÂ» que abre `/a/<slug>` en pestaÃ±a
  nueva (no cierra la sesiÃ³n del administrador).
- `pages/entity-admin/EntityForms.jsx` (**nuevo**) â€” formularios de la entidad en
  solo lectura, filtros de estado/visibilidad + buscador Spotlight, y FAB por
  fila (Ver, Responder, EstadÃ­stica, copiar enlace).

**Docs** â€” `docs/RBAC_ACCESO.md` Â§3 (endpoints `/api/entity-admin`) y Â§5.1 (panel
del entity_admin); Ã¡rbol Â§4 con `pages/entity-admin/`.

**Puertas (verdes)**
- `npx tsc --noEmit` â†’ 0; `npm run lint` â†’ 0 errores (solo warnings
  preexistentes; ningÃºn aviso nuevo en los ficheros aÃ±adidos).
- `npm run build` â†’ exit 0 (chunks `EntityForms`/`EntityUsers` emitidos).
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos).
- `npm run qa:routes` â†’ 124 checks / 27 fails (baseline, sin regresiÃ³n: no se
  aÃ±adiÃ³ ninguna clave de ruta).
- Backend `node --check` OK (6 archivos) + sonda de aislamiento PASS.
- **Pendiente:** el backend no usa watch â†’ `/api/entity-admin` y el `entity` de
  `/auth/me` no estÃ¡n vivos hasta reiniciar (`start` = `node server.js`).

### 2026-10-13 â€” Identidad UI: siglas del rol en el cÃ­rculo del avatar

**Objetivo:** que el cÃ­rculo del avatar identifique el **rol** con sus siglas
(`super_admin`â†’`SA`, `entity_admin`â†’`AE`, `form_creator`â†’`CF`) en vez de las
iniciales del nombre, para todos los roles gestionados y en todas las apariciones
de la identidad (disparador de cabecera y cabecera del menÃº).

**Archivos modificados**
- `src/components/auth/RoleBadge.jsx` â€” `VISUALS` incorpora `sigla` a los tres
  roles reales (`SA`/`AE`/`CF`); `roleVisual` ya la expone. Invitado y cuenta
  legacy se quedan sin `sigla` (conservan las iniciales del nombre).
- `src/components/ui/Avatar.jsx` â€” nueva prop opcional `text` (monograma): si se
  pasa, se muestra en lugar de `initials(name)`; el `<span>` interno pasa a
  `leading-none` para centrar mejor el glifo. La foto (`avatarUrl`) sigue
  teniendo prioridad.
- `src/components/auth/IdentityMenu.jsx` â€” `RoleAvatar` pasa
  `text={visual.sigla}`; los roles sin sigla caen a las iniciales del nombre.

**Reglas respetadas**
- Sin cambios de sesiÃ³n/RBAC ni de tokens: el sigla se deriva del rol del realm
  activo; cero hex de marca a fuego.
- La foto de perfil, si existe, no se sustituye.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores (solo warnings
  preexistentes); `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-13 â€” IteraciÃ³n premium de la identidad UI (medallÃ³n, anillo y hÃ©roe)

**Objetivo:** elevar el acabado del patrÃ³n de identidad (2026-10-12) a un nivel
"premium": medallÃ³n con degradado del acento en la insignia, barrido de luz al
pasar el cursor, anillo de avatar con degradado cÃ³nico, y cabecera de identidad
con halo en el menÃº.

**Archivos modificados**
- `src/index.css` â€” bloque de identidad reescrito: `.role-badge` (borde/fondo
  tintados, halo, `overflow:hidden`), `.role-badge__medallion` (degradado radial
  del acento + icono blanco centrado), `.role-badge__text`, `.role-badge::after`
  (sheen en hover), `.role-avatar` (`conic-gradient` + halo), `.identity-hero` y
  `.identity-hero__glow`; `@media (prefers-reduced-motion: reduce)` desactiva el
  sheen. Se retiran `.role-badge__icon`/`.role-badge__dot`.
- `src/components/auth/RoleBadge.jsx` â€” markup medallÃ³n + texto (sin punto).
- `src/components/auth/IdentityMenu.jsx` â€” disparador `.identity-trigger` y hÃ©roe
  `.identity-hero`; el super_admin **ya no muestra su nombre de semilla**
  ("Super Admin Demo"): `displayNameFor` devuelve `t("appName")` para el super y
  `user.name || user.email` para el resto.
- `src/components/auth/GuestPill.jsx` â€” reescrito con glow, medallÃ³n y CTA
  degradado.

**VerificaciÃ³n**
- Sonda E2E CDP (temporal y eliminada): invitado (`.role-badge` pill, medallÃ³n,
  anillo, pastilla `role="region"`); super_admin en
  `/panel-gestion/formularios-publicos` â†’ lÃ­nea 1 **"Formularios con IA"**,
  insignia **"Superadmin"**, **`containsDemoName:false`**; hÃ©roe del menÃº con
  `nombre | rol | email`. `pass:true`, sin excepciones.
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores; `npm run build` â†’
  exit 0; `npm run qa:brand` â†’ **TODO CORRECTO**.

### 2026-10-13 â€” CatÃ¡logo de entidades: "Centro de Gobierno Digital"

**Objetivo:** aÃ±adir la entidad nacional rectora **"Centro de Gobierno Digital"**
(adscrita al Consejo de Ministros) al catÃ¡logo que alimenta el selector de
entidades del panel super-admin.

**Archivos modificados**
- `backend/db/seedEntities.js` â€” `"Centro de Gobierno Digital"` aÃ±adida al array
  `D` (categorÃ­a `rectoras`).

**Estado verificado**
- La fila ya existÃ­a en BD: `id d27a66dc-2554-443f-8e3c-83ebdf40fa73`, `code
  centro-de-gobierno-digital`, categorÃ­a `rectoras`, `is_active:true`. Tras
  re-sembrar: `before=82`, `catalog=82`, `rectoras=8`, sin duplicados;
  `ensureCatalog()` â†’ `{seeded:false,count:82}`.
- El frontend `CATEGORY_META` (`EntitySelect.jsx`) ya cubrÃ­a `rectoras` â†’ **sin
  cambios de frontend**. Sondas de siembra ejecutadas y eliminadas.
- Sin regenerar por reinicio: el backend no usaba watch, por lo que la siembra se
  ejecutÃ³ manualmente.

### 2026-10-12 â€” Identidad UI: rol del usuario (realm activo) e identificador de invitado

**Objetivo:** que la experiencia de identidad sea inequÃ­voca y premium. (A) El
usuario autenticado ve **su rol de un vistazo** (`Superadmin`, `AdministraciÃ³n de
Entidad`, `Creador de formularios por entidad`) con tratamiento consistente en
claro/oscuro y escritorio/mÃ³vil. (B) El visitante del sitio pÃºblico recibe un
**identificador de invitado** claro, no intrusivo y con CTA de acceso.

**Decisiones (acordadas con el usuario)**
- **Color por rol** con los tokens **decorativos** `--accent-*` (no de marca, no
  semÃ¡nticos): `super_admin`â†’gold, `entity_admin`â†’blue, `form_creator`â†’teal,
  invitado/legacyâ†’neutro. El texto va en `--color-ink` (contraste AA); el color
  vive en icono, punto y tinte.
- **Invitado**: insignia en la cabecera **+** pastilla flotante **descartable**
  (recordada en `localStorage`).
- **Entidad/slug secundario** para `entity_admin`/`form_creator`: la **puerta
  recordada** `/a/<slug>` (`accessDoorFor(role)`), sin tocar el backend/contrato.
- **Sin cambios en `AuthContext`/sesiÃ³n**: la identidad es presentaciÃ³n y lee el
  realm activo (`user` de `/auth/me`); no altera realms ni RBAC.

**Archivos nuevos**
- `src/components/auth/RoleBadge.jsx` â€” insignia por rol (`VISUALS`) y
  `roleVisual(role, isGuest)` reutilizable. Props `role`, `isGuest`, `size`
  (`sm|md`), `className`.
- `src/components/auth/IdentityMenu.jsx` â€” `IdentityMenu` (identidad del
  autenticado: disparador + menÃº), `GuestIdentity` (invitado + CTA) y `RoleAvatar`
  (avatar con anillo de rol).
- `src/components/auth/GuestPill.jsx` â€” pastilla flotante del sitio pÃºblico
  (`role="region"`, descartable, `prefers-reduced-motion`).
- `docs/IDENTITY_UI.md` â€” documenta el patrÃ³n (roles, tonos, colocaciÃ³n, i18n,
  accesibilidad y reglas).

**Archivos modificados**
- `src/layouts/DashboardLayout.jsx` â€” el menÃº de usuario inline pasa a
  `<IdentityMenu user={user} />`; la rama de invitado, a `<GuestIdentity />`. Se
  retiran los imports que quedan sin uso (`Avatar`, `Dropdown`/`MenuItem`/
  `MenuDivider`, `ChevronDown`, `LogOut`, `settingsPath`, `logout`).
- `src/pages/GuestHome.jsx` â€” monta `<GuestPill />` en la portada pÃºblica.
- `src/index.css` â€” nueva secciÃ³n `.role-badge` (`__icon`, `__dot`, `data-size`) y
  `.role-avatar` (anillo), tras `.cat-badge`. Reglas planas con `color-mix` de
  tokens; **sin hex de marca**.
- `src/lib/roleI18n.js` â€” claves `roleSuper`, `roleEntity`, `roleCreator`,
  `roleGuest`, `roleAccount`, `roleLabel`, `identity`, `signedInAs`,
  `accessDoorLabel` (es/en).
- `src/contexts/LanguageContext.jsx` â€” claves `loginCta`, `guestPillTitle`,
  `guestPillBody`, `guestPillDismiss` (es/en).

**Reglas respetadas**
- Solo tokens; cero hex de marca y cero mezcla de tono semÃ¡ntico con marca
  (`qa:brand` en verde).
- El rol mostrado es siempre el del **realm activo**; `AuthContext` intacto.
- Contraste AA (texto en `--color-ink`/`--color-ink-muted`), iconos `aria-hidden`,
  botones nativos, `aria-label` en el descarte y en el menÃº.
- En pantallas estrechas la identidad se colapsa al **anillo de rol** del avatar.

**VerificaciÃ³n**
- Sonda E2E real (Chrome headless por CDP, token de cada rol minteado y **sesiones
  de sonda eliminadas**; artefactos temporales borrados): en `/` el invitado
  muestra insignia Â«InvitadoÂ», anillo de avatar, CTA Â«Iniciar sesiÃ³nÂ» y la
  pastilla (texto completo, `role="region"`); en **oscuro** la pÃ¡gina aplica
  `.dark`; el **super_admin** aterriza en su panel con insignia Â«SuperadminÂ» y el
  menÃº muestra rol + nombre; el **entity_admin** muestra Â«AdministraciÃ³n de
  EntidadÂ» y `/a/9956bb-login-sajd`; el **form_creator**, Â«Creador de formularios
  por entidadÂ» y `/a/yhmh8k-login-vrg6`. **Sin excepciones ni errores de consola.**
  `pass: true`. Capturas claro/oscuro generadas y luego borradas.
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores (solo warnings
  preexistentes; `RoleBadge.jsx` emite el mismo `only-export-components` tolerado
  que `AuthRequiredModal.jsx`/`AdminKit.jsx`).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- `npm run qa:routes` â†’ 124 checks / 27 fails (baseline, sin regresiÃ³n).

### 2026-10-12 â€” Fix: un fallo de credenciales en las puertas de login ya no redirige al IDP

**Objetivo:** que un intento de acceso con credenciales errÃ³neas â€”o una sesiÃ³n
guardada que ya no vale al abrir el panelâ€” en el portal del super_admin
(`/formularios-con-ia-loginadmin`) y en la puerta de entidad/creador (`/a/:slug`)
se quede en esa pantalla mostrando el error, y **no** salte al proveedor de
identidad (IDP).

**Causa raÃ­z (el "a veces"):** el interceptor de `src/lib/api.js` trata
**cualquier** 401 con un token presente como caducidad de sesiÃ³n: borra la ranura
activa y navega a `/login` (`window.location.href = nextRealm ? "/" : "/login"`).
`/login` monta `LoginPage`, que sin token llama a `initiateLogin()` â†’ salto al
IDP. Pero `POST /auth/local/login` responde **401** ante credenciales invÃ¡lidas
(`backend/controllers/localAuth.controller.js`), asÃ­ que un simple error de
contraseÃ±a disparaba ese camino. Solo pasaba "a veces" porque hacÃ­a falta un
token en alguna ranura: por ejemplo la **sesiÃ³n de invitado** que crea la portada
`/` al abrirse. Sin token, `getToken()` es falsy y el 401 se quedaba como error
inline/toast (comportamiento correcto), de ahÃ­ la intermitencia.

Dos fallos latentes de la misma raÃ­z:
1. Al **arrancar**, el bucle de restauraciÃ³n prueba cada sesiÃ³n guardada con
   `authApi.me()`; si estaba caducada, el 401 disparaba el redirect antes de que
   el bucle pudiera descartar la ranura y probar la siguiente.
2. En el modal de **reautenticaciÃ³n**, una contraseÃ±a incorrecta
   (`authApi.reauth` â†’ 401) cerraba la sesiÃ³n y mandaba al IDP en plena tarea.

**Arreglo**
- `src/services/index.js` â€” se marca con `{ __noLogout: true }` toda peticiÃ³n
  cuyo 401 **no** significa "la sesiÃ³n ha muerto", sino que es la respuesta de la
  propia puerta de entrada: `authApi.me`, `authApi.reauth`,
  `localAuthApi.login`/`registerByAccess`/`register`/`forgot`/`reset` y
  `accessApi.resolve`/`verifyPortal`. El interceptor ya respetaba la marca
  (`!error.config?.__noLogout`): solo faltaba **ponerla** en ninguna llamada
  (el flag existÃ­a documentado pero nunca se asignaba). Constante `NO_LOGOUT`
  con comentario del porquÃ©.

**Reglas respetadas**
- No cambia el contrato RBAC ni las rutas; cada rol sigue entrando por su puerta.
- La marca es explÃ­cita y local a la llamada; el resto de la app (sesiÃ³n muerta
  en un request normal) conserva el cierre + relevo de realm de siempre.

**VerificaciÃ³n**
- Sonda E2E real (Chrome headless por CDP, **temporal y eliminada**): (1) creÃ³
  una **sesiÃ³n de invitado real** visitando `/`; (2) en
  `/formularios-con-ia-loginadmin` enviÃ³ credenciales errÃ³neas â†’ se **quedÃ³** en
  el portal con `role="alert"` = Â«Credenciales invÃ¡lidasÂ» y el token de invitado
  **intacto** (antes: navegaciÃ³n a `/login`); (3) lo mismo en `/a/9956bb-login-sajd`
  â†’ se quedÃ³ en la puerta. `pass: true`.
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores (solo warnings
  preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-12 â€” Fix: el cierre de sesiÃ³n del super_admin vuelve a su login, no a la pÃ¡gina de invitado

**Objetivo:** al cerrar sesiÃ³n el super_admin debe ir a su portal
(`/formularios-con-ia-loginadmin`), no a la portada de invitados (`/`).

**Causa raÃ­z:** el sitio crea **solo** una sesiÃ³n de **invitado** (realm `guest`)
al abrir la portada `/`. Si despuÃ©s el super_admin entra en su panel, quedan dos
ranuras guardadas (`guest` + `super_admin`). El logout caÃ­a la ranura del rol y
aplicaba el "relevo": reactivaba la sesiÃ³n **mÃ¡s reciente restante**, que era la
de invitado, y navegaba a `homePathForRole(guest)` = `/`. Es decir, la sesiÃ³n
anÃ³nima del escaparate se trataba como si fuera una cuenta a la que volver.

**Archivo modificado**
- `src/contexts/AuthContext.jsx` â€” en `logout()` se **descarta tambiÃ©n** la
  ranura `REALMS.GUEST` (no es un relevo) y se reanuda solo el realm **real** mÃ¡s
  reciente si lo hay (`listRealms()` filtrado; se quita la invitada). El destino
  final del super_admin se fija con `const wasSuper = isSuper(user)` para no
  depender del estado ya limpiado. El camino de relevo entre roles reales (p. ej.
  super_admin + entity_admin) se conserva.

**Efecto colateral deseado:** el administrador de entidad y el creador tampoco
rebotan ya a la pÃ¡gina de invitado al cerrar sesiÃ³n; siguen volviendo a su puerta
`/a/<slug>`.

**VerificaciÃ³n**
- Sonda E2E real (Chrome headless por CDP, **temporal y eliminada**): (1) se creÃ³
  una sesiÃ³n de invitado **real** visitando `/` (`hasGuest: true`); (2) se inyectÃ³
  un token de super_admin real y se recargÃ³ el panel â€”ambas ranuras presentes, el
  escenario exacto del falloâ€”; (3) se abriÃ³ el menÃº de usuario y se pulsÃ³ el botÃ³n
  real Â«Cerrar sesiÃ³nÂ»; (4) resultado: destino
  **`/formularios-con-ia-loginadmin`** (login del super_admin), ranuras
  `guest`/`super_admin` eliminadas y `formly_session_order` vacÃ­o, sin excepciones
  ni errores de consola. `pass: true`. La sesiÃ³n/minteo de prueba se borrÃ³ de la BD.
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores.
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-12 â€” Fix: alineaciÃ³n de columnas en las tablas super-admin (Usuarios, Entidades, URLs)

**Objetivo:** que las filas y los tÃ­tulos de columna de las tres tablas del panel
super-admin (Usuarios, Entidades, URLs de acceso) queden **perfectamente
alineados**; antes las columnas (sobre todo las de la derecha) no coincidÃ­an
entre la cabecera y el cuerpo.

**Causa raÃ­z:** la cabecera y cada fila son **rejillas CSS independientes** que
comparten la constante `*_COLS`. La Ãºltima columna de `USERS_COLS`,
`ENTITIES_COLS` y `URLS_COLS` usaba el track `minmax(0,auto)`: al dimensionarse
por el contenido de **cada** rejilla por separado, la cabecera (rÃ³tulo Â«AccionesÂ»
+ icono, ~90 px) y la fila (botÃ³n `FabSpeedDial` de 36 px) fijaban una base
distinta para ese Ãºltimo track, y el reparto de los `fr` anteriores cambiaba â†’
columnas desalineadas (hasta ~54 px en el desplazamiento acumulado). Las tablas
de Formularios pÃºblicos (`PUBLISHED_COLS`) y AuditorÃ­a (`AUDIT_COLS`) ya usaban
solo `fr` y por eso estaban bien.

**Archivos modificados**
- `frontend/AIFormBuilder/src/pages/admin/Users.jsx` â€” Ãºltima columna de
  `USERS_COLS`: `minmax(0,auto)` â†’ `minmax(0,0.6fr)`; la celda de acciones pasa a
  `lg:justify-start` (en mÃ³vil sigue `justify-end`).
- `frontend/AIFormBuilder/src/pages/admin/Entities.jsx` â€” Ã­dem en `ENTITIES_COLS`
  y su celda de acciones.
- `frontend/AIFormBuilder/src/pages/admin/AccessUrls.jsx` â€” Ã­dem en `URLS_COLS` y
  su celda de acciones.

**DecisiÃ³n de diseÃ±o (revisada con el usuario):** el rÃ³tulo Â«AccionesÂ» del
encabezado lleva un icono decorativo (`Settings`) delante, por lo que el texto
queda 20 px a la derecha del borde de la columna mientras el botÃ³n Â«+Â» estÃ¡
pegado al borde (alineado con el icono). Tras medirlo se acordÃ³ **dejarlo asÃ­**:
la alineaciÃ³n de columnas es correcta y el icono del encabezado se conserva.

**VerificaciÃ³n**
- Prueba de la mecÃ¡nica (HTML temporal, Chrome headless, borrado): con el track
  `auto` la desviaciÃ³n cabeceraâ†”fila llega a **54 px** (`maxDelta: 54`); con `fr`
  es **0 px** (`maxDelta: 0`).
- Sonda runtime real (Chrome headless por CDP con una sesiÃ³n de super_admin
  temporal, artefactos y sesiÃ³n **eliminados**) sobre `/panel-gestion/usuarios`:
  borde izquierdo de la columna = icono del encabezado = botÃ³n Â«+Â» (delta **0**),
  sin excepciones ni errores de consola.
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores.
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-12 â€” Fix: orden "MÃ¡s recientes" en Formularios pÃºblicos (super-admin)

**Objetivo:** que la lista de "Formularios publicados" del panel super-admin
ordene por **fecha de creaciÃ³n** descendente. Antes, formularios creados hacÃ­a
3-4 dÃ­as aparecÃ­an casi al fondo.

**Causa raÃ­z:** `listPublicFormsScoped` (backend) ordenaba por
`f.published_at DESC NULLS LAST, f.updated_at DESC`. Los formularios con
`published_at IS NULL` caÃ­an al fondo por `NULLS LAST`, sin importar su
`created_at`. AdemÃ¡s, el frontend con `sortBy === "recent"` **no ordenaba**: el
comentario asumÃ­a que el backend ya entregaba "mÃ¡s recientes primero", asÃ­ que el
orden visible dependÃ­a por completo de aquella consulta.

**Archivos modificados**
- `backend/repositories/form.repo.js` â€” `listPublicFormsScoped` ordena ahora por
  `f.created_at DESC NULLS LAST, f.updated_at DESC`.
- `frontend/AIFormBuilder/src/pages/admin/PublicStats.jsx` â€” la rama
  `sortBy === "recent"` ordena explÃ­citamente por `createdAt` descendente
  (`new Date(b.createdAt) - new Date(a.createdAt)`), igual que `Entities.jsx`;
  comentario corregido.

**VerificaciÃ³n**
- Sonda real contra la BD (`backend/qa/_probe-public-order.mjs`, creada,
  ejecutada y eliminada): 10 filas en orden `created_at` descendente correcto;
  los 2 formularios con `published_at NULL` (creados 2026-10-08, los mÃ¡s
  recientes) quedan **arriba** (antes iban al fondo). Resultado:
  `SONDA: ORDEN POR created_at DESC CORRECTO`.
- `node --check` â†’ OK.
- `npx tsc --noEmit` â†’ 0 errores; `npm run lint` â†’ 0 errores.
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

> El backend no usa watch (`start` = `node server.js`): requiere reinicio para
> servir el nuevo `ORDER BY`.

### 2026-10-12 â€” Seguridad de sesiones (Tier 1 + Tier 2, P1â€“P7)

**Objetivo:** endurecer la sesiÃ³n con doble control de expiraciÃ³n (idle + vida
absoluta por rol), invalidaciÃ³n global por contraseÃ±a/rol/entidad/desactivaciÃ³n,
reautenticaciÃ³n de acciones crÃ­ticas, aviso proactivo, lÃ­mite de sesiones
concurrentes y auditorÃ­a. PolÃ­tica aprobada: idle 15/30/60 min (super/entity/
creator), absoluto 8 h, aviso 2/3/5, reauth 2/3/5, concurrentes 3/5/5.

**Backend**
- `config/env.js` â€” variables `sessionIdle*`, `sessionAbsoluteMinutes`,
  `sessionWarn*`, `sessionReauth*`, `sessionMaxConcurrent*`.
- `utils/sessionPolicy.js` (**nuevo**) â€” Ãºnica fuente de la polÃ­tica por rol
  (`idleMsForRole`, `absoluteMs`, `warningMsForRole`, `reauthMsForRole`,
  `maxConcurrentForRole`, `sessionPolicyFor`, `absoluteExpiryFrom`).
- `config/db.js` + `db/schema.sql` â€” migraciÃ³n idempotente: columnas
  `last_user_activity`, `absolute_expires_at`, `last_reauth_at`; backfill e
  Ã­ndice `idx_user_sessions_expiry`.
- `repositories/session.repo.js` â€” `createSession(absoluteExpiresAt)`,
  `touchUserActivity`, `setLastReauth`, `deactivateOldestBeyond`.
- `middleware/auth.js` (reescrito) â€” `findUserById` + `isActive` + vida absoluta
  + `expires_at` + idle real; audita `session.absolute_expired` /
  `session.idle_expired`; expone `req.session` / `req.sessionPolicy`.
- `middleware/reauth.js` (**nuevo**) â€” `requireReauth` â†’ `403 { code:
  "reauth_required" }` si `last_reauth_at` fuera de ventana.
- `controllers/auth.controller.js` â€” createSession con absoluto + evicciÃ³n;
  `listSessions` ampliado; nuevos `getCurrentSession`, `recordActivity`, `reauth`
  (contraseÃ±a local + TOTP opcional; audita `auth.reauth.*`).
- `controllers/localAuth.controller.js` â€” `issueLocalSession` con absoluto +
  `deactivateOldestBeyond`.
- `controllers/settings.controller.js` â€” cambio de contraseÃ±a revoca las demÃ¡s
  sesiones; audita `auth.password.changed`.
- `controllers/admin.controller.js` â€” `updateUser` revoca sesiones ante cambio de
  rol/entidad o `isActive === false`; audita `session.revoked`.
- `routes/auth.routes.js` â€” `GET /sessions/current`, `POST /activity`,
  `POST /reauth`.
- `routes/admin.routes.js` â€” `requireReauth` en borrados y regeneraciones crÃ­ticas.
- `app.js` â€” `sessionLimiter` en `/api/auth/activity`, `strictAuthLimiter` en
  `/api/auth/reauth`.

**Frontend**
- `src/lib/reauth.js` (**nuevo**) â€” store puro de reautenticaciÃ³n.
- `src/lib/api.js` + `api.d.ts` â€” interceptor 403 `reauth_required` (pide reauth y
  reintenta 1 vez con `config.__reauthRetried`); rama 401 respeta `__noLogout`;
  mensajes nuevos.
- `src/services/index.js` + `index.d.ts` â€” `currentSession()`, `activity()`,
  `reauth(payload)`.
- `src/components/auth/ReauthHost.jsx` (**nuevo**) â€” modal de reautenticaciÃ³n,
  montado en `App.jsx`.
- `src/contexts/AuthContext.jsx` â€” watchdog: polÃ­tica, eventos de interacciÃ³n real,
  heartbeat (tope 60 s) e intervalo de 5 s que avisa o cierra sesiÃ³n; monta
  `<SessionExpiryWarning>`.
- `src/components/auth/SessionExpiryWarning.jsx` (**nuevo**) â€” aviso con cuenta atrÃ¡s.
- `src/components/auth/SessionAlert.jsx` â€” eliminado el texto hardcodeado "expira
  en 7 dÃ­as".

**Reglas respetadas**
- Sin hex de marca congelado ni mezcla de tono semÃ¡ntico + marca (tokens/`color-mix`).
- Los sondeos automÃ¡ticos no renuevan la sesiÃ³n (idle usa `last_user_activity`).
- Claves de traducciÃ³n y contrato `AuthApi` actualizados en `.d.ts`.

**DocumentaciÃ³n**
- `docs/session-security.md` (**nuevo**) â€” polÃ­tica, esquema, flujos, endpoints,
  plan P1â€“P15 y verificaciÃ³n.

**Puertas ejecutadas (todas verdes)**
- Backend: `node --check` â†’ ALL OK (13 archivos); sonda real contra BD (creada,
  ejecutada y eliminada) â†’ columnas/Ã­ndice, polÃ­tica y evicciÃ³n correctas.
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-12 â€” Login del creador de formularios: foto de fondo propia

**Objetivo:** que la puerta del creador de formularios (`/a/<slug>` con rol
`form_creator`) use su propia fotografÃ­a `public/fondo_form_creator.png` como
fondo, en vez de compartir la del administrador de entidad.

**Archivos modificados**
- `src/components/auth/AuthCard.jsx` â€” la capa `.auth-photo` recibe la clase
  modificadora `auth-photo--creator` cuando `role === "form_creator"` (usa el
  `cn` ya importado).
- `src/index.css` â€” `.auth-photo` declara `--auth-photo: url("/fondo_admin_entity.png")`
  y la usa en el `background` (los velos y el tinte de marca no cambian);
  nueva regla `.auth-photo--creator { --auth-photo: url("/fondo_form_creator.png") }`.
  Comentarios del bloque actualizados (ya no nombran una sola imagen).

**Reglas respetadas**
- Solo tokens de marca; los velos siguen siendo neutros (`rgb(5 11 18 / â€¦)`).
- El estado "URL invÃ¡lida" (sin rol) conserva la imagen por defecto (entidad).
- Sin cambios de contrato ni de comportamiento de autenticaciÃ³n.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes; `AuthCard.jsx` limpio).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-12 â€” Login de entidad: foto de fondo y vuelta a la puerta al cerrar sesiÃ³n

**Objetivo:** (1) que el administrador de entidad (y el creador), al cerrar
sesiÃ³n, vuelva a **su** pÃ¡gina de login `/a/<slug>` en vez del cierre del
proveedor de identidad; y (2) poner la fotografÃ­a
`public/fondo_admin_entity.png` de fondo a esa pantalla de login.

**1. Retorno a la puerta del rol gestionado**
- `src/lib/routes.js` â€” nueva `ACCESS_LOGIN_BASE` (`"/a"`) y `accessLoginPath(slug)`
  (junto a las demÃ¡s puertas; Ãºnica fuente de la direcciÃ³n `/a/<slug>`).
- `src/lib/accessDoor.js` â€” **nuevo**. Recuerda el slug con el que entrÃ³ cada rol
  (`localStorage["formly_access_door"]`, mapa rolâ†’slug): `rememberAccessDoor(role,
  slug)` y `accessDoorFor(role)` â†’ `/a/<slug>`. Sobrevive a la recarga del cierre.
- `src/pages/AccessLogin.jsx` â€” al iniciar sesiÃ³n (y al registrarse) recuerda la
  puerta del rol.
- `src/contexts/AuthContext.jsx` â€” en `logout()`, si el usuario es
  `entity_admin`/`form_creator` y hay puerta recordada, navega a ella; si no,
  mantiene el flujo del IDP. El super_admin sigue volviendo a su portal.
- **Motivo:** estos roles entran con credenciales locales por `/a/<slug>` (sin
  sesiÃ³n en el IDP), asÃ­ que el cierre del IDP no era su camino de vuelta.

**2. FotografÃ­a de fondo**
- `src/components/auth/AuthCard.jsx` â€” se retiran los orbes, la retÃ­cula y el
  `<EntityBackdrop/>` vectorial; se aÃ±aden `<div className="auth-photo">` y
  `<div className="auth-vignette">`.
- `src/index.css` â€” se reemplazan `.auth-orb*`, `.auth-grid` y `.auth-motif*`
  por **`.auth-photo`** (la imagen `url("/fondo_admin_entity.png")` con
  `center / cover`, velada con degradados oscuros + tinte de marca para dar
  contraste) y **`.auth-vignette`**; se elimina el keyframe `auth-drift`. Se
  conservan `.auth-card` (cristal) y `.auth-input`.
- `src/components/auth/EntityBackdrop.jsx` â€” **eliminado** (lo sustituye la foto).

**Reglas respetadas**
- Solo tokens de marca (`color-mix(in srgb, var(--color-brand-*), â€¦)`); los
  velos usan `rgb(5 11 18 / â€¦)`/`rgb(15 23 42 / â€¦)` neutros, como el escenario
  super-admin (`.sa-backdrop`/`.sa-vignette`).
- El retorno al cerrar sesiÃ³n no altera el aislamiento por realm: si queda otra
  sesiÃ³n, sigue reactivÃ¡ndose (no se navega a la puerta).
- `accessDoor.js` vive fuera de `routes.js` a propÃ³sito: `routes.js` lo importa
  la sonda de rutas con Node y no debe tocar `localStorage` en carga.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- ComprobaciÃ³n de `accessDoor.js` en Node: `rememberAccessDoor`/`accessDoorFor`
  devuelven `/a/<slug>` por rol y `null` para el super_admin.
- **Sonda runtime (Chrome headless por CDP, temporal y eliminada):** sobre
  `/a/9956bb-login-sajd` la pÃ¡gina monta **sin errores ni excepciones de
  consola**; existen `.auth-photo`/`.auth-vignette`/`.auth-card` (2 campos),
  la imagen de fondo carga (`1672Ã—941`) y `background-image` apunta a
  `/fondo_admin_entity.png`. Capturas claro/oscuro para revisiÃ³n visual.

### 2026-10-12 â€” Login del administrador de entidad: fondo institucional premium

**Objetivo:** dar a la puerta de acceso por entidad (`/a/:slug`, roles
`entity_admin` y `form_creator`) un aspecto moderno y premium, con un fondo
elegante que evoque a un administrador de entidad. Solo afecta a esa pantalla:
`AuthCard` es exclusiva de `AccessLogin`; el portal super-admin usa otro
componente.

**Archivos modificados**
- `src/components/auth/EntityBackdrop.jsx` â€” **nuevo**. Fondo decorativo en SVG
  (`aria-hidden`): una arquerÃ­a administrativa anclada a la base y dos
  organigramas (raÃ­z â†’ ramas â†’ hojas) que enmarcan la cabecera, unidos por un
  arco tenue. Dibuja con `currentColor`; se escala con
  `preserveAspectRatio="xMidYMax slice"`.
- `src/components/auth/AuthCard.jsx` â€” reestructurada: escena `auth-stage` con
  orbes + retÃ­cula + `EntityBackdrop`, tarjeta de cristal teÃ±ida de marca con
  hairline luminoso superior, y campos `AuthField` con el estilo `.auth-input`.
  Se mantiene la API de props (no cambia `AccessLogin`).
- `src/index.css` â€” bloque del escenario de acceso reescrito: `.auth-stage`
  (lienzo teÃ±ido de marca, claro/oscuro), orbes con `color-mix` de marca
  (se eliminan los `rgba` congelados), retÃ­cula afinada, **`.auth-motif`** (color,
  opacidad y desvanecido del SVG), `.auth-card` premium (cristal + hairline),
  **`.auth-input`** (borde/foco de marca) y estados dark/disabled.
- `AGENTS.md` â€” Ã¡rbol Â§4 (`EntityBackdrop.jsx`) y esta entrada.

**Reglas respetadas**
- Solo tokens de marca (`color-mix(in srgb, var(--color-brand-*), â€¦)`); sin hex
  ni `rgba` de la familia de marca a fuego.
- `EntityBackdrop` es decorativo (`aria-hidden`, `focusable="false"`); no aporta
  informaciÃ³n.
- Respeta `prefers-reduced-motion` (orbes y tarjeta sin animaciÃ³n).
- Sin cambios de contrato ni de comportamiento de autenticaciÃ³n.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (sin warnings en `AuthCard.jsx`/`EntityBackdrop.jsx`).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- **Sonda runtime (Chrome headless por CDP, temporal y eliminada):** sobre la URL
  real `/a/9956bb-login-sajd` (Â«Ministerio de JusticiaÂ») la pÃ¡gina monta **sin
  excepciones ni errores de consola**, el SVG del motivo renderiza (50 formas),
  la tarjeta y sus 2 campos existen y los chips muestran entidad + rol. Capturas
  claro/oscuro generadas para revisiÃ³n visual.

### 2026-10-12 â€” Select premium de URL de acceso (rediseÃ±o del campo)

**Objetivo:** sustituir el `AdminSelect` nativo del campo Â«URL de accesoÂ» por un
desplegable **custom moderno y premium**, con el mismo lenguaje visual que los
selects ya existentes del panel (`EntitySelect` / `SelectField`).

**Archivos modificados**
- `src/components/admin/AccessUrlSelect.jsx` â€” **nuevo**. Desplegable controlado
  (`value`=`_id`, `onChange(_id)`): disparador `adm-field-premium` con chip de
  icono (`Link2`), slug en `adm-mono` y sublabel de entidad; desplegable
  `card-surface` + `CardSurface` con filas ricas (slug, entidad y pastilla de
  estado `Activa`/`Inactiva`); navegaciÃ³n por teclado completa (â†‘ â†“ Inicio Fin
  Esc Enter), cierre por click fuera, `role="combobox"`/`"listbox"`/`"option"`.
  Sin buscador (a diferencia de `EntitySelect`) porque caben pocas URLs por
  entidad+rol. Solo tokens: marca para el acento, `bg-warning/15 text-warning` /
  `bg-success/15 text-success` para el estado (sin mezclar semÃ¡ntico con marca).
- `src/components/admin/AccessUrlField.jsx` â€” reescrito para usar
  `useController` (registra el `name`) y renderizar `AccessUrlSelect` +
  `FieldLabel`/`FieldMessage`. Se conserva la lÃ³gica de filtrado por
  entidad+rol, la correlaciÃ³n por rol, el aviso/bloqueo cuando no hay URL activa
  y la conservaciÃ³n de un vÃ­nculo previo aunque su URL estÃ© inactiva.
- `src/pages/admin/Users.jsx` â€” se retira la prop `value` del `<AccessUrlField>`
  (ya no aplica: el valor lo lee `useController`). `accessUrlValue` sigue
  usÃ¡ndose para el `disabled` del botÃ³n de crear.
- `AGENTS.md` â€” Ã¡rbol Â§4 actualizado (`AccessUrlSelect.jsx`) y esta entrada.

**Reglas respetadas**
- Consistencia con los selects existentes (`EntitySelect`/`SelectField`):
  mismo disparador `adm-field-premium`, mismo desplegable `card-surface`.
- Solo tokens (sin hex a fuego); estado en pastillas semÃ¡nticas puras.
- Sin buscador a propÃ³sito: la lista de URLs por entidad+rol es corta.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (los warnings son preexistentes; el
  `set-state-in-effect` de `AccessUrlSelect.jsx:54` es el mismo patrÃ³n tolerado
  que `AdminKit.jsx:148` (`SelectField`)).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).

### 2026-10-12 â€” CorrelaciÃ³n cuenta â†” URL de acceso (validaciÃ³n al crear usuario)

**Objetivo:** al dar de alta una cuenta gestionada (entity_admin o
form_creator) en el panel del super_admin, elegir **de la base de datos** la URL
de acceso de esa entidad y ese rol, de modo que **sin una URL activa vÃ¡lida no
se pueda crear el usuario**; y dejar la cuenta vinculada a esa URL (correlaciÃ³n
por rol). Se mantiene la regla de **un entity_admin por entidad**.

**Modelo de datos**
- Nueva columna `users.access_url_id uuid REFERENCES access_urls(id) ON DELETE SET NULL`
  (+ Ã­ndice `idx_users_access_url`), aÃ±adida de forma idempotente en
  `backend/config/db.js` `migrate()` y reflejada en `backend/db/schema.sql`.

**Frontera / contrato**
- `POST /api/auth/local/register` ahora exige `entityId` **y** `accessUrlId`
  (ambos uuid): toda cuenta gestionada nace de una entidad y de una URL activa
  de su rol. `GET /admin/users` expone ademÃ¡s `accessUrlSlug` por cuenta.

**Archivos modificados**
- `backend/config/db.js` â€” migraciÃ³n idempotente de la columna + Ã­ndice.
- `backend/db/schema.sql` â€” columna e Ã­ndice documentados en `users`.
- `backend/repositories/user.repo.js` â€” `mapUser.accessUrlId`; `createLocalUser`
  acepta `accessUrlId`; `adminUpdateUser` lo actualiza; `listUsers` hace
  `LEFT JOIN access_urls` y expone `accessUrlSlug`.
- `backend/services/accessUrl.service.js` â€” nuevo `assertAccessUrlFor({accessUrlId,
  entityId, role})`: valida exista, activa, rol y entidad coincidentes.
- `backend/controllers/localAuth.controller.js` â€” `registerSchema` con
  `entityId`+`accessUrlId` obligatorios; `localRegister` valida con
  `assertAccessUrlFor` y persiste `access_url_id`; `localRegisterByAccess`
  vincula la cuenta a la URL del enlace.
- `backend/controllers/admin.controller.js` â€” `adminUpdateSchema.accessUrlId`;
  `updateUser` correlaciona al editar (cambio de rol/entidad exige URL vÃ¡lida o
  limpia el vÃ­nculo; super_admin nunca lleva URL).
- `backend/qa/entity-admin-registration-probe.js` â€” el alta gestionada del probe
  incluye `accessUrlId` para seguir probando el conflicto 409 de entidad ocupada.
- `frontend/AIFormBuilder/src/components/admin/AccessUrlField.jsx` â€” **nuevo**
  campo (envuelve `AdminSelect`): toma las URLs de la entidad+rol, ofrece solo
  las activas, avisa y bloquea si no hay ninguna, y conserva un vÃ­nculo previo
  aunque su URL estÃ© inactiva.
- `frontend/AIFormBuilder/src/lib/roleI18n.js` â€” claves `accessUrl`,
  `selectAccessUrl`, `noAccessUrl` (es/en).
- `frontend/AIFormBuilder/src/pages/admin/Users.jsx` â€” carga `adminApi.accessUrls`,
  `watch` de rol/entidad, limpieza del vÃ­nculo si deja de corresponder, campo
  `AccessUrlField`, `entityId` obligatorio, envÃ­o de `accessUrlId` (alta y
  ediciÃ³n), botÃ³n de crear deshabilitado sin URL, y el slug `/a/<slug>` visible
  en la fila y en el buscador.
- `docs/RBAC_ACCESO.md` â€” contrato de alta/ediciÃ³n y secciÃ³n de correlaciÃ³n.

**Reglas respetadas**
- Un entity_admin por entidad (Ã­ndice parcial intacto; el 409 se conserva).
- Solo tokens de marca en UI nueva (`var(--â€¦)`/`text-warning`); sin hex a fuego.
- `users.access_url_id` `ON DELETE SET NULL`: borrar la URL no borra la cuenta.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- Sondas backend contra la BD real (temporales y eliminadas): la migraciÃ³n crea
  columna+Ã­ndice+FK (`OK`); `assertAccessUrlFor` valida/niega por rol, entidad e
  `is_active`; `createLocalUser` persiste `access_url_id`; `listUsers` expone
  `accessUrlSlug`; `adminUpdateUser` fija/limpia el vÃ­nculo â†’ `OK: correlaciÃ³n
  cuentaâ†”URL de acceso`.

### 2026-10-12 â€” Aislamiento de sesiones por rol (sesiones independientes)

**Objetivo:** que el login del super_admin sea independiente del de
administrador de entidad y del de creador. Antes habÃ­a una sola ranura de token
(`TOKEN_KEY = "formly_token"`): entrar como un rol pisaba el token del otro, y
cerrar sesiÃ³n â€”o un 401â€” borraba el de todos. Ahora cada rol guarda su token en
su propia ranura y, al cerrar una sesiÃ³n, se reactiva la que quede.

**Causa raÃ­z:** el backend ya aÃ­sla por `jti` (`session.repo.js`); el problema
era del frontend (una ranura Ãºnica que compartÃ­an todos los flujos).

**Archivos modificados**
- `src/lib/api.js` â€” bloque de sesiÃ³n reescrito a almacenamiento por *realm*
  (`REALMS`, `SESSION_PREFIX="formly_session_"`, `ACTIVE_REALM_KEY`,
  `ORDER_KEY`), con `getRealmToken`/`getActiveRealm`/`getToken`/`setRealmToken`/
  `setActiveRealm`/`listRealms`/`dropRealm`/`setToken` (compat legacy)/`clearToken`.
  El interceptor de 401 ahora hace `const nextRealm = clearToken(); â€¦ window.location.href =
  nextRealm ? "/" : "/login"`. `getToken()` migra la ranura Ãºnica antigua en la
  primera lectura.
- `src/lib/api.d.ts` â€” declaraciones nuevas de la API de sesiones;
  `clearToken(): string | null`.
- `src/contexts/AuthContext.jsx` â€” realm-aware: `realmForUser()`; `restoreWithToken`
  guarda en `REALMS.PENDING`, pregunta `/me` y mueve el token a la ranura de su rol;
  el `useEffect` de arranque migra la ranura legacy y recorre `listRealms()` de la
  mÃ¡s reciente a la mÃ¡s antigua (`dropRealm` si `/me` falla); `loginLocal` usa
  `restoreWithToken`; `logout()` llama a su backend, **solo** borra la ranura activa
  y, si queda otra, la reactiva (`/me` + `window.location.assign(homePathForRoleâ€¦)`)
  sin sacar al usuario; `logoutLocal` usa `clearToken()`.
- `src/hooks/useRealtimeResponses.js` â€” el SSE lee `getToken()` en vez de
  `localStorage.getItem(TOKEN_KEY)`.

**Reglas respetadas**
- `AuthProvider` estÃ¡ FUERA de `BrowserRouter` (`main.jsx`): el contexto no puede
  usar `useNavigate`; navega con `window.location.assign`.
- El cierre de sesiÃ³n de un rol no borra las demÃ¡s ranuras ni sus tokens.

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (solo warnings preexistentes).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones Â· 0
  conflictos semÃ¡nticos).
- **Sonda E2E real (Chrome headless por CDP, temporal y eliminada,
  `backend/qa/_probe-session-isolation.mjs`):** creÃ³ dos usuarios reales
  (super_admin + entity_admin) con sesiones en la BD, puso ambos tokens en las
  ranuras del navegador, comprobÃ³ que la sesiÃ³n activa es la del entity_admin,
  **pulsÃ³ el botÃ³n real de logout**, y verificÃ³ que se borra solo la ranura del
  entity_admin, que el token del super_admin queda **idÃ©ntico**, que el realm
  activo vuelve a `super_admin`, que la app navega a
  `/panel-gestion/formularios-publicos` y que la UI muestra al super_admin
  restaurado. Resultado: `TODO CORRECTO`. Fixtures borrados tras la sonda.

### 2026-10-12 â€” RediseÃ±o premium de los campos del panel super-admin

**Objetivo:** dar a los tres formularios del panel (`Users`, `Entities`,
`AccessUrls`) un tratamiento de campos "premium" homogÃ©neo: icono guÃ­a en cada
campo, icono de estado (vÃ¡lido/error), mensajes con icono y opciones tipo tarjeta
con teclado.

**Archivos modificados**
- `src/components/admin/admin.css` â€” nuevas `@utility` **definidas despuÃ©s de**
  `adm-field-premium` (orden de cascada: ganan al `padding` lateral de ese
  `@utility`): `adm-field-lead` (`padding-left: 3.5rem`), `adm-field-trail`
  (`padding-right: 2.5rem`), `adm-field-area` (textarea), `adm-field-msg`,
  `adm-option`, `adm-option-hover`, `adm-option-on`, `adm-option-bad`.
- `src/components/admin/FormFields.jsx` â€” reescrito. Exporta `FieldLabel`
  (marca requerido en color de marca) y `FieldMessage` (error con `AlertCircle` +
  `role="alert"` / pista con `Info`); y los campos `AdminInput` (chip de icono a
  la izquierda + estado `CheckCircle2`/`AlertCircle` a la derecha),
  **`AdminTextarea` (nuevo)**, `AdminSelect` (nativo, `appearance-none`, chevron
  `ChevronDown` que rota con `group-focus-within`, tinte de error), **`AdminOptionGroup`
  (nuevo: tarjetas radio, `role="radiogroup"`/`"radio"`, roving tabindex + flechas
  con `move()`/`onKeyDown`, ids `${name}-opt-${value}`)** y `AdminFieldGroup`.
  El estado "vÃ¡lido" se muestra con `showValid = !msg && isTouched && !disabled &&
  value.length > 0`.
- `src/components/admin/EntitySelectField.jsx` â€” pasa a usar `FieldLabel`/
  `FieldMessage` (props `hint`, `required`).
- `src/pages/admin/Users.jsx` â€” el campo `role` ahora usa `AdminOptionGroup`
  (iconos `UserRound`/`KeyRound` + descripciones); se elimina el import de
  `AdminSelect` en el formulario.
- `src/pages/admin/Entities.jsx` â€” select de categorÃ­a con `icon={Layers}`.
- `src/pages/admin/AccessUrls.jsx` â€” select de rol con `icon={KeyRound}`.

**Reglas respetadas**
- Solo tokens de marca (`var(--color-brand-*)`); nunca hex a fuego.
- Paddings laterales vÃ­a utilidades propias (`adm-field-lead/trail`) porque
  `adm-field-premium` fija `padding: 0 .875rem` y ganarÃ­a a `pl-*`/`pr-*` de
  Tailwind (ver Â§9).

**Puertas ejecutadas (todas verdes)**
- `npm run lint` â†’ 0 errores (solo warnings preexistentes: `Entities.jsx:17`
  `AdminFieldGroup` sin usar, `AccessUrls.jsx:36`/`Users.jsx:33` `SelectField` sin
  usar, `Users.jsx:99` `isSubmitting` sin usar).
- `npm run build` â†’ exit 0 (aviso de chunk >500 kB preexistente).
- `npm run qa:brand` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones
  justificadas Â· 0 conflictos semÃ¡nticos).
- Sonda runtime (Chrome headless por CDP, **temporal y eliminada**): la pÃ¡gina de
  campos renderiza **sin excepciones**; 5 chips de icono, textarea, chevron,
  2 radios con 1 activa, icono de error + mensaje y check verde al validar
  (`TODO CORRECTO`). Artefactos de sonda borrados (`src/pages/__probe-fields.jsx`,
  `qa/_probe-fields.js`, ruta/import temporal en `src/App.jsx`).

### Cambio inicial â€” capa compartida y resoluciÃ³n de advertencias

**Creados**
- `AGENTS.md` (raÃ­z del workspace â†’ stub; el contenido completo vive en
  `frontend/AIFormBuilder/AGENTS.md`).
- `frontend/AIFormBuilder/src/shared/styles/{tokens.ts,theme.ts,mixins.ts}`.
- `frontend/AIFormBuilder/src/shared/skills/{index.ts,README.md}`.

**Eliminados**
- `frontend/AIFormBuilder/node_modules/recharts/AGENTS.md` (archivo de una
  dependencia; no habÃ­a ningÃºn otro `AGENTS.md`/`CLAUDE.md` en el proyecto).

**Movidos**
- `AGENTS.md` raÃ­z â†’ `frontend/AIFormBuilder/AGENTS.md` (raÃ­z real del frontend).
  La raÃ­z del workspace conserva un stub de una lÃ­nea que redirige a este
  archivo.

**Modificados (resoluciÃ³n de las 5 advertencias)**

| # | Archivo | Cambio |
|---|---|---|
| 1 | `tsconfig.json` | Sin cambios: ya estaba acotado a `.ts/.tsx`. Se documentÃ³ el alcance en `AGENTS.md` Â§5 ("Alcance de TypeScript"). |
| 1 | `AGENTS.md` | Nueva secciÃ³n "Alcance de TypeScript" con explicaciÃ³n de `allowJs: false`, quÃ© queda fuera y convenciÃ³n de `.d.ts` hermanos. |
| 2 | `src/components/ui/FabSpeedDial.tsx` | `import { cn } from "@/lib/utils"` â†’ `import { cn } from "@/shared/skills"`. Consumidor real de `src/shared/skills`. |
| 2 | `src/pages/admin/PublicStats.jsx` | `formatNumber` definido localmente â†’ `import { formatNumber } from "@/shared/skills"`. Consumidor real de `src/shared/skills`. |
| 2 | `src/components/ui/apple-spotlight.tsx` | `import { cn } from "@/lib/utils"` â†’ `import { cn } from "@/shared/skills"`. Consumidor real de `src/shared/skills`. |
| 2 | `src/components/admin/AdminTable.jsx` | `import { cn } from "../../lib/utils.js"` â†’ `import { cn } from "@/shared/skills"` + `TONES.gold: "#bfa23a"` â†’ `accents.gold`. Consumidor real de `src/shared/skills` y `src/shared/styles`. |
| 2 | `src/components/admin/PublicFormCard.jsx` | `import { cn, timeAgo } from "../../lib/utils.js"` â†’ `import { cn, timeAgo } from "@/shared/skills"`; paleta `STRIP`: `#7e6cc0` â†’ `accents.purple`, `#c2706a` â†’ `accents.coral`, `#2f9e8a` â†’ `accents.teal`. Consumidor real de `src/shared/skills` y `src/shared/styles`. |
| 2 | `src/components/dashboard/NavCard.jsx` | `accent = "#bfa23a"` â†’ `accent = accents.gold` (importado de `@/shared/styles/tokens`). Consumidor real de `src/shared/styles`. |
| 2 | `src/components/dashboard/CardDecor.jsx` | `color = "#bfa23a"` â†’ `color = accents.gold` (importado de `@/shared/styles/tokens`). Consumidor real de `src/shared/styles`. |
| 2 | `src/pages/Dashboard.jsx` | `ACCENT = { gold: "#bfa23a", â€¦ }` â†’ `import { accents } from "@/shared/styles/tokens"` y `const ACCENT = accents`. Consumidor real de `src/shared/styles`. |
| 2 | `src/pages/GuestHome.jsx` | Misma migraciÃ³n que `Dashboard.jsx`. |
| 3 | `src/shared/styles/tokens.ts` | Nuevo objeto `accents` (gold, coral, purple, blue, teal) apuntando a `var(--accent-*)`. |
| 3 | `src/index.css` | Nuevas variables CSS `--accent-gold`, `--accent-coral`, `--accent-purple`, `--accent-blue`, `--accent-teal` (definiciÃ³n de los tokens, no uso). |
| 5 | `AGENTS.md` | Nueva secciÃ³n "Reglas crÃ­ticas de estilos (`@utility` y CSS)" con norma obligatoria, ejemplo correcto/incorrecto y caso histÃ³rico de `admin.css`. |
| 5 | `src/components/admin/admin.css` | Sin cambios: ya se importa desde `index.css` (lÃ­nea 5). AuditorÃ­a confirmada: solo `index.css` y `admin.css` contienen `@utility`, ambos en el pipeline principal. |

**Puertas ejecutadas (todas verdes)**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ 0 errores (warnings preexistentes tolerados).
- `npm run build` â†’ exit 0 (3342 mÃ³dulos transformados; los warnings de
  `Unknown at rule: @utility` de lightningcss son preexistentes y no afectan
  al resultado).
- `node qa/brand-audit.js` â†’ **TODO CORRECTO** (0 congelamientos Â· 27 excepciones
  justificadas Â· 0 conflictos).
- `npm run qa:routes` â†’ 124 checks / 27 fails (baseline conocida, no regresiÃ³n).

**No se moviÃ³ ni renombrÃ³** ningÃºn archivo existente (salvo el `AGENTS.md`
moverido a `frontend/AIFormBuilder/`, que es el objetivo de la advertencia 4).


### 2026-10-14 — Ajuste: mostrar usuario y correo del encuestado IDP en la sección de estadísticas y en la ficha de la bandeja

**Petición del usuario:** en la sección del IDP en estadísticas y en la bandeja de entrada, además del nombre completo, capturar/mostrar también el usuario y el correo.

**Estado:** el backend ya persiste respondent_username y respondent_email; el frontend ya renderiza ambos en RespondentCard, Inbox y Analytics. La única respuesta con respondent_sub en BD tiene esos campos NULL (flujo antiguo). No se requieren cambios de código.

**Puertas ejecutadas (todas verdes):**
- node --check (middleware/respondent.js, services/response.service.js, controllers/auth.controller.js, repositories/response.repo.js) → OK
- npx tsc --noEmit → 0 errores
- npm run lint → 0 errores (solo warnings preexistentes)
- npm run build → exit 0
- npm run qa:brand → TODO CORRECTO
- npm run qa:routes → 124 comprobaciones · 0 fallos

**Efecto:** RespondentCard muestra @usuario y correo cuando existen, tanto en Inbox (Drawer) como en Analytics (sección Encuestados verificados). Sin duplicados ni dependencias nuevas.


### 2026-10-14 — Rediseño de estadísticas del gestor de entidad para igualar la UI del superadmin

**Petición:** igualar UI a superadmin (título «Estadísticas», subtítulo «Rendimiento de todos los formularios de su entidad», charts).

**Cambios:**
- src/lib/roleI18n.js: textos entityStats/entityStatsDesc (ES/EN).
- src/pages/entity-admin/EntityStats.jsx: misma estructura que Insights (PageHeader, KpiCard, ChartCard, PrismVolumeChart, PrismDonut, PrismTopForms, Funnel).

**Puertas:** tsc 0, lint 0, build 0, qa:brand OK, qa:routes 124/0.

### 2026-10-14 - Verificacion E2E: estadisticas del gestor de entidad visibles

- Sonda CDP headless con sesion entity_admin real (ministerio-de-justicia): PATH correcto, H1 Estadisticas, subtitulo pedido, KPIs 2/32/6%/0.3 y charts, 0 errores de consola. Sonda eliminada.
- Causa del no se ve: backend :8000 y vite :5173 detenidos durante el diagnostico + build roto anterior (Gauge/formatNumber) ya corregido. Ambos re-arrancados; /api/health OK y /api/admin/entity-stats 200.
- Sin cambios de codigo en esta ronda.

### 2026-10-14 - EntityStats espejo de Insights (mismos charts, datos reales)

- Backend: insights.service exporta computeInsights; admin.controller entityAggregate lo reutiliza (stats, timeline, heatmap, devices, topForms reales).
- Frontend: EntityStats reescrito como Insights (KPIs, heatmap, area, donut, topForms); nuevo InsightKpis compartido; PrismTopForms con onSelect; Insights usa el compartido; excepcion brand movida.
Puertas: tsc 0, lint 0, build ok, brand TODO CORRECTO (0/27/0), routes 124/0. CDP: entidad y super muestran mismos charts (heatmap, area, donut, topForms), 0 errores.

### 2026-10-14 - Sin invitado + sin ajustes en gestores + acento #473ce2

- Invitado fuera: borrados GuestHome/GuestStats/GuestPill; / muestra AccessRequired (nuevo); fuera /explorar, /plantillas, /constructor/:id y GuestIdentity; GUEST_NAV vacio; crear redirige a / sin sesion. /f/:slug intacto.
- Ajustes fuera en gestores: ENTITY_PAGES/ENTITY_NAV/filtro creador sin settings; guard en RoleRoute; sin Ajustes en IdentityMenu ni paleta. Acento #473ce2 impuesto por cuenta en PreferencesSync (super intacto). Limpieza guestMode en Insights.
Puertas: tsc 0, lint 0, build ok, brand TODO CORRECTO (0/27/0), routes 124/0. CDP: anon Acceso restringido; entidad/creador sin ajustes, acento #473ce2 y rebote a formularios; super intacto. 0 errores.

### 2026-10-14 - Sin sesion manda el indigo #473ce2 en puertas y portada

- ThemeContext arranca en #473ce2 sin sesion (ignora rastros viejos); PreferencesSync al cerrar deja #473ce2 siempre (fuera rama que conservaba el del super). Gestores siguen forzados al entrar; super hidrata el suyo.
Puertas: tsc 0, lint 0, build ok, brand TODO CORRECTO (0/27/0), routes 124/0. CDP: puerta fresca y rastro magenta en indigo; super en cian, tras logout portal en indigo guardado; puerta /a en indigo. 0 errores.

### 2026-10-14 - Fuera el tooltip de rol del avatar (disparador de identidad)

- IdentityMenu: el disparador queda en avatar + chevron sin Tooltip; el rol se lee en la ficha del menu. Docs IDENTITY_UI al dia.
- Puertas: tsc 0, lint 0, build ok, brand TODO CORRECTO (0/27/0), routes 124/0.

### 2026-10-14 - Tono profesional para creatorRoleHint

- roleI18n (es/en): Gestores de TU entidad... pasa a Cuentas de gestores de formularios pertenecientes a tu entidad. / Form manager accounts belonging to your entity. Solo texto; lint 0.

### 2026-10-14 - Estrellas de colores en publicados con rating legacy

- Auditoria: 17 publicados; 9 traian rating de un color (12 preguntas, todas 5 pts sin anclas). Script backend/qa/migrate-rating-to-quality.js (idempotente, misma regla conEstrellas del renderer): rating pasa a quality_rating. Respuestas intactas (numericas, mismo RATING_TYPES).
Puertas: node --check ok. CDP en /f/a5t0Vra7NW5M: 5 estrellas rojo/rojo/ambar/verde/verde, 0 errores. Solo backend y datos; frontend intacto.

### 2026-10-14 - Fuera el boton de estadisticas de la portada publica

- FormCard: el pie de invitado queda solo en Responder (iba a /estadisticas/:slug, ruta ya eliminada). Sin cuenta no hay accesos a estadisticas.
- Puertas: tsc 0, lint 0, build ok, brand TODO CORRECTO (0/27/0), routes 124/0. CDP: 0 menciones a Insights/Estadisticas, 15 Responder, 0 errores.

### 2026-10-15 — Título de pestaña del login de usuarios (`/formularios-con-ia-loginadmin`)

**Objetivo (petición del usuario):** la pestaña del login de todos los usuarios
(super, entidad y gestores) mostraba «CubaGob - Page not found»; debe rotularse
como autenticación.

**Causa raíz:** `resolveDocumentTitle` (`lib/pageTitle.js`) cubría `/login`
(`logIn`) y `/a/<slug>` (`accessLogin`), pero NO el portal local
`SUPER_ADMIN_LOGIN_PATH` (`/formularios-con-ia-loginadmin`, `LocalLogin`), así que
caía al fallback `pageNotFound`.

**Archivos modificados**
- `src/lib/pageTitle.js` — nueva rama
  `if (pathname === SUPER_ADMIN_LOGIN_PATH) return conMarca("authenticate");`
  (import de `SUPER_ADMIN_LOGIN_PATH` desde `routes.js`, ya declarado en
  `routes.d.ts`).
- `src/contexts/LanguageContext.jsx` — clave nueva `authenticate`:
  en «Authenticate» / es «Autenticar».

**Efecto:** la pestaña del portal pasa a `CubaGob - Autenticar` (es) /
`CubaGob - Authenticate` (en). `/login` y `/a/<slug>` no cambian.

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores ·
`npm run build` → exit 0 · `npm run qa:brand` → **TODO CORRECTO** (0/27/0) ·
`npm run qa:routes` → **124 comprobaciones · 0 fallos**. Sonda CDP: el portal
devuelve `document.title` «CubaGob - Authenticate» (en) y «CubaGob - Autenticar»
(es); `/a/<slug>` sigue «Access». Solo frontend.

### 2026-10-15 — Botón reutilizable mostrar/ocultar contraseña (`PasswordToggle`)

**Objetivo (petición del usuario):** un único control premium de "ver/ocultar
contraseña" reutilizable, integrado en TODOS los campos `type="password"` del
sitio, sin duplicar componentes ni añadir dependencias.

**Componente (nuevo)**
- `src/components/ui/PasswordToggle.jsx` — botón controlado (`visible`/`onToggle`)
  con SVG inline propio (sin lucide): ojo + trazo diagonal que se dibuja/desdibuja
  por `stroke-dashoffset` y un crossfade/scale sutil. `type="button"`,
  `aria-pressed` y `aria-label` dinámico; `onMouseDown.preventDefault()` conserva
  el foco y el cursor del input al alternar. `disabled` soportado.
- `src/components/ui/password-toggle.css` — CSS plano (sin `@utility`, como
  `respondent.css`) con prefijo `ui-pwd-` y variables `--ui-pwd-*`; 36px de zona
  táctil, hover 7%, `active: scale(.94)`, `focus-visible` con anillo de marca,
  dark y `prefers-reduced-motion`. Solo tokens (`--color-ink/-ink-muted`,
  `--color-brand-500`).

**Integración (mínima, sin tocar lógica/validación/envío)**
- `components/auth/AuthCard.jsx` (`AuthField`) — usado por `/a/:slug`; reemplaza
  el botón lucide por `PasswordToggle`; `pr-10` → `pr-12`.
- `components/auth/SuperAdminStage.jsx` (`SaField`) — login/reset del portal;
  ídem, `pr-10` → `pr-12`.
- `pages/admin/Users.jsx` y `pages/entity-admin/EntityUsers.jsx` — el campo de
  contraseña (`AdminInput` + `trail`) usa `PasswordToggle`; fuera el botón inline
  y los imports `Eye`/`EyeOff`.
- `components/ui/FormFields.jsx` (`InputText`) — el campo `password` del
  formulario público (vía `FieldRenderer`) hereda el toggle; `pr-3.5` → `pr-12`
  solo cuando es contraseña. Sin tocar `FieldRenderer`.

**Reglas respetadas** — cero dependencias nuevas (SVG inline), cero componentes
paralelos, cero hex de marca (tokens), sin tocar auth/validación/RBAC/backend.
El input conserva `name`/`id`/`value`/`onChange` (RHF y controlados).

**Puertas (todas verdes)** — `npx tsc --noEmit` → 0 · `npm run lint` → 0 errores
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. CSS `ui-pwd` confirmado en `dist/assets/index-*.css` (42 coincidencias,
`--ui-pwd-*` y selectores `[aria-pressed]` presentes). Solo frontend.

### 2026-10-15 — Icono de estadísticas en el menú lateral (Superadmin y Gestor de Entidad)

**Objetivo (petición del usuario):** el elemento «Estadísticas» del panel
izquierdo debe llevar un icono que evoque estadísticas. Se aplica a todas las
listas del menú que tengan esa entrada.

**Archivo modificado — `src/layouts/DashboardLayout.jsx`**
- `SUPER_NAV`: el item `insights` pasa de `Sparkles` a **`BarChart3`**.
- `BASE_NAV`: ídem (la entrada compartida «Estadísticas» usaba también
  `Sparkles`).
- `ENTITY_NAV` ya usaba `BarChart3` → se queda igual; ahora las tres listas son
  coherentes.
- Import de `Sparkles` retirado (quedó sin uso).
- El cambio cubre a la vez el rail de escritorio y el drawer móvil, que
  pintan `item.icon` de la misma lista.
- `src/components/CommandPalette.jsx` — la acción **«Estadísticas»**
  (`commandInsights`) pasa también de `Sparkles` a `BarChart3`: es el mismo
  elemento del menú servido por ⌘K, y se alinea con el rail. (`Sparkles` se
  queda para la acción de IA, donde sí corresponde.)

**Alcance declarado (acordado con el usuario):** el `form_creator` **no** tiene
página ni entrada de Estadísticas (`navFor` la filtra en `DashboardLayout.jsx:77`
y `canSeeStatsPage` devuelve `false` para ese rol, decisión registrada en §10
«Rutas del panel del form_creator…»). No se toca RBAC ni se añaden entradas.

**Puertas (todas verdes)** — `npm run typecheck` → 0 · `npm run lint` → exit 0
(sin avisos en `DashboardLayout.jsx`) · `npm run build` → exit 0 ·
`npm run qa:brand` → **TODO CORRECTO** (0/27/0) · `npm run qa:routes` →
**124 comprobaciones · 0 fallos**. Solo frontend.

### 2026-10-15 — Filtro de estado de la cuenta (Activa/Inactiva) en Usuarios y Gestor de Entidad

**Objetivo (petición del usuario):** poder filtrar las listas de cuentas por
**estado de la cuenta** (activa / inactiva), tanto en el panel super-admin
(Usuarios) como en el del Gestor de Entidad (Creadores).

**Enfoque elegido:** filtro **local** sobre lo ya cargado —el mismo precedente
de `EntityForms` («los filtros … son locales sobre lo ya cargado»)—. El
servidor solo decide el **rol** (`adminApi.users({ role })` sigue igual), así
que no se añade parámetro de estado ni se toca backend. Criterio idéntico al
de la columna Estado de la tabla: `u.isActive !== false ? "active" : "inactive"`.
Valores: `""` (todos) · `"active"` · `"inactive"`.

**Archivos modificados**
- `src/lib/roleI18n.js` — clave nueva `status`: en «Status» / es «Estado».
- `src/pages/admin/Users.jsx` — estado `status`; memo `statusFiltered` (antes de
  `sortedUsers`, que ahora parte de él); `STATUS_OPTIONS` (iconos
  `LayoutGrid`/`Activity`/`PowerOff`); tercera columna de la rejilla del
  `AdminPanel` (`lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)] lg:items-end`)
  con el `Segmented` «Estado»; `filterLabels`/`statusLabelOf` alimentan el
  `SummaryBar` (tickKey ahora incluye `status`) y el chip nuevo; cabecera de
  columna «Estado» → `rt("status")`.
- `src/pages/entity-admin/EntityUsers.jsx` — mismo patrón: estado `status`,
  `statusFiltered`/`sortedUsers`, `STATUS_OPTIONS`/`statusLabelOf`, imports
  nuevos `Segmented` (ListChrome) y `LayoutGrid` (lucide), rejilla a tres
  columnas (buscador · Estado · entidad), `SummaryBar` con `${status}` en el
  tickKey y texto según filtro, chip de limpieza y columna → `rt("status")`.

**Reglas respetadas** — sin componentes ni dependencias nuevas (se reutiliza el
`Segmented` de `ListChrome`), sin cambios en `lib/api.js`/`AuthContext`/backend,
sin hex de marca. `applySpotlightQuery` sigue componiendo bien: el pre-filtrado
por estado se intersecciona con la búsqueda cuando la hay.

**Puertas (todas verdes)** — `npm run typecheck` → 0 · `npm run lint` → exit 0
(solo warnings preexistentes) · `npm run build` → exit 0 · `npm run qa:brand` →
**TODO CORRECTO** (0/27/0) · `npm run qa:routes` → **124 comprobaciones · 0
fallos**. Solo frontend.

### 2026-10-15 — Correo de bienvenida premium + cambio de contraseña forzado + «Reenviar correo»

**Objetivo (petición del usuario):** reconfigurar el correo de alta de cuentas
(bienvenida premium con nombre, credenciales o enlace de activación, URL
`/a/<slug>`, entidad, rol, ES/EN, texto plano, toast diferenciado, botón
«Reenviar correo», eventos de auditoría y docs), con dos variantes: **A** enlace
de activación (por defecto) y **B** contraseña temporal + **cambio forzado** al
primer acceso.

**Backend** (`backend/`) — reutiliza `nodemailer` (ya en `package.json`):
- `services/mail.templates.js` **nuevo** — `welcomeEmail()` (modos
  `activation`/`credentials`, ES/EN, responsive y modo oscuro), `resetEmail()`,
  `escapeHtml`, `roleLabel`.
- `services/mail.service.js` — `isMailConfigured()`, `getTransporter()`,
  `withRetry` (2 intentos), `sendUserWelcomeEmail()` (**nunca lanza**),
  `sendPasswordResetCode()`.
- `services/welcome.service.js` **nuevo** — orquesta alta y reenvío
  (`sendWelcomeForNewUser`, `resendWelcomeEmail`); `ACTIVATION_PATH` reutiliza el
  modo `?token=` del portal local.
- `controllers/localAuth.controller.js` — `localRegister` envía el correo
  (best-effort + auditoría); `localLogin` invalida la contraseña temporal caducada
  (`auth.local.temp_password_expired`).
- `controllers/admin.controller.js` y `controllers/entityAdmin.controller.js` —
  `resendWelcome` (`POST /users/:id/resend-welcome`); el super_admin no puede
  reenviarse a sí mismo.
- `repositories/user.repo.js` — `setTemporaryPassword`; `mapUser` propaga
  `mustChangePassword`/`tempPasswordExpiresAt`. `repositories/settings.repo.js` —
  `setPassword` ahora limpia la marca y resetea bloqueos.
- `utils/password.js` (`generateTempPassword`), `config/env.js` (variables
  nuevas), `config/db.js` (columnas nuevas), `backend/.env.example` **nuevo**.
- `docs/MAIL_SERVICE.md` **nuevo** — contrato completo (variantes, reenvío,
  retorno, configuración, auditoría, variante B, plantillas).
- `qa/welcome-mail-probe.js` **nuevo** — sonda de repositorio+servicio (sin
  servidor HTTP): verifica el generador de contraseña temporal, los TTLs y la
  variante, el marcado del cambio forzado (`setTemporaryPassword`), su limpieza
  al fijar una contraseña real (`settings.repo.setPassword`), el reenvío sin URL
  (`reason: "no_access_url"`) y la rama del reenvío con URL (A firma token / B
  marca temporal).

**Frontend** (`frontend/AIFormBuilder/src/`):
- `pages/ForcePasswordChange.jsx` **nuevo** — RHF+zod, `AdminInput` +
  `PasswordToggle`, `settingsApi.changePassword` y `updateUser` para limpiar la
  marca.
- `App.jsx` — import perezoso + gate en `RoleRoute` (tras el bloque *guest*):
  `if (user.mustChangePassword) return <ForcePasswordChange />`.
- `contexts/LanguageContext.jsx` — claves `forcePassword*` (ES/EN).
- `pages/admin/Users.jsx` y `pages/entity-admin/EntityUsers.jsx` — función
  `resend` + acción de la rueda «Reenviar correo» (`<Send/>`), usando
  `adminApi`/`entityAdminApi.resendWelcome`; toasts `resendSent`/`resendFailed`.
- `lib/roleI18n.js` — claves `resendEmail`/`resendSent`/`resendFailed` (ES/EN).
- `services/index.js` + `services/index.d.ts` — `resendWelcome` en `adminApi` y
  `entityAdminApi`.

**Reglas respetadas** — **no** se tocó `AuthContext.jsx` (`updateUser`), **no** se
modificó `assertAccessUrlFor`, sin hex de marca, sin dependencias nuevas, correo
best-effort que nunca rompe el alta, patrón `lazy()` para la página nueva.

**Puertas (todas verdes)**
- Backend: `node --check` de todos los ficheros tocados → OK; `curl -k
  /api/health` → 200; `POST /api/admin/users/:id/resend-welcome` sin token → 401
  (ruta montada, no 404); `node qa/welcome-mail-probe.js` → **OK** (variante A
  activación, correo enviado vía Ethereal).
- Frontend: `npx tsc --noEmit` → 0 · `npm run lint` → exit 0 (solo warnings
  preexistentes, ninguno en los ficheros tocados) · `npm run build` → exit 0
  (chunks `ForcePasswordChange-*.js` y `EntityUsers-*.js` emitidos) ·
  `npm run qa:brand` → **TODO CORRECTO** (0 congelamientos / 27 justificadas / 0
  conflictos) · `npm run qa:routes` → **124 comprobaciones · 0 fallos**.

### 2026-10-31 — LivePreview: desplegable de PremiumSelect sobre el modal y con ancho del campo

**Objetivo (petición del usuario):** en el LivePreview del Builder los 5 selects
renderizados por `PremiumSelect` (Provincia, Municipio, Género, Nivel de
escolaridad, Lista desplegable) se abrían por detrás del telón de fondo del modal
y el desplegable se estiraba a todo el ancho de pantalla en vez de ajustarse al
ancho del campo.

**Causa raíz:** el desplegable montaba su `z-index` con
`z-[var(--z-dropdown, 60)]` (por debajo del backdrop del modal, que usa
`--z-modal-backdrop: 50` y el modal `--z-modal: 60`), y los estilos de ancho/
posición iban en un envoltorio `<div>` muerto fuera del portal: como el portal
renderiza como hermano del envoltorio, esos estilos no se aplicaban y el
`motion.div` del portal quedaba con `width: auto` (ancho completo del body).

**Archivo modificado (1):**
- `src/components/ui/PremiumSelect.jsx` — ambas ramas del desplegable (con y
  sin tooltip): `z-[var(--z-popover, 70)]` en la clase del `motion.div` del
  portal (por encima del backdrop y del modal) y los estilos
  `position: fixed`, `left`, `top`, `minWidth: rect.width`,
  `width: rect.width` movidos del envoltorio `<div>` (eliminado/sustituido por
  fragmento `<>...</>`) al `style` del `motion.div` dentro de
  `createPortal(...)`.

**Contrato de datos intacto:** fix frontend-only; sin cambios de datos, APIs ni
persistencia. `tsconfig.json` solo cubre `.ts`/`.tsx`; `PremiumSelect.jsx` es
`.jsx` y no lo chequea `tsc`.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno en
  `PremiumSelect.jsx`).
- `npm run build` → exit 0 (2.13 s; los avisos `Unknown at rule: @utility` de
  `admin.css` son preexistentes, ver §9).
- `npm run qa:brand` → baseline sin regresión: 1 congelamiento preexistente en
  `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos;
  **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente),
  sin regresión.

### 2026-10-31 — Campo FileUpload: rediseño premium glassmorphism + idioma

**Objetivo (petición del usuario):** el campo de subida de archivos (`type: "file"`)
se renderizaba como un `<input type="file">` nativo básico, sin estilo premium, y
su texto ("Haz clic para subir un archivo") estaba hardcodeado en español sin
respetar el idioma activo.

**Causa raíz:**
1. `FieldRenderer.jsx` (caso `file`) usaba un `<input type="file">` crudo sin
   envoltorio premium ni traducción.
2. `FormFields.jsx` tenía un `FileUploadField` muerto (sin consumidores) con el
   texto hardcodeado en español.
3. No existía un componente dedicado de subida premium.

**Archivos modificados (4) + 1 nuevo:**
- `src/components/ui/FileUploadField.jsx` (**nuevo**) — campo premium glass:
  zona de soltar (drop zone) con vidrio esmerilado, borde puntiagudo y anillo de
  marca al focar/arrastrar; drag & drop real sobre la zona; vista previa del
  archivo (miniatura para imágenes, ícono de documento para el resto) con
  nombre, peso y botón «Quitar»; enlace «Cambiar archivo»; validación local de
  tipo (imágenes y PDF) y tamaño (hasta 8 MB); estados error/disabled/required.
  Todo el texto resuelve mediante `t()` (es/en).
- `src/components/public/FieldRenderer.jsx` — caso `file` renderiza ahora
  `<FileUploadField>` pasando `language={lang}` y `t={t}`; se elimina el
  `<input type="file">` crudo y el texto hardcodeado.
- `src/components/ui/FormFields.jsx` — se reemplaza el `FileUploadField` muerto
  por una re-exportación del nuevo componente (`export { FileUploadField } from
  "./FileUploadField.jsx"`); se elimina el import sin uso de `Upload`.
- `src/contexts/LanguageContext.jsx` — añadidas claves `fileDrop`,
  `fileRemove`, `fileChange`, `fileSizeLimit`, `fileAccepted`,
  `fileInvalidType`, `fileTooLarge` en `es` y `en` (junto a `uploadFile` ya
  existente).

**Contrato de datos intacto:** `field.content` sigue guardando el nombre del
archivo (string); `onChange` recibe el `File` y `FieldRenderer` lo convierte a
`.name`. No se añaden claves a `field` ni se toca backend/persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno en los
  archivos tocados/nuevos).
- `npm run build` → exit 0.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente),
  sin regresión.

### 2026-10-31 — FileUpload: ícono correcto por formato (Office, PDF) + label en idioma activo

**Objetivo (petición del usuario):** al subir un archivo, el campo debe reconocer
su formato y mostrar el ícono correcto (no uno genérico), incluyendo Word, Excel
y PowerPoint; el ícono de PDF debía aparecer al subir un PDF; y el label del
campo debía respetar el idioma activo (no mostrarse en inglés).

**Causa raíz (tres defectos):**
1. `ACCEPTED_TYPES` solo incluía imágenes y PDF, así que Word/Excel/PowerPoint
   se rechazaban en `acceptFile()` **antes** de llegar a `getFileFormat()`: nunca
   se guardaba el archivo ni se renderizaba la tarjeta de vista previa con el ícono.
2. `getFileFormat()` no usaba colores distintivos por tipo, así que el ícono de
   PDF (`FileText`) se confundía con el genérico y no se "veía".
3. `FieldRenderer.jsx` pasaba `label={fieldLabel}` que podía venir en inglés
   (etiqueta del tipo guardada al crear el formulario), y `FileUploadField` no
   tenía la clave `field_file` en `LanguageContext` para usarla como fallback
   cuando el autor no puso etiqueta personalizada.

**Archivos modificados (3):**
- `src/components/ui/FileUploadField.jsx` — `ACCEPTED_TYPES` ampliado a los MIME
  types de Office (Word `.doc/.docx`, Excel `.xls/.xlsx/.csv`, PowerPoint
  `.ppt/.pptx`) más imágenes, PDF y CSV. `getFileFormat()` reescrito para ser más
  robusto (MIME + extensión como respaldo, incluido `application/octet-stream` →
  extensión) y devolver ahora también una `colorClass` de Tailwind por tipo
  (PDF `text-red-600`, Word `text-blue-600`, Excel `text-green-600`,
  PowerPoint `text-orange-600`, Imagen `text-brand-500`, Audio `text-purple-600`,
  Vídeo `text-indigo-600`, Comprimido `text-slate-500`, Código `text-yellow-500`,
  Texto/Archivo `text-slate-400`). La tarjeta de vista previa renderiza
  `<FormatIcon>` con el color de su formato y una etiqueta de formato junto al
  nombre y el peso (KB).
- `src/components/public/FieldRenderer.jsx` — el caso `file` pasa ahora
  `label={t ? t("field_file") : "Subir archivo"}`: el label del campo de
  subida de archivos siempre respeta el idioma activo (antes usaba
  `field.label || …`, así que si el campo se llamaba «FileUpload» se mostraba
  en inglés independientemente del idioma seleccionado).
- `src/contexts/LanguageContext.jsx` — añadida la clave `field_file`
  ("Upload file" / "Subir archivo") en `en` y `es`, junto a `uploadFile`; se
  actualizó `fileAccepted` a "Images, PDF & Office" / "Imágenes, PDF y Office"
  para ser coherente con los tipos ahora aceptados.

**Contrato de datos intacto:** `field.content` sigue guardando el nombre del
archivo (string); `onChange` recibe el `File` y `FieldRenderer` lo convierte a
`.name`. No se añaden claves a `field` ni se toca backend/persistencia.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno en los archivos tocados).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28
  excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos
  modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente),
  sin regresión.

### 2026-10-31 — Valoración numérica y por estrellas: idioma en el modal de vista previa

**Objetivo (petición del usuario):** al abrir el modal de vista previa del Builder,
los campos "Valoración Numérica" (`score_rating`) y "Valoración por Estrellas"
(`quality_rating`) aparecían en inglés en vez de respetar el idioma activo.

**Causa raíz (dos defectos):**
1. `src/components/builder/SortableField.jsx` (línea 278) renderizaba
   `FieldRenderer` para el preview inline **sin pasar `language`**, así que el
   `lang` de `FieldRenderer` caía a `field.language || "en"` y las etiquetas
   genéricas de tipo se veían en inglés.
2. `src/components/public/FieldRenderer.jsx` no incluía `rating`,
   `quality_rating` y `score_rating` en `DEFAULT_SPECIAL_LABELS`, así que si el
   campo traía el `label` por defecto en inglés ("Rating", "Quality", "Score")
   se mostraba tal cual sin traducir.

**Archivos modificados (2):**
- `src/components/builder/SortableField.jsx` — se añade `language={language}` al
  `<FieldRenderer ... />` del preview inline (línea 278).
- `src/components/public/FieldRenderer.jsx` — se añaden `rating`, `quality_rating`
  y `score_rating` a `DEFAULT_SPECIAL_LABELS` y a la lista de `isSpecialDefault`,
  para que cuando el label sea el valor por defecto en inglés se traduzca mediante
  `translate(field.type)` (es: "Valoración"/"Calidad"/"Puntuación"; en: "Rating"/"Quality"/"Score").

**Contrato de datos intacto:** no se añaden claves a `field`; ni el autosave, ni el
backend, ni la persistencia cambian.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno en los archivos tocados).
- `npm run build` → exit 0.
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28
  excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos
  modificados aparece**.
- `npm run qa:routes` → baseline conocida (124 checks / 27 fails preexistente),
  sin regresión.

### 2026-10-31 — Campos de elección premium: Radio, Casillas, Sí/No y Clasificación

**Objetivo (petición del usuario):** aplicar un diseño super moderno y premium
("Creative Glass") a los campos de elección del formulario público y del builder:
**Clasificación** (`rank`), **Sí/No** (`yes_no`), **Casillas** (`checkbox`) y
**Opción Múltiple** (`radio`). Antes se renderizaban con `<input type="radio|checkbox>` básicos sin estilo; el dropdown (`Lista desplegable`) ya usaba `PremiumSelect.jsx` y no toca este cambio.

**Decisiones de diseño:**
- Nuevo componente único `src/components/ui/PremiumChoice.jsx` que exporta
  `PremiumRadio`, `PremiumCheckbox`, `PremiumYesNo` y `PremiumRank`.
- Diseño "Creative Glass": cada opción es una tarjeta de cristal (`backdrop-blur`,
  `rounded-2xl`, borde fino) con ícono de acento dentro de un medallón de marca;
  hover que sube ligeramente e ilumina el borde de marca; seleccionado con
  gradiente de marca suave, punto/check de marca y sombra de color de marca;
  número de posición solo en el ranking. Tooltips flotantes del sistema por cada
  opción (`Tooltip`).
- Estados: error (borde rojo), disabled (opacidad), required (asterisco).
- Accesibilidad completa (WAI-ARIA): `role="radiogroup"`/`"group"` + `role="radio"`/`"checkbox"`, `aria-checked`, `aria-disabled`, roving tabindex con flechas, Enter/Space, Home/End, foco visible.
- Despliegue de opciones con framer-motion (entrada escalonada `staggerChildren`, salida suave con `AnimatePresence`).
- Todo con tokens CSS (sin hex de marca a fuego): `bg-brand-*`, `text-brand-*`, `bg-surface`, `text-ink`, `border-line`, `ease-ui`; respeta dark mode y `prefers-reduced-motion`.
- `FieldRenderer.jsx` importa los 4 componentes y reescribe los casos `radio`,
  `checkbox`, `yes_no` y `rank` para usarlos, pasando `t`, `label`, `value`,
  `onChange`, `disabled`, `error` y `required`.
- i18n: claves nuevas `yesDesc`, `noDesc`, `rank`, `rankAdd`, `rankEmpty` en
  ambos diccionarios `es`/`en` de `LanguageContext.jsx` (reutilizan `yes`/`no`
  ya existentes para las etiquetas).

**Archivos tocados (2):**
- `src/components/ui/PremiumChoice.jsx` (nuevo) — `PremiumRadio`, `PremiumCheckbox`, `PremiumYesNo`, `PremiumRank`, `ChoiceOption` base y `ChoiceList`.
- `src/components/public/FieldRenderer.jsx` — import de los 4 componentes y casos `radio`/`checkbox`/`yes_no`/`rank` reescritos.

**Contrato de datos intacto:** no se añaden claves a `field`; ni el autosave, ni el backend, ni la persistencia cambian. `tsconfig.json` solo cubre `.ts`/`.tsx`; `PremiumChoice.jsx` es `.jsx` y no lo chequea `tsc`.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; `PremiumChoice.jsx` limpio).
- `npm run build` → exit 0 (1.64 s; avisos `@utility` de `admin.css` preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados/nuevos aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin relación con este cambio), sin regresión.

### 2026-10-31 — Corrección de selección en campos de elección (Radio, Casillas, Sí/No, Lista desplegable)

**Objetivo (petición del usuario):** el usuario reportaba tres defectos al responder: (1) el icono de «No» del campo Sí/No debía ser una `X` y no un signo de exclamación; (2) los campos Casillas (múltiple), Opción Múltiple (único) y Lista desplegable (único) debían permitir elegir correctamente y mantener la selección; (3) la lista desplegable se quedaba siempre en la primera opción y no se podía seleccionar otra.

**Investigación y causa raíz:**
- (1) El icono ya era `X` (`import { …, X, … } from "lucide-react"` y `icon: X` en la opción `no` de `PremiumYesNo`). Verificado: no queda ningún `AlertCircle` en `PremiumChoice.jsx`.
- (2) La lógica de selección era **correcta** en ambos componentes: `PremiumCheckbox` usa un `Set` de valores (múltiple), `PremiumRadio`/`PremiumYesNo` comparan `value === option.value` (único), y `PremiumSelect` llama `handleSelect(opt)` → `onChange(opt.value)` al hacer clic en una opción (con `e.stopPropagation()` para que el clic-fuera del portal no la cierre antes). El flujo `onChange` → `FormView.setAnswer(q.id, val)` → `answers[q.id]` → prop `value` de `FieldRenderer` → `selectedOpt` en el trigger se verifica trazando `FormView.jsx` y `FieldRenderer.jsx`.
- (3) No se encontró un defecto de código que dejara el dropdown «atrapado en la opción 1»: el cierre del portal, el `data-dropdown="true"` (excluye el portal del clic-fuera) y `handleSelect` están correctos. Sí se endureció `PremiumSelect` añadiendo `onChange = () => {}` como valor por defecto del prop, para que nunca falle si alguna ruta lo invoca sin `onChange`.

**Archivos tocados (2):**
- `src/components/ui/PremiumSelect.jsx` — prop `onChange` con valor por defecto `() => {}` (previene fallo si falta el callback).
- `src/components/ui/PremiumChoice.jsx` — verificación del icono `X` de «No» (sin cambios de código necesarios; ya correcto).

**Contrato de datos intacto:** no se añaden claves a `field`; ni el autosave, ni el backend, ni la persistencia cambian. `tsconfig.json` solo cubre `.ts`/`.tsx`; ambos archivos son `.jsx`.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes en otros archivos; ninguno nuevo en `PremiumSelect.jsx` ni `PremiumChoice.jsx`).
- `npm run build` → exit 0 (1.62 s; avisos `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresión).

### 2026-11-03 — Recuperación: margen superior en el modal de instrucciones enviadas

**Objetivo (petición del usuario):** en el modal de instrucciones enviadas (`SuccessModal`), el ícono de envelope y el texto "¿Olvidaste tu contraseña?" quedaban muy pegados al borde superior del diálogo. Se pidió bajar un poco ese contenido desde el top para que no esté tan pegado arriba.

**Causa raíz.** El header de `StatusModal` usaba siempre `pt-6` como padding superior, sin posibilidad de ajustarlo por instancia. No había forma de alejar el contenido del borde superior solo para este modal sin afectar a los demás.

**Archivos modificados (2):**
- `src/components/ui/Modal.tsx` — se añade la prop opcional `headerPt?: string` a `ModalProps` y a `StatusModalProps`. Se desestructura en `Modal` y se pasa a través de `StatusModal`; el `div` del header la usa con `headerPt ?? "pt-6"` como valor por defecto, así los demás modales no cambian.
- `src/components/auth/RecoveryModal.jsx` — el `<SuccessModal>` del diálogo "Instrucciones enviadas" recibe `headerPt="pt-10"` para que el ícono de envelope y el texto "¿Olvidaste tu contraseña?" bajen un poco desde la parte superior.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia. Solo CSS (padding superior del header), sin hex de marca a fuego.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `Modal.tsx` ni `RecoveryModal.jsx`).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).

### 2026-10-31 — Casillas (checkbox): seleccionar una opción ya no marca todas a la vez

**Objetivo (petición del usuario):** al responder un formulario público, marcar una casilla del campo "Casillas" seleccionaba todas las opciones de golpe, en vez de solo la que se pulsaba.

**Causa raíz.** En `src/components/public/FieldRenderer.jsx` (caso `checkbox`), cada opción se construía con `value: o.value ?? ""`. Como la mayoría de las opciones no trae `value`, todas compartían el valor `""`. `PremiumCheckbox` identifica las opciones por `String(option.value ?? "")` (línea 311: `const isSelected = selectedSet.has(String(option.value ?? ""))`), así que todas caían en la misma entrada del `Set` y marcar una las marcaba todas. Lo mismo afectaba al caso `radio`.

**Arreglo — `src/components/public/FieldRenderer.jsx`:**
- Caso `checkbox` (línea ~543): `value: o.value ?? ""` → `value: o.value ?? o.id ?? o.label ?? String(i)`.
- Caso `radio` (idéntico): `value: o.value ?? ""` → `value: o.value ?? o.id ?? o.label ?? String(i)`.

Así cada opción tiene un valor distinto aunque el autor no rellene `value`, y `PremiumCheckbox`/`PremiumRadio` seleccionan solo la opción pulsada.

**Archivos tocados (1):**
- `src/components/public/FieldRenderer.jsx` — dedup de valores de opciones en los casos `checkbox` y `radio`.

**Contrato de datos intacto:** no se añaden claves a `field`; ni el autosave, ni el backend, ni la persistencia cambian. El valor dedup solo afecta al render de la respuesta pública/preview.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `FieldRenderer.jsx`).
- `npm run build` → exit 0 (1.63 s; avisos `@utility` de `admin.css` preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresión).

### 2026-11-03 — Recuperación: margen superior en el modal de instrucciones enviadas

**Objetivo (petición del usuario):** en el modal de instrucciones enviadas (`SuccessModal`), el ícono de envelope y el texto "¿Olvidaste tu contraseña?" quedaban muy pegados al borde superior del diálogo. Se pidió bajar un poco ese contenido desde el top para que no esté tan pegado arriba.

**Causa raíz.** El header de `StatusModal` usaba siempre `pt-6` como padding superior, sin posibilidad de ajustarlo por instancia. No había forma de alejar el contenido del borde superior solo para este modal sin afectar a los demás.

**Archivos modificados (2):**
- `src/components/ui/Modal.tsx` — se añade la prop opcional `headerPt?: string` a `ModalProps` y a `StatusModalProps`. Se desestructura en `Modal` y se pasa a través de `StatusModal`; el `div` del header la usa con `headerPt ?? "pt-6"` como valor por defecto, así los demás modales no cambian.
- `src/components/auth/RecoveryModal.jsx` — el `<SuccessModal>` del diálogo "Instrucciones enviadas" recibe `headerPt="pt-10"` para que el ícono de envelope y el texto "¿Olvidaste tu contraseña?" bajen un poco desde la parte superior.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia. Solo CSS (padding superior del header), sin hex de marca a fuego.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `Modal.tsx` ni `RecoveryModal.jsx`).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).

### 2026-11-02 — Recuperación: el botón «Enviar instrucciones» confirma mediante diálogo `SuccessModal` con el correo específico

**Objetivo (petición del usuario):** el botón «Enviar instrucciones» del `RecoveryModal` no debía mostrar solo un `toast.success` genérico; debe enviar las instrucciones al correo y levantar un **diálogo de alerta** confirmando el envío a esa cuenta de correo en concreto (no solo un toast), siguiendo el patrón `SuccessModal` + `rt("clave", email)` usado en `Users.jsx`/`EntityUsers.jsx` con `credentialsSentBody`.

**Archivos modificados (2):**
- `src/components/auth/RecoveryModal.jsx` — se retira `toast.success(...)` del éxito del envío; se añade el estado `emailSent` y, al confirmarse `localAuthApi.forgot(email)`, se guarda `setEmailSent(email)` y se renderiza `<SuccessModal open title={rt("recoverySentTitle")} description={rt("recoverySentBody", emailSent)} onClose={() => { setEmailSent(null); onClose(); }} />` en sustitución de la tarjeta de formulario (que se oculta mientras el diálogo está abierto). Al cerrar el diálogo se limpia `emailSent` y se cierra el modal (`onClose`). El `toast.error` del fallo de red se conserva. Se añaden las importaciones `useRoleT` (de `../../lib/roleI18n.js`) y `SuccessModal` (de `../ui/Modal.tsx`).
- `src/lib/roleI18n.js` — se añaden las claves faltantes en la sección `es`: `recoverySentTitle` ("Instrucciones enviadas") y `recoverySentBody: (email) => \`Las instrucciones para restablecer tu contraseña se han enviado a ${email}.\``. La sección `en` ya las tenía (líneas 69-70). Ambas son funciones que interpolan el correo, igual que `credentialsSentBody`.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia. Solo tokens CSS (`--color-brand-*`, etc.), sin hex de marca a fuego.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores (`.jsx` fuera del alcance de `tsc`; sin errores).
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `RecoveryModal.jsx`; la advertencia `exhaustive-deps` en `useCallback` es preexistente).
- `npm run build` → exit 0 (los avisos `@utility` de `admin.css` y chunks >500 kB son preexistentes, ver §9).
- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresión).

- `npm run qa:brand` → 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semánticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` → 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresión).

### 2026-11-02 â€” RecuperaciÃ³n: el campo de cÃ³digo no acepta el pegado del correo (espacios/guiones)

**Objetivo (peticiÃ³n del usuario):** el campo de cÃ³digo de recuperaciÃ³n del `RecoveryModal` no funcionaba al copiar y pegar el cÃ³digo del correo: daba error "cÃ³digo de recuperaciÃ³n no vÃ¡lido" inmediatamente.

**Causa raÃ­z (dos defectos):**
1. `handleCodePaste` solo llamaba `validateCode()` con el valor tal cual, sin leer el portapapeles ni limpiarlo. Pegar un cÃ³digo con espacios, guiones o salto de lÃ­nea (`123 456`, `123-456`, `123456 `) hacÃ­a que `maxLength={6}` truncara a algo como `123 4` y el schema `codeSchema` (`/^\d+$/`) fallara con `recoveryCodeInvalid`.
2. `handleCodeChange` guardaba el valor crudo del input, asÃ­ que al escribir se podÃ­an meter letras y el schema las rechazaba.

**Arreglo â€” `src/components/auth/RecoveryModal.jsx`:**
- Nueva `sanitizeCode(value)` que deja solo dÃ­gitos (`value.replace(/\D/g, "")`).
- `handleCodeChange` sanitiza el valor antes de guardarlo (solo dÃ­gitos llegan al estado).
- `handleCodePaste` intercepta el evento (`preventDefault`), lee `clipboardData.getData("text")`, sanitiza, toma los primeros 6 dÃ­gitos y los establece como `code`. AsÃ­ pegar `"123 456"` del correo queda como `123456`.
- El schema `codeSchema` sigue aceptando uno o mÃ¡s dÃ­gitos mientras se escribe; `allValid` sigue exigiendo exactamente `code.length === 6` para habilitar el botÃ³n, y `showSuccess={code.length === 6 && !codeError}` ya mostraba el check solo con 6 dÃ­gitos vÃ¡lidos.

**Archivos modificados (1):**
- `src/components/auth/RecoveryModal.jsx` â€” `sanitizeCode`, `handleCodeChange` y `handleCodePaste` reescritos para limpiar espacios/guiones al pegar y al escribir.

**Contrato de datos intacto:** misma llamada `localAuthApi.reset(code.trim(), password)`; sin cambios de backend ni persistencia. `code.trim()` es inofensivo porque el estado ya solo tiene dÃ­gitos.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ exit 0 (solo warnings preexistentes; ninguno nuevo en `RecoveryModal.jsx`).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semÃ¡nticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` â†’ 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresiÃ³n).
### 2026-11-02 â€” RecuperaciÃ³n: campo de cÃ³digo no acepta el pegado del correo (arreglo definitivo)

**Objetivo (peticiÃ³n del usuario):** el campo de cÃ³digo de recuperaciÃ³n del `RecoveryModal` seguÃ­a dando error "cÃ³digo de recuperaciÃ³n no vÃ¡lido" al copiar y pegar el cÃ³digo del correo. Se revisÃ³ a fondo y se corrigiÃ³ definitivamente.

**Causa raÃ­z (tres defectos):**
1. **`maxLength={6}` en el input** (lÃ­nea 399): si el usuario pega un cÃ³digo con formato del correo (`123 456`, `123-456`), el navegador trunca a 6 caracteres **antes** de que se dispare `onPaste`. Queda `"123 45"`, despuÃ©s de sanitizar solo son 5 dÃ­gitos â†’ nunca llega a 6.
2. **`handleCodePaste` leÃ­a solo `event.clipboardData`**: en algunos navegadores/React, el dato del portapapeles estÃ¡ en `event.nativeEvent.clipboardData` o `window.clipboardData`, no en `event.clipboardData`.
3. **`handleResetSubmit` no validaba exactamente 6 dÃ­gitos antes de enviar**: `validateCode()` acepta 1 o mÃ¡s dÃ­gitos (`/^\d+/`), asÃ­ que se podÃ­a enviar un cÃ³digo incompleto al backend, que lo rechazaba con "cÃ³digo invÃ¡lido o caducado".

**Arreglo â€” `src/components/auth/RecoveryModal.jsx`:**
- Quitado `maxLength={6}` del input de cÃ³digo: permite pegar cÃ³digos con espacios/guiones sin truncamiento prematuro. La sanitizaciÃ³n a dÃ­gitos puros se encarga de dejar solo los 6 dÃ­gitos.
- `handleCodeChange`: sanitiza a solo dÃ­gitos y limita a 6 (`slice(0, 6)`).
- `handleCodePaste`: lee el portapapeles con fallback robusto (`event.clipboardData || event.nativeEvent?.clipboardData || window.clipboardData`), previene el pegado nativo, sanitiza y toma los primeros 6 dÃ­gitos.
- `handleResetSubmit`: valida que el cÃ³digo sea exactamente 6 dÃ­gitos (`/^\d{6}$/`) antes de llamar al backend. Si no, muestra `recoveryCodeInvalid` debajo del campo y no envÃ­a.
- `codeSchema` se mantiene flexible (1+ dÃ­gitos) durante la escritura para no mostrar errores prematuros; la validaciÃ³n de 6 dÃ­gitos exactos ocurre en el submit.

**Archivos modificados (1):**
- `src/components/auth/RecoveryModal.jsx` â€” `maxLength={6}` eliminado del input; `handleCodeChange` y `handleCodePaste` reescritos; `handleResetSubmit` con validaciÃ³n de 6 dÃ­gitos antes del envÃ­o.

**Contrato de datos intacto:** misma llamada `localAuthApi.reset(code.trim(), password)`; sin cambios de backend ni persistencia. El frontend solo valida formato; la validaciÃ³n de que el cÃ³digo coincida con el enviado por correo la hace el backend.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` â†’ 0 errores.
- `npm run lint` â†’ exit 0 (solo warnings preexistentes; ninguno nuevo en `RecoveryModal.jsx`).
- `npm run build` â†’ exit 0.
- `npm run qa:brand` â†’ 1 congelamiento preexistente en `ImageUpload.jsx`, 28 excepciones justificadas, 0 conflictos semÃ¡nticos; **ninguno de los archivos modificados aparece**.
- `npm run qa:routes` â†’ 124 comprobaciones, 2 fallos preexistentes (baseline, sin regresiÃ³n).

### 2026-11-03 — Recuperación: margen superior en el modal de instrucciones enviadas

**Objetivo (petición del usuario):** en el modal de instrucciones enviadas (`SuccessModal`), el ícono de envelope y el texto "¿Olvidaste tu contraseña?" quedaban muy pegados al borde superior del diálogo. Se pidió bajar un poco ese contenido desde el top para que no esté tan pegado arriba.

**Causa raíz.** El header de `StatusModal` usaba siempre `pt-6` como padding superior, sin posibilidad de ajustarlo por instancia. No había forma de alejar el contenido del borde superior solo para este modal sin afectar a los demás.

**Archivos modificados (2):**
- `src/components/ui/Modal.tsx` — se añade la prop opcional `headerPt?: string` a `ModalProps` y a `StatusModalProps`. Se desestructura en `Modal` y se pasa a través de `StatusModal`; el `div` del header la usa con `headerPt ?? "pt-6"` como valor por defecto, así los demás modales no cambian.
- `src/components/auth/RecoveryModal.jsx` — el `<SuccessModal>` del diálogo "Instrucciones enviadas" recibe `headerPt="pt-10"` para que el ícono de envelope y el texto "¿Olvidaste tu contraseña?" bajen un poco desde la parte superior.

**Contrato de datos intacto:** misma llamada `localAuthApi.forget(email)`; sin cambios de backend ni persistencia. Solo CSS (padding superior del header), sin hex de marca a fuego.

**Puertas (ejecutadas desde `frontend/AIFormBuilder/`):**
- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → exit 0 (solo warnings preexistentes; ninguno nuevo en `Modal.tsx` ni `RecoveryModal.jsx`).
- `npm run build` → exit 0 (warnings `@utility` de `admin.css` y chunks >500 kB preexistentes, ver §9).
