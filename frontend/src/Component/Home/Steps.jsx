import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, ArrowDownCircle, FileClock, Circle, AlertCircle, Link as LinkIcon } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { getNextStepRedirectPath, getBundleSpecificValue, isKYCRequired } from "../../utils/featureToggleUtils";
import { verifyUserSteps, getUserInviteLinks } from '../../utils/serverVerification';
import { forceRefreshStepStatusFromDatabase } from '../../utils/stepPersistenceUtils';
import { getFormattedUserPhone } from '../../utils/phoneUtils';
import Card from "./Card";
import SubscriptionStatus from "../Subscription/SubscriptionStatus";
import axios from 'axios';

const getStepStatus = (stepNumber, currentStep, serverSteps, bundleConfig) => {
    const userPhone = getFormattedUserPhone();

    // Fallback if server not yet loaded
    if (!serverSteps) {
        if (stepNumber === 1) return userPhone ? "completed" : "current";
        if (!userPhone) return "pending";
        return stepNumber === currentStep ? "current" : (stepNumber < currentStep ? "completed" : "pending");
    }

    const kycRequired = bundleConfig?.kycRequired !== false;
    const esignRequired = bundleConfig?.esignRequired !== false;

    if (stepNumber === 1) {
        return serverSteps.registration ? "completed" : "current";
    }
    if (stepNumber === 2) {
        return serverSteps.payment ? "completed" : "current";
    }
    if (stepNumber === 3) {
        if (!kycRequired) return "completed";
        return serverSteps.kyc ? "completed" : "current";
    }
    if (stepNumber === 4) {
        if (!esignRequired) return "completed";
        return serverSteps.esign ? "completed" : "current";
    }
    return "pending";
};

const getStepIcon = (status, defaultIcon) => {
    if (status === "completed") return CheckCircle;
    if (status === "current") return AlertCircle;
    if (status === "pending") return Circle;
    return defaultIcon;
};

const steps = [
    {
        title: "Step 1",
        description: "Register With Mobile number and OTP",
        icon: CheckCircle
    },
    {
        title: "Step 2",
        description: "Select Plans and make Payment",
        icon: FileClock
    },
    {
        title: "Step 3",
        description: "Complete KYC And Receive Link",
        icon: ArrowDownCircle,
    },
    {
        title: "Step 4",
        description: "Sign Document with Digio",
        icon: FileClock,
    }
];

export default function HowItWorks() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showPlans, setShowPlans] = useState(false);
    const [telegramLink, setTelegramLink] = useState("");
    const [channelLinks, setChannelLinks] = useState([]);
    const [serverSteps, setServerSteps] = useState(null);
    const [bundleConfig, setBundleConfig] = useState(null);
    const [allStepsCompleteServer, setAllStepsCompleteServer] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Get the current bundle route for scoped storage
    const bundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';

    // Define fetchInviteLink with useCallback to prevent recreation on every render
    const fetchInviteLink = useCallback(async () => {
        let isMounted = true;

        // Cleanup to prevent state updates on unmounted component
        const cleanup = () => { isMounted = false; };

        try {
            console.log('Fetching invite links from backend...');
            const userPhone = getFormattedUserPhone();
            if (!userPhone) {
                setTelegramLink("Please login first");
                return cleanup;
            }

            // Try to fetch links with short polling if steps are complete
            const maxRetries = 6;
            const delayMs = 2000;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const linksResp = await getUserInviteLinks(userPhone);
                if (linksResp.success && (linksResp.links || []).length > 0) {
                    const allLinks = linksResp.links.map(l => ({
                        link: l.inviteLink || l.link,
                        channelTitle: l.channelTitle || 'Channel',
                        bundleName: l.groupName || l.bundleName || 'Bundle',
                        createdAt: l.createdAt,
                        isUsed: l.is_used || l.isUsed
                    }));
                    const firstLink = allLinks[0].link;
                    if (isMounted) {
                        setTelegramLink(firstLink);
                        setChannelLinks(allLinks);
                    }
                    return cleanup;
                }
                // If not found yet and we have steps indicating payment done, retry after delay
                await new Promise(r => setTimeout(r, delayMs));
                if (!isMounted) return cleanup;
            }

            // Fallback 1: Try channel-bundles path via userId
            try {
                const userResp = await axios.get(`http://localhost:5173/api/public-user/by-phone/${encodeURIComponent(userPhone)}`);
                const user = userResp.data?.user;
                if (user?._id || user?.id) {
                    const uid = user._id || user.id;
                    const bundlesResp = await axios.get(`http://localhost:5173/api/channel-bundles/user/${uid}/channel-bundles`);
                    const channelBundles = bundlesResp.data?.channelBundles || [];
                    const activeBundles = channelBundles.filter(b => b.isActive);
                    const allLinks = [];
                    activeBundles.forEach(b => {
                        (b.inviteLinks || []).forEach(link => {
                            allLinks.push({
                                link: link.link,
                                channelTitle: link.channelTitle || 'Channel',
                                bundleName: b.channelBundle?.name || 'Bundle',
                                expiresAt: link.expiresAt,
                                isUsed: link.isUsed
                            });
                        });
                    });
                    if (allLinks.length > 0) {
                        const firstLink = allLinks[0].link;
                        if (isMounted) {
                            setTelegramLink(firstLink);
                            setChannelLinks(allLinks);
                        }
                        return cleanup;
                    }
                }
            } catch (_) { }

            // Fallback 2: Force regenerate links then fetch again once
            try {
                await axios.post(`http://localhost:5173/api/step-verification/regenerate-links/${encodeURIComponent(userPhone)}`, { reason: 'frontend_auto_retry' });
                const linksResp2 = await getUserInviteLinks(userPhone);
                if (linksResp2.success && (linksResp2.links || []).length > 0) {
                    const allLinks = linksResp2.links.map(l => ({
                        link: l.inviteLink || l.link,
                        channelTitle: l.channelTitle || 'Channel',
                        bundleName: l.groupName || l.bundleName || 'Bundle',
                        createdAt: l.createdAt,
                        isUsed: l.is_used || l.isUsed
                    }));
                    const firstLink = allLinks[0].link;
                    if (isMounted) {
                        setTelegramLink(firstLink);
                        setChannelLinks(allLinks);
                    }
                    return cleanup;
                }
            } catch (_) { }

            if (isMounted) setTelegramLink("No active subscription found");
            return cleanup;
        } catch (error) {
            console.error('Error fetching invite links:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            if (isMounted) setTelegramLink("Error loading links. Please refresh or contact support.");
            return cleanup;
        }
    }, [bundleRoute]);

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const checkAuthAndFetchLinks = () => {
            try {
                const userPhone = getFormattedUserPhone();
                const isAuthenticated = !!userPhone;

                if (isMounted) {
                    setIsLoggedIn(isAuthenticated);
                }

                if (isAuthenticated) {
                    (async () => {
                        try {
                            const verification = await verifyUserSteps(userPhone);
                            if (isMounted && verification.success) {
                                setServerSteps(verification.steps);
                                setBundleConfig(verification.bundleConfig || null);
                                setAllStepsCompleteServer(!!verification.allStepsCompleted);

                                // Map to currentStep for timeline UI
                                const s = verification.steps;
                                if (s.esign) setCurrentStep(4);
                                else if (s.kyc) setCurrentStep(3);
                                else if (s.payment) setCurrentStep(2);
                                else setCurrentStep(1);

                                // Proactively fetch invite links when all steps are completed (server truth)
                                if (verification.allStepsCompleted) {
                                    fetchInviteLink();
                                }
                            }
                        } catch (_) { }
                    })();
                } else {
                    // Clear any existing link data if not authenticated
                    setTelegramLink("");
                    setChannelLinks([]);
                    setCurrentStep(1);
                }
            } catch (error) {
                console.error('Error in auth check:', error);
                if (isMounted) {
                    setTelegramLink("Error checking authentication");
                }
            }
        };

        // Initial check
        checkAuthAndFetchLinks();

        // Set up interval for periodic checks (e.g., for session changes in other tabs)
        timeoutId = setInterval(checkAuthAndFetchLinks, 30000); // Check every 30 seconds

        // Cleanup function
        return () => {
            isMounted = false;
            if (timeoutId) {
                clearInterval(timeoutId);
            }
        };
    }, [bundleRoute, fetchInviteLink]);

    const handleStepClick = (stepNumber) => {
        const userPhone = getFormattedUserPhone();
        // Use backend-verified steps instead of localStorage
        const paymentCompleted = serverSteps?.payment === true;
        const kycCompleted = serverSteps?.kyc === true;

        if (stepNumber === 1) {
            const redirectTo = encodeURIComponent(`${location.pathname}${location.search}`);
            navigate(`/login?redirect=${redirectTo}`);
            return;
        }

        if (!userPhone) {
            navigate('/login');
            return;
        }

        if (stepNumber === 2) {
            // Always navigate to plans/payment page
            const route = (bundleData?.customRoute) || localStorage.getItem('currentBundleCustomRoute');
            navigate(`/pc/${bundleRoute}`);
            return;
        } else if (stepNumber === 3) {
            // Always navigate to KYC form if required
            if (isKYCRequired()) {
                if (!paymentCompleted) {
                    alert('Please complete payment before KYC.');
                    return;
                }
                navigate('/kycForm');
            } else {
                alert('KYC is not required for your bundle.');
            }
            return;
        } else if (stepNumber === 4) {
            // Always navigate to eSign if allowed
            const kycRequired = isKYCRequired();
            const kycDone = !kycRequired || kycCompleted;
            if (!paymentCompleted) {
                alert('Please complete payment before eSign.');
                return;
            }
            if (!kycDone) {
                alert('Please complete KYC before eSign.');
                return;
            }
            const nextPath = getNextStepRedirectPath();
            navigate(nextPath);
            return;
        }
    };

    const isClickable = (index) => {
        const userPhone = getFormattedUserPhone();
        const status = getStepStatus(index + 1, currentStep, serverSteps, bundleConfig);
        // Only clickable if not completed and user is logged in (except for step 1)
        return status !== 'completed' && (index === 0 || (index > 0 && userPhone));
    };

    const isAllStepsCompleted = () => {
        return !!allStepsCompleteServer;
    };

    useEffect(() => {
        const checkCompletion = () => {
            // No-op: server-driven completion already in state
        };

        checkCompletion();

        window.addEventListener('storage', checkCompletion);

        return () => window.removeEventListener('storage', checkCompletion);
    }, []);

    return (
        <div className="relative">
            {isAllStepsCompleted() ? (
                <div className="max-w-full sm:max-w-xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
                    <div className="p-4 sm:p-6 border-2 border-green-500 rounded-lg shadow-lg bg-white dark:bg-gray-800">
                        <p className="text-center text-green-600 font-medium text-base sm:text-lg mb-4">
                            {"Congratulations! You have successfully completed all the required steps."}
                        </p>

                        <div className="mt-4 p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg shadow-md">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                    <LinkIcon className="text-blue-500 dark:text-blue-300" size={18} />
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Your Channel Access Links ({channelLinks.length} available):
                                </span>
                            </div>

                            {/* Display all available channel links */}
                            <div className="space-y-3">
                                {channelLinks.length > 0 ? channelLinks.map((linkData, index) => (
                                    <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {linkData.channelTitle}
                                                    <span className="text-xs text-gray-500 ml-1">({linkData.bundleName})</span>
                                                </h4>
                                                {linkData.expiresAt && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Expires: {new Date(linkData.expiresAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            {linkData.isUsed && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Joined
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <a
                                                href={linkData.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                </svg>
                                                Join Channel
                                            </a>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(linkData.link);
                                                    alert(`Link copied for ${linkData.channelTitle}!`);
                                                }}
                                                className="px-3 py-2 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                                </svg>
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                                            {telegramLink || "No active channel links available. Please contact support if you believe this is an error."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="max-w-full sm:max-w-xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 dark:text-white bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            How it Works
                        </h2>
                        <div className="relative ml-0 sm:ml-6 space-y-6 sm:space-y-8">
                            {steps.map((step, index) => {
                                const status = getStepStatus(index + 1, currentStep, serverSteps, bundleConfig);
                                const canClick = isClickable(index);

                                return (
                                    <div
                                        key={index}
                                        className={`group flex items-start relative transition-all duration-300 hover:scale-[1.02] ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                                        onClick={() => canClick && handleStepClick(index + 1)}
                                    >
                                        <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300
                                            ${status === "completed" ? "bg-green-500 border-green-500 shadow-lg shadow-green-500/30 group-hover:shadow-xl" :
                                                status === "current" ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/30 group-hover:shadow-xl" :
                                                    "bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 group-hover:border-gray-500 dark:group-hover:border-gray-500"}
                                        `}>
                                            {React.createElement(getStepIcon(status, step.icon), {
                                                className: `
                                                    transition-all duration-300 group-hover:scale-110
                                                    ${status === "completed" ? "text-white" :
                                                        status === "current" ? "text-white" :
                                                            "text-gray-500 dark:text-gray-400"}
                                                `,
                                                size: 24
                                            })}
                                        </div>

                                        <div className={`ml-4 sm:ml-6 px-4 py-3 sm:px-6 sm:py-4 rounded-xl flex-1 relative transition-all duration-300
                                            ${status === "current" ? "shadow-lg shadow-red-500/20 bg-white dark:bg-gray-800 group-hover:shadow-xl" :
                                                status === "completed" ? "bg-white dark:bg-gray-800 shadow-lg shadow-green-500/20 group-hover:shadow-xl" :
                                                    "bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm group-hover:bg-white dark:group-hover:bg-gray-800 group-hover:shadow-lg"}
                                        `}>
                                            <h3 className={`text-base sm:text-lg font-semibold mb-2 transition-colors duration-300
                                                ${status === "completed" ? "text-green-600 dark:text-green-400" :
                                                    status === "current" ? "text-black dark:text-white" :
                                                        "text-black dark:text-white"}
                                            `}>
                                                {step.title}
                                            </h3>
                                            <p className={`text-sm sm:text-base transition-colors duration-300
                                                ${status === "completed" ? "text-green-600 dark:text-green-400" :
                                                    status === "current" ? "text-gray-700 dark:text-gray-200" :
                                                        "text-gray-600 dark:text-gray-300"}
                                            `}>
                                                {status === "completed" ? (
                                                    // Check if step was skipped due to being disabled
                                                    (index === 2 && bundleConfig?.kycRequired === false) || (index === 3 && bundleConfig?.esignRequired === false) ?
                                                        "This step is not required" : "This step is completed"
                                                ) : step.description}
                                            </p>
                                        </div>

                                        {index < steps.length - 1 && (
                                            <div className="absolute left-5 sm:left-6 top-12 sm:top-14 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 -ml-px"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {showPlans && !window.currentBundleData && (
                        <div className="mt-8 px-4 sm:px-6">
                            <Card />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
