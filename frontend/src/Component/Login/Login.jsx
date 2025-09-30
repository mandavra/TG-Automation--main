import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { otpAPI } from "../../services/api";
import { toast } from 'react-toastify';
import config from "../../config/config.js";
import 'react-toastify/dist/ReactToastify.css';

function Login() {
  const [phone, setPhone] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const plan = location.state?.plan;
  const bundleData = location.state?.bundleData;
  
  // Get redirect URL from query params
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    const html = document.documentElement;
    darkMode ? html.classList.add("dark") : html.classList.remove("dark");
  }, [darkMode]);

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const numbersOnly = value.replace(/\D/g, '');
    const truncated = numbersOnly.slice(0, config.validation.phone.maxLength);
    setPhone(truncated);
    if (truncated.length === config.validation.phone.maxLength && config.validation.phone.pattern.test(truncated)) {
      setError("");
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (phone.length !== config.validation.phone.maxLength || !config.validation.phone.pattern.test(phone)) {
      setError(config.messages.phone.invalid);
      return;
    }
    try {
      setLoading(true);
      const response = await otpAPI.sendOTP(`+91${phone}`);
      toast.success("OTP has been sent to your mobile number.", config.toast);
      navigate("/otp", { 
        state: { 
          phone: `+91${phone}`,
          plan: plan,
          bundleData: bundleData,
          returnTo: redirectUrl // Pass the redirect URL to OTP component
        }
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError(
        error.response?.data?.message ||
          config.messages.general.unknownError
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-200 via-blue-100 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none z-50"
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? "🌞" : "🌙"}
      </button>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full p-6 border rounded-lg shadow-lg bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-600 sm:p-8">
          <h2 className="text-lg sm:text-2xl font-semibold mb-6 text-center text-gray-900 dark:text-gray-200 whitespace-nowrap overflow-hidden">
            Login with Phone Number
          </h2>
          <form onSubmit={sendOtp}>
            <div className="relative">
              <span className="absolute left-3 top-3 text-sm sm:text-base text-gray-500 dark:text-gray-400">+91</span>
              <input
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={phone}
                onChange={handlePhoneChange}
                className={`w-full p-2 sm:p-3 pl-10 sm:pl-12 mb-2 text-sm sm:text-base rounded-md bg-gray-100 text-gray-900 placeholder-gray-500 border ${
                  error ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:border-gray-600`}
                maxLength={config.validation.phone.maxLength}
              />
              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-500 text-white p-2 sm:p-3 text-sm sm:text-base rounded-md transition ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-600 focus:ring-2 focus:ring-blue-400"
              } dark:bg-blue-600 dark:hover:bg-blue-700`}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
