import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export function HamburgerMenuIcon({ isOpen }) {
  const variant = isOpen ? "open" : "closed";
  const common = { fill: "transparent", strokeWidth: 1.8, stroke: "currentColor" };

  const top = {
    closed: {
      rotate: 0,
      translateY: 0,
    },
    open: {
      rotate: 45,
      translateY: 7,
    },
  };
  const center = {
    closed: {
      opacity: 1,
    },
    open: {
      opacity: 0,
    },
  };
  const bottom = {
    closed: {
      rotate: 0,
      translateY: 0,
    },
    open: {
      rotate: -45,
      translateY: -7,
    },
  };

  return (
    <motion.svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="transparent"
      className="h-5 w-5"
    >
      <motion.line x1="3" y1="12" x2="21" y2="12" variants={center} animate={variant} transition={{ duration: 0.2 }} {...common} />
      <motion.line x1="3" y1="5" x2="21" y2="5" variants={top} animate={variant} transition={{ duration: 0.2 }} {...common} />
      <motion.line x1="3" y1="19" x2="21" y2="19" variants={bottom} animate={variant} transition={{ duration: 0.2 }} {...common} />
    </motion.svg>
  );
}