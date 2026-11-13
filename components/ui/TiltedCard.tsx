
import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "../../lib/utils";

interface TiltedCardProps {
  imageSrc?: string;
  altText?: string;
  captionText?: string;
  containerHeight?: string | number;
  containerWidth?: string | number;
  imageHeight?: string | number;
  imageWidth?: string | number;
  rotateAmplitude?: number;
  scaleOnHover?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  displayOverlayContent?: boolean;
  overlayContent?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function TiltedCard({
  imageSrc,
  altText = "Tilted card image",
  captionText = "",
  containerHeight = "300px",
  containerWidth = "100%",
  imageHeight = "300px",
  imageWidth = "300px",
  rotateAmplitude = 12,
  scaleOnHover = 1.1,
  showMobileWarning = true,
  showTooltip = true,
  displayOverlayContent = false,
  overlayContent = null,
  children,
  className,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 30, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 30, damping: 15 });

  const [hovered, setHovered] = useState(false);

  const rotateX = useTransform(
    mouseY,
    [-0.5, 0.5],
    [rotateAmplitude, -rotateAmplitude]
  );
  const rotateY = useTransform(
    mouseX,
    [-0.5, 0.5],
    [-rotateAmplitude, rotateAmplitude]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseXVal = (e.clientX - rect.left) / width - 0.5;
    const mouseYVal = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseXVal);
    y.set(mouseYVal);
  };

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <figure
      ref={ref}
      className={cn("relative w-full h-full [perspective:800px] cursor-pointer group", className)}
      style={{ height: containerHeight, width: containerWidth }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showMobileWarning && (
        <div className="absolute top-4 text-center text-sm block sm:hidden text-gray-500 z-50">
          This effect is not optimized for mobile. Check on desktop.
        </div>
      )}

      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        style={{
          rotateX,
          rotateY,
          scale: hovered ? scaleOnHover : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Card Background/Image Layer */}
        <div className="absolute inset-0 [transform-style:preserve-3d] rounded-[20px]">
            {children ? children : (
               imageSrc && <img
                    src={imageSrc}
                    alt={altText}
                    className="h-full w-full object-cover rounded-[20px]"
                />
            )}
        </div>

        {/* Overlay Content Layer */}
        {displayOverlayContent && overlayContent && (
          <motion.div 
            className="absolute inset-0 z-[2] [transform:translateZ(50px)]"
          >
            {overlayContent}
          </motion.div>
        )}
      </motion.div>

      {showTooltip && (
        <motion.figcaption
          className="pointer-events-none absolute left-0 top-0 rounded-[4px] bg-white px-[10px] py-[4px] text-[10px] font-bold text-[#2d2d2d] opacity-0 z-[3] hidden sm:block shadow-lg border border-gray-100"
          style={{
            x,
            y,
            rotateX,
            rotateY,
            scale: 1,
          }} 
           initial={{ opacity: 0, y: 0 }}
           animate={{
            opacity: hovered ? 1 : 0,
            y: hovered ? -15 : 0,
            x: hovered ? 10 : 0
           }}
           transition={{ duration: 0.2 }}
        >
            <span className="whitespace-nowrap">{captionText}</span>
        </motion.figcaption>
      )}
    </figure>
  );
}
