const MESSAGES = {
  "API is healthy": "La API funciona correctamente",
  "Form generated": "Formulario generado",
  "Validation suggested": "Validación sugerida",
  "Question improved": "Pregunta mejorada",
  "Summary ready": "Resumen listo",
  "Profile updated": "Perfil actualizado",
  "Account deleted": "Cuenta eliminada",
  "Form created": "Formulario creado",
  "Form saved": "Formulario guardado",
  "Form published": "Formulario publicado",
  "Form unpublished": "Formulario despublicado",
  "Form duplicated": "Formulario duplicado",
  "Form deleted": "Formulario eliminado",
  "Response recorded": "Respuesta registrada",
  "Response deleted": "Respuesta eliminada",
  "Authentication required": "Autenticación requerida",
  "Invalid or expired token": "La sesión no es válida o ha caducado",
  "User no longer exists": "El usuario ya no existe",
  "Form not found": "Formulario no encontrado",
  "You do not have access to this form": "No tienes acceso a este formulario",
  "This form is not available": "Este formulario no está disponible",
  "Add at least one question before publishing": "Añade al menos una pregunta antes de publicar",
  "Response not found": "Respuesta no encontrada",
  "Describe the form you want to create": "Describe el formulario que quieres crear",
  "Field label and type are required": "La etiqueta y el tipo del campo son obligatorios",
  "Provide the question to improve": "Escribe la pregunta que quieres mejorar",
  "Add some questions before generating a summary": "Añade algunas preguntas antes de generar un resumen",
  "Validation failed": "La validación ha fallado",
  "The AI provider returned no questions. Try again in a moment or check the provider quota.": "La IA no devolvió ninguna pregunta. Inténtalo de nuevo en un momento o revisa la cuota del proveedor.",
};

export function localizedMessage(message, language = "en") {
  if (language !== "es" || !message) return message;
  if (MESSAGES[message]) return MESSAGES[message];
  if (/^\".+\" is required$/.test(message)) return message.replace(/^\"(.+)\" is required$/, '"$1" es obligatorio');
  if (message.startsWith("Route not found")) return "Ruta no encontrada";
  if (message.startsWith("Invalid ")) return message.replace(/^Invalid /, "Valor no válido: ");
  if (message.startsWith("AI provider timed out")) return "El proveedor de IA tardó demasiado en responder";
  if (message.startsWith("AI returned invalid JSON")) return "La IA devolvió un JSON no válido";
  return message;
}
