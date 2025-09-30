import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { completeStepAndGetNextPath, getNextRequiredStep, areAllRequiredStepsCompleted, getNextStepRedirectPath } from '../utils/featureToggleUtils';
import { triggerCompletionCelebration } from '../utils/confettiUtils';
import { markStepCompletedInDatabase, verifyStepCompletionFromDatabase } from '../utils/stepPersistenceUtils';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [nextStep, setNextStep] = useState('');

  useEffect(() => {
    const processPaymentSuccess = async () => {
      // Extract order_id from URL parameters
      const urlParams = new URLSearchParams(location.search);
      const orderId = urlParams.get('order_id');
      
      let customRoute = null; // Track customRoute for redirection
      
      try {
        // If we have order_id, fetch the payment details to get bundle data
        if (orderId) {
          const response = await axios.get(`http://localhost:4000/api/payment/details/${orderId}`);
          const paymentData = response.data;
          
          console.log('Payment details received:', paymentData);
          
          // Check if payment is successful but webhook hasn't processed yet
          // Note: API returns status directly, not nested in data object
          if (paymentData && paymentData.status !== 'SUCCESS') {
            console.log('Payment found but not marked as SUCCESS yet - likely webhook delay');
            console.log('Current payment status:', paymentData.status);
            
            // Manually mark payment as successful since user reached success page
            try {
              const updateResponse = await axios.post(`http://localhost:4000/api/payment/mark-success/${orderId}`);
              console.log('Payment status updated to SUCCESS:', updateResponse.data);
              
              // Update local paymentData status for immediate use
              paymentData.status = 'SUCCESS';
            } catch (updateError) {
              console.warn('Could not update payment status:', updateError.message);
            }
          }
          
        // Try to get bundle data from payment details
        if (paymentData.bundleId) {
          console.log('🏦 Need bundle data for ID:', paymentData.bundleId);
          
          // First check if we already have bundle data loaded (from PublicGroup)
          if (window.currentBundleData && window.currentBundleData.id === paymentData.bundleId) {
            console.log('✅ Using existing bundle data from window');
            console.log('🎁 Existing bundle data:', window.currentBundleData);
            console.log('🎯 Feature toggles from existing data:', window.currentBundleData?.featureToggles);
            customRoute = window.currentBundleData.customRoute;
          } else {
            // Try to get customRoute first so we can use public API
            const storedRoute = localStorage.getItem('currentBundleCustomRoute') || 
                               sessionStorage.getItem('currentBundleCustomRoute');
            
            if (storedRoute) {
              console.log('🌐 Fetching bundle data via public API for route:', storedRoute);
              try {
                const bundleResponse = await axios.get(`http://localhost:4000/api/groups/by-route/${storedRoute}`);
                console.log('📋 Public bundle API response:', bundleResponse.data);
                const bundleData = bundleResponse.data.group;
                console.log('🎁 Extracted bundle data:', bundleData);
                console.log('🎯 Feature toggles from bundle:', bundleData?.featureToggles);
                window.currentBundleData = bundleData;
                customRoute = bundleData.customRoute;
              } catch (publicApiError) {
                console.warn('⚠️ Public API also failed:', publicApiError.message);
                // Will fall back to default toggles below
              }
            } else {
              console.warn('⚠️ No custom route available, cannot fetch bundle data');
            }
          }
        }
        }
        
        // Also try to get customRoute from localStorage or current window data as backup
        if (!customRoute) {
          customRoute = window.currentBundleData?.customRoute || 
                       localStorage.getItem('currentBundleCustomRoute') ||
                       sessionStorage.getItem('currentBundleCustomRoute');
        }
        
        // If still no bundle data or feature toggles, try to get from URL or wait for bundle page load
        if (!window.currentBundleData || !window.currentBundleData.featureToggles) {
          console.log('⚠️ No bundle data available yet - will redirect to bundle page to load it');
          // Don't set default toggles to false - let the bundle page handle this
          // Just ensure we have basic structure with customRoute for redirect
          if (!window.currentBundleData) {
            window.currentBundleData = {
              customRoute: customRoute
            };
          } else if (customRoute && !window.currentBundleData.customRoute) {
            window.currentBundleData.customRoute = customRoute;
          }
        }
        
        // CRITICAL: Mark payment as completed in database with bulletproof persistence
        const userPhone = localStorage.getItem('userPhone');
        if (userPhone && customRoute) {
          try {
            console.log('💾 CRITICAL: Saving payment completion to database...');
            const paymentCompletionData = {
              orderId,
              paymentData,
              bundleRoute: customRoute,
              amount: paymentData?.amount,
              paymentMethod: paymentData?.paymentMethod || 'unknown'
            };
            
            await markStepCompletedInDatabase(
              userPhone,
              (window.currentBundleData && (window.currentBundleData._id || window.currentBundleData.id)) || customRoute,
              'payment',
              paymentCompletionData
            );
            console.log('✅ Payment completion SAVED to database successfully');
            
          } catch (dbError) {
            console.error('🚨 CRITICAL: Failed to save payment to database:', dbError);
            // Payment completion will be saved to localStorage as backup in markStepCompletedInDatabase
          }
        }
        
        // Complete the payment step and get next path
        console.log('🔍 Step Detection Debug:');
        console.log('   Current bundle data:', window.currentBundleData);
        console.log('   Feature toggles:', window.currentBundleData?.featureToggles);
        console.log('   User phone:', userPhone);
        
        const redirectPath = completeStepAndGetNextPath('payment');
        console.log('📍 Redirect path from completeStepAndGetNextPath:', redirectPath);
        
        const nextRequiredStep = getNextRequiredStep();
        console.log('🎯 Next required step:', nextRequiredStep);
        
        // Check if all required steps are now completed
        const allStepsCompleted = areAllRequiredStepsCompleted();
        console.log('✅ All steps completed:', allStepsCompleted);
        
        // Determine step name for display
        let stepName = 'completion';
        if (nextRequiredStep === 'kyc') {
          stepName = 'KYC verification';
        } else if (nextRequiredStep === 'esign') {
          stepName = 'document signing';
        }
        
        console.log('🏷️ Step name for display:', stepName);
        
        setNextStep(stepName);
        
        // Trigger confetti celebration if all steps are completed
        if (allStepsCompleted) {
          // Trigger confetti after a short delay to let the success message appear first
          setTimeout(() => {
            triggerCompletionCelebration();
          }, 500);
        }
        
        // If KYC is the next required step, redirect immediately for smoother UX
        if (nextRequiredStep === 'kyc') {
          const nextPath = getNextStepRedirectPath();
          console.log('🚀 Immediate redirect to KYC:', nextPath);
          navigate(nextPath);
          return; // Prevent scheduling the delayed redirect
        }

        // Redirect after 2 seconds to next required step (for other steps)
        const timer = setTimeout(() => {
          if (nextRequiredStep) {
            console.log(`🎯 Redirecting to next step: ${nextRequiredStep}`);
            const nextPath = getNextStepRedirectPath();
            navigate(nextPath);
          } else {
            // All steps completed - redirect to user dashboard
            const userPhone = localStorage.getItem('userPhone');
            if (userPhone) {
              console.log('✅ All steps completed, redirecting to dashboard');
              navigate(`/dashboard?phone=${userPhone}`);
            } else if (customRoute) {
              // Fallback: redirect back to the bundle page to show completion
              console.log('🔄 Fallback: redirecting to bundle page');
              navigate(`/pc/${customRoute}`);
            } else {
              navigate('/'); // Final fallback
            }
          }
        }, 2000);
        return () => clearTimeout(timer);
        
      } catch (error) {
        console.error('Error fetching payment/bundle data:', error);
        
        // Try to get customRoute from backup sources even in error case
        if (!customRoute) {
          customRoute = window.currentBundleData?.customRoute || 
                       localStorage.getItem('currentBundleCustomRoute') ||
                       sessionStorage.getItem('currentBundleCustomRoute');
        }
        
        // Fallback - assume both toggles OFF for safe completion
        // But preserve any existing bundle data (especially customRoute)
        window.currentBundleData = {
          ...window.currentBundleData, // Preserve existing data
          featureToggles: {
            enableKYC: false,
            enableESign: false
          },
          customRoute: customRoute || window.currentBundleData?.customRoute // Use tracked customRoute
        };
        
        const redirectPath = completeStepAndGetNextPath('payment');
        setNextStep('completion');
        
        setTimeout(() => {
          // If we have customRoute, redirect back to the bundle page
          if (customRoute) {
            navigate(`/pc/${customRoute}`);
          } else {
            navigate(redirectPath); // Fallback to original logic
          }
        }, 2000);
      }
    };
    
    processPaymentSuccess();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
        <p className="text-gray-600">
          {nextStep === 'completion' 
            ? 'Redirecting to your channels...' 
            : `Redirecting to ${nextStep}...`
          }
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;