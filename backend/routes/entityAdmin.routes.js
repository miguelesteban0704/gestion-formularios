import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { requireRole, requireEntityMember } from "../middleware/rbac.js";
import * as entityAdmin from "../controllers/entityAdmin.controller.js";

const router = Router();

// Panel de Gestión de Entidad: sólo `entity_admin` con entidad.
// El scope por entidad lo impone el controlador desde `req.user.entityId`.
router.use(protect, requireRole("entity_admin"), requireEntityMember);

// Usuarios de la entidad.
router.get("/users", entityAdmin.listUsers);
router.post("/users", entityAdmin.createUser);
router.patch("/users/:id", entityAdmin.updateUser);
router.post("/users/:id/resend-welcome", entityAdmin.resendWelcome);
router.delete("/users/:id", entityAdmin.removeUser);

// Formularios de la entidad.
router.get("/forms", entityAdmin.listForms);
router.get("/forms/:id/stats", entityAdmin.formStats);

// URLs de acceso de la entidad (generar la del nuevo creador + listar activas).
router.post("/access-urls", entityAdmin.createAccessUrl);
router.get("/access-urls", entityAdmin.listAccessUrls);

export default router;
