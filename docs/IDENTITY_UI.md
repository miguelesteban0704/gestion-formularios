# Identidad UI — rol del usuario y visitante invitado

> Patrón visual para mostrar **quién** es quien usa la aplicación: el rol del
> usuario autenticado (realm activo) y el **identificador de invitado** en el
> sitio público. Cubre claro/oscuro, escritorio/móvil, accesibilidad y las
> reglas de marca. Verificado contra el árbol real (2026-10-13).

## 1. Objetivo y principios

- **Inequívoco de un vistazo.** El rol activo se lee sin abrir nada: el **anillo
  del avatar** en la cabecera (con el `Tooltip` «Rol: …») y la cabecera de
  identidad dentro del menú.
- **Coherencia total.** El usuario autenticado y el invitado comparten el mismo
  lenguaje (insignia + anillo de avatar); solo cambia el tono y el CTA.
- **Nada de marca a fuego.** El color sale de tokens; el texto, de `--color-ink`.
- **Sin tocar la sesión.** El rol mostrado es el del **realm activo**, que ya
  resuelve `AuthContext`; la UI no lee tokens sueltos ni asume el último rol.
- **No intrusivo.** El invitado recibe una pastilla flotante **descartable** que
  recuerda su descarte.

## 2. Piezas

| Pieza | Ruta | Responsabilidad |
|---|---|---|
| `RoleBadge` | `components/auth/RoleBadge.jsx` | Insignia **medallón** (icono con degradado del acento) + acento + microetiqueta del rol (mayúsculas + tracking). Prop `short` para la etiqueta compacta. |
| `roleVisual(role, isGuest)` | `components/auth/RoleBadge.jsx` | Resuelve `{ Icon, accent, labelKey }`; reutilizable por el avatar. |
| `IdentityMenu` | `components/auth/IdentityMenu.jsx` | Identidad del autenticado. Estructura clásica de *profile-dropdown*: **disparador = avatar** (anillo del rol + punto de sesión, con **tooltip del rol**) **+ chevron**; el menú lleva la tarjeta de cabecera (avatar `lg` + nombre + correo + entidad/slug), la ficha **Usuario**/**Rol** (etiqueta + insignia), los grupos **Cuenta**/**Preferencias**/**Soporte** (`MenuGroup`) y el botón **Salir** a lo ancho. |
| `GuestIdentity` | `components/auth/IdentityMenu.jsx` | Misma cabecera para invitado/sin sesión: insignia "Invitado" + CTA. |
| `RoleAvatar` | `components/auth/IdentityMenu.jsx` | `Avatar` con el anillo del rol (`--rb-accent`) y las **iniciales del nombre** del usuario en el círculo. Con `withStatus` muestra el punto de **sesión activa**. |
| `GuestPill` | `components/auth/GuestPill.jsx` | Pastilla flotante del sitio público: explica el modo invitado y ofrece acceso; descartable. |

Consumidores: `layouts/DashboardLayout.jsx` (cabecera, común al sitio público y
al panel) y `pages/GuestHome.jsx` (monta `GuestPill`).

## 3. Lenguaje visual del rol

El acento entra por la variable `--rb-accent` y se aplica por `color-mix` al
borde, al tinte de fondo, al icono y al punto. **El texto va siempre en
`--color-ink`** —el color vive en icono/punto/fondo— para no arriesgar el
contraste AA con acentos intermedios.

| Rol | Icono | Acento | Clave i18n (es) |
|---|---|---|---|
| `super_admin` | `ShieldCheck` | `--accent-gold` | `roleSuper` → «Superadmin» |
| `entity_admin` | `Building2` | `--accent-blue` | `roleEntity` → «Gestor de Entidad» |
| `form_creator` | `PencilRuler` | `--accent-teal` | `roleCreator` → «Gestor de formularios por entidad» |
| invitado (`isGuest`) | `UserRound` | `--color-ink-muted` | `roleGuest` → «Invitado» |
| cuenta legacy (sin rol) | `KeyRound` | `--color-ink-muted` | `roleAccount` → «Cuenta» |

Los acentos son los **decorativos** (`accents` en `shared/styles/tokens.ts`,
`var(--accent-*)`): no siguen al acento del sitio ni son semánticos, así que no
compiten con la marca ni crean «conflicto semántico» en `qa:brand`.

El **avatar** (`RoleAvatar` → `Avatar`) pinta siempre las **iniciales del nombre**
del usuario conectado (`initials(user.name)`, con `user.email` como respaldo); si
el usuario tiene foto, la foto manda. El rol se comunica por la **insignia**
(texto + medallón), nunca por el círculo del avatar.

La **microetiqueta** del rol (`.role-badge__text`) va en `text-transform:
uppercase` + `letter-spacing: 0.08em` (voz de "chip de producto"). Como la
etiqueta plena del `form_creator` («Gestor de formularios por entidad») no cabe
en un chip, `RoleBadge` acepta `short`: mapea a `roleCreatorShort` («Gestor de
Formularios» / "Form manager"); los demás roles ya usan etiquetas cortas.

CSS (en `src/index.css`, junto a `.cat-badge`): `.role-badge`,
`.role-badge__medallion`, `.role-badge__text`, `.role-badge::after` (sheen),
`.role-avatar` (anillo degradado), `.identity-avatar` (envoltorio del avatar),
`.identity-status` (punto de sesión activa) y
`.identity-hero`/`.identity-hero__glow`. Tamaños vía `data-size="sm|md"`.

## 4. Colocación

- **Cabecera (`DashboardLayout`)**:
  - Autenticado (`IdentityMenu`): **disparador mínimo** = avatar con anillo +
    **punto de sesión activa** + chevron (el nombre/email/insignia ya **no**
    viven en la pastilla; todo el detalle se movió a la cabecera del menú).
    Sin tooltip de rol en el disparador (petición del usuario): el rol se lee
    en la ficha Usuario/Rol dentro del menú.
  - Invitado (`GuestIdentity`): avatar con anillo neutro · insignia "Invitado" +
    CTA «Iniciar sesión» (`sm:`).
  - **Colapsado en pantallas estrechas**: el disparador autenticado ya es
    `avatar + chevron` a cualquier ancho; la señal de identidad es el **anillo de
    rol del avatar**. Sin tooltip. Es intencional.
- **Menú de identidad** (al abrir): **tarjeta de cabecera** con avatar `lg` (con
  punto de sesión activa) + nombre + email; línea secundaria **discreta** con la
  **entidad** (`user.entity.name`, icono `Building2`) y, para
  `entity_admin`/`form_creator`, la puerta `/a/<slug>` recordada
  (`accessDoorFor(role)`). La insignia del rol **ya no** va en la tarjeta.
  Debajo, la **ficha etiqueta ← → insignia**: fila **Usuario** (el **correo**
  para el `super_admin`; el nombre real para el resto, si no el correo) en una
  pastilla con el **acento del perfil** —la marca viva,
  `--color-brand-*`, que `applyAccent` recolorea en runtime—, y fila **Rol**
  (`RoleBadge` con el acento del rol). A continuación, **tres grupos** con
  rótulo (`MenuGroup`):
  - **Cuenta** (`accountGroup`) → **Mi perfil** (`profilePath`),
    **Configuración** (`settingsPath`, con descripción `t("settingsDesc")`) y
    **Seguridad** (`securityPath`).
  - **Preferencias** (`preferencesGroup`) → filas **no navegables**
    (`MenuControlRow`) que montan **inline** los controles reales reutilizados
    `<ThemeToggle/>` (Apariencia, `t("appearance")`) y `<LanguageSwitcher/>`
    (Idioma, `t("languageSection")`), más **Notificaciones**
    (`notificationsPath`). El tema/idioma se ajustan **dentro** del menú, no
    duplican un destino con Configuración.
  - **Soporte** (`supportGroup`) → **Centro de ayuda** (`helpPath`) y
    **Atajos de teclado** (`shortcutsPath`).
  Y, tras un separador, el botón **Salir** a lo ancho (centrado, `danger`), que
  se **deshabilita** mientras el cierre de sesión está en curso (`loggingOut`).
- **Páginas de destino** (todas reales, en `pages/`): `Profile.jsx` (tarjeta de
  identidad de solo lectura, lee `useAuth().user`; ofrece el atajo a
  Configuración), `Security.jsx` (monta el `SessionsPanel` compartido con
  Configuración → dispositivos), `Notifications.jsx` (lista vía `notificationApi`,
  patrón react-query), `Help.jsx` y `Shortcuts.jsx` (contenido estático). La
  pestaña *devices* de `Settings` y `Security` comparten `SessionsPanel`.
- **Disparador abierto**: el menú es **controlado** (`open`/`onOpenChange`) para
  que el propio disparador refleje el estado — borde/fondo/`shadow` activos y el
  **chevron rota 180°**—, sin leer el estado interno del `Dropdown`.
- **Nombre mostrado** (`displayNameFor`): **todos** los roles —incluido el
  `super_admin`— encabezan con el **nombre de la cuenta** (`user.name`, p. ej.
  «Miguel»); si no lo tienen, con el correo y, en último término, con el nombre
  de la consola (`t("appName")`).

## 5. Identificador del invitado

- **Cabecera**: insignia "Invitado" (neutra) + CTA a `LOGIN_PATH` (`/login`).
- **`GuestPill`** (solo en el sitio público, montada por `GuestHome`):
  - Flotante abajo-izquierda (`fixed … z-[var(--z-toast)]`), `glass`, ancho
    `min(92vw,21rem)`.
  - Texto: `guestPillTitle` + `guestPillBody`; CTA `loginCta`; descarte con
    `guestPillDismiss` (botón `aria-label`).
  - Descarte recordado en `localStorage["formly_guest_pill_dismissed"]`.
  - Respeta `prefers-reduced-motion` (`motion-reduce:animate-none`).

## 6. i18n

- **Jerga de rol/identidad** → `lib/roleI18n.js`: `roleSuper`, `roleEntity`,
  `roleCreator`,   `roleCreatorShort` (chip compacto de la insignia), `roleGuest`,
  `roleAccount`, `roleLabel` («Rol»/«Role»), `userLabel` («Usuario»/«User»),
  `identity`, `signedInAs`, `accessDoorLabel` (es/en).
- **Copy del sitio público** → `contexts/LanguageContext.jsx`: `loginCta`,
  `guestPillTitle`, `guestPillBody`, `guestPillDismiss` (es/en).
- **Grupos y páginas del menú** → `contexts/LanguageContext.jsx`: rótulos
  `accountGroup`, `preferencesGroup`, `supportGroup`; opciones `myProfile`,
  `security`, `helpCenter`, `keyboardShortcuts`; subtítulos de página
  `profileSubtitle`, `profileEmail`, `profileEntity`, `profileManageHint`,
  `openSettings`, `securitySubtitle`, `notificationsSubtitle`, `helpSubtitle`,
  `help*Title/Body`, `shortcutsSubtitle` y atajos `scOpenPalette`, `scNavigate`,
  `scJump`, `scTypeahead`, `scClose`, `scConfirm` (es/en).

## 7. Accesibilidad

- La insignia es texto estático (no interactiva): el nombre accesible es su
  propio texto; los iconos van `aria-hidden`.
- `GuestPill` es `role="region"` con `aria-label`; el botón de cierre tiene
  `aria-label` (`guestPillDismiss`); el CTA es un `<button>` nativo.
- El disparador del menú es un `<button>` real con `aria-haspopup="menu"`,
  `aria-expanded` y `aria-controls`; el menú usa `role="menu"` (contrato de
  `Dropdown`), con `ariaLabel` = `identity`. El **teclado y la colocación** los
  aporta `Dropdown.jsx`, compartido por todos los menús de la app: foco inicial
  en el primer `menuitem`, `↑`/`↓`/`Home`/`End`, **typeahead** por primera letra
  (buffer 600 ms), `Tab` cierra dejando seguir el foco, y `Escape` cierra
  devolviendo el foco al disparador. El panel va en **portal** (`fixed`), bajo el
  disparador, y **voltea/ajusta** si no cabe (ver `AGENTS.md` §9).
- El estado abierto se refleja en el disparador: **chevron girado 180°**, borde y
  fondo sólidos; el disparador se eleva (`Dropdown` en modo controlado).
- **Foco visible**: el disparador (`focus-visible:ring-2 ring-brand-500/60`) y
  cada `MenuItem` (`focus-visible:bg-…`) muestran un foco claro al navegar con
  teclado.
- El avatar del disparador va sin `Tooltip`: el rol se lee en la ficha
  Usuario/Rol dentro del menú (petición del usuario).
- El punto de sesión activa (`.identity-status`) es decorativo (`aria-hidden`).
- Contraste AA: texto en `--color-ink`/`--color-ink-muted` sobre superficies
  `glass`/tinte suave.

## 8. Reglas que no se deben romper

1. **El rol es el del realm activo.** Se lee de `user` (cargado por `AuthContext`
   desde `/auth/me`). No leer tokens ni el «último rol».
2. **No tocar `AuthContext`** para este patrón: la identidad es presentación.
3. **No escribir hex de marca a fuego**; el acento de rol son tokens `--accent-*`.
4. **No mezclar** tono semántico con marca en un mismo elemento.
5. **CSS con `@utility` → importar desde `src/index.css`.** Aquí son reglas
   planas (como `.cat-badge`), así que basta con vivir en `index.css`.
6. Al añadir un rol nuevo: una fila en `VISUALS` (`RoleBadge.jsx`) + su clave en
   `roleI18n.js` (es/en). Nada más.
