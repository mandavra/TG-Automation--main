import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../services/api";

const LoginAdmin = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      // Clear any existing user session data
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      localStorage.removeItem("phone");
      localStorage.removeItem("otp");
      localStorage.removeItem("userPhone");
      
      const { token, admin } = await adminAPI.login(username.trim().toLowerCase(), password);
      
      // Set admin session data
      localStorage.setItem("auth", "true");
      localStorage.setItem("token", token);
      localStorage.setItem("adminRole", admin?.role || "admin");
      localStorage.setItem("isAdmin", "true");
      
      // Redirect super admin to super admin dashboard
      if (admin?.role === "superadmin") {
        console.log("Redirecting super admin to super admin dashboard");
        navigate("/admin/super-admin-dashboard", { replace: true });
      } else {
        console.log("Redirecting admin to admin dashboard");
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-white">
          Admin Login
        </h2>

        {error && (
          <div className="mb-4 text-red-500 text-sm text-center">{error}</div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default LoginAdmin;
