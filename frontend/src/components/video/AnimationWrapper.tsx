import { motion, AnimatePresence } from "framer-motion"
import type { ReactNode } from "react"

export interface AnimationConfig {
  entry: string
  highlight: string
  exit: string
}

const entryVariants: Record<string, object> = {
  "fade-in-up": { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
  "fade-in-down": { initial: { opacity: 0, y: -30 }, animate: { opacity: 1, y: 0 } },
  "zoom-in": { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } },
  "zoom-out": { initial: { opacity: 0, scale: 1.2 }, animate: { opacity: 1, scale: 1 } },
  "slide-from-left": { initial: { opacity: 0, x: -60 }, animate: { opacity: 1, x: 0 } },
  "slide-from-right": { initial: { opacity: 0, x: 60 }, animate: { opacity: 1, x: 0 } },
  pop: { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 } },
  typewriter: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  default: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
}

const exitVariants: Record<string, object> = {
  "fade-out-left": { exit: { opacity: 0, x: -60 } },
  "fade-out-right": { exit: { opacity: 0, x: 60 } },
  "zoom-out": { exit: { opacity: 0, scale: 0.8 } },
  "slide-to-right": { exit: { opacity: 0, x: 60 } },
  default: { exit: { opacity: 0, y: -20 } },
}

function getEntryVariant(name: string) {
  return entryVariants[name] || entryVariants.default
}

function getExitVariant(name: string) {
  return exitVariants[name] || exitVariants.default
}

export function AnimationWrapper({
  children,
  config,
  slideKey,
  className = "",
}: {
  children: ReactNode
  config: AnimationConfig
  slideKey: string | number
  className?: string
}) {
  const entry = getEntryVariant(config.entry)
  const exit = getExitVariant(config.exit)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slideKey}
        initial={entry.initial}
        animate={entry.animate}
        exit={exit.exit}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function StaggerItem({
  children,
  index = 0,
  className = "",
}: {
  children: ReactNode
  index?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PulseGlow({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <motion.div
      animate={
        active
          ? {
              boxShadow: [
                "0 0 0px rgba(173,255,68,0)",
                "0 0 20px rgba(173,255,68,0.4)",
                "0 0 0px rgba(173,255,68,0)",
              ],
            }
          : {}
      }
      transition={{ duration: 1.5, repeat: Infinity }}
      className="rounded-xl"
    >
      {children}
    </motion.div>
  )
}

export function DrawPath({
  children,
  duration = 1.5,
  delay = 0,
}: {
  children: ReactNode
  duration?: number
  delay?: number
}) {
  return (
    <motion.g
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration, delay, ease: "easeInOut" }}
    >
      {children}
    </motion.g>
  )
}
