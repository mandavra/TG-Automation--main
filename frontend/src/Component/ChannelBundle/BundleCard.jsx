import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { getFormattedUserPhone } from '../../utils/phoneUtils';

const BundleCard = ({ bundleData }) => {
  const { route } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sortBy, setSortBy] = useState('default');
  const [plans, setPlans] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  
  // Component debug logging (remove in production)
  console.log('🔍 BundleCard - Component mounted/rendered:', {
    route,
    bundleDataExists: !!bundleData,
    bundleId: bundleData?.id || bundleData?._id,
    bundleName: bundleData?.name,
    plans: bundleData?.plans?.length || bundleData?.subscriptionPlans?.length || 0
  });
  
  // Cache subscription status
  const bundleId = bundleData?.id || bundleData?._id;
  const subscriptionCacheKey = `subscription_${bundleId}_${getFormattedUserPhone()}`;
  const cachedSubscription = useMemo(() => {
    try {
      const cached = sessionStorage.getItem(subscriptionCacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, [subscriptionCacheKey]);

  useEffect(() => {
    // Load plans from the bundle data instead of global Redux state
    if (bundleData?.plans || bundleData?.subscriptionPlans) {
      const bundlePlans = bundleData.plans || bundleData.subscriptionPlans || [];
      setPlans(bundlePlans.filter(plan => plan.isActive !== false));
    }
    
    // Use cached subscription or check fresh
    if (cachedSubscription) {
      setUserSubscription(cachedSubscription);
    }
    // Always check fresh subscription status on component mount
    checkUserSubscription();
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [bundleData, location, cachedSubscription]);

  const checkUserSubscription = async () => {
    const userPhone = getFormattedUserPhone();
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated || !userPhone || !bundleId) {
      console.log('⚠️ BundleCard - Subscription check skipped:', { isAuthenticated, userPhone, bundleId });
      return;
    }

    try {
      setCheckingSubscription(true);
      
      // Check if user has already purchased this bundle
      console.log('📞 BundleCard - Making subscription API call:', `http://localhost:4000/api/user/check-purchase/${userPhone}/${bundleId}`);
      const response = await fetch(`http://localhost:4000/api/user/check-purchase/${userPhone}/${bundleId}`);

      if (response.ok) {
        const data = await response.json();
        
        const subscriptionData = data.success && data.hasPurchased ? {
          ...data.subscription,
          completionStatus: data.completionStatus,
          canContinueFlow: data.canContinueFlow,
          flowStatus: data.flowStatus,
          isActive: data.isActive
        } : null;
        
        setUserSubscription(subscriptionData);
        // Cache subscription status
        sessionStorage.setItem(subscriptionCacheKey, JSON.stringify(subscriptionData));
        
        
        if (subscriptionData) {
          console.log('✅ User has purchased this bundle:', data);
          
          // CRITICAL: Restore step completion status in localStorage (BUNDLE-SPECIFIC)
          if (data.flowStatus?.paymentCompleted) {
            const bundleRoute = bundleData.customRoute || bundleData.route || bundleData.slug || 'default';
            localStorage.setItem(`paymentCompleted_${bundleRoute}`, 'true');
            // DO NOT set global fallback - maintain bundle isolation
            console.log(`🔄 Restored payment completion status for bundle: ${bundleRoute}`);
          }
          
          // Restore invite links per bundle (BUNDLE-SPECIFIC) 
          if (data.flowStatus?.hasInviteLinks && data.inviteLinks?.length > 0) {
            const bundleRoute = bundleData.customRoute || bundleData.route || bundleData.slug || 'default';
            const telegramLink = data.inviteLinks[0].link;
            localStorage.setItem(`telegramLink_${bundleRoute}`, telegramLink);
            console.log(`🔄 Restored telegram link for bundle ${bundleRoute}:`, telegramLink);
          }
          
          // Mark other steps as completed based on completion status (BUNDLE-SPECIFIC)
          if (data.completionStatus === 'fully_completed' || data.completionStatus === 'paid_not_joined') {
            const bundleRoute = bundleData.customRoute || bundleData.route || bundleData.slug || 'default';
            // Mark KYC and E-sign as completed for THIS BUNDLE only
            localStorage.setItem(`kycCompleted_${bundleRoute}`, 'true');
            localStorage.setItem(`digioCompleted_${bundleRoute}`, 'true');
            // DO NOT set global states - maintain bundle isolation
            console.log(`🔄 Restored step completion status for bundle: ${bundleRoute}`);
            
            // Trigger storage event to refresh other components
            window.dispatchEvent(new Event('storage'));
          }
        } else {
          console.log('ℹ️ User has not purchased this bundle yet');
        }
      }
    } catch (error) {
      console.error('❌ Error checking purchase status:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

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
        return plansCopy.sort((a, b) => {
          const aPrice = a.discountPrice || a.offerPrice || a.mrp;
          const bPrice = b.discountPrice || b.offerPrice || b.mrp;
          return aPrice - bPrice;
        });
      case 'price-high':
        return plansCopy.sort((a, b) => {
          const aPrice = a.discountPrice || a.offerPrice || a.mrp;
          const bPrice = b.discountPrice || b.offerPrice || b.mrp;
          return bPrice - aPrice;
        });
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

  const handlePress = (plan) => {
    // Prefetch payment page for faster loading
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/payment/${plan._id || plan.id}`;
    document.head.appendChild(link);
    
    const isLoggedIn = localStorage.getItem('isAuthenticated') === 'true';
    const currentDateTime = new Date().toISOString();
    const userPhone = getFormattedUserPhone();
    
    // Handle different subscription scenarios
    if (userSubscription) {
      // For users with incomplete flows, redirect to dashboard to complete steps
      if (userSubscription.canContinueFlow || 
          userSubscription.completionStatus === 'paid_not_joined' ||
          userSubscription.completionStatus === 'payment_only') {
        if (userPhone) {
          navigate(`/dashboard?phone=${encodeURIComponent(userPhone)}`);
          return;
        }
      }
      
      // For users with active or expired subscriptions, allow extending/renewing
      // Continue with normal payment flow for extension/renewal
    }
    
    // Normal flow for new subscribers or extending/renewing
    if (isLoggedIn) {
      navigate(`/payment/${plan._id || plan.id}`, {
        state: {
          productName: plan.type,
          productPrice: plan.discountPrice || plan.offerPrice || plan.mrp,
          planData: plan,
          bundleData: bundleData, // Pass bundle data for context
          purchaseDateTime: currentDateTime,
          returnTo: `/pc/${route}`, // Return to bundle page after payment
          isExtension: userSubscription && userSubscription.status === 'active', // Flag for extension
          isRenewal: userSubscription && userSubscription.status === 'expired' // Flag for renewal
        }
      });
    } else {
      navigate("/login", {
        state: {
          plan: plan,
          bundleData: bundleData,
          purchaseDateTime: currentDateTime,
          returnTo: `/pc/${route}`
        }
      });
    }
  };

  if (!plans || plans.length === 0) {
    return (
      <div id="plans-section" className="py-6 sm:py-12 px-2 sm:px-6 lg:pt-[110px]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              No Plans Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This channel bundle doesn't have any active subscription plans yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="plans-section" className="py-6 sm:py-12 px-2 sm:px-6 lg:pt-[110px]">
      <div className="max-w-6xl sm:max-w-7xl mx-auto mb-6 px-2 sm:px-4">
        {/* Sort Plans and Sort sections removed */}
      </div>

      {/* Show subscription status if user has subscription */}
      {userSubscription && (
        <div className="max-w-6xl sm:max-w-7xl mx-auto mb-6 px-2 sm:px-4">
          <div className={`border rounded-xl p-6 text-center ${
            userSubscription.completionStatus === 'fully_completed' 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
              : userSubscription.completionStatus === 'paid_not_joined'
                ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-center mb-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                userSubscription.completionStatus === 'fully_completed' 
                  ? 'bg-green-500'
                  : userSubscription.completionStatus === 'paid_not_joined'
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
              }`}>
                {userSubscription.completionStatus === 'fully_completed' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${
              userSubscription.completionStatus === 'fully_completed' 
                ? 'text-green-800'
                : userSubscription.completionStatus === 'paid_not_joined'
                  ? 'text-orange-800'
                  : 'text-blue-800'
            }`}>
              {userSubscription.completionStatus === 'fully_completed' 
                ? "You're All Set! 🎉"
                : userSubscription.completionStatus === 'paid_not_joined'
                  ? "Complete Your Setup 📱"
                  : "Continue Your Journey 🚀"
              }
            </h3>
            <p className={`mb-4 ${
              userSubscription.completionStatus === 'fully_completed' 
                ? 'text-green-700'
                : userSubscription.completionStatus === 'paid_not_joined'
                  ? 'text-orange-700'
                  : 'text-blue-700'
            }`}>
              Status: <span className="font-medium">{userSubscription.status}</span>
              {userSubscription.expiryDate && (
                <span className="ml-2">
                  • Expires: {new Date(userSubscription.expiryDate).toLocaleDateString()}
                </span>
              )}
            </p>
            
            {/* Progress indicator */}
            {userSubscription.flowStatus && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full ${
                      userSubscription.flowStatus.paymentCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span>Payment</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full ${
                      userSubscription.flowStatus.hasInviteLinks ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span>Links Generated</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full ${
                      userSubscription.flowStatus.hasJoinedChannels ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    <span>Channels Joined</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => {
                  const userPhone = getFormattedUserPhone();
                  if (userPhone) {
                    window.open(`/dashboard?phone=${encodeURIComponent(userPhone)}`, '_blank');
                  }
                }}
                className={`px-6 py-2 text-white font-medium rounded-lg transition-colors ${
                  userSubscription.completionStatus === 'fully_completed' 
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {userSubscription.completionStatus === 'fully_completed' ? 'View Dashboard' : 'Continue Setup'}
              </button>
              
              {userSubscription.canContinueFlow && (
                <button
                  onClick={() => {
                    // Navigate to the appropriate next step
                    const userPhone = getFormattedUserPhone();
                    if (userPhone) {
                      navigate(`/dashboard?phone=${encodeURIComponent(userPhone)}`);
                    }
                  }}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                >
                  Complete Remaining Steps
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl sm:max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-4">
        {sortedPlans.map((plan, index) => {
          const isHighlight = plan.highlight;
          const displayPrice = plan.discountPrice || plan.offerPrice || plan.mrp;
          const hasDiscount = !!(plan.discountPrice || plan.offerPrice);
          
          // Determine subscription status and button behavior  
          const hasActiveSubscription = userSubscription && (
            userSubscription.subscription?.status === 'active' || 
            userSubscription.isActive === true
          );
          const hasExpiredSubscription = userSubscription && (
            userSubscription.subscription?.status === 'expired' || 
            (userSubscription.isActive === false && userSubscription.completionStatus !== 'payment_only')
          );
          const canContinueFlow = userSubscription && userSubscription.canContinueFlow;
          const hasIncompleteFlow = userSubscription && 
            (userSubscription.completionStatus === 'payment_only' || userSubscription.completionStatus === 'paid_not_joined');
          
          // Button text and behavior
          let buttonText = isHighlight ? "Get Started" : "Subscribe Now";
          let buttonClass = isHighlight
            ? "bg-white text-indigo-700 hover:bg-gray-50 hover:shadow-md sm:hover:shadow-lg"
            : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md sm:hover:shadow-lg";
          let isDisabled = false;
          
          if (hasActiveSubscription) {
            // User has active subscription - allow extending
            buttonText = "Extend Subscription";
            buttonClass = "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-lg";
          } else if (hasExpiredSubscription) {
            // User has expired subscription - allow renewal
            buttonText = "Renew Subscription";
            buttonClass = "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg";
          } else if (hasIncompleteFlow) {
            buttonText = "Continue Flow";
            buttonClass = "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md sm:hover:shadow-lg";
          } else if (canContinueFlow) {
            buttonText = "Complete Steps";
            buttonClass = "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md sm:hover:shadow-lg";
          }

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
              {isHighlight && (
                <div className="absolute -top-2 left-0 right-0 flex justify-center animate-bounce-slow">
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
                  {hasDiscount ? (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-green-400">₹{displayPrice}</span>
                      <span className="text-lg sm:text-2xl lg:text-3xl line-through opacity-60">₹{plan.mrp}</span>
                      <span className="text-xs sm:text-sm bg-green-500 text-white px-2 py-1 rounded-full">
                        {Math.round(((plan.mrp - displayPrice) / plan.mrp) * 100)}% OFF
                      </span>
                    </div>
                  ) : (
                    <span>₹{plan.mrp}</span>
                  )}
                  <span className="text-[10px] sm:text-sm lg:text-base font-medium ml-1 opacity-80">
                    / {plan.duration}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handlePress(plan)}
                disabled={isDisabled}
                className={`mt-3 sm:mt-6 lg:mt-8 w-full py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.05] hover:shadow-lg animate-bounce-slow ${
                  buttonClass
                }`}
              >
                {buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BundleCard;
