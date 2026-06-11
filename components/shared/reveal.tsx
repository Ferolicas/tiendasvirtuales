"use client";

import { motion, useReducedMotion } from "motion/react";

// Entrada estándar de Vendi: fade-up con física de spring, una sola vez,
// al entrar en viewport. La prop delay permite stagger entre hermanos.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 26,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
