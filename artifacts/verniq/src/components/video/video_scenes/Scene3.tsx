import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}>
      
      <div className="text-center relative z-10 max-w-[70vw]">
        <h2 className="text-[4vw] font-bold leading-tight uppercase">Generate Content</h2>
        <div className="flex gap-8 justify-center mt-12">
          {['TikTok', 'Twitter', 'LinkedIn', 'Newsletters'].map((platform, i) => (
            <motion.div key={platform} 
              className="px-6 py-3 border border-white/20 rounded bg-white/5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.2 }}>
              {platform}
            </motion.div>
          ))}
        </div>
        <p className="text-[1.5vw] text-[#7C3AED] mt-8 font-bold">All in your authentic voice.</p>
      </div>
    </motion.div>
  );
}
