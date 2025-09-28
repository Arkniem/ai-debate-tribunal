import React from 'react';

interface IconProps {
  className?: string;
}

const ScalesIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M3 21h18v-2H3v2zM5.469 17h13.062L12 3 5.469 17zm2.062-2L12 6.602 16.469 15H7.531z"/>
  </svg>
);

export default ScalesIcon;
