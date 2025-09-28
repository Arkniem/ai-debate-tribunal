
import React from 'react';

interface IconProps {
  className?: string;
}

const StopIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M6 6h12v12H6z"/>
  </svg>
);

export default StopIcon;
