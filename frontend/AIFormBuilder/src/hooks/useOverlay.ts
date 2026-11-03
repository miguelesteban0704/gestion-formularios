/* Re-export de las primitivas de overlay para la ruta histórica
   (src/hooks/useOverlay.js → .ts). La implementación tipada vive en
   src/feedback/overlay.ts; aquí no hay lógica. */
export {
  useFocusTrap,
  useBodyScrollLock,
  useEscapeKey,
  useScrollLock,
} from "../feedback/overlay";