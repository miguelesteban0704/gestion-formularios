import { Router } from "express";
import {
  submitResponse,
  getResponses,
  getAnalytics,
  deleteResponse,
  exportResponses,
  streamResponses,
} from "../controllers/response.controller.js";
import { getPublicForm, getPublicForms, guestListForms, guestGetForm } from "../controllers/form.controller.js";
import { protect } from "../middleware/auth.js";
import { attachRespondent } from "../middleware/respondent.js";

const router = Router();

/* ── Escaparate de invitados (SIN sesión) ─────────────────────────────────
   El invitado navega libre: lista públicos+privados y abre el detalle. Lo
   privado no entrega preguntas (requiresAuth) y para responderlo el
   encuestado se identifica en el IDP (token `rid` en header o query). */
router.get("/guest/forms", guestListForms);
router.get("/guest/forms/:slug", attachRespondent, guestGetForm);
router.post("/guest/forms/:slug/respond", attachRespondent, submitResponse);

/* ── Todo el servicio pasa por el IDP ─────────────────────────────────────
   Estas tres rutas se llamaban "public" y NO lo eran de una forma aceptable:
   sin sesión, `GET /public/forms` devolvía los formularios publicados de TODOS
   los usuarios (SELECT * sobre toda la tabla, con questions y settings), y
   `/public/forms/:slug` y el envío de respuestas iban sin autenticar.

   El sitio es un servicio de un centro de gobierno: entrar requiere
   identificarse. Los tres endpoints llevan `protect` y el listado se acota
   además al dueño en el repositorio, de modo que autenticarse no sirve para
   listar los formularios de otra cuenta.

   El nombre "public" se conserva a propósito: describe para QUÉN es la página
   (quien responde a un formulario), no si exige sesión. Cambiarlo sería
   propagar el mismo malentendido que dejó estos endpoints abiertos. */
router.get("/public/forms", protect, getPublicForms);
router.get("/public/forms/:slug", protect, getPublicForm);
router.post("/public/forms/:slug/respond", protect, attachRespondent, submitResponse);

/* SIN `protect` a propósito: `EventSource` no puede mandar cabecera
   Authorization, así que el token va por query. El controlador lo valida él
   mismo (misma clave, y además comprueba que el formulario sea del usuario).
   Poner `protect` aquí no endurecería nada: el controlador ya exige sesión y
   ownership, y `protect` solo miraría una cabecera que nunca llega. */
router.get("/forms/:id/responses/stream", streamResponses);
router.get("/forms/:id/responses", protect, getResponses);
router.get("/forms/:id/responses/export", protect, exportResponses);
router.get("/forms/:id/analytics", protect, getAnalytics);
router.delete("/responses/:id", protect, deleteResponse);

export default router;
