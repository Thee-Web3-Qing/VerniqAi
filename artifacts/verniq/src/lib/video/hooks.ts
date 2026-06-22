import { useState, useEffect } from 'react';

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  
  useEffect(() => {
    const keys = Object.keys(durations);
    const duration = durations[keys[currentScene]];
    
    if (duration) {
      const timer = setTimeout(() => {
        setCurrentScene((prev) => (prev + 1) % keys.length);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [currentScene, durations]);
  
  return { currentScene };
}
