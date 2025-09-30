import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Package, 
  ToggleLeft, 
  ToggleRight, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const ChannelBundleFeatureManager = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [selectedBundles, setSelectedBundles] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);
  
  useEffect(() => {
    fetchBundles();
  }, []);
  
  const fetchBundles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/channel-bundles/feature-status');
      setBundles(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bundles:', error);
      toast.error('Failed to fetch channel bundles');
    } finally {
      setLoading(false);
    }
  };
  
  const updateFeatureToggle = async (bundleId, toggleType, value) => {
    try {
      setUpdating(prev => ({ ...prev, [`${bundleId}_${toggleType}`]: true }));
      
      const response = await api.patch(`/super-admin/channel-bundles/${bundleId}/feature-toggles`, {
        featureToggles: {
          [toggleType]: value
        }
      });
      
      if (response.data.success) {
        // Update local state
        setBundles(prev => prev.map(bundle => 
          bundle.id === bundleId 
            ? { 
                ...bundle, 
                featureToggles: {
                  ...bundle.featureToggles,
                  [toggleType]: value
                }
              }
            : bundle
        ));
        toast.success(`${toggleType === 'enableKYC' ? 'KYC' : 'E-Sign'} ${value ? 'enabled' : 'disabled'} successfully`);
      }
    } catch (error) {
      console.error('Error updating feature toggle:', error);
      toast.error(error.response?.data?.message || 'Failed to update feature toggle');
    } finally {
      setUpdating(prev => ({ ...prev, [`${bundleId}_${toggleType}`]: false }));
    }
  };
  
  const handleBulkAction = async (action, value) => {
    if (selectedBundles.length === 0) {
      toast.warning('Please select at least one channel bundle');
      return;
    }
    
    try {
      setBulkAction({ action, value });
      
      const featureToggles = {};
      if (action === 'enableKYC') {
        featureToggles.enableKYC = value;
      } else if (action === 'enableESign') {
        featureToggles.enableESign = value;
      } else if (action === 'both') {
        featureToggles.enableKYC = value;
        featureToggles.enableESign = value;
      }
      
      const response = await api.patch('/super-admin/channel-bundles/bulk-feature-toggles', {
        bundleIds: selectedBundles,
        featureToggles
      });
      
      if (response.data.success) {
        toast.success(`Updated ${response.data.data.updated} bundles successfully`);
        await fetchBundles(); // Refresh data
        setSelectedBundles([]);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(error.response?.data?.message || 'Failed to perform bulk action');
    } finally {
      setBulkAction(null);
    }
  };
  
  const toggleBundleSelection = (bundleId) => {
    setSelectedBundles(prev => 
      prev.includes(bundleId)
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId]
    );
  };
  
  const selectAllBundles = () => {
    if (selectedBundles.length === bundles.length) {
      setSelectedBundles([]);
    } else {
      setSelectedBundles(bundles.map(bundle => bundle.id));
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Channel Bundle Feature Manager
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage KYC and E-Sign requirements for all channel bundles
              </p>
            </div>
          </div>
          <button
            onClick={fetchBundles}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Bulk Actions */}
        {selectedBundles.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedBundles.length} bundle{selectedBundles.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('enableKYC', true)}
                  disabled={bulkAction?.action === 'enableKYC'}
                  className="px-3 py-1 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  Enable KYC
                </button>
                <button
                  onClick={() => handleBulkAction('enableKYC', false)}
                  disabled={bulkAction?.action === 'enableKYC'}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  Disable KYC
                </button>
                <button
                  onClick={() => handleBulkAction('enableESign', true)}
                  disabled={bulkAction?.action === 'enableESign'}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Enable E-Sign
                </button>
                <button
                  onClick={() => handleBulkAction('enableESign', false)}
                  disabled={bulkAction?.action === 'enableESign'}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  Disable E-Sign
                </button>
                <button
                  onClick={() => handleBulkAction('both', true)}
                  disabled={bulkAction?.action === 'both'}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Enable Both
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedBundles.length === bundles.length && bundles.length > 0}
                  onChange={selectAllBundles}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Bundle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                KYC
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                E-Sign
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stats
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {bundles.map((bundle) => (
              <tr key={bundle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedBundles.includes(bundle.id)}
                    onChange={() => toggleBundleSelection(bundle.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {bundle.name}
                      </p>
                      {bundle.customRoute && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          /{bundle.customRoute}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {bundle.createdBy?.firstName || 'Unknown'} {bundle.createdBy?.lastName || ''}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => updateFeatureToggle(bundle.id, 'enableKYC', !bundle.featureToggles?.enableKYC)}
                    disabled={updating[`${bundle.id}_enableKYC`]}
                    className="inline-flex items-center"
                  >
                    {updating[`${bundle.id}_enableKYC`] ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    ) : bundle.featureToggles?.enableKYC ? (
                      <ToggleRight className="w-5 h-5 text-orange-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => updateFeatureToggle(bundle.id, 'enableESign', !bundle.featureToggles?.enableESign)}
                    disabled={updating[`${bundle.id}_enableESign`]}
                    className="inline-flex items-center"
                  >
                    {updating[`${bundle.id}_enableESign`] ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    ) : bundle.featureToggles?.enableESign ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>{bundle.stats.totalSubscribers} users</span>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(bundle.createdAt)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {bundles.length === 0 && (
        <div className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No channel bundles found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Channel bundles will appear here once they are created by admins.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChannelBundleFeatureManager;