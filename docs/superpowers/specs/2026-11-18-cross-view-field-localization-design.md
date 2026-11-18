# Especificación: traducción coherente de campos en builder, preview y publicado

- **Fecha:** 2026-11-18
- **Estado:** diseño aprobado en conversación; pendiente revisión de esta especificación.
- **Alcance:** edición y renderizado de traducciones ES/EN para todos los tipos de campo en el builder, su preview y el formulario publicado.

## Objetivo

Permitir al gestor editar los textos de cada campo en español e inglés dentro
del builder y ver esos mismos valores en el lienzo, la vista previa y el
formulario publicado. Las traducciones permanecen guardadas en la base de
datos; no se solicita traducción a IA. Si falta un idioma, se muestra el texto
base del campo hasta que el gestor complete esa traducción.

## Diagnóstico verificado

- `backend/repositories/form.repo.js` ya mapea `questions_i18n` a
  `questionsI18n`, y `form.service.js` admite `questionsI18n` en las
  actualizaciones. No hace falta una migración.
- `Builder.jsx` envía en el autosave el título y la descripción localizados y
  las preguntas, pero no envía el mapa raíz `questionsI18n`.
- `SortableField.jsx` usa un diccionario parcial para traducir texto del
  encabezado; el preview dentro de la tarjeta no pasa `formI18n` a
  `FieldRenderer`.
- `FieldSettings.jsx` lee y escribe mapas inline (`label_i18n`,
  `placeholder_i18n`, etc.) en vez del `questions_i18n[questionId]` que ya
  devuelve el backend. Las traducciones guardadas en el mapa raíz no aparecen
  en esos controles.
- El modal preview y la vista publicada comparten `FormView`, que pasa
  `questions_i18n` a `FieldRenderer`. El render público ya resuelve muchos
  textos por el mapa raíz, aunque el contenido estático aún debe usar la misma
  ruta.
- En el formulario publicado actualmente asociado a esta investigación, la
  base de datos contiene traducciones EN para 4 preguntas de opción múltiple y
  sus 19 etiquetas de opción, y para 4 preguntas de casillas y sus 34 etiquetas.
  La existencia de esos valores junto con el fallo del builder confirma que el
  problema está en el flujo de lectura/edición del builder, no en la falta de
  traducciones persistidas.

## Diseño aprobado

### Fuente de verdad y fallback

- `questions_i18n[questionId]` es el mapa canónico para las nuevas ediciones.
- El formato localizado incluye, cuando aplican:
  - `label`, `description`, `placeholder`, `helpText` y `content`;
  - `options[optionId].label`;
  - `scale.minLabel` y `scale.maxLabel`;
  - `visibleIf.sameFieldPlaceholder`.
- Se lee primero la traducción del idioma activo en el mapa raíz; si no existe,
  se consulta el mapa inline legado correspondiente; si tampoco existe, se
  usa el valor base del campo. No se usa el otro idioma como fallback.
- Al editar un idioma se actualiza únicamente esa entrada del mapa raíz,
  preservando el otro idioma, los valores base y las claves de traducción no
  relacionadas. Los mapas inline existentes se conservan para compatibilidad,
  pero no son destino de nuevas escrituras.

### Builder, preview y publicación

- `FieldSettings` recibe la traducción del campo y un callback de actualización
  del mapa raíz. Sus controles editan por idioma etiquetas, descripciones,
  placeholders, ayudas, opciones, extremos de escala, placeholders
  condicionales y contenido de bloques estáticos.
- `Builder` conserva `questionsI18n` en estado y lo incluye en el autosave.
  El backend ya acepta el atributo y lo persiste en la columna JSONB existente.
- `SortableField` recibe el mapa por pregunta para resolver el encabezado y
  entregar las traducciones al preview embebido. Los nombres de tipo se
  localizan mediante las etiquetas estáticas del tipo, no mediante traducción
  genérica de texto escrito por el usuario.
- El modal preview y la vista publicada siguen usando `FormView` y
  `FieldRenderer`; se amplía la resolución común para que también cubra el
  contenido textual de bloques estáticos.
- Se incluyen todos los tipos de `FIELD_DEFS`, incluidos los heredados y
  estáticos. Las URLs de imagen no se traducen porque no son texto; cualquier
  etiqueta textual asociada sí usa el mapa si existe.

### Compatibilidad y seguridad de datos

- No cambia el esquema de base de datos, la forma de respuestas, los IDs de
  preguntas/opciones, los valores enviados, la lógica condicional ni los
  permisos de acceso.
- Las etiquetas de opciones pueden verse localizadas, pero los valores usados
  por validación, condiciones y respuestas permanecen idénticos.
- Los errores de autosave se muestran mediante el estado y la notificación
  existentes; no se considera un guardado exitoso si el backend falla.
- No se añade traducción automática ni llamadas de IA durante edición,
  preview o respuesta.

## Verificación requerida

- Pruebas de lectura/escritura del mapa por idioma: conserva el idioma no
  editado, no altera el texto base y aplica fallback al texto fuente.
- Matriz basada en todos los tipos de `FIELD_DEFS`: comprobar editor del
  builder, tarjeta/canvas, modal preview y render publicado.
- Casos explícitos para opción múltiple, casillas, listas, catálogos
  personalizables, ranking, escalas, campos condicionales y contenido estático.
- Verificar que cambiar etiquetas visibles no cambia IDs ni valores de
  opciones enviados, y que un autosave incluye `questionsI18n`.
- Ejecutar la suite QA frontend, `typecheck`, `lint` y `build`; registrar
  advertencias preexistentes sin atribuirlas a este cambio.

## Fuera de alcance

- Generar traducciones ausentes con IA o servicios externos.
- Traducir URLs de imagen, respuestas existentes o valores usados por lógica y
  analíticas.
- Reescribir la localización general de todos los controles del panel que no
  pertenecen a los campos del formulario.
- Modificar permisos, API de respuestas o esquema de base de datos.
