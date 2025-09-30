import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddChanel = ({ createdGroup }) => {
  const navigate = useNavigate();
  const [isSetupFinished, setIsSetupFinished] = useState(false);

  return (
    <div className="p-8 bg-white rounded-xl border shadow-md max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        🎉 Yay! Your group "{createdGroup?.name || ""}" is created
      </h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Let's link your Telegram channel or group to get started.
      </p>

      <div className="flex items-start gap-2 p-4 border rounded-lg bg-blue-50 text-left mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
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
        <p className="text-sm text-gray-700 leading-relaxed">
          The first Telegram group you link will be the default and cannot be
          unlinked or deleted.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          Your linked groups overview
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          See the status, type, and linking details of your groups.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg bg-gray-50 text-sm text-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b bg-gray-100 text-start">
                  Group name (1/5)
                </th>
                <th className="px-4 py-2 border-b bg-gray-100 text-start">
                  Group type
                </th>
                <th className="px-4 py-2 border-b bg-gray-100 text-start">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {isSetupFinished && createdGroup ? (
                <tr>
                  <td className="px-4 py-3 border-b text-start">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-base text-gray-900">
                        {createdGroup.name || "-"}
                      </span>
                      {createdGroup.isDefault && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-md bg-purple-100 text-purple-700 font-semibold">
                          Primary
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-start">
                    {createdGroup.telegramChatType || "-"}
                  </td>
                  <td className="px-4 py-3 border-b text-start">
                    {createdGroup.status ? (
                      <span
                        className={`inline-block px-3 py-1 text-xs rounded-md font-semibold
                          ${
                            createdGroup.status.toLowerCase() === "active"
                              ? "bg-green-100 text-green-700"
                              : createdGroup.status.toLowerCase() === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : createdGroup.status.toLowerCase() ===
                                  "inactive" ||
                                createdGroup.status.toLowerCase() === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {createdGroup.status.charAt(0).toUpperCase() +
                          createdGroup.status.slice(1)}
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="px-4 py-2 border-b text-center" colSpan={3}>
                    No group data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </div>
        <p className="text-gray-800 text-sm font-medium">
          Complete your group setup
        </p>
        <p className="text-xs text-gray-500 mt-1 text-center max-w-sm">
          Link your Telegram group or channel to start engaging with your
          audience.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => {
            if (createdGroup) {
              navigate("/admin/Setup-page", {
                state: {
                  groupId: createdGroup._id,
                  groupName: createdGroup.name,
                },
              });
            } else {
              toast.error("Group data not found. Please try again.");
            }
          }}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow hover:bg-blue-700 transition"
        >
          Link Telegram Group or Channel
        </button>
        <button
          className="w-full sm:w-auto px-6 py-2 bg-black text-white rounded-md text-sm font-medium"
          onClick={() => setIsSetupFinished(true)}
        >
          Finish Setup
        </button>
      </div>
    </div>
  );
};

export default AddChanel;
