import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface CameraProps {
  camera?: string
  children: ReactNode
  className?: string
}

const cameraVariants: Record<string, object> = {
  "zoom-in-on-diagram": {
    initial: { scale: 1.15, x: 0, y: 0 },
    animate: { scale: 1, x: 0, y: 0 },
  },
  "zoom-in-on-leaf": {
    initial: { scale: 1.3, x: 0, y: 0 },
    animate: { scale: 1, x: 0, y: 0 },
  },
  "zoom-in": {
    initial: { scale: 1.2 },
    animate: { scale: 1 },
  },
  "zoom-out": {
    initial: { scale: 0.85 },
    animate: { scale: 1 },
  },
  "pan-to-text": {
    initial: { x: 40 },
    animate: { x: 0 },
  },
  "pan-left": {
    initial: { x: 40 },
    animate: { x: 0 },
  },
  "pan-right": {
    initial: { x: -40 },
    animate: { x: 0 },
  },
  "wide-shot": {
    initial: { scale: 1.1 },
    animate: { scale: 1 },
  },
  "close-up-on-keyword": {
    initial: { scale: 1.25, x: 0 },
    animate: { scale: 1, x: 0 },
  },
  default: {
    initial: { scale: 1 },
    animate: { scale: 1 },
  },
}

export function CameraController({
  camera,
  children,
  className = "",
}: CameraProps) {
  const cam = camera?.toLowerCase().trim() || "default"
  const variant = cameraVariants[cam] || cameraVariants.default

  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className={`w-full h-full ${className}`}
      style={{ transformOrigin: "center center" }}
    >
      {children}
    </motion.div>
  )
}
