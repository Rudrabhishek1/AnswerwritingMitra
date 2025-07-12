import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/60 dark:bg-gray-800/50 shadow-2xl shadow-slate-900/10 dark:shadow-black/20 ring-1 ring-gray-900/5 dark:ring-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-lg ${className}`}>
      {children}
    </div>
  );
};

export default Card;