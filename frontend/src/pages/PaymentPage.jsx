import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import cashfreeLogo from "../assets/paylogo.webp";
import { setBundleSpecificValue } from "../utils/featureToggleUtils";
import { formatPhoneNumber, isValidPhoneNumber, getPhoneDigits } from "../utils/phoneUtils";

const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const userData = localStorage.getItem("user");
  
  // Debug localStorage contents
  console.log('🔍 PaymentPage - localStorage contents:', {
    user: localStorage.getItem("user"),
    userPhone: localStorage.getItem("userPhone"),
    isAuthenticated: localStorage.getItem("isAuthenticated"),
    authToken: localStorage.getItem("authToken")
  });
  
  let user = {};
  try {
    user = userData ? JSON.parse(userData) : {};
    console.log('🔍 PaymentPage - Parsed user data:', user);
  } catch (error) {
    console.error('❌ PaymentPage - Error parsing user data:', error);
  }
  
  const customer_id = user?._id || user?.id || null;
  const phone = user?.phone || localStorage.getItem("userPhone") || null;
  
  console.log('🔍 PaymentPage - Extracted auth data:', {
    customer_id: customer_id,
    phone: phone,
    hasUserData: !!userData,
    userKeys: Object.keys(user)
  });

  const [planInfo, setPlanInfo] = useState({
    productName: location.state?.productName || "",
    productPrice: location.state?.productPrice || 0,
    planData: location.state?.planData || {},
    bundleData: location.state?.bundleData || {},
    purchaseDateTime: location.state?.purchaseDateTime || new Date().toISOString()
  });

  console.log(customer_id, phone, planInfo);
  
  useEffect(() => {
    // If no location.state, try to fetch plan data using the ID from URL
    if (!location.state || !location.state.productPrice) {
      console.log("No product data in state, attempting to fetch plan data for ID:", id);
      
      const fetchPlanData = async () => {
        try {
          const response = await axios.get(`http://localhost:4000/api/plans/${id}`);
          const plan = response.data;
          
          const computedPrice = (plan.discountPrice || plan.offerPrice || plan.mrp || 0);
          setPlanInfo({
            productName: plan.type || "Plan",
            productPrice: computedPrice,
            planData: { duration: plan.duration || "30 days" },
            bundleData: plan.groupId || {},
            purchaseDateTime: new Date().toISOString()
          });
          
          console.log("Fetched plan data:", plan);
        } catch (error) {
          console.error("Failed to fetch plan data:", error);
          console.error("Plan ID used:", id);
          console.error("Error details:", error.response?.data || error.message);
          
          if (error.response?.status === 404 || error.message.includes('Cast to ObjectId failed')) {
            toast.error("Invalid plan ID. Redirecting to select a valid plan.");
            // Redirect to a page where they can select plans instead of home
            navigate("/");
          } else {
            toast.error("Failed to load plan information, redirecting to home");
            navigate("/");
          }
        }
      };
      
      if (id) {
        fetchPlanData();
      } else {
        console.warn("No plan ID and no product data found, redirecting to home");
        toast.error("No product data found, redirecting to home");
        navigate("/");
      }
    }

    const checkPaymentStatus = async () => {
      const orderId = localStorage.getItem('currentOrderId');
      if (orderId) {
        try {
          const response = await axios.get(`http://localhost:4000/api/payment/status/${orderId}`);
          if (response.data.status === 'SUCCESS') {
            toast.success(`Payment successful! Transaction ID: ${response.data.transactionId}`);
            localStorage.setItem('transactionId', response.data.transactionId);
            setBundleSpecificValue('paymentCompleted', 'true'); // <-- Ensure Step 2 is completed
            localStorage.removeItem('currentOrderId');
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }
    };

    checkPaymentStatus();
  }, [location.state, planInfo.productPrice, navigate, id]);

  // Check if user has already purchased this bundle
  useEffect(() => {
    const checkExistingPurchase = async () => {
      if (!planInfo.bundleData?._id || !phone) return;
      
      try {
        const response = await axios.get(`http://localhost:4000/api/user/check-purchase/${phone}/${planInfo.bundleData._id}`);
        setPurchaseStatus(response.data);
        
        if (response.data.hasPurchased) {
          // Delay showing message to avoid immediate redirect
          setTimeout(() => {
            const statusText = response.data.status === 'active' ? 'active subscription' : 
                             response.data.status === 'paid_not_joined' ? 'completed purchase' : 'existing purchase';
            toast.info(`You already have an ${statusText} for this bundle`);
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking existing purchase:", error);
        // Don't show error to user as this is a background check
      }
    };
    
    checkExistingPurchase();
  }, [planInfo.bundleData?._id, phone]);

  const calculateExpiryDate = (duration) => {
    const now = new Date();
    let expiryDate = new Date(now);

    if (typeof duration === 'string') {
      const lowerDuration = duration.toLowerCase();
      if (lowerDuration.includes('month')) {
        const months = parseInt(lowerDuration.match(/\d+/)?.[0] || '1');
        expiryDate.setMonth(now.getMonth() + months);
      } else if (lowerDuration.includes('year')) {
        const years = parseInt(lowerDuration.match(/\d+/)?.[0] || '1');
        expiryDate.setFullYear(now.getFullYear() + years);
      } else if (lowerDuration.includes('week')) {
        const weeks = parseInt(lowerDuration.match(/\d+/)?.[0] || '1');
        expiryDate.setDate(now.getDate() + (weeks * 7));
      } else if (lowerDuration.includes('day')) {
        const days = parseInt(lowerDuration.match(/\d+/)?.[0] || '30');
        expiryDate.setDate(now.getDate() + days);
      } else {
        expiryDate.setDate(now.getDate() + 30);
      }
    } else if (typeof duration === 'number') {
      expiryDate.setDate(now.getDate() + duration);
    } else {
      expiryDate.setDate(now.getDate() + 30);
    }

    return expiryDate.toISOString();
  };

  const convertDurationToDays = (duration) => {
    if (typeof duration === 'string') {
      const lowerDuration = duration.toLowerCase();
      if (lowerDuration.includes('month')) {
        const months = parseInt(lowerDuration.match(/\d+/)?.[0] || '1');
        return months * 30;
      } else if (lowerDuration.includes('year')) {
        const years = parseInt(lowerDuration.match(/\d+/)?.[0] || '1');
        return years * 365;
      } else if (lowerDuration.includes('week')) {
        const weeks = parseInt(lowerDuration.match(/\d+/)?.[0] || '1');
        return weeks * 7;
      } else if (lowerDuration.includes('day')) {
        const days = parseInt(lowerDuration.match(/\d+/)?.[0] || '30');
        return days;
      }
    }
    return typeof duration === 'number' ? duration : 30;
  };

  const handlePayment = async () => {
    console.log('🚀 PaymentPage - handlePayment called');
    console.log('🔍 PaymentPage - Current validation data:', {
      customer_id: customer_id,
      phone: phone,
      planInfo: planInfo,
      productPrice: planInfo.productPrice,
      duration: planInfo.planData.duration
    });
    
    // Check if user already has a purchase for this bundle
    if (purchaseStatus?.hasPurchased) {
      // Only block if flow is fully completed
      if (purchaseStatus.completionStatus === 'fully_completed' && purchaseStatus.isActive) {
        toast.info('You already have a fully completed subscription for this bundle. Redirecting to dashboard...');
        setTimeout(() => {
          navigate(`/dashboard?phone=${phone}`);
        }, 2000);
        return;
      }
      
      // For incomplete flows, allow them to continue but guide them to dashboard
      if (purchaseStatus.canContinueFlow) {
        toast.info('You have an incomplete setup for this bundle. Redirecting to dashboard to continue...');
        setTimeout(() => {
          navigate(`/dashboard?phone=${phone}`);
        }, 2000);
        return;
      }
    }

    console.log('✅ PaymentPage - Starting validation checks...');
    
    if (!planInfo.productPrice || planInfo.productPrice <= 0) {
      console.error('❌ PaymentPage - Invalid product price:', planInfo.productPrice);
      toast.error("Invalid product price. Please try again.");
      return;
    }
    console.log('✅ PaymentPage - Product price validation passed:', planInfo.productPrice);

    // Try to resolve missing customer_id by fetching/creating user by phone
    let resolvedCustomerId = customer_id;
    if (!resolvedCustomerId) {
      try {
        console.warn('⚠ PaymentPage - customer_id missing, resolving via phone');
        const resp = await axios.get(`http://localhost:4000/api/public-user/by-phone/${phoneForBackend}?autoCreate=true`);
        resolvedCustomerId = resp.data?.user?._id || resp.data?._id || null;
        if (resolvedCustomerId) {
          console.log('✅ Resolved customer_id from phone:', resolvedCustomerId);
          // Persist minimal user to localStorage to avoid next-time issue
          const existing = localStorage.getItem("user");
          const parsed = existing ? JSON.parse(existing) : {};
          localStorage.setItem("user", JSON.stringify({ ...parsed, _id: resolvedCustomerId, id: resolvedCustomerId, phone: phoneForBackend }));
        }
      } catch (resolveErr) {
        console.error('❌ Failed to resolve user by phone:', resolveErr);
      }
    }

    if (!resolvedCustomerId) {
      console.error('❌ PaymentPage - Missing customer_id after resolve');
      toast.error("Authentication required. Please login again.");
      navigate("/");
      return;
    }
    console.log('✅ PaymentPage - Customer ID validation passed:', resolvedCustomerId);

    if (!phone) {
      console.error('❌ PaymentPage - Missing phone number');
      toast.error("Phone number is missing. Please complete authentication first.");
      navigate("/");
      return;
    }
    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phone);
    if (!isValidPhoneNumber(formattedPhone)) {
      console.error('❌ PaymentPage - Invalid phone number format:', phone);
      toast.error("Invalid phone number format. Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    // Send only 10-digit phone to backend
    const phoneForBackend = getPhoneDigits(formattedPhone);
    console.log('✅ PaymentPage - Phone validation passed:', phoneForBackend);

    // Validate that customer_id is a valid ObjectId format
    if (customer_id === "guest_user" || customer_id.startsWith("temp_")) {
      console.error('❌ PaymentPage - Invalid customer_id format:', customer_id);
      toast.error("Authentication incomplete. Please complete the registration process first.");
      navigate("/");
      return;
    }
    console.log('✅ PaymentPage - Customer ID format validation passed');

    if (!planInfo.planData.duration) {
      console.error('❌ PaymentPage - Missing plan duration:', planInfo.planData);
      toast.error("Invalid subscription duration. Please try again.");
      return;
    }
    console.log('✅ PaymentPage - All validations passed! Proceeding with payment creation...');

    setLoading(true);
    try {
      const durationInDays = convertDurationToDays(planInfo.planData.duration);
      const expiryDate = calculateExpiryDate(planInfo.planData.duration);
      
      const requestData = {
        customer_id: resolvedCustomerId,
        userid: resolvedCustomerId,
        phone: phoneForBackend,
        amount: planInfo.productPrice,
        plan_id: id,
        plan_name: planInfo.productName,
        purchase_datetime: planInfo.purchaseDateTime,
        expiry_date: expiryDate,
        duration: durationInDays
      };

      console.log('Sending payment request:', requestData);
      
      // Additional validation logging
      console.log('Validation check:', {
        customer_id: customer_id ? '✓' : '✗',
        phone: phoneForBackend ? '✓' : '✗',
        amount: planInfo.productPrice > 0 ? '✓' : '✗',
        plan_id: id ? '✓' : '✗',
        plan_name: planInfo.productName ? '✓' : '✗',
        expiry_date: expiryDate ? '✓' : '✗',
        duration: durationInDays > 0 ? '✓' : '✗'
      });
      
      const response = await axios.post("http://localhost:4000/api/payment/create-payment-link", requestData);

      console.log('Payment response:', response.data);

      const { paymentLink, orderId, isExtension, message } = response.data;

      // If backend extended existing plan (no payment needed), redirect to dashboard
      if (isExtension && !paymentLink) {
        toast.success(message || 'Plan extended successfully. Redirecting to dashboard...');
        setBundleSpecificValue('paymentCompleted', 'true');
        setTimeout(() => {
          navigate(`/dashboard?phone=${phoneForBackend}`);
        }, 1200);
        return;
      }

      if (!paymentLink) throw new Error("Payment link not received");

      if (orderId) {
        localStorage.setItem('currentOrderId', orderId);
      }

      localStorage.setItem('paymentDetails', JSON.stringify({
        orderId,
        amount: planInfo.productPrice,
        planName: planInfo.productName,
        customerId: customer_id,
        phone: phoneForBackend,
        expiryDate: expiryDate,
        duration: durationInDays,
        originalDuration: planInfo.planData.duration
      }));
      setBundleSpecificValue('paymentCompleted', 'true'); // <-- Ensure Step 2 is completed

      window.location.href = paymentLink;
    } catch (error) {
      console.error("Payment Error Details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        config: error.config ? {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data
        } : null
      });

      let errorMessage = "Payment failed. Please try again.";
      
      // Handle different error types and response structures
      const status = error.response?.status || error.status;
      const responseData = error.response?.data || error.data;
      
      console.log('🔍 PaymentPage - Error analysis:', {
        hasResponse: !!error.response,
        status: status,
        responseData: responseData,
        errorMessage: error.message
      });
      
      // Handle specific error cases with better messages
      if (status === 409 || error.message.includes('pending payment')) {
        // Duplicate payment prevention
        errorMessage = error.message || responseData?.message || "You already have a pending payment for this bundle.";
        
        // Show the proper error message to user
        toast.error(errorMessage, { autoClose: 6000 });
        
        // If there's a pending payment with a link, offer options
        if (responseData?.pendingPayment?.linkUrl) {
          console.log('🔗 PaymentPage - Found existing payment link:', responseData.pendingPayment.linkUrl);
          
          // Show user options: Complete existing payment or start new one
          const userChoice = window.confirm(
            errorMessage + "\n\n" + 
            "Choose an option:\n" +
            "• Click OK to complete your existing payment\n" +
            "• Click Cancel to cancel the existing payment and create a new one"
          );
          
          if (userChoice) {
            // User chose to complete existing payment
            toast.info("Redirecting to complete existing payment...");
            window.open(responseData.pendingPayment.linkUrl, '_blank');
          } else {
            // User chose to cancel existing payment and create new one
            try {
              console.log('🗑 PaymentPage - Canceling existing payment:', responseData.pendingPayment.id);
              await axios.delete(`http://localhost:4000/api/payment/cancel/${responseData.pendingPayment.id}`);
              toast.info("Existing payment canceled. Creating new payment...");
              
              // Retry payment creation after canceling
              setTimeout(() => {
                handlePayment(); // Recursive call to retry
              }, 1000);
            } catch (cancelError) {
              console.error('Failed to cancel existing payment:', cancelError);
              toast.error("Failed to cancel existing payment. Please try again.");
            }
          }
          
          setLoading(false);
          return;
        }
      } else if (responseData?.message) {
        // Use backend error message if available
        errorMessage = responseData.message;
      }
      
      if (error.response?.status === 409) {
        // Handle duplicate payment error
        errorMessage = error.response.data.message || "You already have a subscription for this bundle.";
        toast.error(errorMessage);
        setTimeout(() => {
          navigate(`/dashboard?phone=${phone}`);
        }, 3000);
        return;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request data. Please check your information.";
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please check your internet connection.";
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = "Network error. Please check your internet connection.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
        : "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
    } flex items-center justify-center px-4 py-4`}>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
      />
      <div className={`${
        isDarkMode 
          ? "bg-gray-800 border-gray-700" 
          : "bg-white border-gray-200"
      } rounded-xl shadow-xl w-[350px] p-4 flex flex-col items-center gap-3 border transition-colors duration-300 relative`}>
        <button
          onClick={toggleTheme}
          className={`absolute top-2 right-2 p-1.5 rounded-full ${
            isDarkMode 
              ? "bg-gray-700 text-yellow-300 hover:bg-gray-600" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } transition-colors duration-300`}
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className={`flex items-center gap-1.5 ${
          isDarkMode ? "text-green-400" : "text-green-600"
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-xs font-semibold">Secure Payment Gateway</span>
        </div>

        <img
          src={cashfreeLogo}
          alt="Cashfree Logo"
          className={`h-10 w-auto filter ${isDarkMode ? "brightness-150" : ""}`}
        />

        <h1 className={`text-xl font-bold tracking-wide text-center ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>
          Secure Payment Portal
        </h1>

        <div className={`w-full text-center space-y-2 ${
          isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
        } p-3 rounded-lg transition-colors duration-300`}>
          <p className={`text-sm font-medium ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Transaction Details
          </p>
          <div className="space-y-1">
            <p className={`text-base font-semibold break-words ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>
              {planInfo.productName}
            </p>
            <p className={`text-2xl font-bold ${
              isDarkMode ? "text-green-400" : "text-green-600"
            }`}>
              ₹{planInfo.productPrice.toLocaleString()}
            </p>
            {planInfo.planData.duration && (
              <p className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Duration: {convertDurationToDays(planInfo.planData.duration)} days ({planInfo.planData.duration})
              </p>
            )}
            {planInfo.planData.duration && (
              <p className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Expires: {new Date(calculateExpiryDate(planInfo.planData.duration)).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className={`w-full grid grid-cols-2 gap-2 text-xs ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure Checkout</span>
          </div>
        </div>

        {purchaseStatus?.hasPurchased ? (
          <div className={`w-full text-center p-3 rounded-lg ${
            isDarkMode ? "bg-blue-800/30 border border-blue-600" : "bg-blue-50 border border-blue-200"
          }`}>
            <div className={`flex items-center justify-center gap-2 mb-2 ${
              isDarkMode ? "text-blue-400" : "text-blue-600"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold">Already Purchased</span>
            </div>
            <p className={`text-xs ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>
              You already have access to this bundle.
            </p>
            <button
              onClick={() => navigate(`/dashboard?phone=${phone}`)}
              className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <button
            onClick={handlePayment}
            disabled={loading || !planInfo.productPrice}
            className={`w-full py-2.5 rounded-lg text-white font-bold transition-all duration-300 ${
              loading || !planInfo.productPrice
                ? isDarkMode ? "bg-gray-600" : "bg-gray-400"
                : isDarkMode 
                  ? "bg-green-600 hover:bg-green-700 hover:shadow-green-500/20" 
                  : "bg-green-500 hover:bg-green-600 hover:shadow-green-400/20"
            } shadow-lg active:scale-95`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              "Proceed to Secure Payment"
            )}
          </button>
        )}

        <p className={`text-[10px] text-center ${
          isDarkMode ? "text-gray-500" : "text-gray-600"
        }`}>
          Your payment information is encrypted and secure
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;