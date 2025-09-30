import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MessageCircle, CheckCircle, AlertCircle, Info } from 'lucide-react';

const TelegramIdForm = () => {
  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!telegramId.trim()) {
      toast.error('Please enter your Telegram User ID');
      return;
    }

    if (!user?._id) {
      toast.error('User data not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:4000/api/payment/update-telegram-id', {
        userId: user._id,
        telegramUserId: telegramId.trim()
      });

      if (response.data.success) {
        toast.success('Telegram User ID updated successfully!');
        setIsSubmitted(true);
        
        // Update user data in localStorage
        const updatedUser = { ...user, telegramUserId: telegramId.trim() };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        toast.error(response.data.message || 'Failed to update Telegram User ID');
      }
    } catch (error) {
      console.error('Error updating Telegram User ID:', error);
      toast.error(error.response?.data?.message || 'Failed to update Telegram User ID');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTelegramId('');
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
          Telegram ID Updated!
        </h3>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
          Your Telegram User ID has been successfully linked to your account.
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Telegram ID:</strong> {telegramId}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Update Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-center mb-4">
        <MessageCircle className="w-12 h-12 text-blue-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
        Link Your Telegram Account
      </h3>
      
      <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
        Enter your Telegram User ID to link it with your subscription for automatic access management.
      </p>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-2">How to find your Telegram User ID:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open Telegram and search for <strong>@userinfobot</strong></li>
              <li>Send any message to the bot</li>
              <li>It will reply with your User ID (a number)</li>
              <li>Copy that number and paste it below</li>
            </ol>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="telegramId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Telegram User ID
          </label>
          <input
            type="text"
            id="telegramId"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="e.g., 123456789"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This should be a number (e.g., 123456789)
          </p>
        </div>

        {user?.telegramUserId && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Current Telegram ID: <strong>{user.telegramUserId}</strong>
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !telegramId.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating...
            </>
          ) : (
            'Update Telegram ID'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This helps us manage your channel access automatically based on your subscription status.
        </p>
      </div>
    </div>
  );
};

export default TelegramIdForm; 