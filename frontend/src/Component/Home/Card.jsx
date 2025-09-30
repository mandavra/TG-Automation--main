import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { getplansasync } from "../../services/action/plan.Action";
import { 
  getSubscriptionAction, 
  getSubscriptionButtonText, 
  getSubscriptionExpiryStatus,
  getCurrentSubscription 
} from "../../utils/subscriptionUtils";

const Card = () => {
  const { plans: globalPlans } = useSelector((state) => state.planReducer);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sortBy, setSortBy] = useState('default');
  const [bundlePlans, setBundlePlans] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [buttonTexts, setButtonTexts] = useState({});

  useEffect(() => {
    // Get bundle-specific plans if available, otherwise use global plans
    const bundleData = window.currentBundleData;
    if (bundleData?.subscriptionPlans && bundleData.subscriptionPlans.length > 0) {
      console.log('📋 Card - Using bundle-specific plans:', bundleData.subscriptionPlans);
      setBundlePlans(bundleData.subscriptionPlans);
    } else {
      console.log('📋 Card - No bundle plans found, loading global plans...');
      dispatch(getplansasync());
      setBundlePlans(globalPlans || []);
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [dispatch, location, globalPlans]);

  // Load subscription status and button texts
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      const userPhone = localStorage.getItem('userPhone');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      if (!isAuthenticated || !userPhone) {
        setSubscriptionStatus(null);
        setButtonTexts({});
        return;
      }
      
      try {
        // Get current subscription status
        const status = await getSubscriptionExpiryStatus(userPhone);
        setSubscriptionStatus(status);
        
        // Determine button text based on subscription status
        const hasActiveSubscription = status.hasSubscription && !status.isExpired;
        const buttonText = hasActiveSubscription ? 'Extend Subscription' : 'Subscribe Now';
        
        // Set same button text for all plans (they're all for the same bundle)
        const currentPlans = bundlePlans.length > 0 ? bundlePlans : globalPlans || [];
        const texts = {};
        currentPlans.forEach(plan => {
          texts[plan._id || plan.id] = buttonText;
        });
        
        setButtonTexts(texts);
        console.log('📋 Card - Subscription status:', status);
        console.log('📋 Card - Button texts:', texts);
      } catch (error) {
        console.warn('Failed to load subscription status:', error);
        setSubscriptionStatus(null);
        setButtonTexts({});
      }
    };
    
    loadSubscriptionStatus();
  }, [bundlePlans, globalPlans]);
  
  // Use bundle plans if available, otherwise fall back to global plans
  const plans = bundlePlans.length > 0 ? bundlePlans : globalPlans;

  const sortedPlans = useMemo(() => {
    if (!plans || plans.length === 0) return [];
    const plansCopy = [...plans];
    if (sortBy === 'default') {
      return plansCopy.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    switch (sortBy) {
      case 'popular':
        return plansCopy.sort((a, b) => {
          if (a.highlight && !b.highlight) return -1;
          if (!a.highlight && b.highlight) return 1;
          return 0;
        });
      case 'price-low':
        return plansCopy.sort((a, b) => a.mrp - b.mrp);
      case 'price-high':
        return plansCopy.sort((a, b) => b.mrp - a.mrp);
      case 'duration':
        return plansCopy.sort((a, b) => {
          const aIsMonth = a.duration?.toLowerCase().includes('month');
          const bIsMonth = b.duration?.toLowerCase().includes('month');
          if (aIsMonth && !bIsMonth) return -1;
          if (!aIsMonth && bIsMonth) return 1;
          return 0;
        });
      default:
        return plansCopy;
    }
  }, [plans, sortBy]);

  const handlePress = async (plan) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userPhone = localStorage.getItem('userPhone');
    const currentDateTime = new Date().toISOString();
    
    // Get current bundle's feature toggles
    const bundleData = window.currentBundleData;
    const featureToggles = bundleData?.featureToggles || {
      enableESign: true,
      enableKYC: true
    };
    
    console.log('📋 Card - Plan selected:', plan);
    console.log('📋 Card - Feature toggles:', featureToggles);
    console.log('📋 Card - User authenticated:', isAuthenticated, 'userPhone exists:', !!userPhone);
    console.log('📋 Card - Subscription status:', subscriptionStatus);
    
    if (!isAuthenticated || !userPhone) {
      // Not authenticated: send to login with redirect back to payment for this plan
      const intendedPath = `/payment/${plan._id || plan.id}`;
      const redirectTo = encodeURIComponent(intendedPath);
      navigate(`/login?redirect=${redirectTo}`, {
        state: {
          plan: plan,
          purchaseDateTime: currentDateTime,
          bundleData: bundleData,
          redirect: intendedPath
        }
      });
      return;
    }
    
    // User is logged in - determine if this is subscription or extension
    let isExtension = false;
    let currentExpiryDate = null;
    
    if (subscriptionStatus?.hasSubscription) {
      isExtension = true;
      currentExpiryDate = subscriptionStatus.subscription?.expiry_date;
      console.log('📋 Card - This will be an extension. Current expiry:', currentExpiryDate);
    }
    
    // Store plan details for payment processing
    const planDetails = {
      orderId: null, // Will be set after payment
      amount: plan.mrp,
      planName: plan.type,
      customerId: userPhone,
      phone: userPhone,
      expiryDate: new Date(Date.now() + (plan.duration === 'year' ? 365 : plan.duration === 'month' ? 30 : 7) * 24 * 60 * 60 * 1000).toISOString(),
      duration: plan.duration === 'year' ? 365 : plan.duration === 'month' ? 30 : 7,
      originalDuration: plan.duration,
      planId: plan._id || plan.id,
      isExtension: isExtension,
      currentExpiryDate: currentExpiryDate
    };
    
    console.log('📋 Card - Storing plan details:', planDetails);
    localStorage.setItem('paymentDetails', JSON.stringify(planDetails));
    
    // Payment is always required - go to payment page
    navigate(`/payment/${plan._id || plan.id}`, {
      state: {
        productName: plan.type,
        productPrice: plan.mrp,
        planData: plan,
        purchaseDateTime: currentDateTime,
        bundleData: bundleData,
        isExtension: isExtension,
        subscriptionStatus: subscriptionStatus
      }
    });
  };

  return (
    <div id="plans-section" className="py-6 sm:py-12 px-2 sm:px-6 lg:pt-[110px]">
      <div className="max-w-6xl sm:max-w-7xl mx-auto mb-6 px-2 sm:px-4">
        <div className="hidden lg:block py-4">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Sort Plans</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Choose how to organize</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                >
                  <option value="default">Default Order</option>
                  <option value="popular">Most Popular First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="duration">Duration (Month/Year)</option>
                </select>
                
                <div className="relative">
                  <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {sortBy !== 'default' && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {sortBy === 'popular' && '⭐ Popular Plans First'}
                    {sortBy === 'price-low' && '💰 Lowest Price First'}
                    {sortBy === 'price-high' && '💰 Highest Price First'}
                    {sortBy === 'duration' && '📅 Monthly Plans First'}
                  </span>
                </div>
                <button
                  onClick={() => setSortBy('default')}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:hidden">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-md p-1.5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <div className="p-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-sm shadow-sm">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Sort</h3>
                </div>
              </div>
              
              {sortBy !== 'default' && (
                <button
                  onClick={() => setSortBy('default')}
                  className="p-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-0.5 mb-1.5">
              <button
                onClick={() => setSortBy('popular')}
                className={`p-1 text-xs font-medium rounded-sm transition-all duration-300 flex items-center justify-center gap-0.5 ${
                  sortBy === 'popular'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm scale-105 transform'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className="text-xs">⭐</span>
                <span>Popular</span>
              </button>
              
              <button
                onClick={() => setSortBy('price-low')}
                className={`p-1 text-xs font-medium rounded-sm transition-all duration-300 flex items-center justify-center gap-0.5 ${
                  sortBy === 'price-low'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm scale-105 transform'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className="text-xs">💰</span>
                <span>Low</span>
              </button>
              
              <button
                onClick={() => setSortBy('price-high')}
                className={`p-1 text-xs font-medium rounded-sm transition-all duration-300 flex items-center justify-center gap-0.5 ${
                  sortBy === 'price-high'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm scale-105 transform'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className="text-xs">💰</span>
                <span>High</span>
              </button>
              
              <button
                onClick={() => setSortBy('duration')}
                className={`p-1 text-xs font-medium rounded-sm transition-all duration-300 flex items-center justify-center gap-0.5 ${
                  sortBy === 'duration'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm scale-105 transform'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className="text-xs">📅</span>
                <span>Duration</span>
              </button>
            </div>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm px-1.5 py-1 pr-5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              >
                <option value="default">Default</option>
                <option value="popular">Popular</option>
                <option value="price-low">Low Price</option>
                <option value="price-high">High Price</option>
                <option value="duration">Duration</option>
              </select>
              
              <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                <svg className="w-2 h-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {sortBy !== 'default' && (
              <div className="mt-1 flex items-center gap-1 p-1 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-sm border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-1">
                  <div className="w-0.5 h-0.5 bg-indigo-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {sortBy === 'popular' && '⭐ Popular'}
                    {sortBy === 'price-low' && '💰 Low'}
                    {sortBy === 'price-high' && '💰 High'}
                    {sortBy === 'duration' && '📅 Month'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl sm:max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-4">
        {sortedPlans.map((plan, index) => {
          const isHighlight = plan.highlight;

          return (
            <div
              key={plan._id || plan.id || index}
              className={`relative w-full rounded-lg sm:rounded-2xl border shadow-md sm:shadow-lg hover:shadow-xl p-3 sm:p-6 lg:p-8 flex flex-col justify-between transition-all duration-700 ease-out hover:-translate-y-3 hover:scale-[1.02] animate-fade-in-down ${
                isHighlight
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-transparent hover:shadow-indigo-500/30"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 hover:shadow-gray-500/20"
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Subscription Status Badge */}
              {subscriptionStatus?.hasSubscription && !subscriptionStatus.isExpired && (
                <div className="absolute -top-2 left-4 animate-pulse">
                  <span className="bg-gradient-to-r from-green-400 to-green-500 text-white text-[8px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold shadow-md sm:shadow-lg uppercase border border-green-300">
                    {subscriptionStatus.isExpiringSoon ? `${subscriptionStatus.daysRemaining}d Left` : 'Active'}
                  </span>
                </div>
              )}
              
              {subscriptionStatus?.isExpired && (
                <div className="absolute -top-2 left-4 animate-pulse">
                  <span className="bg-gradient-to-r from-red-400 to-red-500 text-white text-[8px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold shadow-md sm:shadow-lg uppercase border border-red-300">
                    Expired
                  </span>
                </div>
              )}

              {isHighlight && (
                <div className="absolute -top-2 right-4 flex justify-center animate-bounce-slow">
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-[9px] sm:text-xs px-3 sm:px-4 py-0.5 sm:py-1 rounded-full font-semibold shadow-md sm:shadow-lg uppercase border border-yellow-300">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center space-y-2 sm:space-y-3">
                <h3 className="text-base sm:text-xl lg:text-2xl font-bold tracking-wide animate-fade-in-down">
                  {plan.type}
                </h3>
                <div className="text-2xl sm:text-4xl lg:text-5xl font-extrabold animate-fade-in-down">
                  ₹{plan.mrp}
                  <span className="text-[10px] sm:text-sm lg:text-base font-medium ml-1 opacity-80">
                    / {plan.duration}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handlePress(plan)}
                className={`mt-3 sm:mt-6 lg:mt-8 w-full py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.05] hover:shadow-lg animate-bounce-slow ${
                  isHighlight
                    ? "bg-white text-indigo-700 hover:bg-gray-50 hover:shadow-md sm:hover:shadow-lg"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md sm:hover:shadow-lg"
                }`}
              >
                {buttonTexts[plan._id || plan.id] || (isHighlight ? "Subscribe Now" : "Select Plan")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Card;
