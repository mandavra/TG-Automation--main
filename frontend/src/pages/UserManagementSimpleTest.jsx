import React, { useEffect, useState } from 'react';

const UserManagementSimpleTest = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('UserManagement component mounted');
    setLoading(false);
  }, []);

  useEffect(() => {
    // Check for any runtime errors
    const handleError = (event) => {
      console.error('Runtime error:', event.error);
      setError(event.error.message);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        User Management - Test Version
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-gray-600 dark:text-gray-400">
          This is a simplified test version to verify the component loads correctly.
        </p>
        <div className="mt-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementSimpleTest;
