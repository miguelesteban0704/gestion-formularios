# Diseño: actualización inmediata de estadísticas públicas desde PostgreSQL

- **Fecha:** 2026-11-24
- **Estado:** diseño conversacional aprobado; pendiente de revisión del usuario.
- **Alcance:** estadísticas del `HomeHeroSection` y contadores de respuestas/vistas
  del catálogo público de formularios.

## Objetivo

Actualizar las métricas públicas sin recargar la página cuando cambien los datos
de formularios o respuestas, tanto por las operaciones normales de la aplicación
como por escrituras SQL externas. El aviso debe emitirse después del `COMMIT` y
no introducir un debounce deliberado en el cliente.

“Inmediato” significa que el sistema empieza a refrescar al recibir la
notificación confirmada; no elimina la latencia normal de PostgreSQL, la red ni
las peticiones HTTP. Los cambios en tablas no relacionadas con formularios,
respuestas, publicación o métricas quedan fuera del alcance.

## Diagnóstico verificado

- El SSE público existente transmite eventos generados por el proceso Node.js.
  Una escritura SQL externa no pasa por los servicios que hoy emiten esos
  eventos y, por tanto, no llega al navegador.
- El cliente comparte una conexión SSE para el `HomeHeroSection` y el catálogo,
  pero agrupa las notificaciones durante 300 ms. También sondea cada 10 segundos
  como respaldo cuando el stream falla.
- El `HomeHeroSection` obtiene métricas globales a partir de respuestas reales.
  Las tarjetas del catálogo leen `forms.response_count`.
- La aplicación incrementa/decrementa `forms.response_count` después de insertar
  o borrar una respuesta. Una escritura SQL externa no actualiza ese valor, y
  sumar triggers sin retirar las actualizaciones manuales duplicaría el conteo.
- El backend usa `pg.Pool`; PostgreSQL no tiene actualmente triggers ni una
  conexión persistente `LISTEN` para estas métricas.

## Diseño aprobado

### PostgreSQL como fuente de cambios

- Instalar funciones y triggers idempotentes para `forms` y `responses`.
- El trigger de `responses` mantiene `forms.response_count` de forma atómica:
  aumenta en una inserción, disminuye en un borrado y ajusta ambos formularios
  cuando cambia la referencia `form`. Las operaciones ordinarias de la
  aplicación y las escrituras SQL externas quedan cubiertas por el mismo camino.
- `response_count` pasa a ser un campo derivado: el servicio, el seeder y otros
  escritores no lo asignan directamente. Para cambiar el conteo se insertan,
  actualizan o borran filas de `responses`; el trigger mantiene el valor exacto.
- Antes de activar el trigger, una migración única reconcilia
  `forms.response_count` con el conteo real de `responses`. La migración se
  serializa y versiona para que varios procesos de backend no repitan el
  backfill concurrentemente.
- Retirar las llamadas manuales a `incrementResponseCount` al crear y borrar
  respuestas; actualizar el seeder y retirar cualquier otra escritura directa
  de `response_count`. Eliminar el helper de escritura si ya no tiene usos.
- El trigger de `forms` notifica cambios de columnas usadas por el Hero o las
  tarjetas públicas: `status`, `visibility`, `is_archived`, `title`,
  `description`, `theme`, `settings`, `entity_id`, `category_id`,
  `published_at`, `updated_at`, `views` y `response_count`. Debe cubrir también
  inserción y borrado de formularios. En cada operación se consideran los
  estados `OLD` y `NEW`, para que hacer privado, despublicar o archivar un
  formulario también retire sus datos del catálogo abierto.
- El trigger de `responses` notifica inserciones, actualizaciones y borrados que
  puedan alterar las estadísticas globales. La notificación se limita a
  formularios que sean públicos, publicados y no archivados, considerando tanto
  el formulario anterior como el nuevo cuando corresponda.
- Los triggers envían una marca de invalidación constante, sin ID, respuestas,
  datos personales ni otros valores de filas. PostgreSQL entrega `NOTIFY` tras
  confirmar la transacción y deduplica payloads idénticos repetidos en una misma
  transacción.
- La migración instala el backfill y los triggers en un paso coordinado para no
  dejar una ventana en la que escrituras nuevas puedan desincronizar el conteo.
  Se apoya en el índice existente de `responses(form, submitted_at)`.
- La activación del trigger debe ocurrir después de drenar todas las instancias
  de backend antiguas que todavía incrementan/decrementan el contador desde la
  aplicación. No se permite que esos escritores antiguos convivan con el trigger,
  porque duplicarían el conteo durante un despliegue solapado.

### Listener PostgreSQL y SSE

- Iniciar un `pg.Client` dedicado al `LISTEN` después de las migraciones. No se
  reutiliza una conexión efímera del pool: el listener necesita una sesión
  persistente compatible con `LISTEN/NOTIFY`.
- Cada instancia del backend escucha PostgreSQL y retransmite la invalidación
  al canal SSE público local. De esta forma, el navegador conectado a cualquier
  instancia recibe el aviso sin afinidad de sesión entre escrituras y lecturas.
- Si se pierde la conexión del listener, intentar reconectar con backoff
  acotado y registrar el error. Cerrar los streams públicos existentes para que
  `EventSource` detecte la caída y el navegador active el respaldo; no mantener
  un stream aparentemente sano que ya no recibe cambios.
- Mientras el listener no esté operativo, el endpoint público de eventos
  rechaza nuevas conexiones con `503` y `Retry-After`. Al reconectar, el SSE
  vuelve a estar disponible y el cliente hace una recarga inmediata para
  recuperar cambios ocurridos durante la desconexión.
- Cerrar ordenadamente la conexión dedicada al apagar el servidor. El servidor
  puede permanecer disponible durante un fallo temporal del listener; el SSE
  informa su indisponibilidad y el cliente usa el respaldo.
- Mantener el contrato público de SSE como invalidación genérica. Los eventos
  autenticados de estadísticas (`general`, `form:*`, `entity:*`) continúan
  funcionando para sus consumidores actuales; no se amplían para exponer datos
  de SQL externos.
- Retirar las emisiones públicas en memoria de las rutas de vistas y respuestas
  cuando ya las cubran los triggers, para no pedir dos recargas por una misma
  escritura de la aplicación. Mantener las emisiones autenticadas actuales que
  no se sustituyen con este alcance.

### Cliente público

- Conservar una única conexión `EventSource` compartida entre el
  `HomeHeroSection` y el catálogo.
- Al recibir `stats_updated`, llamar inmediatamente a los consumidores para que
  vuelvan a pedir sus datos en modo silencioso. Retirar el temporizador de
  300 ms; no introducir otro debounce.
- Mantener el sondeo de 10 segundos solo mientras el SSE esté desconectado o
  indisponible. Cuando el stream se abra o se recupere, detener el sondeo y
  actualizar inmediatamente para ponerse al día.
- La actualización silenciosa conserva el contenido visible y evita que las
  tarjetas o el Hero vuelvan al estado de carga inicial.

## Flujo esperado

1. Una escritura SQL de `forms` o `responses` ejecuta sus triggers dentro de la
   misma transacción; las escrituras de respuestas mantienen también
   `response_count`.
2. PostgreSQL confirma la transacción y entrega el `NOTIFY` a todas las
   instancias que ejecutan `LISTEN`.
3. Cada backend emite una invalidación por su SSE público local, sin datos de
   formulario en el payload.
4. El navegador conectado invoca de inmediato las recargas silenciosas del Hero
   y del catálogo. La API lee las cifras ya confirmadas.
5. Si el listener o el SSE no están disponibles, el frontend conserva el
   respaldo temporal; al recuperar el stream, hace una recarga inmediata.

## Errores, seguridad y límites

- Una caída temporal de `LISTEN` se registra y activa reconexión con backoff; no
  se considera que el SSE esté sano mientras el backend no tenga listener.
- Los errores de lectura de la API deben conservar el manejo visible/logueado
  existente; no se presentan datos de éxito ficticios.
- `NOTIFY` contiene solo una invalidación genérica y no transmite contenido de
  respuestas ni identificadores. El endpoint sigue siendo público porque solo
  permite invalidar datos que ya son públicos.
- Se cubren `INSERT`, `UPDATE` y `DELETE` ordinarios que disparan triggers.
  Operaciones administrativas que deshabiliten triggers o los omitan mediante
  configuración de replicación quedan fuera del contrato.
- Las notificaciones PostgreSQL no son una cola durable. Los cambios durante
  una desconexión se recuperan mediante la recarga inmediata al restablecer SSE
  y, mientras tanto, mediante el respaldo del cliente.
- No existe garantía de latencia física cero; sí se elimina la espera
  intencional de 300 ms en la ruta normal.

## Compatibilidad y fuera de alcance

- No cambia el esquema de las respuestas ni la API de lectura pública.
- No se observan tablas ajenas a formularios, respuestas, publicación y
  métricas.
- No se sustituye el sistema de eventos autenticados de analíticas ni se
  distribuyen sus canales privados entre instancias.
- No se añade infraestructura externa de mensajería. PostgreSQL continúa siendo
  el mecanismo de notificación entre procesos.
- La conexión de base de datos configurada debe admitir sesiones persistentes
  `LISTEN`; un pooler en modo transaccional no sirve para la conexión dedicada.
- La activación requiere un despliegue que drene los escritores de la versión
  anterior antes de instalar el trigger. Si el entorno no puede garantizar ese
  orden, se necesita diseñar un despliegue escalonado con compatibilidad de
  versiones antes de activar la migración.

## Alternativas consideradas

- **Mantener solo los eventos SSE de la aplicación:** descartado porque no
  detecta SQL ejecutado fuera del backend.
- **Reducir o quitar el sondeo periódico:** descartado como mecanismo principal;
  no proporciona notificación inmediata y genera lecturas repetidas.
- **Triggers PostgreSQL más `LISTEN/NOTIFY`:** seleccionado porque observa las
  transacciones independientemente del cliente que las ejecuta, puede actualizar
  `response_count` en la misma operación y entrega los avisos después del
  `COMMIT`.

## Verificación requerida

- Pruebas de integración contra una base PostgreSQL aislada y desechable:
  inserción SQL externa, borrado y cambio de formulario mantienen
  `response_count` exactamente; una transacción revertida no emite una
  notificación entregable.
- Verificar que un `NOTIFY` solo llega después del `COMMIT`, que los payloads no
  contienen IDs/datos y que los cambios a formularios públicos y respuestas
  relevantes invalidan las métricas.
- Probar reconexión del listener, indisponibilidad SSE y recuperación del stream
  sin dejar clientes aparentemente conectados.
- Pruebas de frontend que demuestren recarga inmediata al evento, ausencia del
  debounce, operación silenciosa y respaldo solo cuando SSE está caído.
- Verificación integrada en `:5173`: modificar datos mediante la aplicación y
  mediante SQL en la base de pruebas; comprobar Hero, conteo de respuestas y
  vistas de las tarjetas sin recargar el documento.
- No ejecutar escrituras de prueba contra la base de datos de usuario o
  producción. Las pruebas que requieren PostgreSQL deben usar una URL de test
  explícita y una base aislada.
- Verificar el procedimiento de despliegue para asegurar que ningún backend con
  actualizaciones manuales del contador siga activo al habilitar los triggers.
