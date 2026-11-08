# Especificación: correo transaccional en producción

- **Fecha:** 2026-11-05
- **Estado:** aprobada en conversación.
- **Alcance:** backend de `gestion-formularios` y variables del servicio Render.

## Objetivo

Habilitar el envío real en producción de códigos de recuperación de contraseña
y enlaces de activación de cuentas nuevas mediante la cuenta Gmail SMTP que ya
está configurada localmente, sin incluir credenciales en el repositorio.

## Diagnóstico verificado

- `backend/config/env.js` lee `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_USER`, `SMTP_PASS`, `MAIL_SECURE`, `MAIL_FROM` y los ajustes de
  activación.
- El `backend/.env` local está configurado para SMTP de Gmail en el puerto 465
  con TLS implícito. Se confirmó que las dos variables de autenticación están
  definidas, sin leer ni exponer sus valores.
- El backend de Render declara actualmente `MAIL_PROVIDER=ethereal`.
  `isMailConfigured()` rechaza Ethereal en producción, por lo que ambos flujos
  de correo se consideran deshabilitados allí.
- `localForgot` persiste un código de un solo uso, envía el mensaje si el
  proveedor está disponible y no revela si existe la cuenta. Si falla el
  envío, actualmente también escribe el código en los logs; esto no debe ocurrir
  en producción.
- El alta usa la variante de activación: crea un token de un solo uso, compone
  `${FRONTEND_URL}/activar?token=...` y continúa aunque el correo no se envíe.

## Diseño aprobado

### Transporte y configuración

Render usará el transporte SMTP existente de Nodemailer:

```text
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
MAIL_SECURE=true
MAIL_SEND_CREDENTIALS=false
```

`SMTP_USER` y `SMTP_PASS` se declararán como variables no sincronizadas en
`render.yaml` y se configurarán directamente como secretos en el servicio
backend de Render. La contraseña debe ser una contraseña de aplicación de
Google. Ningún valor secreto del `.env` local se copia a archivos versionados,
logs, pruebas o respuestas HTTP. El remitente puede usar la dirección
autenticada como valor predeterminado del servicio.

La composición de opciones SMTP debe respetar el protocolo: TLS inmediato para
465 (`secure: true`) y STARTTLS para 587 (`secure: false`), con opción explícita
solo cuando sea coherente con el puerto configurado.

`FRONTEND_URL` en producción debe apuntar al origen público del sitio:
`https://gestion-formularios.onrender.com`. Las credenciales y la configuración
SMTP permanecen separadas: el frontend no conoce ni recibe acceso al proveedor.

### Flujos de usuario

- **Recuperación:** conserva la respuesta neutral para impedir enumeración, el
  código de un solo uso y su caducidad; en producción no devuelve ni registra el
  código cuando el correo está deshabilitado o falla.
- **Alta y reenvío:** conserva el enlace de activación firmado y de un solo uso
  (no envía la contraseña); el alta sigue completándose aunque falle el correo,
  e informa `mail.sent`/`mail.reason` para que la interfaz pueda mostrar el
  resultado.
- Los errores operativos deben permitir diagnosticar proveedor deshabilitado o
  error de transporte sin imprimir credenciales, códigos de recuperación ni
  tokens.

## Verificación

- Pruebas automatizadas unitarias de configuración: proveedor ausente, SMTP
  incompleto, puerto 465/TLS inmediato y puerto 587/STARTTLS.
- Pruebas de los caminos de recuperación y bienvenida sin conectar a Gmail ni
  enviar correo durante CI.
- Comprobación manual posterior al despliegue, con destinatario controlado:
  enviar una recuperación, verificar la llegada del código, completar el
  cambio, crear una cuenta de prueba y abrir su enlace de activación.
- Confirmar en Render que los secretos estén presentes sin mostrar sus valores,
  que las URLs de activación usen el dominio público y que no se registren
  códigos ni tokens en los logs.

## Restricciones y fuera de alcance

- No leer, copiar, imprimir o versionar los valores de `SMTP_USER` ni
  `SMTP_PASS`.
- No enviar mensajes reales desde pruebas automatizadas.
- No cambiar a la variante que envía contraseñas temporales.
- No introducir una API de proveedor transaccional ni una dependencia nueva.
- El código puede dejar Render listo para usar las variables; la carga de los
  secretos en el Dashboard y la prueba real requieren acceso del propietario al
  servicio y a la cuenta Gmail.
