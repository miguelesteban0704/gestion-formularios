# AGENTS.md

Ver `frontend/AIFormBuilder/AGENTS.md` para las reglas del proyecto frontend.

## Registro de cambios — 2026-11-22

### Estadísticas: tooltip moderno que explica los números de «Clasificación por Escala»

**Objetivo:** en «Desglose de preguntas», los números de la pregunta de
**Clasificación por Escala** (`importancia`) —el promedio «2.8 / 8», el entero
«5 / 8» y el conteo de personas— no eran intuitivos. Se añadió un **tooltip
moderno** (el `Tooltip` de cristal del sistema) que, al pasar el ratón por encima,
explica qué significa cada cifra.

**Cambios (solo frontend, 2 archivos):**
- `frontend/AIFormBuilder/src/components/analytics/QuestionChart.jsx` — el número
  de la escala y la insignia de conteo se envuelven en `Tooltip`:
  - «2.8 / 8»: título «Qué significa» + lista que rotula `2.8` (puntuación media),
    `/ 8` (máximo de la escala) y `10` (personas que puntuaron), más el rango total
    «1–8».
  - Conteo: tooltip compacto «personas puntuaron esta opción».
  - Disparadores con `cursor-help`; colores neutros, sin hex de marca; respeta
    `prefers-reduced-motion`.
- `frontend/AIFormBuilder/src/contexts/LanguageContext.jsx` — 5 claves nuevas
  (`scaleInfoTitle/Avg/Max/Count/Range`) en es/en.

**Contrato de datos intacto:** sin cambios de backend ni persistencia; solo
presentación.

**Verificación:** `tsc` 0 · `lint` 0 errores · `build` exit 0 · `qa:brand` 0
conflictos (1 congelamiento preexistente en `PrismGauge.css`, ajeno) · `qa:routes`
124/2 (baseline) · QA 25/25.

## Registro de cambios — 2026-11-22

Resumen de las modificaciones de producto realizadas hoy. El detalle operativo
del frontend permanece en `frontend/AIFormBuilder/AGENTS.md` (§10).

### Estadísticas: «Desglose de preguntas» traduce Provincia/Municipio y muestra el número de la escala (`importancia`)

**Objetivo:** en «Desglose de preguntas» de las estadísticas, (1) las tarjetas de
**Provincia** y **Municipio** se rotulaban en inglés (p. ej. «Province»,
«Municipality»); (2) la pregunta de **Clasificación por Escala** (`importancia`)
no mostraba el **número de la escala** elegido por cada persona (solo contaba
cuántas la puntuaron).

**Causa raíz:**
1. `QuestionChart.jsx` usaba `question.label` crudo como título; los formularios
   creados por IA/plantillas guardan la etiqueta por defecto en inglés (coincide
   con `FIELD_DEFS[type].label`), así que la tarjeta salía en inglés aunque el
   subtítulo ya pasaba por `t("field_"+type)`.
2. El backend ya calculaba `averageScore` por opción, pero el frontend lo
   descartaba y la escala (`min`/`max`) no viajaba al cliente: sin contexto para
   mostrar «2.8 / 8».

**Cambios:**
- `backend/services/analytics.service.js` — la rama `importancia` añade `scale`
  (`{ min, max, minLabel, maxLabel }`) al payload de la pregunta (campo de
  lectura nuevo; `averageScore` ya se calculaba).
- `frontend/AIFormBuilder/src/components/analytics/QuestionChart.jsx` — el título
  usa el nombre de tipo traducido por `LanguageContext` cuando la etiqueta sigue
  siendo el valor por defecto en inglés; nuevo `ImportanciaBreakdown` que muestra
  por opción el promedio de la escala («2.8 / 8») y cuántas la puntuaron, con la
  paleta Prism y respeto a `prefers-reduced-motion`.

**Contrato de datos intacto:** sin migración ni cambios de endpoints; solo se añade
un campo de lectura (`scale`) y se usa el `averageScore` existente.

**Verificación:** backend 10/10 · sonda real (13 respuestas) `scale={1,8}` +
`averageScore` por opción · frontend QA 25/25 · `tsc` 0 · `lint` exit 0 ·
`build` exit 0 · `qa:brand` 0 conflictos (1 congelamiento preexistente en
`PrismGauge.css`, ajeno) · `qa:routes` 124/2 (baseline).

## Registro de cambios — 2026-11-16

Resumen de las modificaciones de producto realizadas hoy. El detalle operativo
del frontend permanece en `frontend/AIFormBuilder/AGENTS.md` (§10).

### Estadísticas: total de respuestas por pregunta

**Objetivo:** hacer que la cantidad de respuestas de cada pregunta en «Desglose
de preguntas» coincida con el total de respuestas de la encuesta, tanto en la
estadística general como en la de un formulario concreto.

**Causa:** el KPI usaba todas las respuestas enviadas, mientras cada tarjeta
usaba solo las que contestaron esa pregunta. Los envíos parciales (preguntas no
obligatorias u ocultas por condición) hacían que cada tarjeta mostrara un total
distinto sin explicar la diferencia.

**Cambios:**

- `backend/services/analytics.service.js` — cada pregunta declara `responses`
  (total de la encuesta), `total` (contestadas, se conserva) y `skipped`
  (en blanco).
- `frontend/AIFormBuilder/src/components/analytics/QuestionChart.jsx` — las
  tarjetas muestran el total de la encuesta y añaden el segmento «Sin
  responder» en preguntas de valor único; en multiselección, ranking, escala y
  texto libre se indica aparte.
- `frontend/AIFormBuilder/src/contexts/LanguageContext.jsx` — clave
  `notAnswered` en español e inglés.
- `frontend/AIFormBuilder/src/services/exportService.js` — la cobertura del
  informe usa contestadas/total.
- `backend/qa/analytics-question-totals.test.js` — 4 pruebas del contrato.

**Verificación:** backend 14/14 pruebas; sonda real con 8 respuestas (todas las
preguntas devuelven `responses=8` y `total + skipped = 8`); sonda CDP con las 13
tarjetas mostrando «8 respuestas»; `/api/insights` cuadra (9 = 8 + 1). Puertas
frontend: `tsc` 0, `lint` 0 errores, `build` 0, `qa:brand` TODO CORRECTO,
`qa:routes` 124/2 (baseline preexistente).

## Registro de cambios — 2026-11-12

Este registro resume las modificaciones de producto realizadas hoy. El detalle
operativo del frontend permanece también en `frontend/AIFormBuilder/AGENTS.md`.

### Campo «Clasificación por Escala» (`importancia`)

**Objetivo:** completar el campo existente del builder y del formulario que
responde la persona, conservando el identificador `importancia`, las respuestas
JSON existentes y la compatibilidad; no se añadió un tipo duplicado ni una
migración de base de datos.

**Builder y definición del campo**

- `frontend/AIFormBuilder/src/lib/fieldTypes.js` registra `importancia` como
  campo con opciones y escala; `createField` proporciona opciones con IDs
  estables y una escala inicial configurable.
- `frontend/AIFormBuilder/src/components/builder/FieldPalette.jsx` muestra el
  nombre localizado «Clasificación por Escala» / “Classification by scale”.
- `frontend/AIFormBuilder/src/components/builder/FieldSettings.jsx` configura
  opciones, límites y etiquetas de la escala, permite reordenar opciones,
  limita «Otros» a una sola opción y mantiene los datos condicionales al cambiar
  temporalmente su configuración.
- `frontend/AIFormBuilder/src/components/builder/ValidationSettings.jsx`
  presenta una vista previa basada en las opciones y el rango configurados, no
  en una escala fija.
- `frontend/AIFormBuilder/src/contexts/LanguageContext.jsx` incorpora las
  etiquetas y mensajes nuevos en español e inglés.

**Normalización y respuesta**

- `backend/utils/constants.js` incorpora `importancia` a los tipos y campos con
  opciones, y define `SCALE_FIELD_TYPES` sin mezclar este campo con los ratings
  numéricos de una sola respuesta.
- `backend/utils/formNormalize.js` reconoce el alias «Clasificación por
  Escala», conserva la escala, las opciones y la marca `isOther`, y evita
  convertir este campo a `score_rating` por una descripción que empiece con
  números.
- `frontend/AIFormBuilder/src/lib/classificationScale.js` centraliza la
  obtención de filas, normalización tolerante de respuestas anteriores,
  actualización de puntuaciones y validación del rango.
- `frontend/AIFormBuilder/src/lib/validate.js` valida la respuesta del campo:
  puntuaciones enteras dentro del rango, completitud de las filas visibles y
  texto y puntuación para «Otros» cuando se activa. Las puntuaciones repetidas
  entre elementos son válidas.
- `frontend/AIFormBuilder/src/components/public/FieldRenderer.jsx` conecta el
  campo con `PremiumImportancia`, compartido por la vista previa interactiva y
  el formulario publicado.
- `frontend/AIFormBuilder/src/components/ui/PremiumImportancia.jsx` y
  `PremiumImportancia.css` presentan los elementos, sus puntuaciones y el flujo
  de respuesta libre «Otros».
- Al activar «Agregar Otros», la persona puede escribir su respuesta y
  asignarle una puntuación. La opción de respuesta «Otros» se conserva
  diferenciada de la opción condicional configurada por el creador.
- Se retiró de la vista previa y de la respuesta la fila duplicada «Elemento
  adicional» que aparecía debajo de «Otros». Sus controles de configuración se
  mantienen disponibles en el builder, tal como se solicitó.
- Los controles y validaciones nuevos tienen textos ES/EN; no se cambió el
  esquema de almacenamiento ni se requiere migración.

**Selector de escala y corrección visual**

- Se reemplazaron los botones numéricos por `ChronoSelect`, cuyas opciones se
  generan a partir de los extremos de escala configurados y cuyo valor inicial
  es `#`. El selector cerrado conserva un ancho compacto de 4.5 rem.
- La inspección del menú abierto mostró la causa del texto aparentemente
  blanco: el portal del menú heredaba el ancho compacto del selector (72 px) y
  no dejaba espacio a las etiquetas. `ChronoSelect` admite un ancho mínimo
  independiente para el menú; la escala usa 96 px y la posición se limita al
  viewport.
- El `#`, el valor seleccionado y las opciones usan el token `--fg`. Se
  comprobó el color calculado con ambos temas: `rgb(15, 23, 42)` en claro y
  `rgb(233, 237, 244)` en oscuro. En una vista de 320 px, el menú conservó sus
  96 px, mostró las cinco etiquetas y quedó dentro de la pantalla.
- `frontend/AIFormBuilder/src/components/ui/chronoSelectUtils.js` contiene el
  cálculo del ancho mínimo, con regresión en
  `frontend/AIFormBuilder/qa/classification-scale.test.js`.

**Pruebas del campo**

- `backend/qa/classification-scale.test.js` cubre el tipo canónico, límites,
  opciones, `isOther` y alias.
- `frontend/AIFormBuilder/qa/classification-scale.test.js` cubre filas
  condicionales, valores por defecto y heredados, límites, obligatoriedad,
  valores repetidos, activación de «Otros», uso de `ChronoSelect` y el ancho
  mínimo independiente del popup.
- Verificación ejecutada: `node --test qa/classification-scale.test.js
  qa/conditional-fields.test.js` en el frontend, 22 pruebas aprobadas; el
  runner mostró un aviso de que el puerto WebSocket 24678 ya estaba ocupado.
- Verificación visual del selector abierto: en claro y oscuro, en la vista
  previa y en el renderizado del componente usado por el formulario publicado;
  las opciones tuvieron ancho visible y color computado acorde al tema.
- `npm run build` terminó correctamente, con advertencias existentes de
  `@utility` y del tamaño de chunks. El lint enfocado terminó con código 0 y
  señaló dos identificadores sin uso preexistentes en `ChronoSelect.jsx`
  (`X` y `language`).

### Condiciones «Misma Pregunta» y autodescripción de Género

- `frontend/AIFormBuilder/src/components/builder/FieldSettings.jsx` construye
  las opciones de la condición de Género desde el mismo `field.customOptions`
  que se usa al responder; así los valores personalizados coinciden entre
  configuración y selección.
- `frontend/AIFormBuilder/src/components/public/FieldRenderer.jsx` compara las
  opciones de Género por identidad entre español e inglés, y renderiza el campo
  de autodescripción cuando se selecciona «Prefiero autodescribir mi
  identidad».
- `frontend/AIFormBuilder/src/components/public/FormView.jsx` revalida el
  campo al editar la autodescripción, exige texto si esa opción está activa y
  envía el texto escrito como respuesta, no la etiqueta que activa la
  condición. La solución aplica tanto a la vista previa interactiva como al
  formulario publicado.
- `frontend/AIFormBuilder/src/lib/fieldTypes.js` habilita los catálogos
  personalizables de Género y nivel de escolaridad; excluye los campos de
  nomenclátor del editor genérico de opciones.
- `frontend/AIFormBuilder/src/contexts/LanguageContext.jsx` incluye los textos
  bilingües de esta experiencia.

### Contraste de elementos del formulario

- `frontend/AIFormBuilder/src/components/public/FormView.jsx` fija en blanco
  (`#ffffff`) el número de pregunta y el texto del botón de envío sobre el
  fondo de acento, tanto en la vista previa como en la publicación.

### URL para compartir el formulario

- `backend/app.js` prioriza, entre las direcciones de red detectadas, la IPv4
  configurada en `FRONTEND_URL`, evitando que el orden de interfaces virtuales
  cambie el enlace de red mostrado al compartir.
- La respuesta del endpoint conserva el contrato `{ ips, networkUrls,
  frontendPort }`; no se codificó una IP fija.
- La comprobación de la lógica local confirmó que se prioriza el host
  configurado; `node --check app.js` y `GET /api/health` respondieron
  correctamente.