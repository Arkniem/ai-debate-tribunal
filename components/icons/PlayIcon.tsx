
import React from 'react';

interface IconProps {
  className?: string;
}

const PlayIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M8 5v14l11-7z"/>
  </svg>
);

export default PlayIcon;
