import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatExpiryDate, getSubscriptionStatusColor } from '../../utils/subscriptionUtils';

const SubscriptionStatus = () => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (!isAuthenticated) {
          setLoading(false);
          return;
        }

        const userData = localStorage.getItem('user');
        if (!userData) {
          setLoading(false);
          return;
        }

        const user = JSON.parse(userData);
        const userId = user._id || user.id;

        const paymentCompleted = localStorage.getItem('paymentCompleted') === 'true';
        if (!paymentCompleted) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`http://localhost:4000/api/payment/status/${userId}`);
        
        if (response.data) {
          setSubscriptionData(response.data);
          
          if (response.data.expiry_date) {
            const expiryDate = new Date(response.data.expiry_date);
            const now = new Date();
            const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);
            
            if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
              toast.warning(`Your subscription will expire in ${Math.round(hoursUntilExpiry)} hours!`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        if (error.response?.status === 404) {
          setSubscriptionData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
    const interval = setInterval(fetchSubscriptionStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRenewal = () => {
    navigate('/plans');
  };

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-300">Please login to view your subscription status.</p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Login
        </button>
      </div>
    );
  }

  const paymentCompleted = localStorage.getItem('paymentCompleted') === 'true';
  if (!paymentCompleted) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-300">Please complete your payment to view subscription status.</p>
        <button
          onClick={() => navigate('/plans')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          View Plans
        </button>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-300">No active subscription found.</p>
        <button
          onClick={handleRenewal}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    );
  }

  const isExpired = new Date(subscriptionData.expiry_date) < new Date();
  const daysRemaining = Math.ceil((new Date(subscriptionData.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription Status</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Plan:</span>
          <span className="font-medium text-gray-900 dark:text-white">{subscriptionData.plan_name}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Status:</span>
          <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
            {isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Expiry Date:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatExpiryDate(subscriptionData.expiry_date)}
          </span>
        </div>
        
        {subscriptionData.isExtension && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Plan Type:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Extended Subscription
            </span>
          </div>
        )}
        
        {!isExpired && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Days Remaining:</span>
            <span className="font-medium text-gray-900 dark:text-white">{daysRemaining}</span>
          </div>
        )}
      </div>

      {isExpired ? (
        <button
          onClick={handleRenewal}
          className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Renew Subscription
        </button>
      ) : daysRemaining <= 7 ? (
        <button
          onClick={handleRenewal}
          className="mt-4 w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          Extend Subscription
        </button>
      ) : (
        <button
          onClick={handleRenewal}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Extend Subscription
        </button>
      )}
    </div>
  );
};

export default SubscriptionStatus; 