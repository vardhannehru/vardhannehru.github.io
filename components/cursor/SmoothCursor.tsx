import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, SpringOptions } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SmoothCursorProps {
  isDark: boolean;
  className?: string;
}

const SmoothCursor: React.FC<SmoothCursorProps> = ({ isDark, className }) => {
  const cursorSize = 8;
  const followerSize = 32;

  const mouse = {
    x: useMotionValue(0),
    y: useMotionValue(0)
  };

  const springConfig: SpringOptions = { damping: 20, stiffness: 300, mass: 0.5 };
  
  const smoothMouse = {
    x: useSpring(mouse.x, springConfig),
    y: useSpring(mouse.y, springConfig)
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      mouse.x.set(clientX);
      mouse.y.set(clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouse.x, mouse.y]);


  const cursorFollowerStyle: React.CSSProperties = {
    width: `${followerSize}px`,
    height: `${followerSize}px`,
  };

  const cursorDotStyle: React.CSSProperties = {
    width: `${cursorSize}px`,
    height: `${cursorSize}px`,
  };

  return (
    <div className={cn("smooth-cursor hidden md:block pointer-events-none fixed inset-0 z-[9999]", className)}>
        <motion.div
            style={{
                ...cursorFollowerStyle,
                translateX: smoothMouse.x,
                translateY: smoothMouse.y,
            }}
            className={cn(
                'absolute rounded-full -translate-x-1/2 -translate-y-1/2 transition-colors duration-300',
                isDark ? 'bg-[#b69df8]/20' : 'bg-[#743BBE]/20'
            )}
        />
        <motion.div
            style={{
                ...cursorDotStyle,
                translateX: mouse.x,
                translateY: mouse.y,
            }}
            className={cn(
                'absolute rounded-full -translate-x-1/2 -translate-y-1/2',
                isDark ? 'bg-[#b69df8]' : 'bg-[#743BBE]'
            )}
        />
    </div>
  );
};

export default SmoothCursor;