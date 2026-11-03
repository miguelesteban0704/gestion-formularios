import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { requireRole, requireEntityMember, audit } from "../middleware/rbac.js";
import * as admin from "../controllers/admin.controller.js";

const router = Router();

// Todo el panel requiere sessión; cada grupo pide su rol.
router.use(protect);

// Gestión del sistema: solo super_admin.
router.get("/users", requireRole("super_admin"), admin.listUsers);
router.patch("/users/:id", requireRole("super_admin"), admin.updateUser);
router.post("/users/:id/resend-welcome", requireRole("super_admin"), admin.resendWelcome);
router.delete("/users/:id", requireRole("super_admin"), admin.removeUser);

router.get("/entities", requireRole("super_admin"), admin.listEntities);
router.post("/entities", requireRole("super_admin"), audit("entity.create.route", {}), admin.createEntity);
router.patch("/entities/:id", requireRole("super_admin"), admin.updateEntity);
router.delete("/entities/:id", requireRole("super_admin"), admin.deleteEntity);

router.get("/categories", requireRole("super_admin"), admin.listCategories);
router.post("/categories", requireRole("super_admin"), admin.createCategory);
router.patch("/categories/:id", requireRole("super_admin"), admin.updateCategory);
router.delete("/categories/:id", requireRole("super_admin"), admin.deleteCategory);

router.get("/access-urls", requireRole("super_admin"), admin.listAccessUrls);
router.post("/access-urls", requireRole("super_admin"), admin.createAccessUrl);
router.patch("/access-urls/:id", requireRole("super_admin"), admin.toggleAccessUrl);
router.post("/access-urls/:id/regenerate", requireRole("super_admin"), admin.regenerateAccessUrl);
router.delete("/access-urls/:id", requireRole("super_admin"), admin.deleteAccessUrl);

router.get("/settings", requireRole("super_admin"), admin.getSettings);
router.put("/settings", requireRole("super_admin"), admin.updateSettings);
router.post("/settings/login-portal/regenerate", requireRole("super_admin"), admin.rotateLoginPortal);
router.get("/settings/login-portal/slug", requireRole("super_admin"), admin.getLoginPortalSlugRoute);

router.get("/audit", requireRole("super_admin"), admin.listAudit);

// Públicos en solo lectura: super_admin (nunca privados).
router.get("/public-forms", requireRole("super_admin"), admin.listPublicAdmin);
router.get("/public-stats", requireRole("super_admin"), admin.publicAggregate);
router.get("/public-forms/:id/stats", requireRole("super_admin"), admin.publicFormStats);
router.get("/public-forms/:id/export", requireRole("super_admin"), admin.publicFormExport);

// Agregado de la entidad: entity_admin (públicos + privados suyos).
router.get(
  "/entity-stats",
  requireRole("entity_admin"),
  requireEntityMember,
  admin.entityAggregate,
);

export default router;
