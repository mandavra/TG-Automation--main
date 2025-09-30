import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { ThemeProvider } from "./Component/Theme/ThemeContext";
import BundleHeader from "./Component/ChannelBundle/BundleHeader";
import Home from "./Component/Home/Home";
import Login from "./Component/Login/Login";
import OTP from "./Component/Login/OTP";
import KYCForm from "./Component/KYC/Kycform";
import LoginAdmin from "./pages/LoginAdmin";
import Footer from "./Component/Footer/Footer";
import Layout from "./Adminpanel/Layout";
import Dashboard from "./pages/EnhancedDashboard";
import ProtectedRoute from "./Adminpanel/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import KycProtectedRoute from "./Component/KYC/KycProtectedRoute";
import PaymentProtectedRoute from "./Component/Payment/PaymentProtectedRoute";
import Digio from "./Component/DIGIO/Digio";
import DigioProtectedRoute from "./Component/DIGIO/DigioProtectedRoute";
import DigioErrors from "./pages/DigioErrors";
import KickedUsers from "./pages/KickedUsers";
import TelegramIdForm from "./Component/TelegramId/TelegramIdForm";
import CreateAdmin from "./pages/CreateAdmin";
import Group from "./pages/Group";
import ChannelBundle from "./pages/ChannelBundle";
import CreateChannelBundle from "./pages/CreateChannelBundle";
import ChannelBundleDetails from "./pages/ChannelBundleDetails";
import CreateGroup from "./pages/CreateGroup";
import Setuppage from "./pages/Setup-page";
import GroupDetailsPage from "./pages/GroupDetailsPage";
import NotificationContainer from "./components/NotificationSystem/NotificationContainer";
import AddChanel from "./pages/AddChanel";
import EditGroup from "./pages/EditGroup";
import Withdrawals from "./pages/Withdrawals";
import SuperAdminWithdrawals from "./pages/SuperAdminWithdrawals";
import Analytics from "./pages/Analytics";
import AdminInvoices from "./pages/AdminInvoices";
import Documents from "./pages/Documents";
import KYC from "./pages/KYC";
import UserManagement from "./pages/UserManagementFixed";
import UserManagementSimpleTest from "./pages/UserManagementSimpleTest";
import PaymentManagement from "./pages/PaymentManagement";
import EnhancedPaymentManagement from "./Component/PaymentManagement/EnhancedPaymentManagement";
import ChannelMemberManagement from "./pages/ChannelMemberManagement";
import PublicGroup from "./pages/PublicGroup";
import UserDashboard from "./pages/UserDashboardFixed";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import GlobalSearch from "./pages/GlobalSearch";
import SystemAnalytics from "./pages/SystemAnalytics";
import UserProtectedRoute from "./Component/User/UserProtectedRoute";
import Disclaimer from "./Component/disclaimer/page";
import Disclosure from "./Component/disclosure/page";
import GrievanceRedressalProcess from "./Component/GrievanceRedressalProcess/page";
import InvestorCharter from "./Component/investor-charter/page";
import PrivacyPolicy from "./Component/privacy-policy/page";
import RefundPolicy from "./Component/refund-policy/page";
import TermsOfUse from "./Component/terms-of-use/page";
import ManagePlans from "./pages/ManagePlans";

function App() {
  const location = useLocation();

  return (
    <ThemeProvider>
      {location.pathname.startsWith("/pc/") && <BundleHeader />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/otp" element={<OTP />} />
        {/* Legal/public routes */}
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/disclosure" element={<Disclosure />} />
        <Route path="/grievance-redressal-process" element={<GrievanceRedressalProcess />} />
        <Route path="/investor-charter" element={<InvestorCharter />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route 
          path="/payment/:id" 
          element={
            <PaymentProtectedRoute>
              <PaymentPage />
            </PaymentProtectedRoute>
          } 
        />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentSuccess />} />
        <Route 
          path="/kycForm" 
          element={
            <KycProtectedRoute>
              <KYCForm />
            </KycProtectedRoute>
          } 
        />
        <Route 
          path="/digio" 
          element={
            <DigioProtectedRoute>
              <Digio />
            </DigioProtectedRoute>
          }
        />
        <Route
          path="/loginAdmin"
          element={
            localStorage.getItem("auth") === "true" ? (
              localStorage.getItem("adminRole") === "superadmin" ? (
                <Navigate to="/admin/super-admin-dashboard" replace />
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            ) : (
              <LoginAdmin />
            )
          }
        />
        <Route path="/telegram-id" element={<TelegramIdForm />} />
        <Route 
          path="/dashboard" 
          element={
            <UserProtectedRoute>
              <UserDashboard />
            </UserProtectedRoute>
          } 
        />

        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="super-admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="withdrawals" element={<Withdrawals />} />
          <Route path="super-admin-withdrawals" element={<SuperAdminWithdrawals />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="admin-invoices" element={<AdminInvoices />} />
          <Route path="documents" element={<Documents />} />
          <Route path="kyc" element={<KYC />} />
          <Route path="payment-management" element={<EnhancedPaymentManagement />} />
          <Route path="channel-member-management" element={<ChannelMemberManagement />} />
          <Route path="digio-errors" element={<DigioErrors />} />
          <Route path="kicked-users" element={<KickedUsers />} />
          <Route path="create-admin" element={<CreateAdmin />} />
          <Route path="global-search" element={<GlobalSearch />} />
          <Route path="system-analytics" element={<SystemAnalytics />} />
          <Route path="manage-plans" element={<ManagePlans />} />
          
          {/* Legacy Group routes */}
          <Route path="Group" element={<Group />} />
          <Route path="groups" element={<Group />} />
          <Route path="Create-group" element={<CreateGroup  />} />
          <Route path="edit-group/:id" element={<EditGroup />} />
          <Route path="Setup-page" element={<Setuppage  />} />
          <Route path="group-details/:groupId" element={<GroupDetailsPage />} />
          
          {/* Channel Bundle routes */}
          <Route path="channel-bundles" element={<ChannelBundle />} />
          <Route path="channel-bundle" element={<ChannelBundle />} />
          <Route path="create-channel-bundle" element={<CreateChannelBundle />} />
          <Route path="channel-bundle-details/:id" element={<ChannelBundleDetails />} />
          <Route path="edit-channel-bundle/:id" element={<CreateChannelBundle />} />
        </Route>

        {/* Public group pages */}
        <Route path="/pc/:route" element={<PublicGroup />} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {location.pathname.startsWith("/pc/") && <Footer />}
      <ToastContainer position="top-right" autoClose={4000} />
      
      {/* Notification System - Show for admin routes */}
      {location.pathname.startsWith("/admin") && <NotificationContainer />}
    </ThemeProvider>
  );
}

export default App;