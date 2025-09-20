import React from 'react';
import Icon, { LogoIcon } from './Icon';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Icon icon={LogoIcon} className="w-8 h-8" />
      <span className="text-xl font-bold md:hidden md:group-hover:block">StefanGPT</span>
    </div>
  );
};

export default Logo;