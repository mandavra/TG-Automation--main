import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  User,
  Building2,
  Activity,
  Clock,
  Search
} from 'lucide-react';

const AdminSelector = ({ admins = [], selectedAdmin, onAdminChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected admin details
  const selectedAdminData = admins.find(admin => admin.id === selectedAdmin);

  const formatLastActive = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Now';
  };

  const handleAdminSelect = (adminId) => {
    onAdminChange(adminId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-80"
      >
        {selectedAdmin === 'all' ? (
          <>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                All Admins
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                System-wide view
              </div>
            </div>
          </>
        ) : selectedAdminData ? (
          <>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {selectedAdminData.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedAdminData.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {selectedAdminData.email}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                selectedAdminData.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {formatLastActive(selectedAdminData.lastActive)}
              </span>
            </div>
          </>
        ) : null}
        
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
          </div>

          {/* Admin List */}
          <div className="max-h-80 overflow-y-auto">
            {/* All Admins Option */}
            <button
              onClick={() => handleAdminSelect('all')}
              className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selectedAdmin === 'all' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  All Admins
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  System-wide dashboard view
                </div>
              </div>
              {selectedAdmin === 'all' && (
                <Check size={16} className="text-blue-600 dark:text-blue-400" />
              )}
            </button>

            {/* Individual Admins */}
            {filteredAdmins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => handleAdminSelect(admin.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedAdmin === admin.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {admin.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {admin.name}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      admin.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {admin.email}
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <User size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {admin.stats.totalUsers.toLocaleString()} users
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Activity size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {admin.stats.successRate}% success
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {formatLastActive(admin.lastActive)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedAdmin === admin.id && (
                  <Check size={16} className="text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}

            {/* No Results */}
            {filteredAdmins.length === 0 && searchTerm && (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <User size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No admins found matching "{searchTerm}"</p>
              </div>
            )}
          </div>

          {/* Footer with Quick Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Total Admins: {admins.length}</span>
              <span>
                Active: {admins.filter(admin => admin.status === 'active').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSelector;