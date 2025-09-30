import React, { useState } from 'react';

const Loreams = () => {
    const [expanded, setExpanded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const toggleMoreText = () => {
        setExpanded(!expanded);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    return (
        <div className="max-w-[500px] mx-auto p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hidden sm:block">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Equity + F&O
                </h2>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <svg 
                            className={`w-5 h-5 text-blue-500 ${isRefreshing ? 'animate-spin-slow' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="2" 
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                            />
                        </svg>
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                        Premium
                    </span>
                </div>
            </div>
            
            <ul className="space-y-3">
                {[
                    "Weekly 0-5 Equity Tips for Swing Trades",
                    "Longterm Equity Tips For Wealth Creation",
                    "Exclusive Wealth Creation Module",
                    "Daily Market News & Exclusive Market Analysis",
                    "Some Exclusive Research Reports",
                    "Priority Chat Available with me even in market hours too"
                ].map((item, index) => (
                    <li key={index} className="flex items-start space-x-3 text-gray-700 dark:text-gray-300">
                        <svg className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{item}</span>
                    </li>
                ))}

                {expanded && (
                    <>
                        {[
                            "Daily 0-5 Options Calls (All Index)",
                            "Options Buying",
                            "Exclusive Intraday News & Research",
                            "Option Buying Setup",
                            "Live chat with me in Market hours too..."
                        ].map((item, index) => (
                            <li key={index} className="flex items-start space-x-3 text-gray-700 dark:text-gray-300">
                                <svg className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{item}</span>
                            </li>
                        ))}
                        
                        <li className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                            <strong className="text-yellow-800 dark:text-yellow-200">Disclaimer:</strong>{' '}
                            <a
                                href="/"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                https://index-expert.in/disclaimer
                            </a>
                        </li>
                        
                        <li className="text-red-500 font-medium flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>FEES ARE 100% non refundable.</span>
                        </li>
                        
                        <li className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            We reserve right to cancel membership before duration or we also reserve right to change duration of membership. Any type of bad words/spam/abusive language used by members is not allowed & we cancel your membership or terminate it without any refund.
                        </li>
                    </>
                )}
            </ul>
            
            <button
                onClick={toggleMoreText}
                className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
            >
                <span>{expanded ? 'Show Less' : 'Show More'}</span>
                <svg 
                    className={`w-5 h-5 transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>
    );
};

export default Loreams;
