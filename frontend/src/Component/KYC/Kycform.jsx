import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createUser } from "../../services/action/kycUser";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { isESignRequired, isKYCRequired, setBundleSpecificValue, completeStepAndGetNextPath, areAllRequiredStepsCompleted, getBundleSpecificValue } from '../../utils/featureToggleUtils';
import { markStepCompletedInDatabase, canUserPerformStep, verifyStepCompletionFromDatabase } from '../../utils/stepPersistenceUtils';
import { getFormattedUserPhone, getPhoneDigits } from '../../utils/phoneUtils';
import axios from "axios";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli",
  "Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export default function KYCForm() {
  console.log('📋 KYC Form: Component is rendering');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const kycNavigation = useSelector((state) => state.kycReducer.kycNavigation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    state: "",
    panNumber: "",
    dob: "",
  });

  // Pre-populate phone number and check KYC completion status
  useEffect(() => {
    const initializeKYC = async () => {
      const userPhone = getFormattedUserPhone();
      const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
      
      // Phone is no longer part of the form; no pre-population needed
      
      // CRITICAL: Check if user has already completed KYC
      if (userPhone) {
        try {
          const canPerform = await canUserPerformStep(userPhone, currentBundleRoute, 'kyc');
          
          if (!canPerform.canPerform) {
            console.log('🚫 KYC already completed - staying on page due to refresh safeguard');
            toast.warning('KYC verification has already been completed for this account.');
            // Do NOT redirect on initial load/refresh; allow user to stay on KYC route
          }
        } catch (error) {
          console.warn('⚠️ Could not verify KYC completion status:', error);
        }
      }
    };
    
    initializeKYC();
  }, [navigate]);

  const [errors, setErrors] = useState({});

  const getUserId = () => {
    console.log('🔍 KYC Debug - Getting user ID...');
    
    // Debug: Log all localStorage data
    console.log('🔍 KYC Debug - localStorage contents:');
    console.log('   user:', localStorage.getItem("user"));
    console.log('   userPhone:', localStorage.getItem("userPhone"));
    console.log('   isAuthenticated:', localStorage.getItem("isAuthenticated"));
    
    // First try to get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('🔍 KYC Debug - Parsed user data:', user);
        const userId = user?._id || user?.id;
        console.log('🔍 KYC Debug - Extracted user ID:', userId);
        
        if (userId && !userId.startsWith('temp_')) {
          console.log('✅ KYC Debug - Valid user ID found:', userId);
          return userId;
        } else {
          console.log('⚠️ KYC Debug - User ID is temporary or invalid:', userId);
        }
      } catch (error) {
        console.error('❌ KYC Debug - Error parsing user data:', error);
      }
    } else {
      console.log('❌ KYC Debug - No user data in localStorage');
    }
    
    // If no valid user ID, we'll rely on phone-based identification
    // which will be handled by the backend during KYC submission
    const userPhone = getFormattedUserPhone();
    if (userPhone) {
      console.log('📱 KYC Debug - No user ID found, but phone number available:', userPhone);
      return `phone_${userPhone}`; // Return a phone-based identifier
    }
    
    console.log('❌ KYC Debug - No user ID or phone number available');
    return null;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName || !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone number is no longer collected on the form

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!formData.panNumber) {
      newErrors.panNumber = "PAN number is required";
    } else if (!panRegex.test(formData.panNumber.toUpperCase())) {
      newErrors.panNumber =
        "Please enter a valid PAN number (e.g., ABCDE1234F)";
    }

    if (!formData.dob) {
      newErrors.dob = "Date of birth is required";
    } else {
      const dob = new Date(formData.dob);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18) {
        newErrors.dob = "You must be at least 18 years old";
      }
    }

    // City is no longer collected on the form

    if (!formData.state) {
      newErrors.state = "State is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    try {
      setIsSubmitting(true);
      const userId = getUserId();
      console.log('🔍 KYC Form - getUserId returned:', userId);
      
      // Check if we have either a user ID or phone number for identification
      const userPhone = localStorage.getItem("userPhone");
      const hasValidIdentification = userId || userPhone;
      
      console.log('🔍 KYC Form - Identification check:', {
        userId,
        userPhone,
        formDataPhone: formData.phone,
        hasValidIdentification
      });
      
      if (!hasValidIdentification) {
        console.error('❌ KYC Form - No valid identification found');
        toast.error("User data not found! Please try logging in again.");
        setIsSubmitting(false);
        return;
      }

      const kycResponse = await dispatch(createUser(formData));
      if (!kycResponse.success) {
        toast.error(kycResponse.message || "Failed to create KYC user");
        setIsSubmitting(false);
        return;
      }

      // Get payment details from localStorage
      const paymentDetails = JSON.parse(localStorage.getItem('paymentDetails') || '{}');
      const transactionId = localStorage.getItem('transactionId') || '';
      const amount = paymentDetails.amount || 0;
      const userData = localStorage.getItem('user');
      let user = {};
      try {
        user = userData ? JSON.parse(userData) : {};
      } catch (error) {}

      const invoiceData = {
        userid: userId,
        invoiceNo: `INV-${Date.now()}`,
        billDate: new Date().toISOString(),
        description: "Telegram Subscription Plan",
        serviceStartDate: new Date().toISOString(), // Service starts from today
        serviceEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Service ends after 1 year
        price: amount,
        transactionId: transactionId,
        billedTo: {
          name: (formData.fullName || '').trim(),
          phone: user.phone || '',
          email: formData.email || user.email || '',
          address: user.City || '',
          stateCode: user.stateCode || ''
        }
      };

      console.log("Invoice Data being sent:", invoiceData);

      // Try to generate invoice with retry mechanism
      let invoiceGenerated = false;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📄 Starting invoice generation attempt ${attempt}/${maxRetries}...`);
          const response = await axios.post(
            "http://localhost:4000/api/invoices",
            invoiceData,
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              timeout: 15000, // 15 second timeout
            }
          );

          if (response.data) {
            invoiceGenerated = true;
            toast.success("KYC submitted successfully! Invoice has been sent to your email! 🎉");
            const localPdfPath = response.data?.invoice?.localPdfPath;
            if (localPdfPath) {
              console.log('✅ Invoice generated successfully at:', localPdfPath);
            }
            break; // Exit retry loop on success
          }
        } catch (invoiceError) {
          console.warn(`⚠️ Invoice generation attempt ${attempt} failed:`, invoiceError.message);
          
          if (attempt === maxRetries) {
            // Final attempt failed
            console.error('🚨 All invoice generation attempts failed');
            if (invoiceError.code === 'ECONNABORTED') {
              toast.success('KYC submitted successfully! 🎉 (Invoice generation is taking longer than expected, it will be sent to your email shortly)');
            } else if (invoiceError.response?.status >= 500) {
              toast.success('KYC submitted successfully! 🎉 (Invoice will be generated and sent to your email within a few minutes)');
            } else {
              toast.success('KYC submitted successfully! 🎉 (Invoice will be sent separately to your email)');
            }
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // CRITICAL: Mark KYC completion in database with bulletproof persistence
      const userPhoneForDb = localStorage.getItem('userPhone');
      const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
      
      if (userPhoneForDb) {
        try {
          console.log('💾 CRITICAL: Saving KYC completion to database...');
          const kycCompletionData = {
            submissionData: formData,
            kycResponseId: kycResponse.id || kycResponse._id,
            invoiceData: invoiceData,
            formType: 'kyc_verification',
            completedAt: new Date().toISOString()
          };
          
            await markStepCompletedInDatabase(userPhoneForDb, currentBundleRoute, 'kyc', kycCompletionData);
          console.log('✅ KYC completion SAVED to database successfully');
          
        } catch (dbError) {
          console.error('🚨 CRITICAL: Failed to save KYC completion to database:', dbError);
          // KYC completion will be saved to localStorage as backup in markStepCompletedInDatabase
        }
      }
      
      // Mark KYC as completed and navigate to next required step
      setBundleSpecificValue('kycCompleted', 'true');
      
      // Debug bundle configuration before navigation
      console.log('🔍 KYC Completion Debug:');
      console.log('   - Bundle data:', window.currentBundleData);
      console.log('   - isESignRequired():', isESignRequired());
      console.log('   - isKYCRequired():', isKYCRequired());
      
      // Prefer redirecting back to the custom bundle route after KYC completion
      const bundleRoute = (window.currentBundleData && window.currentBundleData.customRoute) 
        || localStorage.getItem('currentBundleCustomRoute') 
        || sessionStorage.getItem('currentBundleCustomRoute');
      
      // Proactively trigger server-side invite link generation/regeneration after KYC
      try {
        const phoneForLinks = getFormattedUserPhone();
        if (phoneForLinks) {
          await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/step-verification/regenerate-links/${encodeURIComponent(phoneForLinks)}`, {
            reason: 'Post-KYC completion auto-generation'
          });
          console.log('🔄 Invite link regeneration requested after KYC');
          // Mark that KYC just completed so bundle page can force refresh
          sessionStorage.setItem('postKycJustCompleted', 'true');
          // Clear any cached link for this bundle to avoid stale UI
          const currentRoute = (window.currentBundleData && window.currentBundleData.customRoute) 
            || localStorage.getItem('currentBundleCustomRoute') 
            || sessionStorage.getItem('currentBundleCustomRoute');
          if (currentRoute) {
            localStorage.removeItem(`telegramLink_${currentRoute}`);
          }
        }
      } catch (regenErr) {
        console.warn('⚠️ Invite link regeneration failed (non-blocking):', regenErr.message);
      }

      // Additionally, trigger bundle-specific link generator after KYC if payment is completed
      try {
        // Prefer triggering once payment is completed; do not wait for e-sign
        const paymentCompletedFlag = (getBundleSpecificValue('paymentCompleted') || '').toLowerCase() === 'true';

        // Resolve bundleId from current bundle data or fetch by route
        let bundleId = (window.currentBundleData && (window.currentBundleData._id || window.currentBundleData.id)) || null;
        if (!bundleId) {
          const routeForBundle = (window.currentBundleData && window.currentBundleData.customRoute)
            || localStorage.getItem('currentBundleCustomRoute')
            || sessionStorage.getItem('currentBundleCustomRoute');
          if (routeForBundle) {
            try {
              const byRouteResp = await axios.get(`http://localhost:4000/api/groups/by-route/${routeForBundle}`);
              const bundleData = byRouteResp.data?.group || byRouteResp.data;
              if (bundleData && (bundleData._id || bundleData.id)) {
                window.currentBundleData = bundleData;
                bundleId = bundleData._id || bundleData.id;
              }
            } catch (e) {
              console.warn('⚠️ Could not resolve bundleId by route:', e?.message || e);
            }
          }
        }

        // Resolve a real userId (avoid temporary phone_* IDs)
        let resolvedUserId = (userId && !String(userId).startsWith('phone_'))
          ? userId 
          : ((user && (user._id || user.id)) || null);

        if (!resolvedUserId) {
          const phone = getFormattedUserPhone();
          if (phone) {
            try {
              const userResp = await axios.get(`http://localhost:4000/api/public-user/by-phone/${encodeURIComponent(phone)}?autoCreate=true`);
              const userObj = userResp.data?.user || userResp.data;
              if (userObj && (userObj._id || userObj.id)) {
                resolvedUserId = userObj._id || userObj.id;
              }
            } catch (e) {
              console.warn('⚠️ Could not resolve user by phone:', e?.message || e);
            }
          }
        }

        const conditions = {
          paymentCompleted: paymentCompletedFlag,
          hasUserId: !!resolvedUserId,
          hasBundleId: !!bundleId,
        };

        if (conditions.paymentCompleted && conditions.hasUserId && conditions.hasBundleId) {
          const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');
          const resp = await axios.post(`${apiBase}/invite/channel-bundle-links`, {
            userId: resolvedUserId,
            groupId: bundleId,
          });
          console.log('✅ Bundle-specific invite links generated after KYC (payment already completed)');

          // Cache links for immediate display on Steps page
          try {
            const routeForBundle = (window.currentBundleData && window.currentBundleData.customRoute)
              || localStorage.getItem('currentBundleCustomRoute')
              || sessionStorage.getItem('currentBundleCustomRoute');
            const primaryLink = resp.data?.link || resp.data?.links?.[0]?.inviteLink || resp.data?.links?.[0]?.link;
            if (routeForBundle && primaryLink) {
              localStorage.setItem(`telegramLink_${routeForBundle}`, primaryLink);
            }
            if (routeForBundle && Array.isArray(resp.data?.links)) {
              const normalized = resp.data.links.map(l => ({
                link: l.inviteLink || l.link,
                channelTitle: l.channelTitle || 'Channel',
                bundleName: (resp.data?.bundleInfo?.name) || 'Bundle',
                expiresAt: l.expiresAt || l.createdAt,
                isUsed: l.isUsed || l.is_used || false
              }));
              sessionStorage.setItem(`channelLinks_${routeForBundle}`, JSON.stringify(normalized));
            }
          } catch (_) {}
        } else {
          console.log('ℹ️ Skipping bundle link generation - conditions not met:', conditions);
        }
      } catch (bundleLinkErr) {
        console.warn('⚠️ Bundle-specific link generation failed (non-blocking):', bundleLinkErr?.message || bundleLinkErr);
      }

      let nextPath = `/`;
      if (bundleRoute) {
        nextPath = `/pc/${bundleRoute}`;
      } else {
        // Fallback to existing step-based logic if route unknown
        nextPath = completeStepAndGetNextPath('kyc');
      }
      console.log('🎯 KYC completed - navigating to:', nextPath);
      
      // Add a small delay to ensure all processes complete before navigation
      if (invoiceGenerated) {
        navigate(nextPath);
      } else {
        console.log('⏳ Waiting for potential invoice processing to complete...');
        setTimeout(() => {
          navigate(nextPath);
        }, 1500);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      if (error.response) {
        toast.error(error.response.data?.message || "Server error occurred");
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error(
          error.message || "Failed to process your request. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStates = INDIAN_STATES.filter((state) =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const handleStateSelect = (state) => {
    setFormData((prev) => ({ ...prev, state }));
    setStateSearch("");
    setIsStateDropdownOpen(false);
    if (errors.state) {
      setErrors((prev) => ({ ...prev, state: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-lg dark:bg-gray-800/95 p-4 sm:p-5 md:p-6 rounded-2xl shadow-2xl space-y-4 border border-gray-100/50 dark:border-gray-700/50 hover:shadow-blue-100/30 dark:hover:shadow-blue-900/30 transition-all duration-500"
        >
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent animate-gradient">
              KYC Form
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide">
              Complete your KYC verification to access all features
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="flex flex-col group">
              <label className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full p-2 sm:p-2.5 rounded-xl border-2 ${
                  errors.fullName
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } dark:bg-gray-700/50 dark:text-white focus:border-transparent transition-all duration-300 text-sm placeholder-gray-400 dark:placeholder-gray-500 hover:border-blue-300 dark:hover:border-blue-500 outline-none shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500/20`}
              />
              {errors.fullName && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.fullName}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col group">
              <label className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                className={`w-full p-2 sm:p-2.5 rounded-xl border-2 ${
                  errors.email
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } dark:bg-gray-700/50 dark:text-white focus:border-transparent transition-all duration-300 text-sm placeholder-gray-400 dark:placeholder-gray-500 hover:border-blue-300 dark:hover:border-blue-500 outline-none shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500/20`}
              />
              {errors.email && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.email}
                </span>
              )}
            </div>
            <div className="flex flex-col group">
              <label className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className={`w-full p-2 sm:p-2.5 rounded-xl border-2 ${
                  errors.dob
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } dark:bg-gray-700/50 dark:text-white focus:border-transparent transition-all duration-300 text-sm placeholder-gray-400 dark:placeholder-gray-500 hover:border-blue-300 dark:hover:border-blue-500 outline-none shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500/20`}
              />
              {errors.dob && (
                <span className="text-red-500 text-xs mt-1">{errors.dob}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col group">
              <label className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                State <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div
                  onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                  className={`w-full p-2 sm:p-2.5 rounded-xl border-2 ${
                    errors.state
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-600"
                  } dark:bg-gray-700/50 dark:text-white focus:border-transparent transition-all duration-300 text-sm placeholder-gray-400 dark:placeholder-gray-500 hover:border-blue-300 dark:hover:border-blue-500 outline-none shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500/20 cursor-pointer flex items-center justify-between`}
                >
                  <span
                    className={
                      formData.state
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-500"
                    }
                  >
                    {formData.state || "Select State"}
                  </span>
                  <svg
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${
                      isStateDropdownOpen ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {isStateDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[200px] sm:max-h-[300px] overflow-hidden">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                      <input
                        type="text"
                        value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                        placeholder="Search state..."
                        className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto max-h-[150px] sm:max-h-[250px]">
                      {filteredStates.length > 0 ? (
                        filteredStates.map((state) => (
                          <div
                            key={state}
                            onClick={() => handleStateSelect(state)}
                            className="px-3 sm:px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-gray-700 dark:text-gray-300 transition-colors duration-150"
                          >
                            {state}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No states found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.state && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.state}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col group">
              <label className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                PAN Card Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="panNumber"
                placeholder="Enter PAN number (e.g., ABCDE1234F)"
                value={formData.panNumber}
                onChange={handleChange}
                className={`w-full p-2 sm:p-2.5 rounded-xl border-2 ${
                  errors.panNumber
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } dark:bg-gray-700/50 dark:text-white focus:border-transparent transition-all duration-300 text-sm placeholder-gray-400 dark:placeholder-gray-500 hover:border-blue-300 dark:hover:border-blue-500 outline-none shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500/20`}
              />
              {errors.panNumber && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.panNumber}
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm shadow-lg hover:shadow-xl hover:shadow-blue-500/20 ${
              isSubmitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit KYC"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}