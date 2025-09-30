import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isKYCRequired, isPaymentRequired, getNextStepRedirectPath } from "../../utils/featureToggleUtils";
import { verifyUserSteps } from "../../utils/serverVerification";

const KycProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [redirectPath, setRedirectPath] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const userPhone = localStorage.getItem('userPhone');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      if (!isAuthenticated || !userPhone) {
        const redirectTo = encodeURIComponent(`${location.pathname}${location.search}`);
        setRedirectPath(`/login?redirect=${redirectTo}`);
        setCanAccess(false);
        setLoading(false);
        return;
      }

      // Check if KYC is required for this bundle
      if (!isKYCRequired()) {
        setRedirectPath(getNextStepRedirectPath());
        setCanAccess(false);
        setLoading(false);
        return;
      }

      // Check backend for payment status
      try {
        const verification = await verifyUserSteps(userPhone);
        const paymentRequired = isPaymentRequired();
        const paymentCompleted = verification?.steps?.payment === true;
        if (paymentRequired && !paymentCompleted) {
          setRedirectPath(getNextStepRedirectPath());
          setCanAccess(false);
        } else {
          setCanAccess(true);
        }
      } catch (e) {
        setRedirectPath(getNextStepRedirectPath());
        setCanAccess(false);
      }
      setLoading(false);
    };
    checkAccess();
    // eslint-disable-next-line
  }, []);

  if (loading) return null; // or a spinner
  if (!canAccess && redirectPath) return <Navigate to={redirectPath} replace />;
  return children;
};

export default KycProtectedRoute;
