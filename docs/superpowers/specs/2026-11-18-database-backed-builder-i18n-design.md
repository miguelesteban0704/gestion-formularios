# Traducciones guardadas de borradores en el builder

**Fecha:** 2026-11-18
**Estado:** propuesta para revisión del usuario
**Alcance:** traducciones de contenido de formularios en el builder, sin IA ni servicios externos.

## Contexto y causa

Los formularios nuevos se guardan como borradores y ya tienen columnas JSONB para `title_i18n`, `description_i18n` y `questions_i18n`. El autosave del builder persiste esos mapas mediante el endpoint autenticado de formularios.

El servicio determinista `ensureFormI18n` existe, pero no se invoca desde el flujo normal de creación o actualización: sus usos actuales están en pruebas y un script de diagnóstico. Además, `ensureLangObj` copia el texto original a ambos idiomas antes de evaluar traducciones faltantes. Esto puede hacer que el idioma destino parezca completo aunque solo contenga una copia del original. El catálogo disponible solo traduce coincidencias exactas; no puede generar una traducción natural de una frase personalizada inédita.

## Objetivo

Al guardar un borrador desde el builder, usar las traducciones disponibles y persistirlas en los mapas bilingües existentes. Al cambiar de idioma, el builder debe mostrar el valor guardado para ese idioma, sin sustituir el título o la etiqueta originales, ni presentar el texto fuente como si fuera una traducción real.

## Diseño

1. Reutilizar el autosave autenticado del builder y las columnas JSONB actuales; no agregar una ruta pública para borradores ni cambiar el estado del formulario.
2. Ejecutar el enriquecimiento determinista al guardar el contenido del borrador. El proceso será idempotente y operará sobre el formulario actualizado (título, descripción, preguntas, opciones y etiquetas de escala).
3. Para coincidencias exactas del catálogo bilingüe y catálogos de opciones ya disponibles, guardar el valor de destino en `title_i18n`, `description_i18n` o `questions_i18n`, utilizando IDs estables de pregunta y opción.
4. No copiar automáticamente el texto fuente al mapa de destino. Conservar las traducciones existentes y no sobrescribir una traducción diferente ya guardada. Cuando no haya traducción de catálogo, el gestor deberá escribirla en el idioma destino en el builder; el autosave la conservará en la base.
5. Devolver las traducciones guardadas y actualizar en el estado local del builder solo los mapas de traducción, sin reemplazar ediciones de contenido que hayan ocurrido mientras el autosave estaba en curso.
6. Si una traducción no está disponible, no anunciar que el campo está traducido. El texto fuente puede servir de referencia editable, pero debe distinguirse de un valor traducido guardado.

## Límites explícitos

- No usar IA, claves API ni proveedores externos de traducción. El autosave al backend propio sigue siendo necesario para persistir los mapas.
- No prometer traducción automática de títulos o etiquetas arbitrarios que no estén en el catálogo. Sin IA, servicio externo o una traducción manual previa, no existe un resultado que la base pueda mostrar.
- No agregar tablas, columnas ni migraciones: los mapas por formulario ya están en el esquema.
- No cambiar en esta entrega los flujos públicos, portada, vista previa ni formularios publicados; estos podrán consumir los mapas guardados posteriormente, pero no forman parte del objetivo actual.

## Errores y consistencia

- Un error al guardar una traducción debe mantener el estado de guardado fallido/pendiente y notificarlo mediante el patrón existente del builder; no debe reportarse éxito si no se persistió.
- Un catálogo sin coincidencia no es un error de guardado: significa que el gestor debe proporcionar la traducción en el idioma destino.
- El enriquecimiento no debe alterar `status`, `title`, `description` ni el contenido fuente salvo cuando el usuario los edite explícitamente.

## Criterios de aceptación

1. Un borrador guardado con una frase incluida en el catálogo conserva el texto fuente y persiste la traducción de destino; al volver a cargarlo, el builder muestra la traducción guardada.
2. Al agregar una pregunta u opción nueva al lienzo, la traducción determinista correspondiente se guarda por sus IDs sin cambiar el estado `draft`.
3. Una etiqueta o título personalizado no incluido en el catálogo no recibe una copia falsa como traducción; al escribir su traducción manual en el idioma destino, se guarda sin modificar el original.
4. Las traducciones existentes sobreviven a autosaves posteriores; las opciones y etiquetas se asocian por ID, no por posición.
5. Pruebas de regresión escribiendo el título y la etiqueta carácter por carácter deben comprobar que el texto completo permanece en el borrador y en el mapa bilingüe correspondiente después de cambiar idioma y recargar.
6. Los errores de persistencia del autosave siguen visibles para el gestor y no se silencian.
