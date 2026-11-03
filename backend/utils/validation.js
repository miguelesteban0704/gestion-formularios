import { z } from "zod";

/** Política de contraseña: ≥ 8 caracteres, letras y al menos un número. */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Za-z]/, "La contraseña debe contener letras.")
  .regex(/[0-9]/, "La contraseña debe contener al menos un número.");

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

/** Código TOTP: 6 dígitos. */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "El código debe tener exactamente 6 dígitos.");