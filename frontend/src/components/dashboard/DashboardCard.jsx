import React from 'react';

const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  trend, 
  trendValue, 
  onClick,
  className = '' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50 border-blue-200',
    green: 'bg-green-500 text-green-600 bg-green-50 border-green-200',
    red: 'bg-red-500 text-red-600 bg-red-50 border-red-200',
    yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50 border-purple-200',
    indigo: 'bg-indigo-500 text-indigo-600 bg-indigo-50 border-indigo-200'
  };

  const [bgColor, textColor, lightBg, borderColor] = colorClasses[color].split(' ');

  return (
    <div 
      className={`
        ${lightBg} ${borderColor} border rounded-xl p-6 
        hover:shadow-lg transition-all duration-300 cursor-pointer
        transform hover:-translate-y-1 backdrop-blur-sm
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${textColor} dark:text-white`}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? '↗' : '↘'} {trendValue}
              </span>
              <span className="text-xs text-gray-500 ml-1">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>
          <div className="text-white text-xl">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
