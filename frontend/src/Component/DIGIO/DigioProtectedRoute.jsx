import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isESignRequired, isKYCRequired, isPaymentRequired, getBundleSpecificValue, getNextStepRedirectPath } from "../../utils/featureToggleUtils";

const DigioProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [bundleDataLoaded, setBundleDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadBundleDataIfNeeded = async () => {
      // If bundle data already exists, we're good
      if (window.currentBundleData) {
        setBundleDataLoaded(true);
        setIsLoading(false);
        return;
      }
      
      // Try to load bundle data from localStorage or URL
      const currentBundleCustomRoute = localStorage.getItem('currentBundleCustomRoute');
      const userPhone = localStorage.getItem('userPhone');
      
      if (currentBundleCustomRoute && userPhone) {
        try {
          console.log('🔄 Loading bundle data for route:', currentBundleCustomRoute);
          
          // Fetch bundle data from the API
          const response = await fetch(`http://localhost:4000/api/groups/route/${currentBundleCustomRoute}`);
          if (response.ok) {
            const bundleData = await response.json();
            window.currentBundleData = bundleData;
            console.log('✅ Bundle data loaded:', bundleData);
            setBundleDataLoaded(true);
          } else {
            console.warn('⚠️ Could not load bundle data, using defaults');
            setBundleDataLoaded(true); // Proceed with defaults
          }
        } catch (error) {
          console.error('❌ Error loading bundle data:', error);
          setBundleDataLoaded(true); // Proceed with defaults
        }
      } else {
        console.warn('⚠️ No bundle route or user phone found, using defaults');
        setBundleDataLoaded(true); // Proceed with defaults
      }
      
      setIsLoading(false);
    };
    
    loadBundleDataIfNeeded();
  }, []);
  
  // Show loading state while bundle data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Debug bundle data
  console.log('🔍 DigioProtectedRoute Debug:');
  console.log('   - Current bundle data:', window.currentBundleData);
  console.log('   - Location:', location.pathname);
  console.log('   - isESignRequired():', isESignRequired());
  
  // Check if e-signature is required for this bundle
  if (!isESignRequired()) {
    // E-sign is disabled - redirect to next step or completion instead of home
    const nextPath = getNextStepRedirectPath();
    console.log('🚫 E-Sign disabled for this bundle, redirecting to:', nextPath);
    return <Navigate to={nextPath} replace />;
  }
  
  // Check if payment is required and completed (if payment feature is enabled)
  if (isPaymentRequired()) {
    const isPaymentCompleted = getBundleSpecificValue("paymentCompleted") === "true";
    if (!isPaymentCompleted) {
      return <Navigate to="/" replace />;
    }
  }
  
  // Check if KYC is required and completed (if KYC feature is enabled)
  if (isKYCRequired()) {
    const isKycCompleted = getBundleSpecificValue("kycCompleted") === "true";
    if (!isKycCompleted) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default DigioProtectedRoute;
