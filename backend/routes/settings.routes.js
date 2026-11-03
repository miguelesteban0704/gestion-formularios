import { Router } from "express";
import { protect } from "../middleware/auth.js";
import * as settingsCtrl from "../controllers/settings.controller.js";
import multer from "multer";

const router = Router();

// multer en memoria (buffer) — máx 4 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

// Todas las rutas requieren autenticación
router.use(protect);

// Perfil + configuración general
router.get("/",                    settingsCtrl.getSettings);
router.patch("/profile",           settingsCtrl.updateProfile);
router.post("/avatar",             upload.single("avatar"), settingsCtrl.uploadAvatar);
router.delete("/avatar",           settingsCtrl.deleteAvatar);

// Notificaciones
router.patch("/notifications",     settingsCtrl.updateNotifications);

// Apariencia
router.patch("/appearance",        settingsCtrl.updateAppearance);

// Sesiones
router.get("/sessions",            settingsCtrl.getSessions);
router.delete("/sessions",         settingsCtrl.revokeOtherSessions);
router.delete("/sessions/:id",     settingsCtrl.revokeSession);

// Exportar datos
router.get("/export",              settingsCtrl.exportData);

// Cuenta — zona de peligro
router.post("/deactivate",         settingsCtrl.deactivateAccount);
router.delete("/account",          settingsCtrl.deleteAccount);

// Seguridad — contraseña local + 2FA (TOTP)
router.post("/password",           settingsCtrl.changePassword);
router.post("/2fa/setup",          settingsCtrl.setup2FA);
router.post("/2fa/verify",         settingsCtrl.verify2FA);
router.post("/2fa/disable",        settingsCtrl.disable2FA);

export default router;
