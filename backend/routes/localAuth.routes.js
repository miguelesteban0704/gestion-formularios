import { Router } from "express";
import {
  localRegister,
  localRegisterByAccess,
  localLogin,
  localLogout,
  localForgot,
  localReset,
} from "../controllers/localAuth.controller.js";
import { protect } from "../middleware/auth.js";
import { requireRole, audit } from "../middleware/rbac.js";

const router = Router();

// Alta de cuentas: solo super_admin (roles gestionables + entidad).
router.post(
  "/register",
  protect,
  requireRole("super_admin"),
  audit("user.create.route", {}),
  localRegister,
);
// Registro por enlace: entidad y rol se resuelven desde el contexto cifrado.
router.post("/register-by-access/:slug", localRegisterByAccess);
// Login local (público, con limiter estricto en app.js) y recuperación.
router.post("/login", localLogin);
router.post("/forgot", localForgot);
router.post("/reset", localReset);
// Cierre de la sesión actual.
router.post("/logout", protect, localLogout);

export default router;
