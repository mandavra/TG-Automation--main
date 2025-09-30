import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GroupPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new channel bundle page
    navigate("/admin/channel-bundles", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to Channel Bundle Management...</p>
      </div>
    </div>
  );
}