/**
 * 页面过渡动画 — D3
 * 淡入动画包装器 + hover 微交互 CSS
 */
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: Props) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
