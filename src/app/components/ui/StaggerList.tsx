import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface StaggerListProps {
  children: ReactNode
  className?: string
  /** Delay between each child animation in seconds */
  staggerDelay?: number
}

const containerVariants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: {
      staggerChildren: staggerDelay,
    },
  }),
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

/**
 * Container that staggers the entrance animation of its children.
 * Each direct child should be wrapped in a <motion.div variants={staggerItemVariants}>.
 */
export default function StaggerList({ children, className, staggerDelay = 0.08 }: StaggerListProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={staggerDelay}
    >
      {children}
    </motion.div>
  )
}
