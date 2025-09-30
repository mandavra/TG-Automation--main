import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  RefreshCw,
  ShieldCheck,
  Activity,
} from "lucide-react";

/**
 * Drop-in redesigned modal.
 * - Props, API calls, and data fields are unchanged.
 * - Improved UI/UX (better layout, dark mode, animations, accessibility).
 * - Copy–paste to replace your existing KYCDetailsModal.jsx.
 */
const KYCDetailsModal = ({ isOpen, onClose, userId }) => {
  const [userData, setUserData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [error, setError] = useState("");

  // Auth header (unchanged)
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return String(date);
    }
  };

  const getVerificationColor = (status) => {
    switch (status) {
      case "verified":
        return "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30 ring-1 ring-emerald-200/60";
      case "partial":
        return "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30 ring-1 ring-amber-200/60";
      case "incomplete":
        return "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30 ring-1 ring-rose-200/60";
      default:
        return "text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-slate-800/50 ring-1 ring-slate-200/60";
    }
  };

  const getTimelineIcon = (type) => {
    switch (type) {
      case "registration":
        return { icon: <User size={16} />, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" };
      case "update":
        return { icon: <Edit size={16} />, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
      case "payment":
        return { icon: <DollarSign size={16} />, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
      case "invoice":
        return { icon: <FileText size={16} />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" };
      default:
        return { icon: <Clock size={16} />, color: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" };
    }
  };

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;
    try {
      setError("");
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/kyc-admin/admin/${userId}`,
        { headers: getAuthHeader() }
      );
      setUserData(response.data.user);
      setTimeline(response.data.timeline);
      setStats(response.data.stats);
      setEditData(response.data.user);
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("Unable to load user details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) fetchUserDetails();
  }, [isOpen, userId, fetchUserDetails]);

  // Close on ESC for better UX (does not change existing onClose flow)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    try {
      const response = await axios.put(
        `http://localhost:4000/api/kyc-admin/admin/${userId}`,
        editData,
        { headers: getAuthHeader() }
      );
      setUserData(response.data.user);
      setEditMode(false);
      alert("KYC information updated successfully!");
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Error updating KYC information. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditData(userData);
    setEditMode(false);
  };

  if (!isOpen) return null;

  // Simple skeleton block
  const Skeleton = ({ className = "" }) => (
    <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`} />
  );

  const SectionCard = ({ title, icon, children, right }) => (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/80 shadow-lg shadow-slate-200/40 dark:shadow-black/30 backdrop-blur p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          {icon}
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white grid place-items-center shadow-md">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-6">KYC Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-5">Admin view & quick actions</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[.98] transition shadow"
                  >
                    <Save size={16} />
                    <span className="text-sm font-medium">Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[.98] transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[.98] transition"
                >
                  <Edit size={16} />
                  <span className="text-sm font-medium">Edit</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-rows-[auto,1fr,auto] h-[calc(92vh-0px)]">
          {/* Tabs */}
          <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur">
            <nav className="relative flex gap-1 py-2">
              {[
                { key: "details", label: "Details" },
                { key: "timeline", label: "Activity Timeline" },
                { key: "stats", label: "Statistics" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`relative px-3 py-2 text-sm rounded-xl transition shadow-sm hover:shadow ${
                    activeTab === t.key
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Scroll Area */}
          <div className="overflow-y-auto p-6 space-y-6">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="animate-spin mr-3" size={22} />
                <span className="text-slate-600 dark:text-slate-300">Loading user details…</span>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-2xl border border-rose-200/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-900/30 p-4 text-rose-700 dark:text-rose-200 flex items-start gap-3">
                <AlertCircle className="mt-0.5" size={18} />
                <div>
                  <p className="font-medium">{error}</p>
                  <button onClick={fetchUserDetails} className="mt-2 text-sm underline hover:no-underline">Retry</button>
                </div>
              </div>
            )}

            {/* Content */}
            {!loading && !error && userData && (
              <>
                {activeTab === "details" && (
                  <div className="space-y-6">
                    {/* Status & Progress */}
                    <SectionCard
                      title="Verification"
                      icon={<Activity size={18} className="opacity-80" />}
                      right={
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getVerificationColor(
                            userData.verificationStatus
                          )}`}
                        >
                          {userData.verificationStatus === "verified" ? (
                            <CheckCircle size={14} />
                          ) : (
                            <AlertCircle size={14} />
                          )}
                          {userData.verificationStatus
                            ? userData.verificationStatus.charAt(0).toUpperCase() +
                              userData.verificationStatus.slice(1)
                            : "Unknown"}
                        </span>
                      }
                    >
                      <div className="grid md:grid-cols-[1fr,auto] gap-4 items-center">
                        <div>
                          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 transition-all"
                              style={{ width: `${userData.completionPercentage || 0}%` }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {userData.completionPercentage || 0}% Profile Completion
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          Last update: {formatDate(userData.updatedAt)}
                        </div>
                      </div>
                    </SectionCard>

                    {/* Personal & Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SectionCard title="Personal Information" icon={<User size={18} className="opacity-80" />}>
                        <div className="space-y-4">
                          {/* Full Name */}
                          <InfoRow label="Full Name" icon={<User className="h-4 w-4" />}> 
                            {editMode ? (
                              <div className="grid grid-cols-3 gap-2">
                                <TextField
                                  placeholder="First Name"
                                  value={editData.firstName || ""}
                                  onChange={(v) => setEditData({ ...editData, firstName: v })}
                                />
                                <TextField
                                  placeholder="Middle Name"
                                  value={editData.middleName || ""}
                                  onChange={(v) => setEditData({ ...editData, middleName: v })}
                                />
                                <TextField
                                  placeholder="Last Name"
                                  value={editData.lastName || ""}
                                  onChange={(v) => setEditData({ ...editData, lastName: v })}
                                />
                              </div>
                            ) : (
                              <ValueText>{userData.fullName || "Not provided"}</ValueText>
                            )}
                          </InfoRow>

                          {/* PAN */}
                          <InfoRow label="PAN Number" icon={<CreditCard className="h-4 w-4" />}>
                            {editMode ? (
                              <TextField
                                value={editData.panNumber || ""}
                                onChange={(v) => setEditData({ ...editData, panNumber: v })}
                              />
                            ) : (
                              <ValueText>{userData.panNumber || "Not provided"}</ValueText>
                            )}
                          </InfoRow>

                          {/* DOB */}
                          <InfoRow label="Date of Birth" icon={<Calendar className="h-4 w-4" />}>
                            {editMode ? (
                              <input
                                type="date"
                                value={editData.dob || ""}
                                onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <ValueText>{userData.dob || "Not provided"}</ValueText>
                            )}
                          </InfoRow>
                        </div>
                      </SectionCard>

                      <SectionCard title="Contact Information" icon={<Mail size={18} className="opacity-80" />}>
                        <div className="space-y-4">
                          {/* Email */}
                          <InfoRow label="Email" icon={<Mail className="h-4 w-4" />}>
                            {editMode ? (
                              <TextField
                                type="email"
                                value={editData.email || ""}
                                onChange={(v) => setEditData({ ...editData, email: v })}
                              />
                            ) : (
                              <ValueText>{userData.email || "Not provided"}</ValueText>
                            )}
                          </InfoRow>

                          {/* Phone */}
                          <InfoRow label="Phone" icon={<Phone className="h-4 w-4" />}>
                            {editMode ? (
                              <TextField
                                type="tel"
                                value={editData.phone || ""}
                                onChange={(v) => setEditData({ ...editData, phone: v })}
                              />
                            ) : (
                              <ValueText>{userData.phone || "Not provided"}</ValueText>
                            )}
                          </InfoRow>

                          {/* Location */}
                          <InfoRow label="Location" icon={<MapPin className="h-4 w-4" />}>
                            {editMode ? (
                              <div className="grid grid-cols-2 gap-2">
                                <TextField
                                  placeholder="City"
                                  value={editData.City || ""}
                                  onChange={(v) => setEditData({ ...editData, City: v })}
                                />
                                <TextField
                                  placeholder="State"
                                  value={editData.State || ""}
                                  onChange={(v) => setEditData({ ...editData, State: v })}
                                />
                              </div>
                            ) : (
                              <ValueText>
                                {userData.City && userData.State
                                  ? `${userData.City}, ${userData.State}`
                                  : "Not provided"}
                              </ValueText>
                            )}
                          </InfoRow>
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                )}

                {activeTab === "timeline" && (
                  <SectionCard title="Activity Timeline" icon={<Clock size={18} className="opacity-80" />}>
                    {timeline?.length ? (
                      <ul className="relative -mb-6">
                        {timeline.map((event, idx) => {
                          const { icon, color } = getTimelineIcon(event.type);
                          const isLast = idx === timeline.length - 1;
                          return (
                            <li key={idx} className="relative pb-6">
                              {!isLast && (
                                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
                              )}
                              <div className="relative flex gap-3">
                                <div className={`h-8 w-8 rounded-full grid place-items-center ring-8 ring-white dark:ring-slate-800 ${color}`}>
                                  {icon}
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5 flex justify-between gap-4">
                                  <div>
                                    <p className="text-sm text-slate-700 dark:text-slate-200">{event.event}</p>
                                    {event.details && (
                                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.details}</p>
                                    )}
                                    {event.status && (
                                      <span
                                        className={`mt-2 inline-block px-2 py-1 text-[11px] rounded-full ${
                                          event.status === "SUCCESS"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                                        }`}
                                      >
                                        {event.status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                                    {formatDate(event.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <Clock size={16} />
                        <span>No activity yet.</span>
                      </div>
                    )}
                  </SectionCard>
                )}

                {activeTab === "stats" && (
                  <SectionCard title="User Statistics" icon={<Activity size={18} className="opacity-80" />}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard icon={<DollarSign className="h-7 w-7" />} label="Total Payments" value={stats.totalPayments || 0} accent="from-blue-500 to-indigo-500" />
                      <StatCard icon={<FileText className="h-7 w-7" />} label="Total Invoices" value={stats.totalInvoices || 0} accent="from-emerald-500 to-teal-500" />
                      <StatCard icon={<DollarSign className="h-7 w-7" />} label="Total Amount" value={`₹${stats.totalAmount || 0}`} accent="from-fuchsia-500 to-pink-500" />
                      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/80 shadow-md p-4 text-center">
                        <Clock className="h-7 w-7 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Last Activity</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.lastActivity ? formatDate(stats.lastActivity) : "N/A"}</p>
                      </div>
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* Empty state while waiting */}
            {isOpen && !loading && !error && !userData && (
              <div className="grid gap-2 place-items-center text-center py-16">
                <Skeleton className="h-16 w-16 rounded-full" />
                <p className="text-slate-600 dark:text-slate-300">No data to display yet.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 active:scale-[.98] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------- Small building blocks (for cleaner JSX) ------- //
const InfoRow = ({ label, icon, children }) => (
  <div className="grid gap-2">
    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
      <span className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-700 grid place-items-center text-slate-600 dark:text-slate-300">
        {icon}
      </span>
      {label}
    </div>
    <div>{children}</div>
  </div>
);

const TextField = ({ value, onChange, type = "text", placeholder = "" }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
);

const ValueText = ({ children }) => (
  <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
);

const StatCard = ({ icon, label, value, accent = "from-indigo-500 to-fuchsia-500" }) => (
  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/80 shadow-md p-4 text-center">
    <div className={`mx-auto mb-2 h-12 w-12 rounded-xl bg-gradient-to-br ${accent} text-white grid place-items-center shadow`}>
      {icon}
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white leading-6">{value}</p>
    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{label}</p>
  </div>
);

export default KYCDetailsModal;
