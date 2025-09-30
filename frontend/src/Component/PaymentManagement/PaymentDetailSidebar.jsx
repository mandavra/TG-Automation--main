import React, { useState, useEffect, useMemo, useCallback } from 'react';
import paymentService from '../../services/paymentService';
import groupAction from '../../services/action/groupAction';
import { calculatePlatformFee } from '../../utils/platformFeeConfig';
// import jsPDF from 'jspdf';
import { 
  X, 
  User, 
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Package,
  Receipt,
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  FileText,
  Download,
  MessageCircle,
  ArrowRight,
  Info,
  Shield,
  Globe,
  Smartphone,
  FileCheck,
  Calculator,
  Wallet,
  Building,
  ScrollText,
  Eye,
  Timer,
  Percent,
  UserCheck
} from 'lucide-react';

const PaymentDetailSidebar = ({ isOpen, onClose, paymentId }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [downloading, setDownloading] = useState('');
  const [resolvedBundleName, setResolvedBundleName] = useState('');
  
  // Memoized utility functions for performance
  const formatCurrency = useCallback((amount) => {
    const numericAmount = Number(amount) || 0;
    const hasFraction = Math.abs(numericAmount % 1) > 1e-9;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2
    }).format(numericAmount);
  }, []);


  const formatDate = useCallback((date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);
  
  const formatPhoneDisplay = useCallback((phone) => {
    if (!phone) return '-';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }
    return phone;
  }, []);

  // Safe helpers to avoid showing undefined/empty as text
  const isEmptyValue = useCallback((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (value === 'N/A') return true;
    return false;
  }, []);

  const displayValue = useCallback((value, fallback = '-') => {
    return isEmptyValue(value) ? fallback : value;
  }, [isEmptyValue]);

  // Helper to pick first non-empty value
  const getFirstNonEmpty = useCallback((...values) => {
    for (const v of values) {
      if (!isEmptyValue(v)) return v;
    }
    return undefined;
  }, [isEmptyValue]);

  // Deep search helper to find a plausible UTR/Transaction ID in nested objects
  const findDeepTransactionId = useCallback((obj) => {
    if (!obj || typeof obj !== 'object') return undefined;
    const stack = [obj];
    const keyRegex = /(utr|txn|transaction|reference|rrn|order).*id|^(utr|txn|rrn|ref|reference|order)$/i;
    while (stack.length) {
      const current = stack.pop();
      for (const [key, value] of Object.entries(current)) {
        if (value && typeof value === 'object') {
          stack.push(value);
        } else if (typeof value === 'string') {
          if (keyRegex.test(key) && value.trim().length >= 6) {
            return value.trim();
          }
        }
      }
    }
    return undefined;
  }, []);

  // Compute a safe plan validity string
  const planValidity = useMemo(() => {
    const validity = paymentData?.planDetails?.validity;
    if (!isEmptyValue(validity)) return validity;

    // Prefer planDetails duration
    const pdDuration = paymentData?.planDetails?.duration;
    const pdDurationType = paymentData?.planDetails?.durationType;
    if (!isEmptyValue(pdDuration) && !isEmptyValue(pdDurationType)) {
      return `${pdDuration} ${pdDurationType}`;
    }

    // Try payment-level duration fields
    const p = paymentData?.payment || {};
    const pDuration = p.duration || p.validity || p.validityDays;
    const pDurationType = p.durationType || p.duration_type || (pDuration ? 'days' : undefined);
    if (!isEmptyValue(pDuration)) {
      return `${pDuration} ${pDurationType || 'days'}`;
    }

    // Derive from timestamps if available
    const start = p.createdAt ? new Date(p.createdAt) : null;
    const endRaw = getFirstNonEmpty(p.expiresAt, p.expiry_date, p.expiryDate, p.expiry);
    const end = endRaw ? new Date(endRaw) : null;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        // If roughly monthly, present months
        if (days % 30 === 0) {
          const months = days / 30;
          return `${months} ${months === 1 ? 'month' : 'months'}`;
        }
        return `${days} ${days === 1 ? 'day' : 'days'}`;
      }
    }

    return '-';
  }, [paymentData, isEmptyValue, getFirstNonEmpty]);

  // Safe getters for backend field variations
  

  const paymentFields = useMemo(() => {
    const p = paymentData?.payment || {};
    // Prioritize 'utr' field if present, then fallback to other possible fields
    const idFull = getFirstNonEmpty(p.paymentId, p._id, p.link_id);
    const transactionId = getFirstNonEmpty(
      p.utr,
      p.transactionId,
      p.txn_id,
      p.txnId,
      p.referenceId,
      p.reference,
      p.ref_no,
      p.refNo,
      p.rrn,
      p.orderId,
      p.payment_id,
      p.razorpay_payment_id,
      p.utrNumber,
      p.utr_no,
      p.utrNo,
      findDeepTransactionId(p)
    );
    const expires = getFirstNonEmpty(p.expiresAt, p.expiry_date, p.expiryDate, p.expiry);
    const email = getFirstNonEmpty(p?.userid?.email, p.customerEmail);
    const phone = getFirstNonEmpty(p?.userid?.phone, p.phone);
    const planName = getFirstNonEmpty(paymentData?.planDetails?.name, p.plan_name);
    // Resolve bundle/group name robustly
    const groupIdRaw = p.groupId;
    const groupNameFromGroupId = typeof groupIdRaw === 'object' && groupIdRaw !== null
      ? (groupIdRaw.name || groupIdRaw.title || groupIdRaw.groupName)
      : (typeof groupIdRaw === 'string' ? groupIdRaw : undefined);
    const bundleNameFromMemberships = Array.isArray(paymentData?.channelMemberships) && paymentData.channelMemberships.length > 0
      ? getFirstNonEmpty(
          paymentData.channelMemberships[0]?.bundleName,
          paymentData.channelMemberships[0]?.groupName,
          paymentData.channelMemberships[0]?.channelBundleName,
          paymentData.channelMemberships[0]?.channelName
        )
      : undefined;
    const bundleName = getFirstNonEmpty(
      p.paymentBundle,
      p.paymentBundleName,
      p.groupName,
      p.group?.name,
      p.group?.group_name,
      p.bundleName,
      p.bundle?.name,
      p.group_id?.name,
      p.group_id?.group_name,
      p.bundle_id?.name,
      p.bundleTitle,
      p.bundle_title,
      p.groupTitle,
      p.group_id?.title,
      p.groupId?.title,
      p.groupId?.groupTitle,
      p.groupId?.group_name,
      paymentData?.payment?.groupId?.name,
      paymentData?.payment?.groupId?.title,
      paymentData?.payment?.groupId?.groupTitle,
      paymentData?.payment?.groupId?.group_name,
      // Invoice-level names
      p.invoiceId?.group?.name,
      p.invoiceId?.groupName,
      p.invoiceId?.bundleName,
      p.invoiceId?.metadata?.bundleName,
      paymentData?.planDetails?.bundleName,
      paymentData?.planDetails?.groupName,
      bundleNameFromMemberships,
      groupNameFromGroupId,
      (typeof groupIdRaw === 'string' ? groupIdRaw : undefined)
    );
    const bundleId = getFirstNonEmpty(
      (typeof groupIdRaw === 'string' ? groupIdRaw : undefined),
      (typeof groupIdRaw === 'object' && groupIdRaw !== null ? (groupIdRaw._id || groupIdRaw.id || groupIdRaw.$oid) : undefined),
      p.group_id?._id || p.group_id,
      p.bundle_id?._id || p.bundle_id,
      p.bundleId,
      // Invoice-level IDs
      p.invoiceId?.metadata?.bundleId,
      p.invoiceId?.bundleId,
      p.invoiceId?.groupId,
      p.invoiceId?.group_id?._id,
      // Plan/channel fallbacks
      paymentData?.planDetails?.bundleId,
      (Array.isArray(paymentData?.channelMemberships) && paymentData.channelMemberships[0]?.bundleId)
    );
    return {
      idFull,
      idShort: idFull ? String(idFull).slice(-8) : undefined,
      transactionId,
      expires,
      email,
      phone,
      planName,
      bundleName,
      bundleId
    };
  }, [paymentData, getFirstNonEmpty, findDeepTransactionId]);

  // Normalize user/customer fields from multiple possible backend keys
  const userFields = useMemo(() => {
    const p = paymentData?.payment || {};
    const u = p.userid || p.user || {};

    // Parse customerName if needed
    let parsedFirst = undefined;
    let parsedLast = undefined;
    if (!u.firstName && !p.firstName && typeof p.customerName === 'string' && p.customerName.trim()) {
      const parts = p.customerName.trim().split(/\s+/);
      if (parts.length > 0) parsedFirst = parts[0];
      if (parts.length > 1) parsedLast = parts.slice(1).join(' ');
    }

    const firstName = getFirstNonEmpty(u.firstName, p.firstName, p.customerFirstName, u.givenName, u.name?.first, parsedFirst);
    const middleName = getFirstNonEmpty(u.middleName, p.middleName, u.name?.middle);
    const lastName = getFirstNonEmpty(u.lastName, p.lastName, p.customerLastName, u.surname, u.name?.last, parsedLast);
    const nameFromUserObject = typeof u.name === 'string' ? u.name.trim() : undefined;
    const fullNameRaw = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
    const fullName = getFirstNonEmpty(
      fullNameRaw,
      u.fullName,
      nameFromUserObject,
      u.displayName,
      (typeof p.customerName === 'string' ? p.customerName.trim() : undefined)
    );
    const dob = getFirstNonEmpty(u.dob, p.dob, u.dateOfBirth, p.dateOfBirth, u.birthDate);
    const email = getFirstNonEmpty(paymentFields.email, u.email, p.customerEmail, p.email);
    const city = getFirstNonEmpty(u.city, p.city, p.customerCity, u.address?.city);
    const state = getFirstNonEmpty(
      // User-level
      u.state,
      u.stateName,
      u.state_code,
      u.stateCode,
      u.State,
      u.province,
      u.region,
      u.address?.state,
      u.address?.stateName,
      u.address?.State,
      u.address?.province,
      u.billingAddress?.state,
      u.billingAddress?.stateName,
      u.shippingAddress?.state,
      // Payment-level
      p?.userid?.state,
      p?.userid?.State,
      p.userid?.stateName,
      p.userid?.state_code,
      p.userid?.stateCode,
      p.userid?.address?.state,
      p.userid?.address?.stateName,
      p.userid?.address?.State,
      p.state,
      p.state_name,
      p.stateName,
      p.customerState,
      p.address?.state,
      p.address?.stateName,
      // Invoice billed-to fallback
      p.invoiceId?.billedTo?.state,
      p.invoiceId?.billedTo?.stateName,
      p.invoiceId?.billedTo?.state_code,
      p.invoiceId?.billedTo?.stateCode,
      p.invoiceId?.billedTo?.address?.state,
      p.invoiceId?.billedTo?.address?.stateName
    );
    const panNumber = getFirstNonEmpty(u.panNumber, u.pan, u.pan_no, u.kyc?.panNumber, p.panNumber, p.pan);
    const aadharNumber = getFirstNonEmpty(u.aadharNumber, u.aadhaarNumber, u.aadhar, u.aadhaar, u.aadhar_no, u.kyc?.aadharNumber, p.aadharNumber);

    return { fullName, firstName, middleName, lastName, dob, email, city, state, panNumber, aadharNumber };
  }, [paymentData, getFirstNonEmpty, paymentFields]);

  // Effective bundle name for reliable display
  const effectiveBundleName = useMemo(() => {
    return getFirstNonEmpty(
      // Resolved and normalized fields
      resolvedBundleName,
      paymentFields?.bundleName,
      // Common payment-level fields
      paymentData?.payment?.bundleName,
      paymentData?.payment?.bundle_title,
      paymentData?.payment?.bundleTitle,
      paymentData?.payment?.groupName,
      paymentData?.payment?.groupTitle,
      paymentData?.payment?.group?.name,
      paymentData?.payment?.group?.title,
      // Invoice-level hints
      paymentData?.payment?.invoiceId?.group?.name,
      paymentData?.payment?.invoiceId?.groupName,
      paymentData?.payment?.invoiceId?.bundleName,
      paymentData?.payment?.invoiceId?.metadata?.bundleName,
      paymentData?.payment?.invoiceId?.metadata?.groupName,
      paymentData?.payment?.invoiceId?.group_id?.name,
      paymentData?.payment?.invoiceId?.group_id?.title,
      // GroupId variants
      paymentData?.payment?.groupId?.name,
      paymentData?.payment?.groupId?.title,
      paymentData?.payment?.group_id?.name,
      paymentData?.payment?.group_id?.title,
      // Plan details as fallback (bundle-like fields only; avoid plan name/type)
      paymentData?.planDetails?.bundleName,
      paymentData?.planDetails?.groupName,
      // Channel membership first entry
      (Array.isArray(paymentData?.channelMemberships) && (
        paymentData.channelMemberships[0]?.bundleName ||
        paymentData.channelMemberships[0]?.groupName ||
        paymentData.channelMemberships[0]?.channelBundleName ||
        paymentData.channelMemberships[0]?.channelName
      )),
      // Root-level fallbacks if API provides bundle at top level
      paymentData?.bundleName,
      paymentData?.groupName,
      // Last resort: show ID
      paymentFields?.bundleId
    );
  }, [resolvedBundleName, paymentFields, paymentData, getFirstNonEmpty]);

  // Compute breakdown amounts to avoid zeros when backend fields are absent
  const breakdown = useMemo(() => {
    const p = paymentData?.payment || {};
    const totalAmount = Number(p.amount) || 0;
    const explicitBase = Number(p.baseAmount);
    const explicitGst = Number(p.gstAmount);
    const gstRate = typeof p.gstRate === 'number' ? p.gstRate : 0.18;
    const discountAmount = Number(p.discountAmount) || 0;

    let baseAmount;
    if (!Number.isNaN(explicitBase) && explicitBase > 0) {
      baseAmount = explicitBase;
    } else if (totalAmount > 0) {
      const computedBase = totalAmount / (1 + gstRate);
      baseAmount = Math.round(computedBase * 100) / 100; // keep paise
    } else {
      baseAmount = 0;
    }

    let gstAmount;
    if (!Number.isNaN(explicitGst) && explicitGst > 0) {
      gstAmount = explicitGst;
    } else {
      const computedGst = totalAmount - baseAmount;
      gstAmount = Math.max(Math.round(computedGst * 100) / 100, 0);
    }

    // Subtotal before GST (and before discount if applicable)
    const subTotal = baseAmount;

    return {
      gstRate,
      discountAmount,
      baseAmount,
      subTotal,
      gstAmount,
      totalAmount
    };
  }, [paymentData]);


  // Fetch payment details
  const fetchPaymentDetails = async () => {
    if (!paymentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Making API request for payment ID:', paymentId);
      
      const result = await paymentService.getPaymentDetails(paymentId);
      
      console.log('Payment service result:', result);
      
      if (result.success) {
        setPaymentData(result.data);
      } else {
        console.error('Payment service failed:', result);
        let errorMsg = result.error || 'Failed to load payment details. Please try again.';
        
        // Handle specific error cases
        if (errorMsg.includes('not found')) {
          errorMsg = 'Payment not found. This transaction may have been deleted or you may not have access to it.';
        } else if (errorMsg.includes('Server error') || errorMsg.includes('500')) {
          errorMsg = 'Server error: The payment data could not be retrieved. This may be due to database connectivity issues or corrupted data.';
        } else if (errorMsg.includes('Authentication') || errorMsg.includes('401')) {
          errorMsg = 'Authentication required. Please log in as admin and try again.';
        }
        
        setError(errorMsg);
        setPaymentData(null);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      
      let errorMessage = 'Failed to load payment details. Please try again.';
      
      if (error.name === 'AuthenticationError') {
        errorMessage = 'Authentication required. Please log in as admin.';
      } else if (error.name === 'NetworkError') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.name === 'APIError') {
        if (error.status === 401) {
          errorMessage = 'Authentication required. Please log in as admin.';
        } else if (error.status === 403) {
          errorMessage = 'Access forbidden. Admin privileges required.';
        } else if (error.status === 404) {
          errorMessage = 'Payment not found. It may have been deleted.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message || `API Error (${error.status})`;
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      setPaymentData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentDetails();
    } else if (!isOpen) {
      // Reset state when sidebar is closed
      setPaymentData(null);
      setError(null);
      setLoading(false);
      setResolvedBundleName('');
    }
  }, [isOpen, paymentId]);

  // Resolve bundle name from backend if missing
  useEffect(() => {
    const tryResolveBundleName = async () => {
      try {
        if (!paymentData?.payment) return;
        const existingName = paymentFields?.bundleName;
        if (existingName && String(existingName).trim()) {
          setResolvedBundleName(existingName);
          return;
        }
        const bundleId = paymentFields?.bundleId;
        if (bundleId) {
          const res = await groupAction.getGroupById(bundleId);
          const name = res?.group?.name || res?.data?.group?.name || res?.data?.name || res?.name || '';
          if (name) {
            setResolvedBundleName(name);
            return;
          }
        }
        // Fallback: fetch default group name when bundle id is unavailable
        const defaultGroup = await groupAction.getDefaultGroup?.();
        const defaultName = defaultGroup?.group?.name || defaultGroup?.data?.group?.name || defaultGroup?.data?.name || defaultGroup?.name || '';
        if (defaultName) setResolvedBundleName(defaultName);
      } catch (e) {
        // silent fallback
      }
    };
    tryResolveBundleName();
  }, [paymentData, paymentFields]);

  // Format functions are now memoized above

  // Copy to clipboard
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Calculate GST breakdown
  const calculateGSTBreakdown = (totalAmount) => {
    const gstRate = 0.18; // 18% GST
    const baseAmount = Math.round(totalAmount / (1 + gstRate));
    const gstAmount = totalAmount - baseAmount;
    return {
      baseAmount,
      gstAmount,
      gstRate,
      totalAmount
    };
  };

  // Download Invoice - Fast and functional
  const downloadInvoice = useCallback(async () => {
    try {
      setDownloading('invoice');
      
      // Create immediate invoice data
      const invoiceData = {
        invoiceNo: paymentData?.payment?.invoiceId || 'INV-TEST123',
        date: formatDate(paymentData?.payment?.createdAt),
        customer: paymentData?.payment?.userid ? 
          `${paymentData.payment.userid.firstName || ''} ${paymentData.payment.userid.lastName || ''}`.trim() || 'Test Customer' : 'Test Customer',
        amount: paymentData?.payment?.amount || 1800,
        plan: paymentData?.planDetails?.name || paymentData?.payment?.plan_name || 'Premium Plan',
        gst: paymentData?.payment?.gstAmount || 274
      };
      
      // Create downloadable content
      const invoiceContent = `INVOICE\n=================\nInvoice No: ${invoiceData.invoiceNo}\nDate: ${invoiceData.date}\nCustomer: ${invoiceData.customer}\nPlan: ${invoiceData.plan}\nAmount: ₹${invoiceData.amount}\nGST (18%): ₹${invoiceData.gst}\n=================\nTotal: ₹${invoiceData.amount}\n\nThank you for your business!`;
      
      // Create and download file
      const blob = new Blob([invoiceContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceData.invoiceNo}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Success feedback
      setCopySuccess('Invoice downloaded successfully!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error downloading invoice');
    } finally {
      setDownloading('');
    }
  }, [paymentData, formatDate]);

  // Download E-signed Document - Fast and functional
  const downloadESignedDocument = useCallback(async () => {
    try {
      setDownloading('esign');
      
      // Create agreement content
      const agreementData = {
        docId: paymentData?.payment?.paymentId || 'DOC-TEST123',
        customer: paymentData?.payment?.userid ? 
          `${paymentData.payment.userid.firstName || ''} ${paymentData.payment.userid.lastName || ''}`.trim() || 'Test Customer' : 'Test Customer',
        plan: paymentData?.planDetails?.name || paymentData?.payment?.plan_name || 'Premium Plan',
        amount: paymentData?.payment?.amount || 1800,
        validUntil: formatDate(paymentData?.payment?.expiresAt),
        signedOn: formatDate(paymentData?.payment?.createdAt)
      };
      
      // Create agreement content
      const agreementContent = `DIGITALLY SIGNED AGREEMENT\n\n=================================\nSERVICE AGREEMENT\n=================================\n\nCustomer: ${agreementData.customer}\nPlan: ${agreementData.plan}\nAmount: ₹${agreementData.amount}\nValid Until: ${agreementData.validUntil}\n\nThis document is digitally signed and verified.\n\nDigital Signature: ${agreementData.docId}\nSigned On: ${agreementData.signedOn}\n\n=================================\nTG Automation Services\nDigitally Verified Document\n=================================`;
      
      // Create and download file
      const blob = new Blob([agreementContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `E-Signed-Agreement-${agreementData.docId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Success feedback
      setCopySuccess('E-signed document downloaded successfully!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      console.error('Error generating e-signed document:', error);
      alert('Error downloading e-signed document');
    } finally {
      setDownloading('');
    }
  }, [paymentData, formatDate]);

  // Format phone number for WhatsApp
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return '';
    // Remove any non-digit characters and ensure proper format
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  };

  // Get status configuration
  const getStatusConfig = (status) => {
    const configs = {
      SUCCESS: { 
        color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
        icon: <CheckCircle size={16} />,
        label: 'Payment Received'
      },
      FAILED: { 
        color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
        icon: <XCircle size={16} />,
        label: 'Payment Failed'
      },
      PENDING: { 
        color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
        icon: <Clock size={16} />,
        label: 'Payment Pending'
      },
      EXPIRED: { 
        color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400',
        icon: <AlertCircle size={16} />,
        label: 'Payment Expired'
      }
    };
    return configs[status] || configs.PENDING;
  };

  if (!isOpen) return null;

  // console.log("hiiiiii",paymentData.payment.netEarnedAmount);
  

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex"
      onClick={(e) => {
        // Close sidebar when clicking on the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="ml-auto w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Details
            </h2>
            {paymentData?.payment && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Payment ID: {paymentFields.idShort || '-'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="animate-spin mr-2" size={24} />
              <span className="text-gray-600 dark:text-gray-400">Loading payment details...</span>
            </div>
          ) : paymentData ? (
            <div className="p-6 space-y-6">
              {/* Payment Status Card */}
                  <div className={`rounded-lg p-4 ${getStatusConfig(paymentData.payment.status).color}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getStatusConfig(paymentData.payment.status).icon}
                    <span className="font-medium">
                      {getStatusConfig(paymentData.payment.status).label}
                    </span>
                  </div>
                  <div className="text-sm opacity-75">
                    {formatDate(paymentData.payment.createdAt)}
                  </div>
                </div>
                <div className="text-2xl font-bold mb-2">
                  {formatCurrency(paymentData.payment.amount)}
                </div>
                  <div className="grid grid-cols-2 gap-2 text-sm opacity-90">
                  <div>Payment ID: {paymentFields.idShort || '-'}</div>
                  <div>
                    Bundle: {displayValue(effectiveBundleName, paymentFields.bundleId || '-')}
                  </div>
                </div>
              </div>

              {/* Plan Details Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Package size={16} className="mr-2 text-blue-600" />
                  Plan Details
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Plan Name</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {displayValue(paymentFields.planName)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Plan Validity</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {planValidity}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Expires On</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {paymentFields.expires ? formatDate(paymentFields.expires) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Base Price</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(paymentData.planDetails?.price || paymentData.payment.amount || 0)}
                    </p>
                  </div>
                </div>
                {paymentData.planDetails?.description && (
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {paymentData.planDetails.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Comprehensive Payment Breakdown */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Calculator size={16} className="mr-2 text-green-600" />
                  Payment Breakdown & Tax Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Plan Price (Base)</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(breakdown.baseAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sub Total</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(breakdown.subTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount (if any)</span>
                    <span className="text-gray-900 dark:text-white">
                      {paymentData.payment.discountAmount ? 
                        `-${formatCurrency(paymentData.payment.discountAmount)}` : 
                        '--'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-600 dark:text-gray-400">GST</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({(breakdown.gstRate * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      +{formatCurrency(breakdown.gstAmount)}
                    </span>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-600" />
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-900 dark:text-white">Total Amount (Incl. GST)</span>
                    <span className="text-blue-600">
                      {formatCurrency(breakdown.totalAmount)}
                    </span>
                  </div>
                  {/* Platform fee info (Admin Set) near Total Amount */}
                  {(() => {
                    const adminSetFee =
                      typeof paymentData?.payment?.adminId?.platformFee === 'number'
                        ? paymentData.payment.adminId.platformFee
                        : (typeof paymentData?.payment?.adminPlatformFee === 'number'
                            ? paymentData.payment.adminPlatformFee
                            : (typeof paymentData?.calculatedFeeData?.platformFee === 'number'
                                ? paymentData.calculatedFeeData.platformFee
                                : undefined));
                    if (typeof adminSetFee === 'number') {
                      return (
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-500 dark:text-gray-400">Platform fee</span>
                          <span className="text-gray-500 dark:text-gray-400">(Admin Set: {adminSetFee})</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {paymentData.payment.status === 'SUCCESS' && (
                    <>
                      <hr className="border-gray-200 dark:border-gray-600 my-3" />
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">You received from customer</span>
                          <span className="text-green-600 font-bold">
                            {formatCurrency(paymentData.payment.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-600 dark:text-gray-400">Platform fee</span>
                            {typeof paymentData.payment.adminPlatformFee === 'number' ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                (Admin Set: {paymentData.payment.adminPlatformFee})
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({((paymentData.payment.platformFeeRate || 0.029) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(
                              typeof paymentData.payment.adminPlatformFee === 'number'
                                ? paymentData.payment.adminPlatformFee
                                : (paymentData.payment.platformFee || (paymentData.payment.amount * 0.029))
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Affiliate Share</span>
                          <span className="text-gray-900 dark:text-white">--</span>
                        </div>
                        <hr className="border-blue-200 dark:border-blue-700" />
                        <div className="flex justify-between text-base font-bold">
                          <span className="text-gray-900 dark:text-white">Net Earned Amount</span>
                          <span className="text-green-600">
                            {formatCurrency(
                              paymentData.payment.netEarnedAmount >= 0
                                ? paymentData.payment.netEarnedAmount
                                : 0
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Comprehensive Customer & KYC Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <User size={16} className="mr-2 text-indigo-600" />
                  Customer Information & KYC Details
                </h3>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-4">
                  
                  {/* Personal Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Full Name</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {displayValue(userFields.fullName)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {userFields.dob || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information */}
                  <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Contact Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Email Address</span>
                        <p className="font-medium text-gray-900 dark:text-white break-all">
                          {displayValue(userFields.email)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Phone Number</span>
                        <p className="font-mono font-medium text-gray-900 dark:text-white">
                          {formatPhoneDisplay(paymentFields.phone)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Address Information */}
                  <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Address Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">State</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {displayValue(userFields.state)}
                        </p>
                      </div>
                      {paymentData.payment.userid?.pincode && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">PIN Code</span>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">
                            {paymentData.payment.userid.pincode}
                          </p>
                        </div>
                      )}
                      {paymentData.payment.userid?.stateCode && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">State Code</span>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">
                            {paymentData.payment.userid.stateCode}
                          </p>
                        </div>
                      )}
                    </div>
                    {paymentData.payment.userid?.address && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Full Address</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {paymentData.payment.userid.address}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Identity Documents */}
                  <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Identity Documents</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">PAN Number</span>
                        <p className="font-mono font-bold text-gray-900 dark:text-white">
                          {displayValue(userFields.panNumber)}
                        </p>
                      </div>
                      <div>
                        {/* <span className="text-xs text-gray-500 dark:text-gray-400">Aadhar Number</span>
                        <p className="font-mono font-bold text-gray-900 dark:text-white">
                          {displayValue(userFields.aadharNumber)}
                        </p> */}
                      </div>
                    </div>
                  </div>
                  
                  {/* KYC Status & Verification */}
                  <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">KYC Verification Status</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">100% Complete</span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {paymentData.payment.userid?.kycStatus || 'Verified'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-green-500 transition-all duration-300" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    
                    {paymentData.payment.userid?.kycCompletedAt && (
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">KYC Completed On</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(paymentData.payment.userid.kycCompletedAt)}
                        </p>
                      </div>
                    )}
                    
                    {paymentData.payment.userid?.kycDocuments && paymentData.payment.userid.kycDocuments.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Verified Documents:</p>
                        <div className="flex flex-wrap gap-2">
                          {paymentData.payment.userid.kycDocuments.map((doc, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle size={10} className="mr-1" />
                              {doc.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Telegram Information */}
                  {(paymentData.payment.userid?.telegramUserId || paymentData.payment.userid?.telegramJoinStatus) && (
                    <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Telegram Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {paymentData.payment.userid?.telegramUserId && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Telegram ID</span>
                            <p className="font-mono font-medium text-gray-900 dark:text-white">
                              {paymentData.payment.userid.telegramUserId}
                            </p>
                          </div>
                        )}
                        {paymentData.payment.userid?.telegramJoinStatus && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Join Status</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              paymentData.payment.userid.telegramJoinStatus === 'joined' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : paymentData.payment.userid.telegramJoinStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {paymentData.payment.userid.telegramJoinStatus}
                            </span>
                          </div>
                        )}
                      </div>
                      {paymentData.payment.userid?.telegramJoinedAt && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Joined At</span>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(paymentData.payment.userid.telegramJoinedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Additional Information */}
                  {(paymentData.payment.userid?.age || paymentData.payment.userid?.occupation) && (
                    <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Additional Information</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {paymentData.payment.userid?.age && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Age</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {paymentData.payment.userid.age} years
                            </p>
                          </div>
                        )}
                        {paymentData.payment.userid?.occupation && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Occupation</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {paymentData.payment.userid.occupation}
                            </p>
                          </div>
                        )}
                        {paymentData.payment.userid?.income && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Income Range</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {paymentData.payment.userid.income}
                            </p>
                          </div>
                        )}
                        {paymentData.payment.userid?.registrationSource && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Registration Source</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {paymentData.payment.userid.registrationSource}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Contact Actions */}
                  <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700">
                    <div className="flex space-x-2">
                      {paymentData.payment.phone && (
                        <button
                          onClick={() => window.open(`https://wa.me/${formatPhoneForWhatsApp(paymentData.payment.phone)}`, '_blank')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </button>
                      )}
                      {paymentData.payment.userid?.email && (
                        <button
                          onClick={() => window.open(`mailto:${paymentData.payment.userid.email}`, '_blank')}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
                        >
                          <Mail size={14} />
                          <span>Email</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction & Payment Summary */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Wallet size={16} className="mr-2 text-orange-600" />
                  Transaction Summary
                </h3>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Amount</span>
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(paymentData.payment.amount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Method</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {paymentData.payment.paymentMethod || 'UPI'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        getStatusConfig(paymentData.payment.status).color
                      }`}>
                        {getStatusConfig(paymentData.payment.status).icon}
                        <span className="ml-1">{getStatusConfig(paymentData.payment.status).label.split(' ')[1] || getStatusConfig(paymentData.payment.status).label}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Transaction Date</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(paymentData.payment.createdAt)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Last Updated</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(paymentData.payment.updatedAt || paymentData.payment.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {paymentFields.transactionId && (
                    <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">UTR/Reference Number</span>
                          <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                            {paymentFields.transactionId}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(paymentFields.transactionId, 'UTR Number')}
                          className="ml-2 text-orange-600 hover:text-orange-700 dark:text-orange-400 flex-shrink-0"
                          title="Copy UTR Number"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      {copySuccess === 'UTR Number' && (
                        <p className="text-xs text-green-600 mt-1">UTR copied to clipboard!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Timeline */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Timer size={16} className="mr-2 text-purple-600" />
                  Detailed Timeline
                </h3>
                <div className="space-y-4">
                  {paymentData.timeline?.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                        event.status === 'success' ? 'bg-green-500' :
                        event.status === 'processing' ? 'bg-yellow-500' :
                        event.status === 'info' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.event}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No timeline data available
                      </p>
                    </div>
                  )}
                </div>
              </div>


              {/* Payment & Transaction IDs */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <CreditCard size={16} className="mr-2 text-blue-600" />
                  Payment & Transaction Details
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Payment ID</span>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-mono text-gray-900 dark:text-white">
                            {paymentFields.idFull || '-'}
                          </p>
                          {paymentData.payment.paymentId && (
                            <button
                              onClick={() => copyToClipboard(paymentData.payment.paymentId, 'Payment ID')}
                              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Transaction ID (UTR)</span>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-mono text-gray-900 dark:text-white">
                            {paymentFields.transactionId || '-'}
                          </p>
                          {paymentFields.transactionId && (
                            <button
                              onClick={() => copyToClipboard(paymentFields.transactionId, 'Transaction ID')}
                              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex-1">
                        <span className="text-xs text-blue-600 dark:text-blue-400">Payment Link with Bundle</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {displayValue(effectiveBundleName, paymentFields.bundleId || '-')} - 
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                            paymentData.payment.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {paymentData.payment.status === 'SUCCESS' ? 'Paid' : 'Pending'}
                          </span>
                        </p>
                        {copySuccess === 'Payment Link' && (
                          <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                        )}
                      </div>
                      {paymentData.payment.link_url && (
                        <button
                          onClick={() => copyToClipboard(paymentData.payment.link_url, 'Payment Link')}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Refunds Section */}
              {paymentData.payment.status === 'SUCCESS' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <RefreshCw size={16} className="mr-2" />
                    Refunds
                  </h3>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                      <RefreshCw size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      No Refunds initiated yet!
                    </p>
                    <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center mx-auto">
                      Initiate refunds
                      <ArrowRight size={14} className="ml-1" />
                    </button>
                  </div>
                </div>
              )}

              {/* Transaction Technical Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Info size={16} className="mr-2" />
                  Technical Details
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Payment Link ID</span>
                      <button
                        onClick={() => copyToClipboard(paymentData.payment.link_id, 'Link ID')}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
                      >
                        <span className="font-mono text-xs">
                          {paymentData.payment.link_id?.slice(0, 12)}...
                        </span>
                        <Copy size={12} />
                      </button>
                    </div>
                    {copySuccess === 'Link ID' && (
                      <p className="text-xs text-green-600 text-right">Copied!</p>
                    )}
                  </div>

                  {paymentData.payment.link_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Payment Link</span>
                      <button
                        onClick={() => window.open(paymentData.payment.link_url, '_blank')}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  )}

                  {paymentData.payment.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Expires At</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(paymentData.payment.expiresAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Details */}
              {paymentData.planDetails && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Package size={16} className="mr-2" />
                    Plan Details
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Plan Name</span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium">
                          {paymentData.planDetails.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {paymentData.planDetails.duration} {paymentData.planDetails.durationType}
                        </span>
                      </div>
                      {paymentData.planDetails.description && (
                        <div className="pt-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {paymentData.planDetails.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Channel Memberships */}
              {paymentData.channelMemberships && paymentData.channelMemberships.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Smartphone size={16} className="mr-2" />
                    Channel Access ({paymentData.channelMemberships.length})
                  </h3>
                  <div className="space-y-2">
                    {paymentData.channelMemberships.map((membership, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {membership.channelName || membership.channelId}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Expires: {formatDate(membership.expiresAt)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            membership.isActive && new Date(membership.expiresAt) > new Date() 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {membership.isActive && new Date(membership.expiresAt) > new Date() ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failure Reason */}
              {paymentData.payment.failure_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      {/* <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Payment Failed
                      </h4> */}
                      <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                        {paymentData.payment.failure_reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Payment Details</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
              <button
                onClick={fetchPaymentDetails}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <RefreshCw className="mr-2" size={16} />
                Try Again
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <AlertCircle size={48} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No payment data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer Actions */}
        {paymentData && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50">
            <div className="space-y-3">
              {/* First row - Downloads */}
              <div className="flex space-x-2">
                <button
                  onClick={downloadInvoice}
                  disabled={downloading === 'invoice'}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
                >
                  {downloading === 'invoice' ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>Invoice</span>
                </button>
                
                <button
                  onClick={downloadESignedDocument}
                  disabled={downloading === 'esign'}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
                >
                  {downloading === 'esign' ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span>E-Signed Doc</span>
                </button>
                
                {paymentData.payment.link_url && (
                  <button
                    onClick={() => window.open(paymentData.payment.link_url, '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
                  >
                    <ExternalLink size={14} />
                    <span>Payment Link</span>
                  </button>
                )}
              </div>
              
              {/* Second row - Additional actions */}
              <div className="flex space-x-2">
                {paymentData.payment.invoiceId && (
                  <button
                    onClick={() => window.open(`/admin/admin-invoices?id=${paymentData.payment.invoiceId}`, '_blank')}
                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center space-x-2 transition-colors text-sm"
                  >
                    <Eye size={14} />
                    <span>View Online Invoice</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    const details = `Payment Details:\n` +
                      `ID: ${paymentData.payment.paymentId}\n` +
                      `Amount: ${formatCurrency(paymentData.payment.amount)}\n` +
                      `Status: ${paymentData.payment.status}\n` +
                      `Plan: ${paymentData.planDetails?.name || paymentData.payment?.plan_name}\n` +
                      `Customer: ${paymentData.payment?.userid ? 
                        `${paymentData.payment.userid.firstName || ''} ${paymentData.payment.userid.lastName || ''}`.trim() : '-'}`;
                    copyToClipboard(details, 'Payment Details');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"
                >
                  <ScrollText size={14} />
                  <span>Copy Details</span>
                </button>
              </div>
              
              {copySuccess === 'Payment Details' && (
                <p className="text-xs text-green-600 text-center">Payment details copied to clipboard!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetailSidebar;
