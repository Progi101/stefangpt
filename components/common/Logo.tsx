import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        className="w-9 h-9"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19.34 7.66a2 2 0 0 0-1.07-1.07l-4.5-2a2 2 0 0 0-1.54 0l-4.5 2a2 2 0 0 0-1.07 1.07L4.66 12l2 4.5a2 2 0 0 0 1.07 1.07l4.5 2c.5.22 1.04.22 1.54 0l4.5-2a2 2 0 0 0 1.07-1.07l2-4.5-2-4.34zM9 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
      </svg>
      <span className="text-3xl font-bold text-gray-200">StefanGPT</span>
    </div>
  );
};

export default Logo;