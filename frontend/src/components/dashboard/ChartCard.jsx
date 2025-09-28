import React from 'react';

const ChartCard = ({ 
  title, 
  children, 
  className = '',
  headerAction = null,
  loading = false 
}) => {
  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 
      dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-300
      ${className}
    `}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {headerAction && (
          <div className="flex items-center space-x-2">
            {headerAction}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="h-64">
          {children}
        </div>
      )}
    </div>
  );
};

export default ChartCard;
