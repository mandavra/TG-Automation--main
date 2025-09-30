import React, { useState, useEffect } from 'react';
import AdminPanelPreview from './AdminPanelPreview';
import {
  Settings,
  Save,
  RotateCcw,
  Eye,
  Edit3,
  Copy,
  Download,
  Upload,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Palette,
  Layout,
  Shield,
  Clock,
  Users,
  Search,
  Filter,
  X,
  Check,
  AlertCircle,
  LayoutGrid
} from 'lucide-react';
import axios from 'axios';

const AdminPanelCustomizer = () => {
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [admins, setAdmins] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('sidebar');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const tabs = [
    { id: 'sidebar', label: 'Sidebar', icon: Layout },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'restrictions', label: 'Restrictions', icon: Clock },
    { id: 'branding', label: 'Branding', icon: Palette }
  ];

  useEffect(() => {
    fetchAdmins();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      fetchAdminConfig();
    }
  }, [selectedAdmin]);

  const fetchAdmins = async () => {
    try {
      const response = await axios.get('/api/admin/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAdmins(response.data.admins?.filter(admin => admin.role !== 'superadmin') || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/admin-panel-customization/templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAdminConfig = async () => {
    if (!selectedAdmin) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/admin-panel-customization/${selectedAdmin}/config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveConfig(response.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // Create default config if none exists
        await createDefaultConfig();
      } else {
        console.error('Error fetching admin config:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = async () => {
    try {
      const response = await axios.post(`/api/admin-panel-customization/${selectedAdmin}/default-config`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveConfig(response.data.data);
    } catch (error) {
      console.error('Error creating default config:', error);
    }
  };

  const saveConfig = async () => {
    if (!activeConfig || !selectedAdmin) return;

    setSaving(true);
    try {
      const response = await axios.put(`/api/admin-panel-customization/${selectedAdmin}/config`, activeConfig, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveConfig(response.data.data);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!selectedAdmin || !confirm('Reset to default configuration? This will overwrite all customizations.')) return;

    try {
      const response = await axios.post(`/api/admin-panel-customization/${selectedAdmin}/reset`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveConfig(response.data.data);
      alert('Configuration reset to default!');
    } catch (error) {
      console.error('Error resetting config:', error);
      alert('Error resetting configuration');
    }
  };

  const updateConfig = (path, value) => {
    setActiveConfig(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const renderSidebarConfig = () => {
    if (!activeConfig?.sidebarConfig) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Menu Items</h3>
          <div className="space-y-3">
            {activeConfig.sidebarConfig.menuItems?.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateConfig(`sidebarConfig.menuItems.${index}.enabled`, !item.enabled)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {item.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <button
                    onClick={() => updateConfig(`sidebarConfig.menuItems.${index}.visible`, !item.visible)}
                    className={`px-2 py-1 rounded text-xs ${
                      item.visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.visible ? 'Visible' : 'Hidden'}
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-2">{item.path}</div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="text-sm">Order:</span>
                    <input
                      type="number"
                      value={item.order || 0}
                      onChange={(e) => updateConfig(`sidebarConfig.menuItems.${index}.order`, parseInt(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-sm">Category:</span>
                    <select
                      value={item.category}
                      onChange={(e) => updateConfig(`sidebarConfig.menuItems.${index}.category`, e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="core">Core</option>
                      <option value="management">Management</option>
                      <option value="analytics">Analytics</option>
                      <option value="settings">Settings</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Appearance</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Theme</span>
              <select
                value={activeConfig.sidebarConfig.appearance?.theme || 'auto'}
                onChange={(e) => updateConfig('sidebarConfig.appearance.theme', e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Width</span>
              <select
                value={activeConfig.sidebarConfig.appearance?.width || 'normal'}
                onChange={(e) => updateConfig('sidebarConfig.appearance.width', e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="narrow">Narrow</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </label>
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={activeConfig.sidebarConfig.appearance?.showIcons !== false}
                onChange={(e) => updateConfig('sidebarConfig.appearance.showIcons', e.target.checked)}
                className="rounded"
              />
              <span>Show Icons</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={activeConfig.sidebarConfig.appearance?.showLabels !== false}
                onChange={(e) => updateConfig('sidebarConfig.appearance.showLabels', e.target.checked)}
                className="rounded"
              />
              <span>Show Labels</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderPermissionsConfig = () => {
    if (!activeConfig?.restrictions) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Feature Permissions</h3>
          <div className="space-y-3">
            {Object.entries(activeConfig.restrictions.features || {}).map(([feature, enabled]) => (
              <label key={feature} className="flex items-center justify-between">
                <span className="font-medium capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                <button
                  onClick={() => updateConfig(`restrictions.features.${feature}`, !enabled)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Data Access Restrictions</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={activeConfig.restrictions.dataAccess?.ownDataOnly || false}
                onChange={(e) => updateConfig('restrictions.dataAccess.ownDataOnly', e.target.checked)}
                className="rounded"
              />
              <span>Restrict to own data only</span>
            </label>
            
            <div className="border-t pt-4">
              <label className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={activeConfig.restrictions.dataAccess?.dateRange?.enabled || false}
                  onChange={(e) => updateConfig('restrictions.dataAccess.dateRange.enabled', e.target.checked)}
                  className="rounded"
                />
                <span>Enable date range restrictions</span>
              </label>
              
              {activeConfig.restrictions.dataAccess?.dateRange?.enabled && (
                <div className="ml-6 grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm">Max days</span>
                    <input
                      type="number"
                      value={activeConfig.restrictions.dataAccess.dateRange.maxDays || ''}
                      onChange={(e) => updateConfig('restrictions.dataAccess.dateRange.maxDays', parseInt(e.target.value))}
                      className="px-3 py-2 border rounded"
                      placeholder="90"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRestrictionsConfig = () => {
    if (!activeConfig?.restrictions?.timeRestrictions) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Time-based Access Restrictions</h3>
          
          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={activeConfig.restrictions.timeRestrictions.enabled || false}
              onChange={(e) => updateConfig('restrictions.timeRestrictions.enabled', e.target.checked)}
              className="rounded"
            />
            <span>Enable time restrictions</span>
          </label>

          {activeConfig.restrictions.timeRestrictions.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Start Time</span>
                  <input
                    type="time"
                    value={activeConfig.restrictions.timeRestrictions.allowedHours?.start || ''}
                    onChange={(e) => updateConfig('restrictions.timeRestrictions.allowedHours.start', e.target.value)}
                    className="px-3 py-2 border rounded"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">End Time</span>
                  <input
                    type="time"
                    value={activeConfig.restrictions.timeRestrictions.allowedHours?.end || ''}
                    onChange={(e) => updateConfig('restrictions.timeRestrictions.allowedHours.end', e.target.value)}
                    className="px-3 py-2 border rounded"
                  />
                </label>
              </div>

              <div>
                <span className="text-sm font-medium block mb-2">Allowed Days</span>
                <div className="grid grid-cols-4 gap-2">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                    <label key={day} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeConfig.restrictions.timeRestrictions.allowedDays?.includes(index) || false}
                        onChange={(e) => {
                          const currentDays = activeConfig.restrictions.timeRestrictions.allowedDays || [];
                          const updatedDays = e.target.checked 
                            ? [...currentDays, index]
                            : currentDays.filter(d => d !== index);
                          updateConfig('restrictions.timeRestrictions.allowedDays', updatedDays);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredAdmins = admins.filter(admin =>
    admin.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAdminInfo = admins.find(admin => admin._id === selectedAdmin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Panel Customizer</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={!selectedAdmin || !activeConfig}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye size={16} />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Admin Selector */}
        <div className="col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Select Admin</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAdmins.map(admin => (
                <button
                  key={admin._id}
                  onClick={() => setSelectedAdmin(admin._id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedAdmin === admin._id
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="font-medium">{admin.firstName} {admin.lastName}</div>
                  <div className="text-sm text-gray-600">{admin.email}</div>
                  <div className="text-xs text-gray-500 capitalize">{admin.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="col-span-9">
          {selectedAdmin && activeConfig ? (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={resetToDefault}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Reset to Default
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg">
                <div className="border-b">
                  <div className="flex space-x-0">
                    {tabs.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600 bg-blue-50'
                              : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <Icon size={16} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === 'sidebar' && renderSidebarConfig()}
                  {activeTab === 'permissions' && renderPermissionsConfig()}
                  {activeTab === 'restrictions' && renderRestrictionsConfig()}
                  {activeTab === 'dashboard' && (
                    <div className="text-center py-8 text-gray-500">
                      Dashboard customization coming soon...
                    </div>
                  )}
                  {activeTab === 'branding' && (
                    <div className="text-center py-8 text-gray-500">
                      Branding customization coming soon...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
              <Settings className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Admin</h3>
              <p className="text-gray-600">Choose an admin from the list to customize their panel configuration.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && activeConfig && selectedAdminInfo && (
        <AdminPanelPreview
          config={activeConfig}
          adminInfo={{
            name: `${selectedAdminInfo.firstName} ${selectedAdminInfo.lastName}`,
            email: selectedAdminInfo.email,
            role: selectedAdminInfo.role
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default AdminPanelCustomizer;