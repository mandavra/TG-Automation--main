import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getplansasync } from "../services/action/plan.Action";
import { CheckCircle, XCircle, ArrowUpDown, Search, Loader2, Settings } from "lucide-react";

const ViewPlans = () => {
  const plans = useSelector((state) => state.planReducer.plans);
  const dispatch = useDispatch();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      await dispatch(getplansasync());
      setIsLoading(false);
    };
    fetchPlans();
  }, []);

  const sortedPlans = React.useMemo(() => {
    let sortableItems = [...plans];
    
    if (searchTerm) {
      sortableItems = sortableItems.filter(plan => 
        plan._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.duration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.mrp?.toString().includes(searchTerm)
      );
    }

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'createdAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    } else {
      
      sortableItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return sortableItems;
  }, [plans, sortConfig, searchTerm]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 inline ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? 
      <ArrowUpDown className="w-4 h-4 inline ml-1 text-blue-500" /> : 
      <ArrowUpDown className="w-4 h-4 inline ml-1 text-blue-500 transform rotate-180" />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Available Plans
        </h2>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/manage-plans"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manage Plans
          </Link>
          <div className="relative">
          <input
            type="text"
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <table className="min-w-[860px] w-full text-sm text-left whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 uppercase">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => requestSort('_id')}>
                  Order ID {getSortIcon('_id')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => requestSort('mrp')}>
                  MRP (₹) {getSortIcon('mrp')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => requestSort('type')}>
                  Type {getSortIcon('type')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => requestSort('duration')}>
                  Duration {getSortIcon('duration')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => requestSort('createdAt')}>
                  Created {getSortIcon('createdAt')}
                </th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => requestSort('highlight')}>
                  Highlight {getSortIcon('highlight')}
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              {sortedPlans.length > 0 ? (
                sortedPlans.map((plan, index) => (
                  <tr
                    key={`${plan.id}-${index}`}
                    className="border-b border-gray-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="py-3 px-4 font-medium">{index + 1}</td>
                    <td className="py-3 px-4 break-all">{plan._id || "N/A"}</td>
                    <td className="py-3 px-4">₹{plan.mrp}</td>
                    <td className="py-3 px-4 capitalize">{plan.type}</td>
                    <td className="py-3 px-4 capitalize">{plan.duration}</td>
                    <td className="py-3 px-4">{formatDate(plan.createdAt)}</td>
                    <td className="py-3 px-4">{formatTime(plan.createdAt)}</td>
                    <td className="py-3 px-4">
                      {plan.highlight ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle className="w-4 h-4" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                          <XCircle className="w-4 h-4" /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-400">
                    {searchTerm ? "No matching plans found" : "No plans available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ViewPlans;
