import React from 'react';

interface IconProps {
  className?: string;
}

export const PodiumIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M5 2h14v2H5zm0 18v-8H2l10-10 10 10h-3v8H5zm2-2h10v-5.586L12 7.414 7 12.414V18z"/>
  </svg>
);