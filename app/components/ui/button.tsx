import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export const Button = ({ 
  className = '', 
  variant = 'default', 
  size = 'default',
  ...props 
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium';
  const variantStyles = variant === 'default' 
    ? 'bg-blue-600 text-white hover:bg-blue-700' 
    : 'border border-gray-300 bg-transparent hover:bg-gray-100';
  
  const sizeStyles = {
    'default': 'px-4 py-2',
    'sm': 'px-3 py-1 text-xs',
    'lg': 'px-6 py-3 text-base'
  }[size];
  
  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    />
  );
}; 