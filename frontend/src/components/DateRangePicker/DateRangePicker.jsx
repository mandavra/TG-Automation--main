import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const DateRangePicker = ({ 
  value = { startDate: null, endDate: null, preset: 'Last 30 Days' },
  onChange,
  placeholder = "Select date range",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(value.startDate);
  const [tempEndDate, setTempEndDate] = useState(value.endDate);
  const [selectedPreset, setSelectedPreset] = useState(value.preset || 'Last 30 Days');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownRef = useRef(null);

  const presetRanges = [
    { label: 'Custom', value: 'custom' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'Last 60 Days', value: 'last60days' },
    { label: 'Last 90 Days', value: 'last90days' },
    { label: 'Lifetime', value: 'lifetime' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate date ranges for presets
  const getPresetRange = (preset) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0); // Start of today

    switch (preset) {
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 6);
        last7Days.setHours(0, 0, 0, 0);
        return { startDate: last7Days, endDate: today };
      
      case 'last30days':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 29);
        last30Days.setHours(0, 0, 0, 0);
        return { startDate: last30Days, endDate: today };
      
      case 'last60days':
        const last60Days = new Date(today);
        last60Days.setDate(today.getDate() - 59);
        last60Days.setHours(0, 0, 0, 0);
        return { startDate: last60Days, endDate: today };
      
      case 'last90days':
        const last90Days = new Date(today);
        last90Days.setDate(today.getDate() - 89);
        last90Days.setHours(0, 0, 0, 0);
        return { startDate: last90Days, endDate: today };
      
      case 'lifetime':
        // Return a very early date for lifetime
        const lifetime = new Date('2020-01-01');
        return { startDate: lifetime, endDate: today };
      
      default:
        return { startDate: null, endDate: null };
    }
  };

  // Handle preset selection
  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    
    if (preset === 'custom') {
      setIsCustomMode(true);
      return;
    }
    
    setIsCustomMode(false);
    const range = getPresetRange(preset);
    setTempStartDate(range.startDate);
    setTempEndDate(range.endDate);
    
    if (onChange) {
      onChange({
        startDate: range.startDate,
        endDate: range.endDate,
        preset
      });
    }
    
    setIsOpen(false);
  };

  // Calendar generation functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateInRange = (date) => {
    if (!tempStartDate || !tempEndDate || !date) return false;
    return date >= tempStartDate && date <= tempEndDate;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return (tempStartDate && isSameDay(date, tempStartDate)) || 
           (tempEndDate && isSameDay(date, tempEndDate));
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const handleDateClick = (date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(date);
      setTempEndDate(null);
    } else {
      // Set end date
      if (date >= tempStartDate) {
        setTempEndDate(date);
      } else {
        setTempStartDate(date);
        setTempEndDate(tempStartDate);
      }
    }
  };

  const handleApply = () => {
    if (onChange && tempStartDate && tempEndDate) {
      onChange({
        startDate: tempStartDate,
        endDate: tempEndDate,
        preset: 'custom'
      });
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(value.startDate);
    setTempEndDate(value.endDate);
    setSelectedPreset(value.preset || 'Last 30 Days');
    setIsCustomMode(false);
    setIsOpen(false);
  };

  // Format display value
  const getDisplayValue = () => {
    if (value.preset && value.preset !== 'custom') {
      const preset = presetRanges.find(p => p.value === value.preset);
      return preset ? preset.label : 'Select date range';
    }
    
    if (value.startDate && value.endDate) {
      const start = value.startDate.toLocaleDateString();
      const end = value.endDate.toLocaleDateString();
      return `${start} - ${end}`;
    }
    
    return placeholder;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm border rounded-lg
          bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
          hover:border-gray-400 dark:hover:border-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${disabled ? 'bg-gray-50 dark:bg-gray-600' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300 truncate">
            {getDisplayValue()}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[320px]">
          <div className="flex">
            {/* Preset Options */}
            <div className="w-40 border-r border-gray-200 dark:border-gray-700 p-2">
              {presetRanges.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`
                    w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700
                    ${selectedPreset === preset.value 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            {isCustomMode && (
              <div className="p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="font-medium text-gray-900 dark:text-white">
                    {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 p-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((date, index) => (
                    <button
                      key={index}
                      onClick={() => date && handleDateClick(date)}
                      disabled={!date}
                      className={`
                        p-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700
                        ${!date ? 'invisible' : ''}
                        ${isDateSelected(date) 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : isDateInRange(date)
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {date?.getDate()}
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!tempStartDate || !tempEndDate}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
