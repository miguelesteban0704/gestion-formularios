import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as aiService from "../services/ai.service.js";

export const generateForm = asyncHandler(async (req, res) => {
  const language = req.headers["accept-language"]?.startsWith("es") ? "es" : "en";
  const t0 = Date.now();
  try {
    const form = await aiService.generateForm(req.body.prompt, language);
    sendSuccess(res, { message: "Form generated", data: { form } });
  } finally {
    /* Total de la peticion, que es lo que el usuario espera en el spinner.
       Los `[ai.service][tiempo]` de dentro dicen de dónde sale; este dice el
       suelo de red + parseo que rodea al pipeline. */
    console.warn(`[ai.controller] generateForm: ${Date.now() - t0} ms`);
  }
});

export const generateValidation = asyncHandler(async (req, res) => {
  /* El idioma lo manda el frontend en `accept-language` (mismo patrón que
     `generateForm` y `formSummary`): sin esto el mensaje de error sugerido
     salía siempre en inglés aunque el sitio estuviera en español. */
  const language = req.headers["accept-language"]?.startsWith("es") ? "es" : "en";
  const validation = await aiService.generateValidation({ ...req.body, language });
  sendSuccess(res, { message: "Validation suggested", data: { validation } });
});

export const improveQuestion = asyncHandler(async (req, res) => {
  const result = await aiService.improveQuestion(req.body);
  sendSuccess(res, { message: "Question improved", data: { result } });
});

export const formSummary = asyncHandler(async (req, res) => {
  const language = req.headers["accept-language"]?.startsWith("es") ? "es" : "en";
  const summary = await aiService.summarizeForm(req.body.form, language);
  sendSuccess(res, { message: "Summary ready", data: { summary } });
});
