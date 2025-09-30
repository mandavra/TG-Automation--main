import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import groupActions from "../services/action/groupAction";

const Setuppage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [chatId, setChatId] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [linkingGroup, setLinkingGroup] = useState(false);
  
  const groupId = location.state?.groupId;
  const groupName = location.state?.groupName;

  // Redirect if no group ID
  useEffect(() => {
    if (!groupId) {
      toast.error('No group selected. Please create a group first.');
      navigate('/admin/Create-group');
    }
  }, [groupId, navigate]);

  const handleTestConnection = async () => {
    if (!chatId || !groupId) return;
    
    try {
      setTestingConnection(true);
      const result = await groupActions.testBotConnection(groupId, chatId);
      
      if (result.isAdmin) {
        toast.success(`✅ Bot connection successful! Chat: ${result.chatTitle} (${result.chatType})`);
      } else {
        toast.error('❌ Bot is not admin in this chat. Please add the bot as admin first.');
      }
    } catch (error) {
      toast.error('❌ Failed to test bot connection. Please check the chat ID and bot permissions.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFinishSetup = async () => {
    if (!chatId || !groupId) {
      toast.error('Please enter a valid Telegram Chat ID');
      return;
    }

    try {
      setLinkingGroup(true);
      await groupActions.linkTelegramGroup(groupId, chatId);
      
      toast.success('🎉 Group setup completed successfully!');
      
      // Navigate to groups page after a short delay
      setTimeout(() => {
        navigate('/admin/Group');
      }, 2000);
      
    } catch (error) {
      console.error('Error linking group:', error);
    } finally {
      setLinkingGroup(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border shadow-md max-w-5xl mx-auto my-7">
      {/* Heading */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Steps to follow for set-up
      </h2>

      {/* Info Box */}
      <div className="flex items-start gap-2 p-3 border rounded-md bg-gray-50 text-sm text-gray-600 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-500 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m0-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
        Please don't remove <span className="font-medium mx-1">Rigi_Robot</span>
        from the group as admin, or we won't be able to automatically give or
        remove access for users.
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6">
        <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-2">
          On Web
        </button>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Step 1 */}
        <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col">
          <img
            src="https://dd7s6xojfdqlr.cloudfront.net/common/telegram/telegram-desktop.png"
            alt="Telegram"
            className="w-full h-32 object-contain mb-3"
          />
          <h3 className="font-semibold text-sm mb-1">
            Step 1: Go to Telegram web app
          </h3>
          <p className="text-xs text-gray-500 flex-1">
            Select the group you want to link on your telegram web app
          </p>
          {/* <button className="mt-3 w-full border rounded-md py-1.5 text-sm font-medium hover:bg-gray-50">
            Go to telegram
          </button> */}
          <Link to="https://web.telegram.org/z/" target="_blank">
            <button className="mt-3 w-full border rounded-md py-1.5 text-sm font-medium hover:bg-gray-50">
              Go to telegram
            </button>
          </Link>
        </div>

        {/* Step 2 */}
        <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col">
          <img
            src="https://dd7s6xojfdqlr.cloudfront.net/common/telegram/telegram-rigi-bot.png"
            alt="Bot"
            className="w-full h-32 object-contain mb-3"
          />
          <h3 className="font-semibold text-sm mb-1">
            Step 2: Add Rigi_Robot as an admin
          </h3>
          <p className="text-xs text-gray-500 flex-1">
            Add "Rigi_Robot" as an admin. Grant all admin permissions to
            Rigi_Robot.
          </p>
          <button
            onClick={() => setShowVideo(true)}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline self-start cursor-pointer"
          >
            Watch how →
          </button>
        </div>

        {/* Step 3 */}
        <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col">
          <img
            src="https://dd7s6xojfdqlr.cloudfront.net/common/telegram/telegram-web-message.png"
            alt="Message"
            className="w-full h-32 object-contain mb-3"
          />
          <h3 className="font-semibold text-sm mb-1">
            Step 3: Send message for final linking
          </h3>
          <p className="text-xs text-gray-500 flex-1">
            Copy and paste the message mentioned below into the selected group
            chat.
          </p>
          <div className="flex items-center justify-between border rounded-md bg-gray-50 px-2 py-1 mt-3">
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter Telegram Chat ID (e.g., -1001234567890)"
              className="flex-1 bg-transparent border-none outline-none text-xs text-gray-600 px-2"
            />
            <button 
              onClick={() => navigator.clipboard.writeText(chatId)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          
          {/* Test Connection Button */}
          <button
            onClick={handleTestConnection}
            disabled={!chatId || testingConnection}
            className={`mt-3 w-full py-1.5 text-sm font-medium rounded-md transition ${
              !chatId || testingConnection
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {testingConnection ? 'Testing...' : 'Test Bot Connection'}
          </button>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-gray-500 mb-4">
        <span className="font-medium">Note:</span> When a new Telegram group or
        channel is linked, only new subscribers will gain access. Existing users
        will not receive access to the newly linked group or channel.
      </p>

      {/* Confirm & Finish */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="confirm"
          checked={checked}
          onChange={() => setChecked(!checked)}
          className="h-4 w-4 border-gray-300 rounded"
        />
        <label htmlFor="confirm" className="text-sm text-gray-700">
          Please confirm if you have completed all the above steps to link your
          telegram channel.
        </label>
      </div>

      <button
        onClick={handleFinishSetup}
        disabled={!checked || !chatId || linkingGroup}
        className={`w-full sm:w-auto px-6 py-2 rounded-md text-sm font-medium transition ${
          checked && chatId && !linkingGroup
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {linkingGroup ? 'Linking Group...' : 'Finish Setup'}
      </button>

      {/* YouTube Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                How to Add Rigi_Robot as Admin
              </h3>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                   className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/POlPSbF6drY?si=3fgeXCzghYgYVti2"
                  title="How to Add Rigi_Robot as Admin"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setuppage;
