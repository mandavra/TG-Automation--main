import { useEffect, useState, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getplansasync } from "../services/action/plan.Action";
import axios from "axios";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaMoon, FaSun, FaRegCalendarAlt } from "react-icons/fa";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";


const customStyles = `
  .react-datepicker-popper {
    top: 145px !important;
    left:43% !important;
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

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
    { label: 'This week', calculate: () => [startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })] },
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
        className="flex items-center text-gray-700 dark:text-gray-200 px-3 py-2 focus:outline-none"
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

const Dashboard = () => {
  const dispatch = useDispatch();
  const { plans } = useSelector((state) => state.planReducer);

  
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    dispatch(getplansasync());
  }, [dispatch]);

  
  const [todayUsersCount, setTodayUsersCount] = useState(0);
  useEffect(() => {
    
    axios.get('http://localhost:4000/api/kyc/today')
      .then(res => {
        console.log('Today users API response:', res.data);
        setTodayUsersCount(res.data.length);
      })
      .catch(err => {
        setTodayUsersCount(0);
        
      });
  }, []);

  const [netRevenue, setNetRevenue] = useState(0);
  useEffect(() => {
    axios.get('http://localhost:4000/api/payment/total-revenue')
      .then(res => {
        setNetRevenue(res.data.total || 0);
      })
      .catch(() => setNetRevenue(0));
  }, []);

  const [totalTransactions, setTotalTransactions] = useState(0);
  useEffect(() => {
    axios.get('http://localhost:4000/api/payment/total-transactions')
      .then(res => {
        setTotalTransactions(res.data.count || 0);
      })
      .catch(() => setTotalTransactions(0));
  }, []);


  const [activeUsers, setActiveUsers] = useState(0);
  useEffect(() => {
    axios.get('http://localhost:4000/api/payment/active-users')
      .then(res => {
        setActiveUsers(res.data.count || 0);
      })
      .catch(() => setActiveUsers(0));
  }, []);

  // Super admin withdrawal stats
  const [withdrawalStats, setWithdrawalStats] = useState({
    pendingWithdrawals: 0,
    totalWithdrawnAmount: 0,
    totalWithdrawalRequests: 0
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    setIsSuperAdmin(role === 'superadmin');
    
    if (role === 'superadmin') {
      axios.get('http://localhost:4000/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(res => {
          setWithdrawalStats({
            pendingWithdrawals: res.data.pendingWithdrawals || 0,
            totalWithdrawnAmount: res.data.totalWithdrawnAmount || 0,
            totalWithdrawalRequests: res.data.totalWithdrawalRequests || 0
          });
        })
        .catch(err => {
          console.error('Error fetching super admin stats:', err);
        });
    }
  }, []);

  
  const [recentTransactions, setRecentTransactions] = useState([]);
  useEffect(() => {
    axios.get('http://localhost:4000/api/payment/recent-successful?limit=5')
      .then(res => {
        setRecentTransactions(res.data.transactions || []);
      })
      .catch(() => setRecentTransactions([]));
  }, []);

 
  const barData = {
    labels: [now.toLocaleDateString()],
    datasets: [
      {
        label: 'New Audiences',
        data: [todayUsersCount],
        backgroundColor: ['#3ABEFF'],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="pl-50 transition-all duration-300">
    
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 md:px-12 py-8 ${isSuperAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
            <p className="text-md text-gray-500 dark:text-gray-300">Total Plans</p>
            <h2 className="text-4xl font-bold mt-2 text-gray-800 dark:text-white">{plans.length}</h2>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
            <p className="text-md text-gray-500 dark:text-gray-300">Net revenue</p>
            <h2 className="text-4xl font-bold mt-2 text-gray-800 dark:text-white">₹{netRevenue.toLocaleString()}</h2>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
            <p className="text-md text-gray-500 dark:text-gray-300">Total Transactions</p>
            <h2 className="text-4xl font-bold mt-2 text-gray-800 dark:text-white">{totalTransactions.toLocaleString()}</h2>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
            <p className="text-md text-gray-500 dark:text-gray-300">Active Users</p>
            <h2 className="text-4xl font-bold mt-2 text-gray-800 dark:text-white">{activeUsers.toLocaleString()}</h2>
          </div>
          
          {/* Super Admin Withdrawal Stats */}
          {isSuperAdmin && (
            <>
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700 p-6 text-white">
                <p className="text-sm text-yellow-100">Pending Withdrawals</p>
                <h2 className="text-3xl font-bold mt-2">{withdrawalStats.pendingWithdrawals}</h2>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700 p-6 text-white">
                <p className="text-sm text-green-100">Total Withdrawn</p>
                <h2 className="text-3xl font-bold mt-2">₹{withdrawalStats.totalWithdrawnAmount.toLocaleString()}</h2>
              </div>
            </>
          )}
        </div>

       
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 md:px-12 pb-12">
         
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-md font-semibold text-gray-800 dark:text-white">New Audiences</p>
                <span className="inline-block bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-300 text-xs px-2 py-0.5 rounded-full mr-2">0.10</span>
                <span className="text-xs text-gray-400 dark:text-gray-300">From Last Period</span>
              </div>
              <button className="border border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400 text-xs px-4 py-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/50">View Report</button>
            </div>
            <div className="h-64">
              <Bar data={barData} options={{
                plugins: { legend: { display: false } },
                scales: { 
                  y: { 
                    beginAtZero: true, 
                    grid: { color: theme === 'dark' ? '#374151' : '#eee' },
                    ticks: { color: theme === 'dark' ? '#9CA3AF' : '#666' }
                  }, 
                  x: { 
                    grid: { color: theme === 'dark' ? '#374151' : '#eee' },
                    ticks: { color: theme === 'dark' ? '#9CA3AF' : '#666' }
                  } 
                },
              }} />
              {todayUsersCount === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-300 mt-4 text-sm font-semibold">
                  No new users today
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Successful Transactions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left rounded-xl overflow-hidden">
                <thead className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  <tr>
                    <th className="py-2 px-2 bg-white dark:bg-gray-800">User</th>
                    <th className="py-2 px-2 bg-white dark:bg-gray-800">Amount</th>
                    <th className="py-2 px-2 bg-white dark:bg-gray-800">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {recentTransactions.length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-4 text-gray-400 dark:text-gray-500">No recent transactions</td></tr>
                  ) : (
                    recentTransactions.map((tx, idx) => (
                      <tr key={idx} className={
                        `border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-100/70 dark:hover:bg-gray-700/80`
                      }>
                        <td className="py-2 px-2 text-gray-800 dark:text-gray-200">{tx.userid || 'N/A'}</td>
                        <td className="py-2 px-2 font-semibold text-gray-800 dark:text-gray-200">₹{tx.amount}</td>
                        <td className="py-2 px-2 text-gray-800 dark:text-gray-200">{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
