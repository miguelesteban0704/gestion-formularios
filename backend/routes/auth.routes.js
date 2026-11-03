import { Router } from "express";
import {
  startLogin,
  handleCallback,
  getMe,
  patchProfile,
  deleteAccount,
  logout,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  logoutCurrentSession,
  getCurrentSession,
  recordActivity,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { getLoginPortalSlug } from "../utils/bootstrap.js";

const router = Router();
router.get("/login", startLogin);
router.get("/callback", handleCallback);
router.get("/logout", logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, patchProfile);
router.delete("/me", protect, deleteAccount);
// Endpoint público para obtener la URL del portal del superadmin.
// Es seguro: el slug solo lleva al formulario de login donde todavía se
// requieren credenciales de superadmin. Se usa cuando el superadmin olvida
// cuál es su puerta de acceso actual.
router.get("/login-portal/slug", async (_req, res) => {
  const slug = await getLoginPortalSlug();
  if (!slug) return res.status(404).json({ error: "No portal configured" });
  res.json({ slug, url: `/a/${slug}` });
});
// Sesiones multi-dispositivo
router.get("/sessions", protect, listSessions);
router.delete("/sessions/:id", protect, revokeSession);
router.post("/sessions/revoke-others", protect, revokeOtherSessions);
router.post("/sessions/logout", protect, logoutCurrentSession);
// Política de sesiones: estado y actividad
router.get("/sessions/current", protect, getCurrentSession);
router.post("/activity", protect, recordActivity);

export default router;