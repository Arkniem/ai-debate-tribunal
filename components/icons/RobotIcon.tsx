
import React from 'react';

interface RobotIconProps {
  className?: string;
}

const RobotIcon: React.FC<RobotIconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12 2a2 2 0 0 0-2 2v2H8a2 2 0 0 0-2 2v1.17a3 3 0 0 1 0 5.66V18a2 2 0 0 0 2 2h2v2a2 2 0 0 0 4 0v-2h2a2 2 0 0 0 2-2v-5.17a3 3 0 0 1 0-5.66V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2zm-4 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm-4 4a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
  </svg>
);

export default RobotIcon;
