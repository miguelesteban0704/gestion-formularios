# Registro unico de administradores por entidad

Fecha: 2026-10-06
Estado: Diseno para revision

## Objetivo

Permitir que el enlace de acceso creado por el super administrador para el rol `entity_admin` abra el registro de la entidad correspondiente. La cuenta nueva recibe el rol y la entidad fijados por el enlace, inicia sesion al completar el alta y entra al dashboard. Cada entidad puede tener como maximo una cuenta `entity_admin`.

## Decisiones

- La cardinalidad es una cuenta `entity_admin` por entidad, no una por sistema.
- Solo los enlaces activos cuyo rol sea `entity_admin` ofrecen registro. Los enlaces `form_creator` mantienen su flujo de inicio de sesion actual.
- Mientras la entidad no tenga `entity_admin`, la pagina del enlace abre por defecto el registro y permite cambiar a inicio de sesion.
- Si la entidad ya tiene administrador, el mismo enlace sigue permitiendo iniciar sesion, pero no ofrece un segundo registro.
- Entidad y rol se resuelven en el servidor desde la fila activa de `access_urls` y su contexto cifrado. El endpoint de registro no acepta esos campos como autoridad desde el cliente.
- El alta publica autentica a la nueva cuenta con la misma infraestructura de JWT y `user_sessions` usada por el login local.
- El enlace no se desactiva al registrar: sigue siendo una URL de acceso contextual para el administrador. La regla de unicidad impide usarla para crear otra cuenta.
- La eliminacion del unico administrador libera la entidad para registrar uno nuevo. Desactivarlo o cambiarlo a otro rol no elimina el registro y, por tanto, no libera el cupo.

## Flujo

1. `GET /api/access/:slug` valida que la URL siga activa y que el contexto cifrado coincida con el slug, rol y entidad almacenados. Para enlaces `entity_admin`, responde si esa entidad aun admite registro.
2. `AccessLogin` muestra la pestaña de registro solo cuando el rol es `entity_admin` y la respuesta indica que no existe ya uno. Nombre, email, nombre de usuario opcional y contrasena son los unicos datos editables; entidad y rol permanecen visibles y bloqueados.
3. `POST /api/auth/local/register-by-access/:slug` vuelve a validar la URL y su contexto, comprueba que la entidad este activa y que no exista ya su administrador, valida los campos y crea la cuenta con el rol y entidad derivados del servidor.
4. La base de datos aplica la restriccion unica para cubrir registros concurrentes y todas las rutas de alta. Si la creacion tiene exito, el servidor crea la sesion local y devuelve el token para que el cliente cargue al usuario y navegue a su dashboard.
5. Los errores de enlace revocado/invalido, entidad inactiva, email duplicado o administrador ya existente se muestran en el formulario y no crean una sesion.

## Invariante y datos existentes

Crear un indice unico parcial sobre `users.entity_id` para filas con `role = 'entity_admin'`. El alta gestionada por superadmin, la edicion de rol/entidad y el alta por enlace deben traducir una violacion de unicidad a un conflicto claro (`409`), sin confiar solo en una comprobacion previa de la interfaz.

La inspeccion agregada de la base local encontro cero entidades con administradores duplicados. La migracion en cada entorno debe comprobar duplicados preexistentes y detenerse con un error accionable si los encuentra; no debe elegir ni eliminar cuentas automaticamente. Tambien debe reportar cuentas `entity_admin` sin entidad asignada, ya que no pueden cumplir el alcance requerido.

## Alcance tecnico

- Frontend: `AccessLogin`, `accessApi` y `localAuthApi`; pestañas accesibles, contexto entidad/rol visible y navegacion tras el alta.
- Backend: resolucion compartida del contexto de acceso, alta publica limitada, rate limit, sesion local, auditoria y conflictos de unicidad en las rutas locales y de administracion.
- Base de datos: indice unico parcial y comprobacion previa de los datos existentes en la migracion.

## Fuera de alcance

- Registro libre sin un enlace de acceso activo.
- Seleccion o edicion del rol o la entidad durante el autorregistro.
- Permitir mas de un administrador por entidad, incluso si el actual esta desactivado.
- Cambiar las reglas de registro de `form_creator`.

## Criterios de aceptacion

- Un enlace `entity_admin` activo y sin administrador presenta registro con entidad y rol correctos.
- Completar el registro autentica a la cuenta y la lleva al dashboard de entidad.
- El mismo enlace ofrece solo inicio de sesion una vez que la entidad ya tiene administrador.
- Un cliente no puede cambiar entidad ni rol enviando valores manipulados.
- Dos intentos concurrentes, o un alta desde el panel y otra desde el enlace, no pueden crear dos administradores para la misma entidad.
- Un enlace `form_creator` conserva su pantalla y comportamiento actuales.
- Las fallas de validacion conservan el enlace disponible y no crean sesiones incompletas.