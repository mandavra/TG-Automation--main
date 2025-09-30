import React from "react";

const Disclaimer = () => {
    return (
        <div className="dark:bg-gray-900 py-8 md:py-16 px-4 md:px-6 text-center transition-colors duration-300">
            <h1 className="text-xl md:text-3xl font-semibold text-black dark:text-white mb-4 md:mb-6">
                Disclaimer
            </h1>
            <p className="text-gray-800 dark:text-gray-300 w-[90%] sm:w-[85%] md:w-[80%] lg:max-w-3xl mx-auto text-xs md:text-base leading-relaxed px-2 sm:px-4 md:px-6">
                Cosmofeed Technologies Pvt. Ltd. shall not be held liable for any content or materials
                published, sold, or distributed by content creators on our associated apps or websites.
                <br /><br />
                We do not endorse or take responsibility for the accuracy, legality, or quality of their content.
                <br /><br />
                Users must exercise their own judgment and discretion when relying on such content.
                <br /><br />
                Cosmofeed disclaims all liability for any losses or damages incurred.
                <br /><br />
                By using our services, you agree to these terms.{" "}
                <span className="underline cursor-pointer text-blue-600 dark:text-blue-400">
                    Learn more.
                </span>
            </p>
        </div>
    );
};

export default Disclaimer;
