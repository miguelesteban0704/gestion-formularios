# Especificación: traducciones de formularios desde la base de datos

- **Fecha:** 2026-11-17
- **Estado:** diseño aprobado en conversación; pendiente revisión de esta especificación.
- **Alcance:** traducción ES/EN de formularios publicados y edición de sus textos localizados en el builder.

## Objetivo

Permitir que los formularios publicados muestren las traducciones ES/EN que ya
están guardadas en la base de datos, sin solicitar traducciones a un modelo de
IA. Al cambiar el idioma, la vista responde inmediatamente con los valores
localizados guardados. Si falta una traducción, conserva el texto original.

## Diagnóstico verificado

- El esquema y el repositorio ya contemplan `title_i18n`,
  `description_i18n` y `questions_i18n` como datos JSONB; `mapForm` los devuelve
  al cliente.
- El builder ya permite editar varios campos de pregunta por idioma, pero los
  campos de título y descripción del formulario editan solo `title` y
  `description`. El autoguardado no envía las traducciones de esos dos campos y
  la lista permitida del servicio de formularios tampoco acepta
  `titleI18n`/`descriptionI18n`.
- Al montar un formulario publicado, `FormView` llama a
  `GET /api/public/forms/:slug/translate`. Cuando faltan traducciones,
  `translateFormForLanguage` delega en `ai.service.translateForm` y persiste el
  resultado.
- En el worktree ya hay cambios sin confirmar relacionados con i18n, pruebas y
  dos planes incompatibles (uno dinámico con IA y otro determinista). La
  implementación debe integrarlos con cuidado, sin descartar ni confirmar
  cambios ajenos.

## Diseño aprobado

### Fuente de verdad y fallback

- Los textos escritos por el creador se resuelven desde las traducciones
  existentes en el formulario: título, descripción, etiqueta, descripción,
  placeholder, texto de ayuda y contenido estático; además de etiquetas de
  opciones y extremos de escala cuando existan.
- Se conservan las estructuras JSON actuales y los alias de propiedades
  camelCase/snake_case que ya admiten los clientes.
- Si el idioma solicitado no tiene una traducción guardada, se muestra el texto
  original de ese campo. No se genera una traducción aproximada, no se marca
  falsamente como completa y no se escribe un fallback en la base de datos.
- La localización propia de la interfaz y de catálogos de campos estándar
  continúa usando los recursos estáticos existentes. No se aplica un
  diccionario genérico como traducción de textos personalizados.
- No se añade migración ni se modifica el almacenamiento de respuestas.
  `questionId`, `optionId`, valores y reglas condicionales permanecen estables.

### Edición y persistencia en el builder

- El idioma activo permite editar la versión correspondiente del título y la
  descripción del formulario, igual que los campos localizados ya existentes.
- Las ediciones se guardan en `title_i18n` y `description_i18n` mediante el
  autoguardado actual.
- El flujo conserva traducciones preexistentes y no sobrescribe la otra lengua
  al editar una.
- El servicio de formularios admite explícitamente esas propiedades localizadas
  y el repositorio las persiste usando las columnas JSONB existentes.
- Los campos de pregunta y sus opciones usan los mecanismos localizados
  existentes; se preservan además los textos guardados en `questions_i18n`.

### Respuesta pública y API

- La respuesta publicada ya incluye los datos i18n disponibles; el frontend los
  resuelve localmente al cambiar el idioma, sin una petición de traducción al
  montar el formulario ni al alternar ES/EN.
- `GET /api/public/forms/:slug/translate` se mantiene por compatibilidad, pero
  pasa a devolver únicamente datos existentes, sin invocar IA, persistir
  cambios ni alterar el contrato de respuesta.
- Se conserva la protección IDP para formularios privados. La vista pública
  solo recibe los datos que ya autoriza `getGuestFormDetail`.
- Una falta de traducción es una condición normal de fallback, no un error de
  API ni una alerta de autenticación de IA.

### Compatibilidad y alcance

- Formularios antiguos que solo tienen cadenas originales siguen funcionando:
  no requieren migración y muestran esos textos en ambos idiomas cuando no hay
  una versión localizada guardada.
- Las traducciones ya almacenadas se preservan y se muestran.
- Este cambio elimina la dependencia de IA únicamente del renderizado y
  traducción de formularios publicados. No modifica generación de formularios,
  mejora de preguntas ni otras funciones de IA.
- El alcance de idiomas continúa limitado a español e inglés.
- No se modifica `.env` ni se intenta reparar o reutilizar una API key.

## Verificación requerida

- Pruebas backend que demuestren que el endpoint usa traducciones guardadas,
  aplica fallback al original, no llama al traductor de IA y no persiste cambios
  durante una lectura.
- Pruebas frontend que cubran título, descripción, etiquetas de preguntas,
  opciones, cambio de idioma sin petición de red y fallback al texto original.
- Pruebas que mantengan el rechazo de traducción/lectura de formularios privados
  sin un token IDP válido.
- Pruebas de persistencia del autoguardado para `title_i18n` y
  `description_i18n`, incluyendo la preservación de la otra lengua.
- Ejecutar los tests enfocados de backend/frontend y las comprobaciones
  pertinentes de tipo y build disponibles en el proyecto.

## Fuera de alcance

- Traducir automáticamente texto personalizado que no tenga traducción
  almacenada.
- Instalar modelos locales, servicios externos de traducción o nuevas
  dependencias de traducción.
- Cambiar la estructura o semántica de respuestas, IDs, lógica condicional,
  analíticas o permisos de formularios privados.
