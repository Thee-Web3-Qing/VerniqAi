import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}>
      
      <div className="text-center relative z-10">
        <motion.h1 className="text-[8vw] font-black tracking-tighter uppercase text-white"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}>
          VERNIQ
        </motion.h1>
        <motion.p className="text-[2vw] text-[#7C3AED] mt-2 font-bold uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}>
          Your voice. Everywhere.
        </motion.p>
      </div>
    </motion.div>
  );
}
