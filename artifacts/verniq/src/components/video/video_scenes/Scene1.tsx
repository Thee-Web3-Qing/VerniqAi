import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}>
      
      <div className="text-center relative z-10 flex flex-col items-center">
        <motion.h1 className="text-[6vw] font-bold tracking-tighter uppercase text-white"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}>
          Your Voice
        </motion.h1>
        
        <motion.h2 className="text-[3vw] text-[#7C3AED] mt-4 font-bold uppercase"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}>
          Is your biggest asset
        </motion.h2>
        
        <motion.p className="text-[1.5vw] text-white/60 mt-8"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}>
          Verniq captures it.
        </motion.p>
      </div>
    </motion.div>
  );
}
