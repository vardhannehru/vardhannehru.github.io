import React from 'react';
import { motion } from 'framer-motion';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

/**
 * Simple scroll-reveal wrapper (fade + slide up) using Framer Motion.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  once = true,
}: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.7, delay, type: 'spring', stiffness: 70, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
