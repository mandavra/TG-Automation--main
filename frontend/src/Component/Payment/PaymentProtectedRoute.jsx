import { Navigate, useLocation } from 'react-router-dom';
import { isPaymentRequired } from '../../utils/featureToggleUtils';

const PaymentProtectedRoute = ({ children }) => {
  const location = useLocation();
  
  // Check if payment is required for this bundle
  if (!isPaymentRequired()) {
    return <Navigate to="/" replace />;
  }
  
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirectTo}`} replace />;
  }

  return children;
};

export default PaymentProtectedRoute; 