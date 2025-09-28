import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

const BackToHomeButton = ({ 
  className = "",
  variant = "primary", // "primary", "secondary", "ghost"
  size = "md", // "sm", "md", "lg"
  position = "inline", // "inline", "fixed-top", "fixed-bottom"
  text = "Ir al Dashboard"
}) => {
  const navigate = useNavigate();

  const getButtonStyles = () => {
    const baseStyles = "flex items-center gap-2 font-medium transition-all duration-200 rounded-lg focus:ring-2 focus:ring-offset-2";
    
    // Tamaños
    const sizeStyles = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };

    // Variantes
    const variantStyles = {
      primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md",
      secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
      ghost: "text-green-600 hover:bg-green-50 focus:ring-green-500 dark:text-green-400 dark:hover:bg-green-900/20"
    };

    // Posición
    const positionStyles = {
      inline: "",
      "fixed-top": "fixed top-4 right-4 z-40 shadow-lg",
      "fixed-bottom": "fixed bottom-4 right-4 z-40 shadow-lg"
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${positionStyles[position]} ${className}`;
  };

  const getIconSize = () => {
    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5", 
      lg: "w-6 h-6"
    };
    return iconSizes[size];
  };

  return (
    <button
      onClick={() => navigate('/')}
      className={getButtonStyles()}
      type="button"
    >
      <HomeIcon className={getIconSize()} />
      {text}
    </button>
  );
};

export default BackToHomeButton;