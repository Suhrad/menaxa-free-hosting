import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'info' | 'purple' | 'cyan';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default',
  className = '' 
}: BadgeProps) {
  const variantStyles = {
    'default': 'bg-gray-700 text-gray-100',
    'danger': 'bg-rose-500/20 text-rose-500',
    'success': 'bg-emerald-500/20 text-emerald-500',
    'warning': 'bg-amber-500/20 text-amber-500',
    'info': 'bg-blue-500/20 text-blue-500',
    'purple': 'bg-purple-500/20 text-purple-500',
    'cyan': 'bg-cyan-500/20 text-cyan-500'
  }[variant];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles} ${className}`}>
      {children}
    </span>
  );
} 