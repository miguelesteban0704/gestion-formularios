import { motion, useReducedMotion } from "framer-motion";
import { Building2, FileText, Users } from "lucide-react";
import { useRoleT } from "../../lib/roleI18n.js";

const branches = [
  {
    icon: Users,
    title: "entityManagersLabel",
    detail: "entityManagersDetail",
    side: -1,
  },
  {
    icon: FileText,
    title: "entityFormsLabel",
    detail: "entityFormsDetail",
    side: 1,
  },
];

export function AuthEntityScene({ entityName, focused, submitting, reducedMotion }) {
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(reducedMotion || systemReducedMotion);
  const active = focused || submitting;
  const rt = useRoleT();
  const label = entityName?.trim() || rt("entityLabel");

  return (
    <div className="auth-entity-scene" aria-hidden="true">
      <div className="auth-entity-preview-scale">
        <div className="auth-entity-command-center" data-ui="entity-command-center">
          <motion.div
            className="auth-entity-core"
            initial={false}
            animate={{
              scale: !reduceMotion && submitting ? [1, 1.035, 1] : 1,
              opacity: active ? 1 : 0.9,
            }}
            transition={{ duration: reduceMotion ? 0.12 : 0.38, ease: "easeOut" }}
          >
            <span className="auth-entity-core-icon">
              <Building2 aria-hidden="true" />
            </span>
            <div className="auth-entity-core-copy">
              <span>{rt("entityLabel")}</span>
              <p title={label}>{label}</p>
            </div>
          </motion.div>

          <motion.div
            className="auth-entity-connectors"
            aria-hidden="true"
            initial={false}
            animate={{
              opacity: submitting ? 1 : focused ? 0.9 : reduceMotion ? 0.48 : [0.42, 0.54, 0.42],
            }}
            transition={{
              duration: reduceMotion ? 0.12 : active ? 0.28 : 4.8,
              repeat: !reduceMotion && !active ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <span className="auth-entity-stem" />
            <span className="auth-entity-crossbar" />
            <span className="auth-entity-leg auth-entity-leg--left" />
            <span className="auth-entity-leg auth-entity-leg--right" />
          </motion.div>

          <div className="auth-entity-branches">
            {branches.map(({ icon: Icon, title, detail, side }, index) => (
              <motion.div
                className="auth-entity-branch"
                key={title}
                initial={false}
                animate={{
                  x: reduceMotion || active ? 0 : side * 5,
                  opacity: active ? 1 : 0.78,
                }}
                transition={{
                  duration: reduceMotion ? 0.12 : 0.28,
                  delay: reduceMotion || !active ? 0 : index * 0.05,
                  ease: "easeOut",
                }}
              >
                <span className="auth-entity-branch-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div className="auth-entity-branch-copy">
                  <p>{rt(title)}</p>
                  <span>{rt(detail)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
