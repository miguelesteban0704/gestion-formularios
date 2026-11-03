import { cva } from "class-variance-authority";

/* Variantes CVA del sistema de feedback. Las clases apuntan a las utilidades y
   hojas EXISTENTES (cr-btn/cr-tone de crystal.css, btn-danger de index.css)
   para no inventar CSS nuevo: el spec unifica, no recorta. */

export const dialogSize = cva("", {
  variants: {
    size: {
      sm: "max-w-[420px]",
      md: "max-w-[560px]",
      lg: "max-w-[680px]",
      xl: "max-w-[880px]",
    },
  },
  defaultVariants: { size: "md" },
});

export const alertTone = cva("", {
  variants: {
    tone: {
      success: "cr-tone-green-solid",
      error: "cr-tone-red-solid",
      warning: "cr-tone-amber-solid",
      info: "cr-tone-blue-solid",
      loading: "cr-tone-blue-solid",
    },
  },
  defaultVariants: { tone: "info" },
});

export const buttonVariant = cva("", {
  variants: {
    variant: {
      neutral: "cr-btn cr-btn-neutral",
      primary: "btn-primary",
      success: "cr-btn cr-btn-green",
      danger: "btn-danger cr-btn-danger-pulse",
      info: "cr-btn cr-btn-blue",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export type AlertTone = "success" | "error" | "warning" | "info" | "loading";
export type DialogSize = "sm" | "md" | "lg" | "xl";
export type FeedbackButtonVariant = "neutral" | "primary" | "success" | "danger" | "info";