# Tipografía del sitio

Guía del sistema tipográfico de `frontend/AIFormBuilder`. Fuente única de verdad:
`src/index.css` (`@theme`). Las fuentes están **autoalojadas** vía `@fontsource`
(no hay CDN externo); así se evita el bloqueo regional de Google Fonts en el
entorno institucional.

## 1. Familias y roles

| Token | Familia | Rol | Dónde |
|---|---|---|---|
| `--font-sans` | **Manrope Variable** | Cuerpo y UI (por defecto) | `html`, `body`, toda la app |
| `--font-mono` | **JetBrains Mono Variable** | Datos, slugs, URLs, códigos, IPs, `<kbd>` | `code/pre/kbd/samp`, `adm-mono`, `.kbd` |
| `--font-display` | **Fraunces Variable** | Títulos y encabezados de marca | inline `style={{ fontFamily: "var(--font-display)" }}` (AuthCard, Modal, Toast, Splash… ) |

`--font-display` cae a Manrope y luego a serif; `--font-mono` cae a
`ui-monospace`; `--font-sans` cae a la pila sans del sistema.

## 2. Dónde se declaran y por qué

- **`src/index.css` → `@theme`** define los tres tokens (`--font-sans`,
  `--font-mono`, `--font-display`). `@layer base` aplica `html { font-family:
  var(--font-sans) }` y `code, pre, kbd, samp { font-family: var(--font-mono) }`.
  Es el punto único: cambiar una familia aquí la cambia en todo el sitio.
- **`src/main.jsx`** importa las tres hojas de `@fontsource` **antes** de
  `./index.css`:
  ```js
  import "@fontsource-variable/manrope";
  import "@fontsource-variable/jetbrains-mono";
  import "@fontsource-variable/fraunces";
  import "./index.css";
  ```
  Cada `index.css` incluye todos los subsets con `unicode-range`; el navegador
  descarga **solo el subset que necesita** (latino en la práctica).
- **`index.html`** no carga fuentes (se retiró el `<link>` a
  `fonts.googleapis.com`).
- **Espejos documentales** (no son la fuente real, solo referencia para TS/IDE):
  `src/lib/designTokens.ts`, `src/shared/styles/tokens.ts` y
  `tailwind.config.js`. Si cambia una familia, actualízalos también.

## 3. Reglas

- **Solo tokens.** No escribas una familia a fuego salvo que sea un caso de
  data-viz con su propio lenguaje (p. ej. los `Prism*.css` de analítica). Para
  mono usa siempre `var(--font-mono)` / `font-mono` / `<code>`.
- **No añadas familias nuevas sin justificarlo** (≈2–3 pesos por familia, WOFF2,
  `font-display: swap` ya lo aporta `@fontsource`).
- No cambies el tamaño base (16px). La escala vive en `@theme` como
  `fontSize`/utilidades Tailwind.
- Mantén el contraste AA en claro y oscuro; los títulos usan los tokens de tinta
  (`text-ink`, `text-fg`) existentes.

## 4. Verificación

```bash
npx tsc --noEmit   # 0
npm run lint       # 0 errores
npm run build      # exit 0 · emite los .woff2 en dist/assets
npm run qa:brand   # TODO CORRECTO
npm run qa:routes  # 124 · 0
```

Tras `npm run build`, `dist/assets/` debe contener los `.woff2` de
`manrope-*`, `jetbrains-mono-*` y `fraunces-*`.
