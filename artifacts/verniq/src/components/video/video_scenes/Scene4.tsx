import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}>
      
      <div className="text-center relative z-10 max-w-[70vw]">
        <h2 className="text-[4vw] font-bold leading-tight uppercase text-[#F59E0B]">Sell access</h2>
        <p className="text-[2vw] mt-4">Let other creators write like you.</p>
        <p className="text-[1.5vw] text-white/60 mt-4">Get paid in crypto, directly to your wallet.</p>
        <p className="text-[1.2vw] text-white/40 mt-8 uppercase tracking-widest">Store your DNA on the 0G Blockchain</p>
      </div>
    </motion.div>
  );
}
