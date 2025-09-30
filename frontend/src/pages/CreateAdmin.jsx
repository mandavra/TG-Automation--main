import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../services/api";
import { toast } from "react-toastify";

const CreateAdmin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [admins, setAdmins] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingPassword, setEditingPassword] = useState("");
  const [rowBusyId, setRowBusyId] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    if (role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const loadAdmins = async () => {
    setListLoading(true);
    try {
      const { admins } = await adminAPI.listAdmins();
      setAdmins(admins || []);
    } catch (e) {
      // swallow list error but show a minimal message in UI
      toast.error(e?.response?.data?.message || 'Failed to load admins');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const stats = useMemo(() => {
    const total = admins.length;
    const superCount = admins.filter(a => a.role === 'superadmin').length;
    const normalCount = total - superCount;
    return { total, superCount, normalCount };
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nonSuper = admins.filter(a => a.role !== 'superadmin');
    if (!q) return nonSuper;
    return nonSuper.filter(a => (a.email || '').toLowerCase().includes(q) || (a.role || '').toLowerCase().includes(q));
  }, [admins, search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        setLoading(false);
        return;
      }
      await adminAPI.createAdmin(email.trim().toLowerCase(), password);
      toast.success("Admin created successfully");
      setEmail("");
      setPassword("");
      loadAdmins();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 py-4 sm:px-5">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Management</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Create new admin accounts and review existing ones.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Total {stats.total}</span>
            <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Super {stats.superCount}</span>
            <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Admins {stats.normalCount}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Create Admin</h2>
            <p className="text-[11px] mb-3 text-gray-600 dark:text-gray-400">Super Admin only. New admins can log in immediately.</p>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">Password</label>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Min 8 characters</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="w-full p-2 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    required
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="text-[11px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="text-[12px] px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Admins</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search email or role..."
                  className="w-40 sm:w-56 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <button
                  onClick={loadAdmins}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-1.5 pr-4">Email</th>
                    <th className="py-1.5 pr-4">Role</th>
                    <th className="py-1.5 pr-4">Status</th>
                    <th className="py-1.5 pr-4">Created</th>
                    <th className="py-1.5 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                    </tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-gray-500 dark:text-gray-400">No admins found</td>
                    </tr>
                  ) : (
                    filteredAdmins.map((a) => (
                      <tr key={a._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="py-1.5 pr-4 text-gray-900 dark:text-gray-100">
                          {editingId === a._id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="email"
                                value={editingEmail}
                                onChange={(e) => setEditingEmail(e.target.value)}
                                className="w-56 p-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-700 dark:text-white"
                              />
                              <input
                                type="password"
                                placeholder="New password (optional)"
                                value={editingPassword}
                                onChange={(e) => setEditingPassword(e.target.value)}
                                className="w-48 p-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-700 dark:text-white"
                              />
                              <button
                                className="text-[11px] px-2 py-0.5 rounded bg-blue-600 text-white disabled:opacity-50"
                                disabled={rowBusyId === a._id}
                                onClick={async () => {
                                  const normalizedCurrentEmail = (a.email || '').trim().toLowerCase();
                                  const normalizedNewEmail = (editingEmail || '').trim().toLowerCase();
                                  const emailChanged = normalizedNewEmail && normalizedNewEmail !== normalizedCurrentEmail;
                                  const wantsPasswordUpdate = (editingPassword || '').length > 0;
                                  if (!emailChanged && !wantsPasswordUpdate) {
                                    toast.info('No changes to save');
                                    return;
                                  }
                                  if (wantsPasswordUpdate && editingPassword.length < 8) {
                                    toast.error('Password must be at least 8 characters');
                                    return;
                                  }
                                  try {
                                    setRowBusyId(a._id);
                                    if (emailChanged) {
                                      await adminAPI.updateEmail(a._id, normalizedNewEmail);
                                    }
                                    if (wantsPasswordUpdate) {
                                      await adminAPI.updatePassword(a._id, editingPassword);
                                    }
                                    await loadAdmins();
                                    setEditingId(null);
                                    setEditingPassword('');
                                    if (emailChanged && wantsPasswordUpdate) {
                                      toast.success('Email and password updated');
                                    } else if (emailChanged) {
                                      toast.success('Email updated');
                                    } else {
                                      toast.success('Password updated');
                                    }
                                  } catch (e) {
                                    toast.error(e?.response?.data?.message || 'Failed to save changes');
                                  } finally {
                                    setRowBusyId(null);
                                  }
                                }}
                              >Save</button>
                              <button
                                className="text-[11px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600"
                                onClick={() => { setEditingId(null); setEditingPassword(''); }}
                              >Cancel</button>
                            </div>
                          ) : (
                            <span>{a.email}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${a.role === 'superadmin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            {a.role}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${a.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'}`}>
                            {a.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4 text-gray-600 dark:text-gray-300">
                          <span>{new Date(a.createdAt).toLocaleString()}</span>
                        </td>
                        <td className="py-1.5 pr-4">
                          {editingId === a._id ? (
                            <div />
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                className="text-[11px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600"
                                onClick={() => { setEditingId(a._id); setEditingEmail(a.email); setEditingPassword(''); }}
                              >Edit</button>
                              <button
                                className="text-[11px] px-2 py-0.5 rounded bg-red-600 text-white disabled:opacity-50"
                                disabled={rowBusyId === a._id}
                                onClick={async () => {
                                  try {
                                    setRowBusyId(a._id);
                                    await adminAPI.deleteAdmin(a._id);
                                    await loadAdmins();
                                    toast.success('Admin deleted');
                                  } catch (e) {
                                    toast.error(e?.response?.data?.message || 'Failed to delete admin');
                                  } finally {
                                    setRowBusyId(null);
                                  }
                                }}
                              >Delete</button>
                            </div>
                          )}
                        </td>
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

export default CreateAdmin;


