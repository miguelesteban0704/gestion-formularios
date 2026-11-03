import { useCallback } from "react";
import { useConfirm } from "./useConfirm";
import type { DeleteOptions } from "../feedback/types";

/* Borrado con confirmación escrita — wrapper destructivo de useConfirm.
   `requireWord`/`wordHint`/`caseSensitive` los consume DeleteDialog (T8);
   aquí solo se fuerza el registro peligroso. */

export function useDeleteConfirm() {
  const { confirm, busy } = useConfirm();
  const confirmDelete = useCallback(
    (opts: DeleteOptions) =>
      confirm({
        danger: true,
        confirmText: opts.confirmText ?? "Eliminar",
        cancelText: opts.cancelText ?? "Cancelar",
        ...opts,
      }),
    [confirm]
  );
  return { confirmDelete, busy };
}