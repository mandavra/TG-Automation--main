import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { otpAPI } from "../../services/api";
import { toast } from 'react-toastify';
import config from "../../config/config.js";
import { isPaymentRequired, isKYCRequired, isESignRequired, setBundleSpecificValue, getNextRequiredStep, getNextStepRedirectPath } from '../../utils/featureToggleUtils';
import { forceRefreshStepStatusFromDatabase } from '../../utils/stepPersistenceUtils';
import { setUserPhone, getFormattedUserPhone } from '../../utils/phoneUtils';
import 'react-toastify/dist/ReactToastify.css';

const OTP = () => {
  const [otp, setOtp] = useState(new Array(config.validation.otp.length).fill(""));
  const inputRefs = useRef([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, plan, bundleData, returnTo, autoCreateAccount, redirect: stateRedirect } = location.state || {};
  const searchParams = new URLSearchParams(location.search);
  const redirect = stateRedirect || searchParams.get('redirect');

  useEffect(() => {
    const html = document.documentElement;
    darkMode ? html.classList.add("dark") : html.classList.remove("dark");
  }, [darkMode]);

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Start timer when component mounts
  useEffect(() => {
    setResendDisabled(true);
    setResendTimer(config.otp.resendCooldown); // 60 seconds cooldown
  }, []);

  const handleChange = (el, index) => {
    const value = el.value;
    if (/^\d$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (index < 3) inputRefs.current[index + 1].focus();
    } else if (value === "") {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleResendOTP = async () => {
    if (!phone) {
      toast.error("Phone number is missing. Please go back and try again.");
      navigate("/login");
      return;
    }

    try {
      setResendLoading(true);
      await otpAPI.sendOTP(phone);
      toast.success("OTP has been resent to your mobile number.", config.toast);

      // Reset OTP input
      setOtp(new Array(config.validation.otp.length).fill(""));
      inputRefs.current[0]?.focus();

      // Start timer again
      setResendDisabled(true);
      setResendTimer(config.otp.resendCooldown);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== config.validation.otp.length) return;

    if (!phone) {
      toast.error("Phone number is missing. Please go back and try again.");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      let data;

      try {
        data = await otpAPI.verifyOTP(phone, fullOtp);
      } catch (verifyError) {
        // If OTP verification fails due to user not found and auto-create is enabled
        if (verifyError.response?.status === 404 && autoCreateAccount) {
          console.log('🔄 User not found, creating account automatically...');

          // Create account first
          try {
            const createResponse = await fetch(`/api/public-user/create-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: phone,
                autoCreated: true,
                source: 'otp_verification'
              })
            });

            if (createResponse.ok) {
              console.log('✅ Account created, retrying OTP verification...');
              // Retry OTP verification
              data = await otpAPI.verifyOTP(phone, fullOtp);
            } else {
              throw new Error('Failed to create account');
            }
          } catch (createError) {
            console.error('❌ Account creation failed:', createError);
            throw verifyError; // Fall back to original error
          }
        } else {
          throw verifyError;
        }
      }

      // Handle successful OTP verification
      if (data && (data.user || data.userExists !== undefined)) {
        // Create user data object
        const userData = {
          _id: data.user?._id || data.user?.id || `temp_${Date.now()}`,
          phone: phone,
          isTemporary: data.user?.isTemporary || false
        };

        // Store authentication data properly
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        setUserPhone(phone); // Use utility function for consistent formatting
        // Ensure userPhone is set in localStorage (critical for progress restore)
        if (!localStorage.getItem('userPhone')) {
          localStorage.setItem('userPhone', phone.startsWith('+91') ? phone : `+91${phone}`);
        }
        localStorage.setItem('authToken', data.token || `temp_token_${Date.now()}`);

        // Store bundle context if available
        if (bundleData) {
          window.currentBundleData = bundleData;
          // Also store customRoute in localStorage as backup for payment flow
          if (bundleData.customRoute) {
            localStorage.setItem('currentBundleCustomRoute', bundleData.customRoute);
          }
          // Always save bundleData to localStorage for later reload
          try {
            localStorage.setItem('currentBundleData', JSON.stringify(bundleData));
            console.log('🟢 Saved currentBundleData to localStorage:', bundleData);
          } catch (e) {
            console.warn('⚠️ Failed to save currentBundleData to localStorage:', e);
          }
        }

        console.log('OTP Frontend - User data saved:', userData);
      } else {
        console.error('OTP Frontend - Invalid response data:', data);
        toast.error("Failed to get user data. Please try again.");
        return;
      }

      toast.success("OTP verified successfully!", config.toast);

      // Always force sync step status from backend after login
      try {
        const phoneForCheck = getFormattedUserPhone() || phone;
        // 1. Fetch all bundles for this user
        console.log('🔄 Fetching all bundles for user:', phoneForCheck);
        const bundlesResp = await fetch(`http://localhost:5173/api/step-verification/all-bundles/${encodeURIComponent(phoneForCheck)}`);
        let allBundles = [];
        if (bundlesResp.ok) {
          const data = await bundlesResp.json();
          allBundles = data.bundles || [];
          console.log('📦 Bundles found:', allBundles);
        } else {
          console.warn('⚠️ Could not fetch bundles for user:', phoneForCheck);
        }
        // 2. For each bundle, sync step status
        if (allBundles.length > 0) {
          for (const bundle of allBundles) {
            if (bundle.groupId) {
              console.log(`🔁 Syncing step status for bundle: ${bundle.groupId} (${bundle.bundleName})`);
              await forceRefreshStepStatusFromDatabase(phoneForCheck, bundle.groupId);
            }
          }
        } else {
          // Fallback: try to sync current bundle if available
          let bundleIdForCheck = bundleData?._id || bundleData?.id || bundleData?.bundleId;
          if (!bundleIdForCheck && phoneForCheck) {
            try {
              const subsResp = await fetch(`http://localhost:5173/api/subscription/user/${encodeURIComponent(phoneForCheck)}`);
              if (subsResp.ok) {
                const subs = await subsResp.json();
                const active = Array.isArray(subs) ? subs.find(s => s.status === 'SUCCESS' && !s.isExpired) : null;
                bundleIdForCheck = active?.groupId?._id || active?.groupId || active?.group?.id;
                if (active?.groupId?.customRoute) {
                  localStorage.setItem('currentBundleCustomRoute', active.groupId.customRoute);
                }
              }
            } catch (_) { }
          }
          if (bundleIdForCheck && phoneForCheck) {
            console.log('🔁 Fallback: Syncing step status for bundle:', bundleIdForCheck);
            await forceRefreshStepStatusFromDatabase(phoneForCheck, bundleIdForCheck);
          }
        }
        // 3. Now redirect user to correct step
        setTimeout(() => {
          // If payment redirect or plan is present, go to payment page
          if (redirect) {
            navigate(redirect, {
              state: {
                planData: plan,
                bundleData: bundleData
              }
            });
          } else if (plan) {
            const selectedPrice = (plan?.discountPrice || plan?.offerPrice || plan?.mrp);
            navigate(`/payment/${plan._id || plan.id}`, {
              state: {
                productName: plan.type,
                productPrice: selectedPrice,
                planData: plan,
                bundleData: bundleData
              }
            });
          } else {
            // Default: old logic
            const nextPath = getNextStepRedirectPath();
            console.log('➡️ Redirecting user to:', nextPath);
            if (!nextPath || nextPath === '/' || nextPath.startsWith('/dashboard')) {
              const route = (bundleData?.customRoute) || localStorage.getItem('currentBundleCustomRoute');
              if (route) {
                navigate(`/pc/${route}`);
              } else if (phoneForCheck) {
                navigate(`/dashboard?phone=${encodeURIComponent(phoneForCheck)}`);
              } else {
                navigate("/");
              }
            } else {
              navigate(nextPath);
            }
          }
        }, 500);
        return;
      } catch (err) {
        console.warn('Step status sync after login failed:', err);
      }

      // Determine next step
      if (redirect) {
        // If a redirect path is present, go there
        navigate(redirect, {
          state: {
            planData: plan,
            bundleData: bundleData
          }
        });
      } else if (plan) {
        // Fallback: go to payment page for plan
        const selectedPrice = (plan?.discountPrice || plan?.offerPrice || plan?.mrp);
        navigate(`/payment/${plan._id || plan.id}`, {
          state: {
            productName: plan.type,
            productPrice: selectedPrice,
            planData: plan,
            bundleData: bundleData
          }
        });
      } else if (returnTo) {
        // Navigate to specified return URL
        navigate(returnTo);
      } else if (bundleData?.customRoute) {
        // Navigate back to bundle page
        navigate(`/pc/${bundleData.customRoute}`);
      } else {
        // Default: go to user dashboard with phone for context
        const userPhone = getFormattedUserPhone() || phone;
        if (userPhone) {
          navigate(`/dashboard?phone=${encodeURIComponent(userPhone)}`);
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      toast.error(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-200 via-blue-100 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none z-50"
      >
        {darkMode ? "🌞" : "🌙"}
      </button>

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md p-6 sm:p-8 border rounded-xl shadow-lg bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-600">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center text-gray-900 dark:text-gray-200">
            OTP Verification
          </h2>

          <div className="flex justify-center gap-2 flex-wrap sm:flex-nowrap mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-10 h-10 sm:w-12 sm:h-12 text-center text-xl border rounded-md bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ))}
          </div>

          <button
            disabled={!isOtpComplete || loading}
            onClick={handleVerify}
            className={`w-full p-3 rounded-md text-white font-medium transition text-sm sm:text-base ${!isOtpComplete || loading
                ? "bg-gray-400 cursor-not-allowed dark:bg-gray-700"
                : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 focus:ring-2 focus:ring-green-400"
              }`}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Didn't receive the OTP?
            </p>
            <button
              disabled={resendDisabled || resendLoading}
              onClick={handleResendOTP}
              className={`text-sm font-medium transition ${resendDisabled || resendLoading
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                }`}
            >
              {resendLoading
                ? "Sending..."
                : resendDisabled
                  ? `Resend OTP in ${resendTimer}s`
                  : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTP;