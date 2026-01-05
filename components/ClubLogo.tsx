
import React from 'react';

interface ClubLogoProps {
  primaryColor: string;
  secondaryColor: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  clubName?: string;
}

const ClubLogo: React.FC<ClubLogoProps> = ({ primaryColor, secondaryColor, size = 'md', className = '', clubName }) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const getInitials = (name: string) => {
    if (!name) return "P";
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`${dimensions[size]} ${className} relative flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <defs>
          <linearGradient id={`grad-${primaryColor}-${secondaryColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>
        
        {/* Shield Background */}
        <path 
          d="M10 20 L50 10 L90 20 L90 60 C90 85 50 95 50 95 C50 95 10 85 10 60 Z" 
          fill={`url(#grad-${primaryColor}-${secondaryColor})`}
          stroke="white" 
          strokeWidth="3"
        />
        
        {/* Overlay Decoration */}
        <path 
          d="M10 45 L90 35 L90 45 L10 55 Z" 
          fill="white" 
          opacity="0.15"
        />

        {/* Initials or Icon */}
        <text 
          x="50" 
          y="56" 
          fontSize="32" 
          fontWeight="900" 
          fill="white" 
          textAnchor="middle" 
          className="uppercase tracking-tighter"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {getInitials(clubName || "")}
        </text>

        {/* Small Ball Icon */}
        <circle cx="72" cy="72" r="6" fill="white" />
        <circle cx="72" cy="72" r="4" fill={primaryColor} opacity="0.4" />
      </svg>
    </div>
  );
};

export default ClubLogo;
