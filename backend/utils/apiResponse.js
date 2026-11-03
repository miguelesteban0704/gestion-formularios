import { localizedMessage } from "./messages.js";

export function sendSuccess(
  res,
  { statusCode = 200, message = "OK", data = null, meta } = {},
) {
  const language = res.req?.headers["accept-language"]?.startsWith("es") ? "es" : "en";
  return res.status(statusCode).json({
    success: true,
    message: localizedMessage(message, language),
    data,
    ...(meta ? { meta } : {}),
  });
}
