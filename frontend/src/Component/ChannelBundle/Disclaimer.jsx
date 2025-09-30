import React from "react";

const Disclaimer = ({ bundle }) => {
  // Default disclaimer if bundle doesn't have custom disclaimer
  const defaultDisclaimer = {
    title: "Disclaimer",
    content: `This channel bundle provides educational and informational content only. 
    
We do not guarantee any specific results or outcomes from the content provided in these channels.
    
Users must exercise their own judgment and discretion when acting on any information shared.
    
Past performance does not guarantee future results. All investments and decisions carry risk.
    
By subscribing, you agree to these terms and acknowledge that you understand the risks involved.`,
    learnMoreText: "Learn more about our terms.",
    learnMoreLink: "#"
  };

  const disclaimer = bundle?.disclaimer || defaultDisclaimer;

  if (!disclaimer || disclaimer.hidden) return null;

  return (
    <div className="dark:bg-gray-900 py-8 md:py-16 px-4 md:px-6 text-center transition-colors duration-300 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl md:text-3xl font-semibold text-black dark:text-white mb-4 md:mb-6">
          {disclaimer.title}
        </h1>
        <div className="text-gray-800 dark:text-gray-300 w-[90%] sm:w-[85%] md:w-[80%] lg:max-w-3xl mx-auto text-xs md:text-base leading-relaxed px-2 sm:px-4 md:px-6">
          {disclaimer.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph.trim()}
            </p>
          ))}
          
          {disclaimer.learnMoreText && (
            <span className="underline cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
              {disclaimer.learnMoreText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;