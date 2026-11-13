import React, { useState, useEffect, useRef } from 'react';

interface FunnyEyesProps {
  isDark: boolean;
}

const FunnyEyes: React.FC<FunnyEyesProps> = ({ isDark }) => {
  const [pupilStyles, setPupilStyles] = useState({
    left: {},
    right: {},
  });
  const [isBlinking, setIsBlinking] = useState(false);

  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);

  // Blinking effect
  useEffect(() => {
    let blinkTimeoutId: number;

    const scheduleBlink = () => {
      const blinkInterval = Math.random() * 4000 + 2000;
      blinkTimeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, blinkInterval);
    };

    scheduleBlink();

    return () => {
      clearTimeout(blinkTimeoutId);
    };
  }, []);

  // Mouse tracking for pupils
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;

      const calculatePupilStyle = (eyeRef: React.RefObject<SVGCircleElement>) => {
        if (!eyeRef.current) return {};
        
        const eyeRect = eyeRef.current.getBoundingClientRect();
        const eyeCenterX = eyeRect.left + eyeRect.width / 2;
        const eyeCenterY = eyeRect.top + eyeRect.height / 2;

        const deltaX = clientX - eyeCenterX;
        const deltaY = clientY - eyeCenterY;
        const angle = Math.atan2(deltaY, deltaX);

        const radius = eyeRect.width / 2 - 4;  // 4 is pupil radius

        const moveX = Math.cos(angle) * radius;
        const moveY = Math.sin(angle) * radius;

        return {
          transform: `translate(${moveX}px, ${moveY}px)`,
        };
      };

      if (!isBlinking) {
        setPupilStyles({
          left: calculatePupilStyle(leftEyeRef),
          right: calculatePupilStyle(rightEyeRef),
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isBlinking]);

  const eyeGroupStyle: React.CSSProperties = {
    transformOrigin: 'center',
    transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
    transition: 'transform 0.1s ease-in-out',
  };
  
  const eyeColor = isDark ? '#FFFFFF' : '#1f2937';
  const pupilColor = isDark ? '#07040f' : '#FFFFFF';

  return (
    <div className="fixed bottom-5 right-5 z-[999] pointer-events-none">
      <svg width="80" height="30" viewBox="0 0 80 30" className="transition-opacity duration-300">
        <g style={eyeGroupStyle}>
          {/* Left Eye */}
          <g transform="translate(25, 15)">
            <circle ref={leftEyeRef} cx="0" cy="0" r="12" fill={eyeColor} />
            <circle cx="0" cy="0" r="4" fill={pupilColor} style={pupilStyles.left} />
          </g>
          {/* Right Eye */}
          <g transform="translate(55, 15)">
            <circle ref={rightEyeRef} cx="0" cy="0" r="12" fill={eyeColor} />
            <circle cx="0" cy="0" r="4" fill={pupilColor} style={pupilStyles.right} />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default FunnyEyes;