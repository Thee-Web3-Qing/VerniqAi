import { motion } from 'framer-motion';

export function Scene2() {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}>
      
      <div className="text-center relative z-10 max-w-[60vw]">
        <motion.div className="w-24 h-24 rounded border-2 border-[#7C3AED] mx-auto mb-8 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
          <span className="text-[#7C3AED] font-bold">DNA</span>
        </motion.div>
        <h2 className="text-[4vw] font-bold leading-tight uppercase">Build your<br/>Voice DNA</h2>
        <p className="text-[1.5vw] text-white/60 mt-4">A living model of exactly how you write, think, and communicate.</p>
      </div>
    </motion.div>
  );
}
