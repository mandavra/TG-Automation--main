import React, { useState, useMemo } from 'react';
import {
  Shield,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  Save,
  RotateCcw,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  Database,
  Lock,
  Unlock,
  DollarSign
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminPermissions = ({ admins }) => {
  const [editingPermissions, setEditingPermissions] = useState({});
  const [platformFees, setPlatformFees] = useState({});
  const [savedPermissions, setSavedPermissions] = useState({});

  const availablePermissions = [
    { id: 'payments', name: 'Payment Management', icon: <CreditCard size={16} />, category: 'Financial' },
    { id: 'platform_fee', name: 'Platform Fee', icon: <DollarSign size={16} />, category: 'Financial' },
    { id: 'users', name: 'User Management', icon: <Users size={16} />, category: 'User Management' },
    { id: 'analytics', name: 'Analytics & Reports', icon: <BarChart3 size={16} />, category: 'Analytics' },
    { id: 'reports', name: 'Advanced Reports', icon: <FileText size={16} />, category: 'Analytics' },
    { id: 'settings', name: 'System Settings', icon: <Shield size={16} />, category: 'Administration' },
    { id: 'database', name: 'Database Access', icon: <Database size={16} />, category: 'Administration' },
    { id: 'user_create', name: 'Create Users', icon: <Plus size={16} />, category: 'User Management' },
    { id: 'user_delete', name: 'Delete Users', icon: <Trash2 size={16} />, category: 'User Management' },
    { id: 'payment_refund', name: 'Process Refunds', icon: <RotateCcw size={16} />, category: 'Financial' },
    { id: 'export_data', name: 'Export Data', icon: <FileText size={16} />, category: 'Data Management' }
  ];

  const groupedPermissions = useMemo(() => {
    const groups = {};
    availablePermissions.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, []);

  const handlePermissionToggle = (adminId, permissionId) => {
    const current = editingPermissions[adminId] || [];
    const updated = current.includes(permissionId)
      ? current.filter(p => p !== permissionId)
      : [...current, permissionId];
    setEditingPermissions({ ...editingPermissions, [adminId]: updated });
  };

  const handleSave = async (adminId) => {
    try {
      const token = localStorage.getItem('token');
      const permissions = editingPermissions[adminId];
      const fee = platformFees[adminId];
      await axios.put(`http://localhost:4000/api/admin/${adminId}/permissions`, { permissions, platformFee: fee }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Permissions & Fee saved');
      const updated = { ...editingPermissions };
      delete updated[adminId];
      setEditingPermissions(updated);
      setSavedPermissions(prev => ({ ...prev, [adminId]: permissions || [] }));
    } catch {
      toast.error('Save failed');
    }
  };

  const handleCancel = (adminId) => {
    const updated = { ...editingPermissions };
    delete updated[adminId];
    setEditingPermissions(updated);
    const newFees = { ...platformFees };
    delete newFees[adminId];
    setPlatformFees(newFees);
  };

  const normalizedAdmins = useMemo(() => {
    return (admins || []).map(a => ({
      id: a.id || a._id || a.adminId || a.email,
      name: a.name || a.email || (a._id ? `Admin ${String(a._id).slice(-6)}` : 'Admin'),
      email: a.email,
      permissions: Array.isArray(a.permissions) ? a.permissions : [],
      platformFee: typeof a.platformFee === 'number' ? a.platformFee : undefined,
      status: a.status || (a.isActive ? 'active' : 'inactive')
    }));
  }, [admins]);

  return (
<div className="space-y-6 mt-[10vh]">
{/* Header */}
<div className="hidden sm:block bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
  <h2 className="text-2xl font-bold">Admin Permissions Matrix</h2>
  <p className="text-sm opacity-80">Manage roles, permissions and platform fee</p>
</div>


  {/* Table Wrapper for Mobile */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/70">
          <tr>
            {['Admin','Permissions','Platform Fee','Status','Actions'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {normalizedAdmins.map(admin => {
            const isEditing = editingPermissions.hasOwnProperty(admin.id);
            const currentPermissions = isEditing
              ? editingPermissions[admin.id]
              : savedPermissions[admin.id] || admin.permissions || [];
            const feeValue = platformFees[admin.id] ?? admin.platformFee;

            return (
              <tr
                key={admin.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {/* Admin */}
                <td className="px-4 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                  {admin.name}
                </td>

                {/* Permissions */}
                <td className="px-4 py-4">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(groupedPermissions).map(([cat, perms]) => (
                        <div
                          key={cat}
                          className="p-2 border rounded-lg border-slate-200 dark:border-slate-700"
                        >
                          <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            {cat}
                          </h5>
                          {perms.map(p => (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={currentPermissions.includes(p.id)}
                                onChange={() =>
                                  handlePermissionToggle(admin.id, p.id)
                                }
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              {p.icon}
                              <span>{p.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-600 dark:text-slate-300 break-words">
                      {currentPermissions.length
                        ? currentPermissions
                            .map(
                              pid =>
                                availablePermissions.find(ap => ap.id === pid)
                                  ?.name || pid
                            )
                            .join(', ')
                        : 'None'}
                    </span>
                  )}
                </td>

                {/* Platform Fee */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="number"
                      value={feeValue ?? ''}
                      placeholder="Set fee"
                      onChange={e =>
                        setPlatformFees({
                          ...platformFees,
                          [admin.id]:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      className="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {feeValue ?? '-'}
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {admin.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <Unlock size={14} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                      <Lock size={14} /> Inactive
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleSave(admin.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={() => handleCancel(admin.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPermissions({
                          ...editingPermissions,
                          [admin.id]: [...(admin.permissions || [])],
                        });
                        setPlatformFees({
                          ...platformFees,
                          [admin.id]: admin.platformFee,
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
</div>

  );
};

export default AdminPermissions;
