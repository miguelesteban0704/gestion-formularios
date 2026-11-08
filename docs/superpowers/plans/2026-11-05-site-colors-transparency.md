# Auditoría global de color, contraste y transparencia — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Armonizar color, contraste, opacidad y superficies translúcidas en todo el frontend, preservando la identidad y los temas existentes.

**Architecture:** Mantener `src/index.css` como fuente de tokens CSS y `src/shared/styles` como la API semántica. Añadir comprobaciones de contraste WCAG y usarlas junto con la auditoría de marca y capturas reales para ajustar únicamente las superficies que fallen.

**Tech Stack:** React, Vite 8, Tailwind CSS 4, CSS, Node.js y QA existente del frontend.

**Spec:** `docs/superpowers/specs/2026-11-05-site-colors-transparency-design.md`

## Global Constraints

- Preservar el cyan personalizable, el índigo `MANAGED_ACCENT`, los colores semánticos y los acentos de datos/formularios que sean intencionales.
- Mantener los modos `light`, `dark` y `system`, sin alterar la persistencia ni el cambio de tema/acento.
- `MANAGED_ACCENT` vive en `src/lib/accent.js`, no es un token CSS; conservar su cableado actual.
- Texto normal: contraste mínimo 4.5:1; texto grande y límites gráficos/interactivos relevantes: mínimo 3:1.
- No cambiar layout, tipografía, contenido ni movimiento; no reemplazar opacidad/transparencia indiscriminadamente.
- Validar las capturas de la build de producción, no solo el servidor de desarrollo.
- Ejecutar comandos `git` desde la raíz del repositorio y los comandos npm desde `frontend/AIFormBuilder`.
- Antes de cada commit, inspeccionar el diff y stagear solo cambios propios de esa tarea; preservar cambios ajenos del worktree.

## Review Focus

- Texto secundario que pierde contraste en modo claro u oscuro: cubrir pares `--fg-muted` con app, superficie y superficie elevada en ambos modos.
- Bordes translúcidos casi invisibles: calcular contraste con el color ya compuesto sobre su sustrato real.
- Foco de teclado teñido por el cyan o por acentos personalizados: comprobar el indicador contra las superficies adyacentes y el tema correspondiente.
- Overrides por rol: verificar que el usuario administrado sigue viendo el índigo y el super_admin conserva su acento configurado.
- Gráficos, formularios diseñables y estados semánticos: comprobar que la auditoría no confunde colores de serie o del formulario con colores globales de marca.

---

### Task 1: Crear una sonda de contraste para los tokens semánticos

**Files:**
- Create: `frontend/AIFormBuilder/qa/color-contrast-utils.js`
- Create: `frontend/AIFormBuilder/qa/color-contrast.test.js`
- Create: `frontend/AIFormBuilder/qa/color-contrast.js`
- Modify: `frontend/AIFormBuilder/package.json`

**Interfaces:**
- Produce `relativeLuminance(color)`, `contrastRatio(foreground, background)` y `compositeOver(foreground, background, alpha)` en `qa/color-contrast-utils.js`.
- Produce `parseThemeTokens(css)`, returning `{ light: { appBg, surface, surface2, fg, fgMuted }, dark: { appBg, surface, surface2, fg, fgMuted } }`; throw when a required selector/token is missing or not a six-digit hex color.
- `qa/color-contrast.js` lee los tokens semánticos claros de `:root` y los oscuros de `.dark` en `src/index.css`, calcula los pares de texto/superficie y sale distinto de cero ante una infracción.

- [ ] **Step 1: Write the failing tests**

En `color-contrast.test.js`, añadir pruebas con `node:test` para:
- `contrastRatio("#000000", "#ffffff")` → `21`.
- `contrastRatio("#777777", "#777777")` → `1`.
- Componer un color semitransparente sobre blanco y verificar los canales redondeados esperados.
- Extraer los tokens `--app-bg`, `--surface`, `--surface-2`, `--fg` y `--fg-muted` de los bloques claro y oscuro.
- Calcular los pares de texto `--fg` y `--fg-muted` contra `--app-bg`, `--surface` y `--surface-2` en ambos temas; comprobar el umbral 4.5:1.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test qa/color-contrast.test.js` desde `frontend/AIFormBuilder`.
Expected: FAIL porque todavía no existe el módulo de cálculo/parsing.

- [ ] **Step 3: Implement the contrast utilities and probe**

Implementar el cálculo WCAG 2.x para colores hex de seis dígitos, composición alfa sobre el color opaco y lectura de los tokens CSS. Añadir `qa:colors` para ejecutar la sonda sobre el CSS real; no incluir colores derivados de comentarios.

- [ ] **Step 4: Run tests and the probe**

Run: `node --test qa/color-contrast.test.js` y `npm run qa:colors`.
Expected: pruebas matemáticas verdes; el probe informa los seis pares de cada tema y sale distinto de cero si alguno incumple 4.5:1. Si revela un incumplimiento de tokens actual, conservarlo como regresión para la Task 2.

- [ ] **Step 5: Commit**

```bash
git add frontend/AIFormBuilder/qa/color-contrast-utils.js frontend/AIFormBuilder/qa/color-contrast.test.js frontend/AIFormBuilder/qa/color-contrast.js frontend/AIFormBuilder/package.json
git commit -m "test: medir contraste de los tokens del sitio"
```

### Task 2: Armonizar superficies base y cristal

**Files:**
- Modify: `frontend/AIFormBuilder/src/index.css`
- Modify: `frontend/AIFormBuilder/src/components/ui/crystal.css`
- Modify: `frontend/AIFormBuilder/src/components/admin/admin.css`
- Test: `frontend/AIFormBuilder/qa/color-contrast.test.js`

**Interfaces:**
- Consume los helpers y la sonda de la Task 1.
- Mantiene los nombres semánticos de `src/shared/styles/tokens.ts` y `theme.ts`; no añade una segunda API de tema.

- [ ] **Step 1: Add failing assertions for confirmed surface defects**

El navegador confirmó que el anillo de `.btn-focus` con `MANAGED_ACCENT` (`#473ce2`) al 72% sobre `--surface` oscuro (`#12151d`) se compone como `#3831ab`, con contraste 1.91:1 (< 3:1). Añadir una regresión que exija una línea exterior sólida `2px solid var(--fg)` con `outline-offset: 4px`, además del anillo de marca, y comprobar que `--fg` mantiene 3:1 contra las superficies adyacentes en ambos temas. Comprobar también cualquier otro defecto reproducible con el alfa ya compuesto sobre su sustrato real.

- [ ] **Step 2: Run the targeted test to verify RED**

Run: `node --test qa/color-contrast.test.js` desde `frontend/AIFormBuilder`.
Expected: FAIL en la prueba del indicador `.btn-focus` porque aún no existe el contorno semántico exterior.

- [ ] **Step 3: Adjust the smallest semantic token set**

Añadir el contorno exterior `var(--fg)` a `@utility btn-focus` en `index.css` y conservar el anillo de acento existente. Ajustar tokens base o consumidores de cristal en `crystal.css`/`admin.css` solo si una medición adicional confirma una falla. Evitar tocar una propiedad que no aparezca en la evidencia.

- [ ] **Step 4: Run the targeted checks to verify GREEN**

Run: `node --test qa/color-contrast.test.js` y `npm run qa:colors`.
Expected: todos los pares añadidos alcanzan el umbral de su clase en ambos temas y el probe sigue reportando los valores reales.

- [ ] **Step 5: Commit**

```bash
git add frontend/AIFormBuilder/src/index.css frontend/AIFormBuilder/src/components/ui/crystal.css frontend/AIFormBuilder/src/components/admin/admin.css frontend/AIFormBuilder/qa/color-contrast.test.js
git commit -m "fix: mejorar contraste de superficies translucidas"
```

### Task 3: Corregir excepciones visuales en componentes alcanzables

**Files:**
- Modify, solo si la auditoría lo prueba: CSS y componentes alcanzables desde `frontend/AIFormBuilder/src/main.jsx`.
- Modify: `frontend/AIFormBuilder/qa/brand-audit.js` solo para documentar una excepción que sea deliberada y esté justificada.
- Test: `frontend/AIFormBuilder/qa/color-contrast.test.js`

**Interfaces:**
- Consume los tokens base y la sonda de contraste de Tasks 1–2.
- Conserva las excepciones documentadas por `qa/brand-audit.js` para formularios diseñables, colores de series y showcase.

- [ ] **Step 1: Record and reproduce each component-level defect**

Recorrer los estilos activos que definen texto, estado, borde, foco o superficie translúcida (incluidos CSS de formularios públicos, analíticas y controles compartidos). Para cada defecto reproducible, añadir primero su caso a la sonda o un test focalizado de tokens y comprobar el fallo antes de editar el componente.

- [ ] **Step 2: Apply only evidence-backed fixes**

Usar tokens semánticos existentes en vez de hex/alpha duplicados cuando el valor deba seguir tema o acento. Mantener el color de serie de gráficos, los colores propios del formulario y `MANAGED_ACCENT` cuando sean la intención visual.

- [ ] **Step 3: Run focused and existing QA**

Run: `npm run qa:colors`, `npm run qa:brand`, `npm run qa:routes`.
Expected: ratios conformes, `qa:brand` sin congelamientos ni conflictos nuevos y las rutas conservan sus resultados previos.

- [ ] **Step 4: Review and stage only this task's changed files**

Revisar `git diff --name-only` y el diff completo; stagear individualmente solo las rutas que esta tarea cambió y revisó. No stagear directorios ni cambios ajenos del worktree.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix: corregir inconsistencias de color por componente"
```

Solo crear este commit si la auditoría produjo cambios; si no se reproduce ningún defecto, dejar la tarea documentada sin un commit vacío.

### Task 4: Verificar tema y build con render real

**Files:**
- Modify only if the validation reveals a documentation gap: `frontend/AIFormBuilder/DESPLIEGUE.md`.
- No guardar capturas temporales como cambios de producto.

**Interfaces:**
- Consume el build y los tokens ya corregidos; no cambia el comportamiento de autenticación ni la API.

- [ ] **Step 1: Build and serve production output**

Run: `npm run build` y después `npm run preview -- --host 127.0.0.1`.
Expected: build exitosa y rutas SPA disponibles en preview.

- [ ] **Step 2: Inspect representative flows at required sizes and themes**

Revisar con navegador real 1440×900 y 390×844, para `light` y `dark`: login/recuperación, panel y tarjetas, formulario público, analíticas, modal/toast y controles con foco de teclado. Comparar un mismo estado entre dev y preview; calcular las combinaciones modificadas con la sonda.

- [ ] **Step 3: Run the complete frontend gates**

Run: `npm run typecheck`, `npm run lint`, `npm run qa:colors`, `npm run qa:brand`, `npm run qa:routes` y `npm run build`.
Expected: `typecheck`, `lint`, `qa:colors`, `qa:brand` y `build` terminan con código cero; `qa:routes` conserva exactamente los dos fallos del baseline, sin fallos nuevos. Reportar por nombre los warnings de lint preexistentes.

- [ ] **Step 4: Commit directly related documentation only if it changed**

Revisar el diff de `frontend/AIFormBuilder/DESPLIEGUE.md`; solo si Task 4 lo modificó, stagear ese archivo exacto y crear el commit `docs: documentar validacion visual de produccion`.
