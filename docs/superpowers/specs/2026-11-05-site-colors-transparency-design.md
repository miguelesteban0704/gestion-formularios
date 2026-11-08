# Especificación: sistema global de color y transparencia

- **Fecha:** 2026-11-05
- **Estado:** aprobada en conversación.
- **Alcance:** frontend `frontend/AIFormBuilder`.

## Objetivo

Revisar y armonizar los colores, contrastes, opacidades y superficies
translúcidas del sitio, conservando la identidad cyan/teal actual, el acento
personalizable y los temas claro y oscuro. La build publicada debe conservar el
mismo comportamiento visual que el entorno de desarrollo.

## Dirección visual aprobada

- **Intención:** preservar el sistema existente y corregir inconsistencias, no
  sustituir la marca ni rediseñar el producto.
- **Fuente de verdad:** los tokens de `src/index.css` (`--color-brand-*`,
  colores semánticos y `--glass-chroma`) junto con el tema y el acento dinámico
  actuales. Se conserva también el acento índigo fijo de las puertas y roles
  gestionados (`MANAGED_ACCENT` en `src/lib/accent.js`); no se fuerza ese flujo
  a usar el cyan personalizable del super_admin.
- **Capas translúcidas:** mantener el lenguaje de cristal y los efectos
  existentes cuando sigan siendo legibles; ajustar tintes, opacidad, bordes y
  fondos cuando dificulten distinguir contenido o controles.
- **Colores semánticos:** conservar estados de éxito, advertencia, error e
  información como colores diferenciados; no convertirlos en decoraciones de
  marca.
- **Restricción:** no cambiar estructura, tipografía, contenido ni movimiento
  como parte de esta revisión.

## Alcance de auditoría

Revisar las pantallas y componentes compartidos del frontend, incluyendo
autenticación/recuperación, paneles de administración y entidad, formularios,
analíticas, diálogos, menús, toasts y superficies públicas. Incluir CSS global,
tokens y estilos de componentes cuando el recorrido real del código indique que
afectan una superficie visible.

La búsqueda de valores concretos como `rgba()`, `opacity`, `color-mix()`,
gradientes y `backdrop-filter` es un instrumento de auditoría, no una orden de
reemplazar todas sus apariciones. Se preservarán las excepciones intencionales,
como color de datos y estados.

## Requisitos

1. Los modos claro, oscuro y sistema mantienen jerarquía legible para texto,
   controles, estados, bordes y capas superpuestas.
2. El acento dinámico continúa propagándose a los componentes cuyo color depende
   de la marca; los colores semánticos permanecen independientes y el acento
   índigo de los roles gestionados se mantiene diferenciado.
3. Las superficies translúcidas no reducen la legibilidad del contenido que
   cubren ni vuelven ambiguos los límites de controles y diálogos.
4. El texto normal alcanza contraste WCAG AA de al menos 4.5:1; texto grande y
   componentes gráficos/interactivos relevantes alcanzan al menos 3:1 contra
   colores adyacentes.
5. La auditoría no introduce diferencias entre los estilos vistos en desarrollo
   y la build de producción.
6. La revisión no altera comportamiento ni persistencia del tema/acento.

## Validación y aceptación

- Ejecutar la auditoría de marca existente antes y después, más typecheck, lint,
  pruebas de rutas y build.
- Renderizar y revisar visualmente casos representativos de las superficies
  principales en tema claro y oscuro, en escritorio (1440 px) y móvil (390 px).
- Confirmar contraste de las combinaciones modificadas con valores calculados,
  no solo una inspección subjetiva.
- Considerar la entrega aceptada si no hay regresión de tema/acento, las
  combinaciones revisadas cumplen los umbrales anteriores y las capturas de la
  build resultan coherentes con desarrollo.

## Fuera de alcance

- Rebranding o cambio de paleta.
- Rediseño de layout, tipografía, contenido o animaciones.
- Cambios del backend, plantillas de correo o configuración de Render.
- Reemplazo indiscriminado de toda transparencia por superficies opacas.
