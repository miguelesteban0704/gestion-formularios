import { Router } from "express";
import {
  getForms,
  getForm,
  createForm,
  updateForm,
  setFormVisibility,
  publishForm,
  duplicateForm,
  deleteForm,
  uploadFormLogo,
  deleteFormLogo,
} from "../controllers/form.controller.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";

const router = Router();

// El logo llega como archivo, no como JSON: multer en memoria (buffer) con un
// tope de 4 MB, el mismo límite y la misma estrategia que usa el avatar en
// settings.routes.js. En memoria a propósito — el archivo se reescribe en disco
// enseguida y no hace falta streaming ni almacenamiento temporal.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

router.use(protect);
router.route("/").get(getForms).post(createForm);
router.route("/:id").get(getForm).put(updateForm).delete(deleteForm);
router.patch("/:id/visibility", setFormVisibility);
router.post("/:id/publish", publishForm);
router.post("/:id/duplicate", duplicateForm);

// La extensión y el tamaño se validan TAMBIÉN en el servicio: aquí multer solo
// corta el tamaño, y la extensión la decide el nombre que envía el cliente.
router.post("/:id/logo", upload.single("logo"), uploadFormLogo);
router.delete("/:id/logo", deleteFormLogo);

export default router;
