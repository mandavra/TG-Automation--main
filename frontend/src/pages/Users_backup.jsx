import React, { useEffect, useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaRegCalendarAlt } from "react-icons/fa";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import axios from "axios";

const customStyles = `
  .react-datepicker-popper {
    top: 50px !important;
    left:-90% !important;
    z-index: 9999 !important;
  }

  .dark .react-datepicker {
    background-color: #1f2937;
    border-color: #374151;
    color: #e5e7eb;
  }

  .dark .react-datepicker__header {
    background-color: #111827;
    border-bottom-color: #374151;
  }

  .dark .react-datepicker__current-month {
    color: #e5e7eb;
  }

  .dark .react-datepicker__day-name {
    color: #9ca3af;
  }

  .dark .react-datepicker__day {
    color: #e5e7eb;
  }

  .dark .react-datepicker__day:hover {
    background-color: #374151;
  }

  .dark .react-datepicker__day--selected {
    background-color: #3b82f6 !important;
    color: white !important;
  }

  .dark .react-datepicker__day--keyboard-selected {
    background-color: #3b82f6 !important;
    color: white !important;
  }

  .dark .react-datepicker__day--in-range {
    background-color: #1d4ed8 !important;
    color: white !important;
  }

  .dark .react-datepicker__day--in-selecting-range {
    background-color: #1d4ed8 !important;
    color: white !important;
  }

  .dark .react-datepicker__day--disabled {
    color: #6b7280;
  }

  .dark .react-datepicker__navigation {
    color: #e5e7eb;
  }

  .dark .react-datepicker__navigation:hover {
    background-color: #374151;
  }

  .dark .react-datepicker__navigation-icon::before {
    border-color: #e5e7eb;
  }

  .dark .react-datepicker__month-select,
  .dark .react-datepicker__year-select {
    background-color: #1f2937;
    color: #e5e7eb;
    border-color: #374151;
  }

  .dark .react-datepicker__month-option:hover,
  .dark .react-datepicker__year-option:hover {
    background-color: #374151;
  }

  .dark .react-datepicker__month-option--selected,
  .dark .react-datepicker__year-option--selected {
    background-color: #3b82f6 !important;
  }
`;

const CustomDateRangePicker = () => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectedPreset, setSelectedPreset] = useState('Last 28 days');
  const [showCompare, setShowCompare] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
   
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);

   
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    
    if (!startDate && !endDate && selectedPreset === 'Last 28 days') {
      const end = new Date();
      const start = subDays(end, 27);
      setDateRange([start, end]);
    }
  }, [startDate, endDate, selectedPreset]);

  const datePresets = [
    { label: 'Last 7 days', calculate: () => [subDays(new Date(), 6), new Date()] },
    { label: 'Last 28 days', calculate: () => [subDays(new Date(), 27), new Date()] },
    { label: 'Last 90 days', calculate: () => [subDays(new Date(), 89), new Date()] },
    { label: 'This week', calculate: () => [startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })] }, // Monday as start of week
    { label: 'This month', calculate: () => [startOfMonth(new Date()), endOfMonth(new Date())] },
    { label: 'This year', calculate: () => [startOfYear(new Date()), endOfYear(new Date())] },
    { label: 'Last week', calculate: () => [startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 })] },
    { label: 'Last month', calculate: () => [startOfMonth(subDays(new Date(), 30)), endOfMonth(subDays(new Date(), 30))] },
    { label: 'Custom', calculate: () => [null, null] },
  ];

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset.label);
    if (preset.label !== 'Custom') {
      setDateRange(preset.calculate());
    } else {
      setDateRange([null, null]);
    }
  };

  const CustomDatePickerInput = forwardRef(({ onClick }, ref) => {
    let displayValue = selectedPreset;

    if (startDate && endDate) {
      const formattedStartDate = format(startDate, 'MMM d, yyyy');
      const formattedEndDate = format(endDate, 'MMM d, yyyy');
      displayValue = `${selectedPreset}: ${formattedStartDate} - ${formattedEndDate}`;
    } else {
      displayValue = "Select Date Range";
    }

    return (
      <button
        className="flex items-center text-gray-700 dark:text-gray-200 px-3 py-2 focus:outline-none border border-gray-300 rounded-lg"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
          onClick(e);
        }}
        ref={ref}
      >
        <FaRegCalendarAlt className="mr-2" />
        {displayValue}
        <span className="ml-2 text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </span>
      </button>
    );
  });

  
  const renderCustomHeader = ({
    monthDate,
    customHeaderCount,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }) => (
    <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-700">
      <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600">
        {'<'}
      </button>
      <div className="text-lg font-semibold text-gray-800 dark:text-white">
        {format(monthDate, 'MMM yyyy')}
      </div>
      <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600">
        {'>'}
      </button>
    </div>
  );

  const CustomCalendarContainer = ({ children }) => {
    return (
      <div className="flex flex-row bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        
        <div className="w-48 p-4 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          {datePresets.map((preset) => (
            <div
              key={preset.label}
              className={`flex items-center mb-2 cursor-pointer p-2 rounded-md ${
                selectedPreset === preset.label 
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => handlePresetClick(preset)}
            >
              <input
                type="radio"
                name="datePreset"
                value={preset.label}
                checked={selectedPreset === preset.label}
                onChange={() => handlePresetClick(preset)}
                className="mr-2 form-radio text-blue-600 dark:text-blue-400"
              />
              {preset.label}
            </div>
          ))}
        </div>
       
        <div className="flex flex-col flex-grow">
          <div className="flex flex-row">
            {children}
          </div>
          
          <div className="p-2 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            <div className="mb-2 flex items-center">
              <input
                type="checkbox"
                checked={showCompare}
                onChange={() => setShowCompare(!showCompare)}
                className="mr-1 form-checkbox text-blue-600 dark:text-blue-400"
              />
              <label className="text-gray-700 dark:text-gray-300 text-sm">Compare</label>
            </div>
            <div className="flex items-center space-x-1 mb-2">
              <div className="relative">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setDateRange([date, endDate])}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-20 text-xs dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  dateFormat="MMM d, yyyy"
                />
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">-</span>
              <div className="relative">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setDateRange([startDate, date])}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-20 text-xs dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  dateFormat="MMM d, yyyy"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Dates are shown in Pacific Time
            </div>
            <div className="flex justify-end space-x-1">
              <button 
                onClick={() => {
                  setDateRange([null, null]);
                  setSelectedPreset('Last 28 days');
                }} 
                className="px-3 py-1 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (startDate && endDate) {
                    setSelectedPreset('Custom');
                  }
                }} 
                className="px-3 py-1 bg-black dark:bg-gray-700 text-white dark:text-gray-200 rounded-md hover:bg-gray-900 dark:hover:bg-gray-600 text-sm"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DatePicker
        selectsRange={true}
        startDate={startDate}
        endDate={endDate}
        onChange={(update) => {
            setDateRange(update);
            if (update[0] !== null && update[1] !== null) {
                setSelectedPreset('Custom');
            }
        }}
        customInput={<CustomDatePickerInput />}
        calendarContainer={CustomCalendarContainer}
        renderCustomHeader={renderCustomHeader}
        showPopperArrow={false}
        monthsShown={2}
        popperPlacement="bottom"
        open={isOpen}
        onCalendarOpen={() => setIsOpen(true)}
        onCalendarClose={() => setIsOpen(false)}
        popperModifiers={[
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport"
            }
          },
          {
            name: "offset",
            options: {
              offset: [0, 8]
            }
          }
        ]}
        dayClassName={(date) => {
            if (startDate && endDate && date >= startDate && date <= endDate) {
                return "bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-xs";
            }
            if (startDate && date.toDateString() === startDate.toDateString()) {
                return "bg-black dark:bg-gray-700 text-white dark:text-gray-200 rounded-full text-xs";
            }
            if (endDate && date.toDateString() === endDate.toDateString()) {
                return "bg-black dark:bg-gray-700 text-white dark:text-gray-200 rounded-full text-xs";
            }
            return "text-xs dark:text-gray-300";
        }}
        className="react-datepicker-custom"
        dayLabelStyle={{
          width: "20px",
          height: "20px",
          lineHeight: "20px",
          fontSize: "0.75rem",
        }}
    />
  );
};

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
       
        const response = await axios.get('http://localhost:4000/api/kyc/all');
        setUsers(response.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    return (
      (user?.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user?.middleName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user?.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user?.phone || '').includes(searchTerm) ||
      (user?.selectedPlan?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user?.orderId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  });

  
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      
      setSelectedUsers(filteredUsers.filter(user => user.invoiceId).map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  console.log(filteredUsers);   
  
  const handleDownloadSelectedInvoices = async () => {
    
    const invoiceIds = selectedUsers
      .map(userId => {
        const user = users.find(u => u._id === userId);
        return user && user.invoiceId ? user.invoiceId : null;
      })
      .filter(Boolean);

    if (invoiceIds.length === 0) return;

    try {
      const response = await axios.post(
        'http://localhost:4000/api/invoices/download-zip',
        { invoiceIds },
        { responseType: 'blob' }
      );
    
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoices.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download invoices');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 dark:text-white"></h2>

     
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
        
        <div className="relative w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-300 absolute left-3 top-1/2 transform -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
       
        <div className="flex justify-end w-full sm:w-auto">
          <button
            onClick={handleDownloadSelectedInvoices}
            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedUsers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={selectedUsers.length === 0}
          >
            Download Selected Invoices
          </button>
        </div>
      </div>

     
      <div className="max-h-[380px] custom-scrollbar overflow-y-auto overflow-x-auto rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="min-w-[700px] w-full text-xs text-left rounded-xl overflow-hidden">
          <thead className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-100 sticky top-0 z-20 shadow-md rounded-t-xl">
            <tr>
              <th className="py-2 px-2 first:rounded-tl-xl last:rounded-tr-xl bg-white dark:bg-gray-900">{/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400 border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Name</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Email</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Phone</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Plan</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Order ID</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Amount</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Status</th>
              <th className="py-2 px-2 font-semibold bg-white dark:bg-gray-900">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => {
              const isEven = index % 2 === 0;
              return (
                <tr
                  key={user._id || index}
                  className={`transition-colors duration-150 border-b border-gray-100 dark:border-gray-800 ${
                    isEven
                      ? "bg-white dark:bg-gray-900"
                      : "bg-blue-50/60 dark:bg-gray-800/80"
                  } hover:bg-blue-100/70 dark:hover:bg-gray-700/80`}
                >
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400 border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="py-2 px-2 font-medium whitespace-nowrap dark:text-gray-100">{`${user.firstName} ${user.middleName || ''} ${user.lastName}`}</td>
                  <td className="py-2 px-2 whitespace-nowrap dark:text-gray-100">{user.email}</td>
                  <td className="py-2 px-2 whitespace-nowrap dark:text-gray-100">{user.phone}</td>
                  <td className="py-2 px-2 whitespace-nowrap dark:text-gray-100">{user.selectedPlan || 'N/A'}</td>
                  <td className="py-2 px-2 whitespace-nowrap dark:text-gray-100">{user.orderId || 'N/A'}</td>
                  <td className="py-2 px-2 whitespace-nowrap font-semibold dark:text-gray-100">₹{user.amount || '0'}</td>
                  <td className="py-2 px-2 whitespace-nowrap dark:text-gray-100">
                    {user.paymentStatus === "SUCCESS" ? (
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">Success</span>
                    ) : user.paymentStatus === "FAILED" ? (
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Failed</span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Pending</span>
                    )}
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap dark:text-gray-100">
                    <button
                      className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors duration-150 text-[11px] font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        user.paymentStatus === "SUCCESS" || selectedUsers.includes(user._id)
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (user.paymentStatus === "SUCCESS" || selectedUsers.includes(user._id)) {
                          window.open(`http://localhost:4000/api/invoices/download/${user.invoiceId}`, '_blank');
                        }
                      }}
                      disabled={!(user.paymentStatus === "SUCCESS" || selectedUsers.includes(user._id))}
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                      Download
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
