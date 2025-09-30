import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { otpAPI } from "../../services/api";
import { toast } from 'react-toastify';
import config from "../../config/config.js";
import { getFormattedUserPhone } from '../../utils/phoneUtils';
import 'react-toastify/dist/ReactToastify.css';

const Home = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const userPhone = getFormattedUserPhone();
    if (isAuthenticated === 'true' && userPhone) {
      navigate('/dashboard');
    }
  }, [navigate]);

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
      toast.success("OTP has been sent to your mobile number.");
      navigate("/otp", { 
        state: { 
          phone: `+91${phone}`,
          returnTo: '/dashboard', // Redirect to dashboard after OTP verification
          autoCreateAccount: true // Flag to auto-create account if needed
        }
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      setError(error.response?.data?.message || "Failed to send OTP. Please try again.");
      toast.error(error.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col overflow-x-hidden">
      <header className="w-full h-[30px] bg-[#1e3a8a] text-white">
        <div className="max-w-6xl mx-auto h-full px-3 flex items-center justify-between text-[11px] sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 3H7a2 2 0 0 0-2 2v14l7-3 7 3V5a2 2 0 0 0-2-2z"/></svg>
            SEBI Reg. No: INH000018221
          </span>
          <a href="mailto:compliance@vyomresearch.in" className="inline-flex items-center gap-1.5 hover:underline">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-1.4 3-6.6 4.99L5.4 7H18.6zM4 18V8.25l7.4 5.59a1 1 0 0 0 1.2 0L20 8.25V18H4z"/></svg>
            compliance@vyomresearch.in
          </a>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Enter your phone number to get started
            </p>
          </div>

          <form onSubmit={sendOtp} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">+91</span>
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter your 10-digit mobile number"
                  className="block w-full pl-12 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  disabled={loading}
                  maxLength={10}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending OTP...
                </div>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By proceeding, you agree to receive SMS messages from us
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-blue-200/60 dark:border-gray-700 bg-gradient-to-br from-blue-50/80 to-indigo-100/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur w-full">
        <div className="h-1 bg-gradient-to-r from-blue-400/60 via-indigo-400/60 to-fuchsia-400/60"></div>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 md:py-10 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 text-center md:text-left">
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">Vyom Research Payments</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-400 break-words">
                maneged by <a href="https://www.vyomresearch.in" className="text-blue-600 hover:underline" target="_blank">Vyom Research LLP</a>
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Quick Links</h4>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <ul className="space-y-2">
                  <li><Link to="/disclaimer" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">disclaimer</Link></li>
                  <li><Link to="/disclosure" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">disclosure</Link></li>
                  <li><Link to="/grievance-redressal-process" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">GrievanceRedressalProcess</Link></li>
                  <li><Link to="/investor-charter" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">investor-charter</Link></li>
                </ul>
                <ul className="space-y-2">
                  <li><Link to="/privacy-policy" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">privacy-policy</Link></li>
                  <li><Link to="/refund-policy" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">refund-policy</Link></li>
                  <li><Link to="/terms-of-use" className="inline-block break-words text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">terms-of-use</Link></li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Stay Updated</h4>
              <p className="mt-3 text-gray-600 dark:text-gray-400">Get product updates and tips.</p>
              <form className="mt-3 flex items-stretch gap-2 max-w-md mx-auto md:mx-0">
                <input type="email" inputMode="email" placeholder="Your email" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">Subscribe</button>
              </form>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Vyom Research LLP. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home