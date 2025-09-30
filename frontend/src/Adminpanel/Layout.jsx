import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router";
import { useState } from "react";

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/admin/user-management')) return 'User Management';
    if (path.includes('/admin/payment-management')) return 'Payment Management';
    if (path.includes('/admin/channel-member-management')) return 'Channel Member Management';
    if (path.includes('/admin/users')) return 'User Payments';
    if (path.includes('/admin/addplans')) return 'Add Plans';
    if (path.includes('/admin/viewplans')) return 'View Plans';
    if (path.includes('/admin/dashboard')) return 'Admin Panel';
    if (path.includes('/admin/documents')) return 'E-Signed Documents';
    if (path.includes('/admin/kyc')) return 'KYC Management';
    if (path.includes('/admin/kicked-users')) return 'Kicked Users';
    return 'Admin Panel';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar title={getPageTitle()} />
      <div className="flex pt-14 sm:pt-16">
        <Sidebar onCollapse={setIsCollapsed} />
        <div className={`flex-1 transition-all duration-300 overflow-x-hidden ${isCollapsed ? 'ml-14' : 'ml-14 md:ml-48'}`}>
          <main className="max-w-full">
            <div className="px-2 sm:px-4 md:px-6 mx-auto max-w-full md:max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
