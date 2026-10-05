import React from 'react';

interface ApexLogoProps {
  size?: number;
  className?: string;
}

export const ApexLogo: React.FC<ApexLogoProps> = ({ size = 16, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M50 14 L92 86 L69 86 L50 45 L31 86 L8 86 Z"
        fill="currentColor"
      />
    </svg>
  );
};
