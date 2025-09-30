import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
// Import exact homepage components
import HowItWorks from '../Component/Home/Steps';
import ContentSection from '../Component/Home/Loreams';
import Disclaimer from '../Component/Home/Disclaimer';
// Import bundle-specific components
import BundleCard from '../Component/ChannelBundle/BundleCard';
// Import debug utilities for development
import '../debug/bundleTestUtils.js';
// Import feature toggle utils for payment completion tracking
import { setBundleSpecificValue, getNextRequiredStep, getNextStepRedirectPath } from '../utils/featureToggleUtils';

const PublicGroup = () => {
  const { route } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State for tracking purchase status (commented out for future use)
  // const [_, setCheckingPurchase] = useState(false);

  // Cache for instant loading
  const cacheKey = `bundle_${route}`;
  const [cachedData, setCachedData] = useState(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Clear cache when user logs out or when logout URL parameter is present
  useEffect(() => {
    // Check for logout URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
      // Clear all cached data and state
      sessionStorage.clear();
      setCachedData(null);
      
      // Clear any remaining bundle data
      window.currentBundleData = null;
      
      // Clear any bundle-specific localStorage entries
      const currentRoute = route || 'default';
      const keysToRemove = [
        'telegramLink',
        'paymentCompleted',
        'kycCompleted',
        'digioCompleted',
        'esignCompleted',
        'currentOrderId',
        'paymentDetails',
        'currentBundle',
        'bundleData'
      ];
      
      // Remove all matching keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (keysToRemove.some(k => key === k || key.startsWith(`${k}_`))) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear route-specific keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(`${key}_${currentRoute}`);
      });
      
      // Force a state reset in child components
      setGroup(null);
      setLoading(true);
      setError(null);
      
      // Remove the logout parameter from URL without page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Force a re-render of the page
      window.dispatchEvent(new Event('storage'));
    }

    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && !e.newValue) {
        // Clear cached bundle data on logout
        sessionStorage.removeItem(cacheKey);
        setCachedData(null);
        window.currentBundleData = null;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [route, cacheKey]);

  const loadGroupData = useCallback(async () => {
    console.log("🔍 Fetching public group data for route:", route);
    
    if (!route) {
      console.error('❌ No route provided');
      setError('Invalid route');
      return;
    }
    
    try {
      // Try the direct public API first (no auth headers for public endpoint)
      console.log('🚀 Attempting API call:', `http://localhost:4000/api/groups/by-route/${route}`);
      let response = await fetch(`http://localhost:4000/api/groups/by-route/${route}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // Explicitly no Authorization header
        }
      });
      console.log("📡 Public API response status:", response.status);
      
      if (!response.ok) {
        // Try alternative API if direct route fails
        console.warn("📡 Direct public API failed, trying alternative approach");
        const allGroupsResponse = await fetch('http://localhost:4000/api/groups/active', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (allGroupsResponse.ok) {
          const allGroups = await allGroupsResponse.json();
          console.log("📊 All public groups:", allGroups);
          
          const targetGroup = Array.isArray(allGroups) 
            ? allGroups.find(group => group.customRoute === route)
            : null;
            
          if (targetGroup) {
            console.log("✅ Group found via alternative method:", targetGroup);
            setGroup(targetGroup);
            sessionStorage.setItem(cacheKey, JSON.stringify(targetGroup));
            return targetGroup;
          }
        }
        
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ Public group data received:", data);
      
      let groupData = null;
      if (data.success && data.group) {
        groupData = data.group;
      } else if (data.success && data.id) {
        groupData = data;
      } else {
        console.log("❌ PublicGroup Debug - Group not found or error:", data);
        setError(data.message || 'Group not found');
        return null;
      }
      
      console.log('🎯 Setting group data:', groupData);
      setGroup(groupData);
      sessionStorage.setItem(cacheKey, JSON.stringify(groupData));
      return groupData;
      
    } catch (error) {
      console.error('Error loading group data:', error);
      setError('Failed to load group data. Please try again later.');
      throw error;
    }
  }, [route, cacheKey]);

  const fetchGroupData = useCallback(async () => {
    try {
      setLoading(true);
      await loadGroupData();
    } catch (error) {
      console.error('Error fetching group:', error);
      setError('Failed to load group. Please check if the bundle exists.');
    } finally {
      setLoading(false);
    }
  }, [loadGroupData]);

  const fetchGroupDataBackground = useCallback(async () => {
    try {
      await loadGroupData();
    } catch (error) {
      console.error('Background fetch error:', error);
    }
  }, [loadGroupData]);

  useEffect(() => {
    // Use cached data immediately for instant display
    if (cachedData) {
      setGroup(cachedData);
      setLoading(false);
      // Still fetch fresh data in background
      fetchGroupDataBackground();
    } else {
      fetchGroupData();
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [route, cachedData, fetchGroupData, fetchGroupDataBackground]);

  // Store bundle data globally for header access
  useEffect(() => {
    if (group) {
      window.currentBundleData = group;
      // Also store customRoute in localStorage as backup for payment flow
      if (group.customRoute) {
        localStorage.setItem('currentBundleCustomRoute', group.customRoute);
      }

      // Cache the bundle data for faster loading
      try {
        sessionStorage.setItem(`bundle_${route}`, JSON.stringify(group));
      } catch (error) {
        console.warn('Could not cache bundle data:', error);
      }
    }
    return () => {
      // Only clear global data if user is logging out
      const isAuthenticated = localStorage.getItem('authToken');
      if (!isAuthenticated) {
        window.currentBundleData = null;
      }
    };
  }, [group, route]);

  // If user is authenticated and already purchased this bundle, redirect to dashboard to avoid re-purchase
  useEffect(() => {
    const maybeRedirectIfPurchased = async () => {
      try {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const phone = localStorage.getItem('userPhone');
        if (!isAuthenticated || !phone || !group?._id) return;

        const resp = await fetch(`http://localhost:4000/api/user/check-purchase/${encodeURIComponent(phone)}/${encodeURIComponent(group._id)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data?.success && data?.hasPurchased) {
          // Mark payment completed for bundle context and redirect
          setBundleSpecificValue('paymentCompleted', 'true');
          toast.info('Aapka is bundle ka plan pehle se active hai. Redirecting...');
          setTimeout(() => {
            const target = `/dashboard?phone=${encodeURIComponent(phone)}`;
            navigate(target);
          }, 1200);
        }
      } catch (e) {
        // silent
      }
    };
    if (group) {
      maybeRedirectIfPurchased();
    }
  }, [group, navigate]);

  // Check for completed payment after bundle loads or URL changes
  useEffect(() => {
    const checkPaymentCompletion = async () => {
      const userPhone = localStorage.getItem('userPhone');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      // Only check if user is authenticated and we have bundle data
      if (!isAuthenticated || !userPhone || !group?._id) {
        return;
      }
      
      // Check URL parameters for payment success indicators
      const urlParams = new URLSearchParams(location.search);
      const paymentStatus = urlParams.get('status');
      const orderId = urlParams.get('order_id');
      
      console.log('🔍 Checking payment completion parameters:');
      console.log('   Current URL:', window.location.href);
      console.log('   Search params:', location.search);
      console.log('   Payment status param:', paymentStatus);
      console.log('   Order ID param:', orderId);
      console.log('   User phone:', userPhone);
      console.log('   Is authenticated:', isAuthenticated);
      console.log('   Bundle ID:', group?._id);
      
      try {
        // If URL indicates successful payment, check and update status
        if (paymentStatus === 'success' && orderId) {
          console.log('🎉 Payment success detected in URL:', { paymentStatus, orderId });
          
          // Fetch payment details to confirm success
          const paymentResponse = await fetch(`http://localhost:4000/api/payment/details/${orderId}`);
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            console.log('💳 Payment details retrieved:', paymentData);
            
            if (paymentData.status === 'SUCCESS') {
              console.log('✅ Payment confirmed as SUCCESS, updating step status');
              // Mark payment as completed for this bundle
              setBundleSpecificValue('paymentCompleted', 'true');
              
              // Show success toast
              toast.success('Payment completed successfully! 🎉', {
                position: "top-center",
                autoClose: 5000,
              });
              
              // Clean up URL parameters to prevent re-processing
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
              
              // Check if there's a next required step and redirect
              const nextStep = getNextRequiredStep();
              if (nextStep) {
                console.log(`🎯 Payment complete, redirecting to next step: ${nextStep}`);
                setTimeout(() => {
                  const nextPath = getNextStepRedirectPath();
                  navigate(nextPath);
                }, 3000);
              }
              
            } else if (paymentData.status === 'PENDING') {
              console.log('⏳ Payment still pending, attempting to mark as success');
              // Try to manually mark as success since user reached success page
              try {
                await fetch(`http://localhost:4000/api/payment/mark-success/${orderId}`, {
                  method: 'POST'
                });
                console.log('✅ Payment manually marked as success');
                setBundleSpecificValue('paymentCompleted', 'true');
                toast.success('Payment completed successfully! 🎉');
                
                // Clean up URL
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                
                // Check if there's a next required step and redirect
                const nextStep = getNextRequiredStep();
                if (nextStep) {
                  console.log(`🎯 Payment complete, redirecting to next step: ${nextStep}`);
                  setTimeout(() => {
                    const nextPath = getNextStepRedirectPath();
                    navigate(nextPath);
                  }, 3000);
                }
              } catch (markError) {
                console.warn('⚠️ Could not mark payment as success:', markError);
              }
            }
          }
        } else {
          // Check if user has any successful payments for this bundle
          console.log('🔍 No URL params, checking purchase status via API...');
          const checkResponse = await fetch(`http://localhost:4000/api/user/check-purchase/${userPhone}/${group._id}`);
          if (checkResponse.ok) {
            const purchaseData = await checkResponse.json();
            console.log('📋 Purchase check response:', purchaseData);
            if (purchaseData.success && purchaseData.hasPurchased) {
              console.log('✅ User has purchased this bundle, updating step status');
              setBundleSpecificValue('paymentCompleted', 'true');
              
              // Also check the subscription status in more detail
              if (purchaseData.subscription && purchaseData.subscription.status === 'SUCCESS') {
                console.log('🎆 Payment status confirmed as SUCCESS in database');
                
                // Force a refresh of the localStorage and trigger step updates
                window.dispatchEvent(new Event('storage'));
                
                // Show success toast
                toast.success('Welcome back! Your payment was successful. 🎉', {
                  position: "top-center",
                  autoClose: 3000,
                });
                
                // Check if there's a next required step and redirect after a delay
                setTimeout(() => {
                  const nextStep = getNextRequiredStep();
                  if (nextStep) {
                    console.log(`🎯 Purchase confirmed, redirecting to next step: ${nextStep}`);
                    const nextPath = getNextStepRedirectPath();
                    navigate(nextPath);
                  }
                }, 3000);
              }
            } else {
              console.log('❌ No purchase found for this user/bundle combination');
            }
          } else {
            console.error('❌ Failed to check purchase status:', checkResponse.status);
          }
        }
      } catch (error) {
        console.error('❌ Error checking payment completion:', error);
      }
    };
    
    // Run the check when group loads or location changes
    if (group) {
      checkPaymentCompletion();
    }
  }, [group, location.search, navigate]);

  if (loading && !cachedData) {
    return (
      <div className="bg-[#f4f4fb] dark:bg-[#1a1a2a] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Channel Bundle Not Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#f4f4fb] dark:bg-[#1a1a2a]">
        <BundleCard bundleData={group} />
        <HowItWorks bundleData={group} />
        <ContentSection />
        <Disclaimer />
      </div>
    </>
  );
};

export default PublicGroup;