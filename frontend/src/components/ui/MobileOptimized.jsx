import React, { useState, useEffect } from 'react';
import { 
  Bars3Icon, 
  XMarkIcon, 
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Hook para detectar dispositivo móvil
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

// Componente de navegación móvil
export const MobileNavigation = ({ 
  isOpen, 
  onClose, 
  navigation = [],
  currentPath = '',
  userInfo = null
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Side navigation */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 z-50 md:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* User info */}
        {userInfo && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {userInfo.first_name?.[0] || userInfo.email?.[0] || 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {userInfo.first_name} {userInfo.last_name}
                </p>
                <p className="text-xs text-gray-500">{userInfo.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigation.map((item, index) => (
            <a
              key={index}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center px-4 py-3 text-sm font-medium transition-colors
                ${currentPath === item.href
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              {item.icon && <item.icon className="w-5 h-5 mr-3" />}
              {item.name}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
};

// Header móvil con navegación
export const MobileHeader = ({ 
  title, 
  onMenuClick, 
  onBack,
  showBack = false,
  actions = [],
  className = ''
}) => {
  return (
    <header className={`bg-white border-b border-gray-200 md:hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          )}
          
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        </div>

        {actions.length > 0 && (
          <div className="flex items-center space-x-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`p-2 rounded-md transition-colors ${
                  action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={action.title}
              >
                {action.icon && <action.icon className="w-5 h-5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

// Componente de tarjeta optimizada para móvil
export const MobileCard = ({ 
  children, 
  onClick, 
  className = '',
  isSelected = false,
  showCheckbox = false,
  onSelect
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200
        ${onClick ? 'cursor-pointer active:scale-95 active:bg-gray-50' : ''}
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'}
        ${className}
      `}
    >
      {showCheckbox && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className={`
              w-6 h-6 border-2 rounded flex items-center justify-center transition-colors
              ${isSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 bg-white'
              }
            `}
          >
            {isSelected && <div className="w-3 h-3 bg-white rounded-sm" />}
          </button>
        </div>
      )}
      {children}
    </div>
  );
};

// Lista optimizada para móvil con pull-to-refresh
export const MobileList = ({ 
  items = [], 
  renderItem, 
  onRefresh,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className = '',
  emptyMessage = 'No hay elementos para mostrar'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!touchStart || window.scrollY > 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = Math.max(0, (touchY - touchStart) * 0.5);
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setTouchStart(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (
        hasMore &&
        !isLoading &&
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000
      ) {
        onLoadMore?.();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, onLoadMore]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <EyeIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 border-b border-blue-200 transition-all duration-200"
          style={{ 
            height: isRefreshing ? '60px' : `${pullDistance}px`,
            opacity: pullDistance > 20 ? 1 : pullDistance / 20
          }}
        >
          <div className={`transition-transform ${isRefreshing ? 'animate-spin' : ''}`}>
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
          <span className="ml-2 text-sm text-blue-600">
            {isRefreshing ? 'Actualizando...' : pullDistance > 60 ? 'Suelta para actualizar' : 'Desliza para actualizar'}
          </span>
        </div>
      )}

      {/* List items */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id || index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-gray-600">Cargando más...</span>
        </div>
      )}
    </div>
  );
};

// Barra de búsqueda móvil
export const MobileSearchBar = ({ 
  value, 
  onChange, 
  onSearch, 
  placeholder = 'Buscar...', 
  showFilters = false,
  onFiltersClick,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-white border-b border-gray-200 md:hidden ${className}`}>
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => setIsExpanded(false)}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          
          {showFilters && (
            <button
              onClick={onFiltersClick}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={onSearch}
            className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
        )}
      </div>
    </div>
  );
};

// Componente de pestañas móviles
export const MobileTabs = ({ 
  tabs = [], 
  activeTab, 
  onChange, 
  className = '' 
}) => {
  return (
    <div className={`bg-white border-b border-gray-200 md:hidden ${className}`}>
      <div className="flex overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => onChange(tab.id)}
            className={`
              flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default {
  useIsMobile,
  MobileNavigation,
  MobileHeader,
  MobileCard,
  MobileList,
  MobileSearchBar,
  MobileTabs
};