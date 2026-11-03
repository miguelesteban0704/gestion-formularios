import type { CSSProperties } from "react";
import { cn } from "../../lib/utils.js";

/* Esqueleto de diálogo: filas shimmer (clase `sa-skel` existente, con su
   guarda de reduced-motion) para montar dentro de un <Modal> en loading. */

export interface DialogSkeletonProps {
  rows?: number;
  className?: string;
}

const WIDTHS = [96, 100, 78, 88, 64];

export function DialogSkeleton({ rows = 3, className }: DialogSkeletonProps) {
  return (
    <div aria-busy="true" className={cn("space-y-3", className)} role="presentation">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="sa-skel h-4"
          style={{ width: `${WIDTHS[i % WIDTHS.length] ?? 100}%` } as CSSProperties}
        />
      ))}
      <div className="sa-skel h-9" style={{ width: "40%" } as CSSProperties} />
    </div>
  );
}