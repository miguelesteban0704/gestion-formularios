export function FuturisticTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl dark:border-slate-700 dark:bg-slate-950/95 text-slate-100 min-w-[150px] animate-in fade-in zoom-in-95 duration-150">
      {label && (
        <p className="text-[10px] font-bold tracking-widest text-brand-400 uppercase mb-2 border-b border-slate-800 pb-1">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span 
                className="h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]" 
                style={{ backgroundColor: item.color || item.stroke || "#2dd4bf" }} 
              />
              {item.name || "Valor"}
            </span>
            <span className="text-xs font-extrabold text-white tracking-tight font-mono">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}