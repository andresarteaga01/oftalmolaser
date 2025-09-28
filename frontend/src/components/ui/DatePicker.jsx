import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Seleccionar fecha",
  maxDate = new Date(),
  minDate = new Date('1900-01-01'),
  required = false,
  error = null,
  label = null,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [inputValue, setInputValue] = useState('');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setInputValue(formatDateForDisplay(date));
      setCurrentMonth(date);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Días del mes anterior (grises)
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    // Días del mes actual
    const today = new Date();
    const selectedDate = value ? new Date(value) : null;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate && date.toDateString() === selectedDate.toDateString(),
        isDisabled: date > maxDate || date < minDate
      });
    }

    // Días del próximo mes (grises)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    return days;
  };

  const handleDateSelect = (date) => {
    if (date.isDisabled) return;
    
    const formattedDate = formatDateForInput(date.date);
    onChange(formattedDate);
    setInputValue(formatDateForDisplay(date.date));
    setIsOpen(false);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const selectYear = (year) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setFullYear(year);
      return newMonth;
    });
    setShowYearDropdown(false);
  };

  const selectMonth = (monthIndex) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(monthIndex);
      return newMonth;
    });
    setShowMonthDropdown(false);
  };

  const generateYearRange = () => {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    const years = [];
    
    for (let year = maxYear; year >= minYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  const navigateToToday = () => {
    const today = new Date();
    if (today >= minDate && today <= maxDate) {
      const formattedDate = formatDateForInput(today);
      onChange(formattedDate);
      setInputValue(formatDateForDisplay(today));
      setCurrentMonth(today);
      setIsOpen(false);
    }
  };

  const clearDate = () => {
    onChange('');
    setInputValue('');
    setIsOpen(false);
  };

  const closeDropdowns = () => {
    setShowYearDropdown(false);
    setShowMonthDropdown(false);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthNamesShort = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const years = generateYearRange();

  return (
    <div className="relative" ref={pickerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white cursor-pointer transition-colors ${
            error 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        
        <div className="absolute right-3 top-3 flex items-center space-x-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={clearDate}
              className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          )}
          <CalendarIcon className={`w-5 h-5 transition-colors ${
            disabled ? 'text-gray-400' : 'text-gray-500'
          }`} />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-full max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                navigateMonth(-1);
                closeDropdowns();
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex items-center space-x-2 relative">
              {/* Month Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthDropdown(!showMonthDropdown);
                    setShowYearDropdown(false);
                  }}
                  className="px-3 py-1 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {monthNames[currentMonth.getMonth()]}
                </button>
                
                {showMonthDropdown && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {monthNames.map((month, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectMonth(index)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          index === currentMonth.getMonth()
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearDropdown(!showYearDropdown);
                    setShowMonthDropdown(false);
                  }}
                  className="px-3 py-1 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {currentMonth.getFullYear()}
                </button>
                
                {showYearDropdown && (
                  <div className="absolute top-full right-0 z-10 mt-1 w-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {years.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => selectYear(year)}
                        className={`w-full text-center px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          year === currentMonth.getFullYear()
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                navigateMonth(1);
                closeDropdowns();
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 p-2 border-b border-gray-100 dark:border-gray-700">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div 
            className="grid grid-cols-7 gap-1 p-2"
            onClick={closeDropdowns}
          >
            {days.map((day, index) => {
              const isSelectable = day.isCurrentMonth && !day.isDisabled;
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelectable) {
                      handleDateSelect(day);
                      closeDropdowns();
                    }
                  }}
                  disabled={!isSelectable}
                  className={`
                    w-8 h-8 text-sm rounded-lg transition-colors
                    ${day.isSelected 
                      ? 'bg-blue-600 text-white' 
                      : day.isToday && day.isCurrentMonth
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        : day.isCurrentMonth
                          ? day.isDisabled
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'text-gray-400 dark:text-gray-600'
                    }
                  `}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div 
            className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700"
            onClick={closeDropdowns}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateToToday();
                closeDropdowns();
              }}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearDate();
                closeDropdowns();
              }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;