import React from 'react';
import { cn } from '../../lib/utils';

interface AnimatedMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

const AnimatedMenuButton: React.FC<AnimatedMenuButtonProps> = ({ isOpen, onClick, className, buttonRef }) => {
  // Framer “HamburgerMenu” inspired path morph (but controlled by isOpen)
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-center relative z-[100] transition-colors duration-300 rounded-xl p-2 cursor-pointer text-white/80 hover:text-white",
        className
      )}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      type="button"
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-7 h-7",
          "transition-transform duration-[600ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "-rotate-45" : "rotate-0"
        )}
      >
        <path
          d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          strokeDasharray={isOpen ? "20 300" : "12 63"}
          strokeDashoffset={isOpen ? -32.42 : 0}
          style={{
            transition:
              "stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <path
          d="M7 16 27 16"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
      </svg>
    </button>
  );
};

export default AnimatedMenuButton;
