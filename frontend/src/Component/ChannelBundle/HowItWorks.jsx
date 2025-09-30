import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowDownCircle, FileClock, Circle, AlertCircle, Link as LinkIcon, ExternalLink, Copy } from "lucide-react";
import { getBundleSpecificValue, isKYCRequired, isESignRequired } from "../../utils/featureToggleUtils";
import { syncStepCompletionWithBackend } from "../../utils/stepSyncUtils";
import { getComprehensiveStepStatus, forceRefreshStepStatusFromDatabase } from "../../utils/stepPersistenceUtils";

const HowItWorks = ({ bundle }) => {
  const [userSubscription, setUserSubscription] = useState(null);
  const [userInviteLinks, setUserInviteLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stepRefreshKey, setStepRefreshKey] = useState(0); // Force re-render when step status changes
  
  useEffect(() => {
    checkUserSubscriptionStatus();
  }, [bundle]);
  
  // Add immediate refresh when component mounts to ensure accurate step status
  useEffect(() => {
    const immediateRefresh = async () => {
      const userPhone = localStorage.getItem('userPhone');
      if (userPhone && bundle?._id) {
        console.log('🔄 HowItWorks: Immediate step status refresh on mount');
        try {
          await forceRefreshStepStatusFromDatabase(userPhone, bundle._id);
          console.log('✅ HowItWorks: Step status refreshed from database');
          // Force component re-render after step status refresh
          setStepRefreshKey(prev => prev + 1);
        } catch (error) {
          console.warn('⚠️ HowItWorks: Could not refresh step status:', error);
        }
      }
    };
    
    immediateRefresh();
  }, []); // Run once on mount
  
  const checkUserSubscriptionStatus = async () => {
    const userPhone = localStorage.getItem('userPhone');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated || !userPhone || !bundle?._id) {
      return;
    }

    try {
      setLoading(true);
      
      // CRITICAL: First force refresh step status from database to ensure accuracy
      await forceRefreshStepStatusFromDatabase(userPhone, bundle._id);
      // Force component re-render after step status refresh
      setStepRefreshKey(prev => prev + 1);
      
      // Check if user has subscription for this bundle
      const response = await fetch(`http://localhost:4000/api/user/check-purchase/${userPhone}/${bundle._id}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasPurchased) {
          setUserSubscription({
            ...data.subscription,
            completionStatus: data.completionStatus,
            flowStatus: data.flowStatus
          });
          
          // Sync step completion with backend data
          await syncStepCompletionWithBackend(data, userPhone, bundle._id);
          
          // If user has subscription, get their invite links
          if (data.subscription?.id) {
            await fetchUserInviteLinks(data.subscription.id);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking user subscription for How it Works:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserInviteLinks = async (subscriptionId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/user/subscription/${subscriptionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.inviteLinks) {
          setUserInviteLinks(data.data.inviteLinks);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching invite links:', error);
    }
  };
  
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show brief success feedback
      const event = window.event;
      const button = event?.target?.closest('button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('bg-green-500');
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-green-500');
        }, 2000);
      }
    } catch (error) {
      alert('Failed to copy. Please copy manually:\n\n' + text);
    }
  };
  // Create dynamic steps based on user's subscription status and localStorage completion flags
  // stepRefreshKey is used to force re-evaluation when step status changes
  const createDynamicSteps = () => {
    // Check localStorage completion flags (same logic as payment/KYC/e-sign flow)
    const paymentCompleted = getBundleSpecificValue('paymentCompleted') === 'true';
    const kycCompleted = getBundleSpecificValue('kycCompleted') === 'true';
    const digioCompleted = getBundleSpecificValue('digioCompleted') === 'true';
    const kycRequired = isKYCRequired();
    const esignRequired = isESignRequired();
    
    console.log('🎯 HowItWorks Step Completion Check:', {
      paymentCompleted,
      kycCompleted: kycRequired ? kycCompleted : 'N/A (not required)',
      digioCompleted: esignRequired ? digioCompleted : 'N/A (not required)',
      kycRequired,
      esignRequired
    });
    
    // Build dynamic steps based on feature toggles and completion status
    const steps = [];
    
    // Step 1: Payment (always required)
    steps.push({
      id: 1,
      title: "Subscribe to Plan",
      description: paymentCompleted 
        ? `✅ Payment completed successfully`
        : "Choose and subscribe to one of our premium plans",
      icon: "payment",
      status: paymentCompleted ? "completed" : "current"
    });
    
    // Step 2: KYC (if required)
    if (kycRequired) {
      steps.push({
        id: 2,
        title: "Complete KYC Verification",
        description: kycCompleted 
          ? `✅ KYC verification completed`
          : paymentCompleted 
            ? "📋 Complete your KYC verification to proceed"
            : "Complete KYC verification after payment",
        icon: "verification",
        status: kycCompleted ? "completed" : (paymentCompleted ? "current" : "pending")
      });
    }
    
    // Step 3: E-Sign (if required) 
    if (esignRequired) {
      const prevStepsComplete = paymentCompleted && (!kycRequired || kycCompleted);
      steps.push({
        id: steps.length + 1,
        title: "Sign Documents",
        description: digioCompleted 
          ? `✅ Document signing completed`
          : prevStepsComplete 
            ? "📝 Sign required documents to complete enrollment"
            : "Sign documents after completing previous steps",
        icon: "esign",
        status: digioCompleted ? "completed" : (prevStepsComplete ? "current" : "pending")
      });
    }
    
    // Final Step: Channel Access
    const allRequiredStepsComplete = paymentCompleted && 
      (!kycRequired || kycCompleted) && 
      (!esignRequired || digioCompleted);
      
    steps.push({
      id: steps.length + 1,
      title: "Get Channel Access", 
      description: allRequiredStepsComplete 
        ? `✅ All steps completed! Access your premium channels`
        : userSubscription?.inviteLinks?.length > 0
          ? "📱 Channel access links generated - join channels below" 
          : "Receive instant access to all premium channels",
      icon: "channels",
      status: allRequiredStepsComplete ? "completed" : 
        (userSubscription?.inviteLinks?.length > 0 ? "current" : "pending")
    });
    
    return steps;
  };

  // Always use dynamic steps that reflect actual completion status from localStorage
  // This ensures the UI shows the current step status, not static bundle data
  const steps = createDynamicSteps();
  
  // Check if all required steps are completed using localStorage flags
  const paymentCompleted = getBundleSpecificValue('paymentCompleted') === 'true';
  const kycCompleted = getBundleSpecificValue('kycCompleted') === 'true';
  const digioCompleted = getBundleSpecificValue('digioCompleted') === 'true';
  const allRequiredStepsComplete = paymentCompleted && 
    (!isKYCRequired() || kycCompleted) && 
    (!isESignRequired() || digioCompleted);
  
  const sectionTitle = allRequiredStepsComplete ? 
    "Your Journey - Completed! 🎉" : 
    (paymentCompleted || userSubscription ? "Your Journey Progress" : (bundle?.howItWorks?.title || "How It Works"));
    
  const sectionDescription = allRequiredStepsComplete ? 
    "Congratulations! You've completed all steps and can enjoy premium content." :
    (paymentCompleted || userSubscription ?
     "Track your progress and complete the remaining steps to access all premium content." :
     (bundle?.howItWorks?.description || "Get started in a few simple steps"));

  const getStepIcon = (iconType, status) => {
    const iconClasses = `w-8 h-8 ${
      status === "completed" 
        ? "text-green-600" 
        : status === "current" 
        ? "text-blue-600" 
        : "text-gray-400"
    }`;

    switch (iconType) {
      case "payment":
        return <FileClock className={iconClasses} />;
      case "verification":
        return <CheckCircle className={iconClasses} />;
      case "esign":
        return <FileClock className={iconClasses} />;
      case "channels":
        return <LinkIcon className={iconClasses} />;
      case "community":
        return <Circle className={iconClasses} />;
      case "learning":
        return <CheckCircle className={iconClasses} />;
      default:
        return <Circle className={iconClasses} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "current":
        return <ArrowDownCircle className="w-6 h-6 text-blue-600" />;
      case "pending":
        return <Circle className="w-6 h-6 text-gray-400" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <div key={stepRefreshKey} className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {sectionTitle}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {sectionDescription}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200 dark:bg-gray-700"></div>
              )}
              
              <div className={`flex items-start gap-4 p-6 rounded-2xl transition-all duration-300 ${
                step.status === "completed" 
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                  : step.status === "current"
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              }`}>
                
                {/* Step Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  step.status === "completed" 
                    ? "bg-green-100 dark:bg-green-900/40" 
                    : step.status === "current"
                    ? "bg-blue-100 dark:bg-blue-900/40"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}>
                  {getStepIcon(step.icon, step.status)}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Step {step.id}: {step.title}
                    </h3>
                    {getStatusIcon(step.status)}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                  
                  {/* Show Telegram links if this is the final channel access step and user has them */}
                  {step.icon === 'channels' && userInviteLinks.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Your Telegram Channel Links:
                      </h4>
                      <div className="space-y-2">
                        {userInviteLinks.map((link, linkIndex) => (
                          <div key={linkIndex} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {link.channelTitle || `Channel ${linkIndex + 1}`}
                              </p>
                              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                                {link.link}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {link.isUsed ? `✅ Joined on ${new Date(link.usedAt).toLocaleString()}` : '🔗 Ready to join'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => copyToClipboard(link.link)}
                                className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                              {!link.isUsed && (
                                <a
                                  href={link.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Join Now
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!userInviteLinks.some(link => link.isUsed) && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Click "Join Now" on each link to access your premium channels
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;