import { motion, useReducedMotion } from "framer-motion";

const fieldBlocks = [
  { y: 38, x: -18, rotate: -7, kind: "text" },
  { y: 98, x: 16, rotate: 5, kind: "select" },
  { y: 158, x: -12, rotate: 8, kind: "rating" },
];

export function AuthCreatorScene({ focused, submitting, reducedMotion }) {
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = reducedMotion || systemReducedMotion;
  const composing = focused || submitting;

  return (
    <div className="auth-creator-scene" aria-hidden="true">
      <svg viewBox="0 0 360 250" focusable="false" aria-hidden="true">
        <g className="auth-creator-blocks">
          {fieldBlocks.map((block, index) => {
            const lastBlock = index === fieldBlocks.length - 1;
            return (
              <g key={block.kind} transform={`translate(44 ${block.y})`}>
                <motion.g
                  initial={false}
                  animate={{
                    x: reduceMotion || composing ? 0 : block.x,
                    rotate: reduceMotion || composing ? 0 : block.rotate,
                    scale: submitting && lastBlock && !reduceMotion ? [1, 0.96, 1.03, 1] : 1,
                    opacity: composing ? 1 : 0.76,
                  }}
                  transition={{
                    duration: reduceMotion ? 0.12 : submitting ? 0.34 : 0.28,
                    delay: reduceMotion ? 0 : composing ? index * 0.06 : 0,
                    ease: "easeOut",
                  }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <rect
                    x="44"
                    y="0"
                    width="132"
                    height="42"
                    rx="7"
                    fill="var(--auth-role-accent)"
                    fillOpacity="0.13"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  {block.kind === "text" && (
                    <g stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
                      <path d="M58 14h33M58 23h21" />
                    </g>
                  )}
                  {block.kind === "select" && (
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                      <rect x="58" y="12" width="36" height="18" rx="3" />
                      <path d="m87 19 3 3 3-3" />
                    </g>
                  )}
                  {block.kind === "rating" && (
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35">
                      <path d="m64 12 2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" />
                      <path d="M81 16h31M81 23h22" />
                    </g>
                  )}
                  <path d="M126 15h34M126 23h24" stroke="currentColor" strokeOpacity="0.34" strokeLinecap="round" strokeWidth="1.3" />
                </motion.g>
              </g>
            );
          })}
        </g>

        <motion.g
          className="auth-creator-spark"
          transform="translate(270 42)"
          initial={false}
          animate={{
            scale: reduceMotion ? 1 : submitting ? 1.24 : focused ? 1.12 : 1,
            rotate: reduceMotion ? 0 : submitting ? 45 : [0, 8, -8, 0],
            opacity: composing ? 1 : 0.72,
          }}
          transition={{
            duration: reduceMotion ? 0.12 : submitting ? 0.28 : 4,
            repeat: !reduceMotion && !submitting ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <path
            d="M0-15 3-3 15 0 3 3 0 15-3 3-15 0-3-3z"
            fill="var(--auth-role-accent)"
          />
          <circle r="2.5" fill="var(--color-surface)" />
        </motion.g>

        <g className="auth-creator-chart" fill="var(--auth-role-accent)">
          {[10, 17, 25, 34].map((height, index) => (
            <motion.rect
              key={height}
              x={236 + index * 13}
              y={reduceMotion || composing ? 206 - height : 206}
              width="8"
              height={reduceMotion || composing ? height : 0}
              rx="2"
              initial={false}
              animate={{ opacity: composing ? 0.82 : 0.28 }}
              transition={{
                duration: reduceMotion ? 0.12 : submitting ? 0.32 : 0.36,
                delay: reduceMotion ? 0 : index * 0.045,
                ease: "easeOut",
              }}
            />
          ))}
          <path d="M232 208h60" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
