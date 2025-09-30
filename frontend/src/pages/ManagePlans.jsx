import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const ManagePlans = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [planType, setPlanType] = useState("Base");
  // Duration states: unit and value
  const [durationUnit, setDurationUnit] = useState("day");
  const [durationValue, setDurationValue] = useState(1);
  const [mrp, setMrp] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [discountPrice, setDiscountPrice] = useState(""); // New state
  const [offerPrice, setOfferPrice] = useState("");     // New state

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get("/plans/get");
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.plans || [];
      setPlans(list);
    } catch (error) {
      console.error("fetchPlans error:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!mrp || !planType || !durationValue || !durationUnit) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const durationString = `${durationValue} ${durationUnit}${durationValue > 1 ? 's' : ''}`;
      const planData = {
        mrp: Number(mrp),
        type: planType,
        duration: durationString, // Ensure the correctly formed duration string is used
        highlight: highlight,
      };
      // Add discountPrice and offerPrice only if they have values
      if (discountPrice !== "") {
        planData.discountPrice = Number(discountPrice);
      }
      if (offerPrice !== "") {
        planData.offerPrice = Number(offerPrice);
      }
      if (editingPlan) {
        await api.put(`/groups/${groupId}/plans/${editingPlan._id}`, planData);
        setPlans((prev) =>
          prev.map((p) =>
            p._id === editingPlan._id ? { ...p, ...planData } : p
          )
        );
        toast.success("Plan updated successfully!");
      } else {
        const response = await api.post(`/groups/${groupId}/plans`, planData);
        const created = response.data?.plan || response.data;
        setPlans((prev) => [...prev, created]);
        toast.success("Plan created successfully!");
      }
      resetForm();
    } catch (error) {
      console.error("Save plan error:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to save plan");
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setMrp(plan.mrp.toString());
    setPlanType(plan.type);
    // Parse duration like '20 days', '2 months', '1 year'
    const match = (plan.duration || '').match(/(\d+)\s*(\w+)/);
    if (match) {
      setDurationValue(Number(match[1]));
      let unit = match[2].toLowerCase();
      if (unit.endsWith('s')) unit = unit.slice(0, -1); // remove plural
      setDurationUnit(unit);
    } else {
      setDurationValue(1);
      setDurationUnit('day');
    }
    setHighlight(plan.highlight || false);
    setDiscountPrice(plan.discountPrice?.toString() || ""); // Populate discountPrice
    setOfferPrice(plan.offerPrice?.toString() || "");     // Populate offerPrice
    setShowPlanModal(true);
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) {
      return;
    }

    try {
      await api.delete(`/groups/${groupId}/plans/${planId}`);
      setPlans((prev) => prev.filter((plan) => plan._id !== planId));
      toast.success("Plan deleted successfully!");
    } catch (error) {
      console.error("Delete plan error:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to delete plan");
    }
  };

  const toggleBestDeal = async (plan) => {
    try {
      const updatedPlan = {
        mrp: plan.mrp,
        type: plan.type,
        duration: plan.duration,
        highlight: !plan.highlight,
      };
      
      await api.put(`/plans/edit/${plan._id}`, updatedPlan);
      
      setPlans((prev) =>
        prev.map((p) =>
          p._id === plan._id ? { ...p, highlight: !p.highlight } : p
        )
      );
      toast.success("Plan updated successfully!");
    } catch (error) {
      console.error("Update plan error:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to update plan");
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setMrp("");
    setPlanType("Base");
    setDurationUnit("day");
    setDurationValue(1);
    setHighlight(false);
    setDiscountPrice(""); // Reset discountPrice
    setOfferPrice("");     // Reset offerPrice
    setShowPlanModal(false);
  };

  const filteredPlans = plans.filter(
    (plan) =>
      plan.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.duration?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Manage Subscription Plans
        </h1>
        <Link
          to="/admin/viewplans"
          className="bg-gray-600 text-white px-3 py-1.5 text-sm rounded-md shadow hover:bg-gray-700"
        >
          ← Back to Plans
        </Link>
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search plans..."
          className="border rounded-md px-2 py-1 w-full max-w-xs text-sm 
                     focus:outline-none focus:ring-1 focus:ring-blue-500 
                     text-gray-800 dark:text-gray-200 
                     bg-white dark:bg-gray-800 
                     border-gray-300 dark:border-gray-600"
        />
        <button
          onClick={() => setShowPlanModal(true)}
          className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md shadow hover:bg-blue-700"
        >
          Create Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="bg-white dark:bg-gray-900 shadow rounded-xl p-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center gap-2">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              <span className="text-lg">Loading plans...</span>
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No plans found.</p>
            {searchQuery && <p className="text-sm">Try adjusting your search.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => (
              <div
                key={plan._id}
                className="border rounded-lg shadow-sm p-4 bg-white dark:bg-gray-800 relative"
              >
                {plan.highlight && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full">
                    ⭐ Best Deal
                  </div>
                )}
                
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {plan.type}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {plan.duration}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    ₹{plan.mrp}
                  </p>
                  <p className="text-sm text-gray-500">
                    per {plan.duration}
                  </p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Best Deal
                    </span>
                    <button
                      onClick={() => toggleBestDeal(plan)}
                      className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition ${
                        plan.highlight ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-3 h-3 rounded-full shadow transform transition ${
                          plan.highlight ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleEditPlan(plan)}
                      className="flex-1 px-3 py-1.5 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan._id)}
                      className="flex-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-md shadow-md w-[400px] max-w-[90vw]">
            <h2 className="text-blue-600 font-semibold mb-4 text-lg">
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan Type *
                </label>
                <input
                  type="text"
                  value={planType}
                  onChange={e => setPlanType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter plan type (e.g. Base, Pro, Enterprise)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration *
                </label>
                <div className="flex gap-2">
                  <select
                    value={durationUnit}
                    onChange={e => setDurationUnit(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={durationValue}
                    onChange={e => setDurationValue(Number(e.target.value))}
                    className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-24"
                    placeholder="e.g. 20"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  value={mrp}
                  onChange={e => setMrp(e.target.value)}
                  placeholder="Enter price"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Discount Price (₹)
                </label>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={e => setDiscountPrice(e.target.value)}
                  placeholder="Enter discount price (optional)"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Offer Price (₹)
                </label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={e => setOfferPrice(e.target.value)}
                  placeholder="Enter offer price (optional)"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="highlight"
                  checked={highlight}
                  onChange={e => setHighlight(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="highlight" className="text-sm font-medium">
                  Mark as Best Deal
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePlans;