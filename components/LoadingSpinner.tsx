
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center my-4">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-coffee-primary border-t-transparent`}
      ></div>
      {text && <p className="mt-2 text-coffee-secondary">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
