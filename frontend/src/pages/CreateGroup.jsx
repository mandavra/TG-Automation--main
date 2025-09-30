import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import { useNavigate } from "react-router-dom";

// ✅ use your configured axios instance with interceptors (token, baseURL)
import api from "../services/api";
import groupActions from "../services/action/groupAction";
import AddChanel from "./AddChanel";

const steps = ["Add Details", "Set Pricing", "Add FAQs"];

const CreateGroup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [addGST, setAddGST] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [customRoute, setCustomRoute] = useState("");
  const [faqs, setFaqs] = useState([{ question: "", answer: "" }]);

  const [duration, setDuration] = useState("month");
  const [planType, setPlanType] = useState("Base");
  const [mrp, setMrp] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [createdGroup, setCreatedGroup] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // 🔁 use shared api; keep your existing endpoint if backend is /api/plans/get
      const response = await api.get("/plans/get");
      // backend might return {plans: [...] } OR direct array; handle both
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

  const handleCreateGroup = async () => {
    try {
      if (!groupName.trim()) {
        toast.error("Group title is required");
        return;
      }

      // ensure plans have _id
      const planIds = plans
        .filter((p) => p && (p._id || p.id))
        .map((p) => p._id || p.id);

      const cleanFaqs = faqs
        .map((f) => ({
          question: (f.question || "").trim(),
          answer: (f.answer || "").trim(),
        }))
        .filter((f) => f.question && f.answer);

      const payload = {
        name: groupName.trim(),
        description: (groupDescription || "").trim(),
        customRoute: customRoute.trim(),
        image: image || null, // if backend expects URL/file, remove or change to imageUrl
        subscriptionPlans: planIds, // must be ObjectId[] on server
        addGST: !!addGST,
        faqs: cleanFaqs,
      };

      setLoading(true);
      const group = await groupActions.createGroup(payload);
      setCreatedGroup(group);
      setCompleted(true);
    } catch (error) {
      console.error("Error creating group:", error?.response?.data || error);
      toast.error(
        error?.response?.data?.message ||
          "Something went wrong while creating group"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validation for step 1
    if (step === 1 && (!groupName.trim() || !customRoute.trim() || customRoute.trim().length < 3)) {
      toast.error("Please fill in all required fields correctly");
      return;
    }
    
    if (step < 3) setStep(step + 1);
    else handleCreateGroup();
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result); // base64 preview
    reader.readAsDataURL(file);
  };

  const handleSavePlan = async () => {
    if (!mrp || !planType || !duration) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const newPlan = {
        mrp: Number(mrp),
        type: planType,
        duration: `${durationValue} ${durationUnit}`,
        highlight: false,
      };
      // 🔁 use shared api; keep your existing endpoint if backend is /api/plans/add
      const response = await api.post("/plans/add", newPlan);

      // backend may return {plan: {...}} or plan object directly
      const created = response.data?.plan || response.data;
      if (!created?._id) {
        console.warn("Unexpected plan response shape:", response.data);
      }
      setPlans((prev) => [...prev, created]);
      toast.success("Plan created successfully!");
      setShowPlanModal(false);
      setDuration("month");
      setPlanType("Base");
      setMrp("");
      setHighlight(false);
    } catch (error) {
      console.error("create plan error:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to create plan");
    }
  };

  const toggleBestDeal = async (planId) => {
    try {
      const planToUpdate = plans.find((p) => (p._id || p.id) === planId);
      if (!planToUpdate) {
        toast.error("Plan not found!");
        return;
      }
      const updatedPlan = {
        mrp: planToUpdate.mrp,
        type: planToUpdate.type,
        duration: planToUpdate.duration,
        highlight: !planToUpdate.highlight,
      };
      // 🔁 shared api; keep your existing endpoint if backend is /api/plans/edit/:id
      await api.put(`/plans/edit/${planId}`, updatedPlan);

      setPlans((prev) =>
        prev.map((p) =>
          (p._id || p.id) === planId ? { ...p, highlight: !p.highlight } : p
        )
      );
      toast.success("Plan updated successfully!");
    } catch (error) {
      console.error("update plan error:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to update plan");
    }
  };

  return (
    <div className="p-4">
      {/* Top Dashboard Button */}
      <div className="flex justify-end mb-4">
        <Link
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition text-xs"
          to="/admin/Group"
        >
          Go to Backe
        </Link>
      </div>

      {/* Stepper */}
      {completed ? (
        ""
      ) : (
        <div className="flex items-center justify-between mb-6">
          {steps.map((label, index) => {
            const stepNum = index + 1;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center relative"
              >
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-1/2 left-[calc(50%+0.9rem)] w-[calc(100%-1.8rem)] h-0.5 -translate-y-1/2 ${
                      step > stepNum ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  ></div>
                )}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                    step >= stepNum
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNum}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    step >= stepNum
                      ? "text-blue-600 font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completed ? (
        <AddChanel createdGroup={createdGroup} />
      ) : (
        <div className="bg-white p-5 rounded-md border shadow-sm mx-auto">
          {/* Step 1 */}
          {step === 1 && (
            <form className="space-y-3">
              <div>
                <h2 className="font-bold text-[20px]">
                  Provide basic group information
                </h2>
                <p className="text-gray-600 text-xs mt-0">
                  Enter the group name, description, and upload an image
                </p>
              </div>

              <div>
                <label className="block text-gray-600 text-xs mb-1 font-bold">
                  Group Title *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter group title"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 text-xs mb-1 font-bold">
                  Group Description
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter description"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-gray-600 text-xs mb-1 font-bold">
                  Custom Route *
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">yoursite.com/pc/</span>
                  <input
                    type="text"
                    value={customRoute}
                    onChange={(e) => setCustomRoute(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    className="flex-1 border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                    placeholder="my-group-name"
                    required
                    pattern="[a-z0-9-_]+"
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Only lowercase letters, numbers, hyphens and underscores allowed. Min 3 chars.
                </p>
              </div>

              <div>
                <label className="block text-gray-600 text-xs mb-1 font-bold">
                  Display Image
                </label>
                <label className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition relative w-[fit-content]">
                  {image ? (
                    <img
                      src={image}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-md"
                    />
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-gray-400 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v4a1 1 0 001 1h3m10-5h3a1 1 0 011 1v3m-4 10v-4a1 1 0 00-1-1h-3m-10 5h3a1 1 0 001-1v-3"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-600">
                        Upload logo
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Upload the logo in 1:1 aspect ratio
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h2 className="font-bold text-[20px]">
                Create subscription plans and pricing
              </h2>
              <p className="text-gray-600 text-xs mt-0">
                Set up multiple subscription plans with different durations and
                prices in INR, EUR, and USD.
              </p>

              <div className="flex items-center gap-2 p-3 mt-3 border rounded-md bg-blue-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m0-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                  />
                </svg>
                <p className="text-xs text-gray-700">
                  How do users interact with subscription plans, payment pages,
                  and post-purchase communications?{" "}
                  <a
                    href="#"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Learn more
                  </a>
                </p>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold mb-1">
                  Subscription plans <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Create various subscription plans to offer your audience
                </p>

                <div className="flex gap-4 flex-wrap">
                  <div
                    onClick={() => setShowPlanModal(true)}
                    className="border-2 border-dashed border-gray-300 rounded-md p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition w-[150px] h-[120px]"
                  >
                    <span className="text-2xl text-gray-500">＋</span>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      Create plan
                    </p>
                  </div>

                  {plans.map((plan, idx) => {
                    const id = plan._id || plan.id || idx;
                    return (
                      <div
                        key={id}
                        className="border rounded-md shadow-sm p-3 w-[180px] relative bg-white"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-sm">
                            {plan.type} ({plan.duration})
                          </h3>
                          {plan.highlight && (
                            <span className="bg-gray-200 text-[10px] px-2 py-0.5 rounded-md">
                              ⭐ Best Deal
                            </span>
                          )}
                        </div>
                        <div className="mb-2">
                          <p className="text-sm font-bold">₹{plan.mrp}</p>
                        </div>
                        <div className="border-t pt-2 flex items-center justify-between">
                          <span className="text-[11px]">Set as best deal</span>
                          <div
                            onClick={() => toggleBestDeal(plan._id || plan.id)}
                            className={`w-8 h-4 flex items-center rounded-full cursor-pointer transition ${
                              plan.highlight ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`bg-white w-3 h-3 rounded-full shadow transform transition ${
                                plan.highlight
                                  ? "translate-x-4"
                                  : "translate-x-1"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plan Modal */}
              {showPlanModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                  <div className="bg-white p-5 rounded-md shadow-md w-[320px] text-xs">
                    <h2 className="text-blue-600 font-semibold mb-3 text-sm">Create Plan</h2>
                    <form className="space-y-3">
                      <div>
                        <label className="block text-xs mb-1">Type *</label>
                        <input
                          type="text"
                          value={planType}
                          onChange={e => setPlanType(e.target.value)}
                          className="w-full border rounded-md px-2 py-1 text-xs"
                          placeholder="Enter plan type (e.g. Base, Pro, Enterprise)"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Duration *</label>
                        <div className="flex gap-2">
                          <select
                            value={durationUnit}
                            onChange={e => setDurationUnit(e.target.value)}
                            className="border rounded-md px-2 py-1 text-xs"
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
                            className="border rounded-md px-2 py-1 text-xs w-16"
                            placeholder="e.g. 20"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs mb-1">MRP *</label>
                        <input
                          type="number"
                          value={mrp}
                          onChange={e => setMrp(e.target.value)}
                          placeholder="Enter MRP"
                          className="w-full border rounded-md px-2 py-1 text-xs"
                          min="1"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPlanModal(false);
                            setDuration("month");
                            setPlanType("Base");
                            setMrp("");
                            setHighlight(false);
                          }}
                          className="px-3 py-1 border rounded-md text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePlan}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <form className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">
                  Frequently asked questions (FAQs)
                </h3>
                <p className="text-sm text-gray-500">
                  Provide answers to common queries to assist your group
                  subscribers.
                </p>
              </div>

              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 bg-white shadow-sm"
                >
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">
                      Question {index + 1}
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const newFaqs = [...faqs];
                        newFaqs[index].question = e.target.value;
                        setFaqs(newFaqs);
                      }}
                      className="w-full border rounded-md px-3 py-2 text-sm placeholder-gray-400"
                      placeholder="Please write your question here"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Answer {index + 1}
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => {
                        const newFaqs = [...faqs];
                        newFaqs[index].answer = e.target.value;
                        setFaqs(newFaqs);
                      }}
                      className="w-full border rounded-md px-3 py-2 text-sm placeholder-gray-400"
                      rows={3}
                      placeholder="Please write your answer here"
                    />
                  </div>
                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFaqs(faqs.filter((_, i) => i !== index))
                      }
                      className="mt-2 text-red-600 text-sm hover:text-red-800"
                    >
                      Remove FAQ
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                className="flex items-center justify-center border rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                + Add more
              </button>
            </form>
          )}

          <div className="flex justify-between mt-5">
            {step > 1 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1 border rounded-md text-xs"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1 bg-blue-600 text-white rounded-md text-xs"
              disabled={loading}
            >
              {step === 3 ? (loading ? "Saving..." : "Finish") : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateGroup;
