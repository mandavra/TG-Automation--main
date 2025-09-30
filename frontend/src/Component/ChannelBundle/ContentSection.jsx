import React, { useState } from 'react';

const ContentSection = ({ bundle }) => {
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Default content if bundle doesn't have custom content
  const defaultContent = {
    title: "Premium Content",
    subtitle: "What You'll Get",
    description: "Access exclusive content and premium features designed for your success.",
    details: [
      "📊 Daily market analysis and insights",
      "💡 Expert tips and strategies",
      "📈 Real-time updates and alerts",
      "🎯 Personalized recommendations",
      "💬 Community discussions and Q&A",
      "📚 Educational resources and tutorials"
    ],
    expandedText: `Join thousands of satisfied subscribers who have transformed their approach with our premium content. 
    Our expert team provides carefully curated insights, analysis, and strategies that you won't find anywhere else.
    
    With regular updates, interactive sessions, and a supportive community, you'll have everything you need to succeed.`
  };

  const content = bundle?.contentSection || defaultContent;

  const toggleMoreText = () => {
    setExpanded(!expanded);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  if (!content || content.hidden) return null;

  return (
    <div className="py-12 md:py-16 bg-white dark:bg-gray-800">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="max-w-[500px] mx-auto p-6 rounded-xl shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {content.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {content.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
              >
                <svg 
                  className={`w-5 h-5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {content.description}
            </p>

            {/* Content Details */}
            {content.details && content.details.length > 0 && (
              <div className="bg-white/50 dark:bg-gray-700/30 rounded-lg p-4 space-y-2">
                {content.details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 text-sm">•</span>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      {detail}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Expandable Text */}
            {content.expandedText && (
              <>
                {expanded && (
                  <div className="mt-4 p-4 bg-white/70 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                      {content.expandedText}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={toggleMoreText}
                  className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline transition-colors"
                >
                  {expanded ? 'Show less' : 'Learn more...'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentSection;