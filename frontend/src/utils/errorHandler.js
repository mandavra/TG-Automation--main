// Comprehensive error handling utility for payment management

// Optional toast notifications (fallback to console if not available)
const showToast = (message, type = 'error') => {
  try {
    // Try to use react-hot-toast if available
    if (window.toast) {
      window.toast[type](message);
    } else if (window.alert) {
      // Fallback to browser alert for critical errors
      if (type === 'error') window.alert(`Error: ${message}`);
    } else {
      // Fallback to console
      console.error(`Toast (${type}):`, message);
    }
  } catch (error) {
    console.error(`Toast (${type}):`, message);
  }
};

export class APIError extends Error {
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Error handler for different types of errors
export const handleError = (error, context = 'Operation') => {
  console.error(`${context} Error:`, error);

  if (error.name === 'NetworkError' || error.code === 'ECONNREFUSED') {
    showToast('Unable to connect to server. Please check your connection.');
    return {
      type: 'network',
      message: 'Connection failed',
      canRetry: true,
      userMessage: 'Please check your internet connection and try again.'
    };
  }

  if (error.name === 'AuthenticationError' || error.status === 401) {
    showToast('Session expired. Please login again.');
    return {
      type: 'auth',
      message: 'Authentication failed',
      canRetry: false,
      userMessage: 'Your session has expired. Please log in again.',
      action: 'redirect_login'
    };
  }

  if (error.status === 403) {
    showToast('Access denied. You don\'t have permission for this action.');
    return {
      type: 'permission',
      message: 'Access denied',
      canRetry: false,
      userMessage: 'You don\'t have permission to perform this action.'
    };
  }

  if (error.status === 404) {
    showToast('Requested resource not found.');
    return {
      type: 'notfound',
      message: 'Resource not found',
      canRetry: false,
      userMessage: 'The requested resource could not be found.'
    };
  }

  if (error.status >= 500) {
    showToast('Server error. Please try again later.');
    return {
      type: 'server',
      message: 'Server error',
      canRetry: true,
      userMessage: 'A server error occurred. Please try again in a few moments.'
    };
  }

  if (error.name === 'ValidationError') {
    showToast(`Validation Error: ${error.message}`);
    return {
      type: 'validation',
      message: error.message,
      field: error.field,
      canRetry: false,
      userMessage: `Please correct the following: ${error.message}`
    };
  }

  // Generic error
  const message = error.message || 'An unexpected error occurred';
  showToast(message);
  return {
    type: 'generic',
    message,
    canRetry: true,
    userMessage: message
  };
};

// Retry mechanism with exponential backoff
export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      if (error.status === 401 || error.status === 403 || error.status === 404) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Loading states manager
export const createLoadingManager = () => {
  const loadingStates = new Map();
  const listeners = new Set();

  return {
    // Set loading state for a specific key
    setLoading: (key, isLoading) => {
      loadingStates.set(key, isLoading);
      listeners.forEach(listener => listener(key, isLoading));
    },

    // Get loading state for a key
    isLoading: (key) => loadingStates.get(key) || false,

    // Get all loading states
    getAll: () => Object.fromEntries(loadingStates),

    // Clear all loading states
    clearAll: () => {
      loadingStates.clear();
      listeners.forEach(listener => listener(null, false));
    },

    // Subscribe to loading state changes
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
};

// Performance monitoring
export const performanceMonitor = {
  start: (operation) => {
    const startTime = performance.now();
    
    return {
      end: (data = {}) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log slow operations (> 2 seconds)
        if (duration > 2000) {
          console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, data);
        }
        
        // Log to analytics if available
        if (window.analytics) {
          window.analytics.track('Performance', {
            operation,
            duration,
            ...data
          });
        }
        
        return duration;
      }
    };
  }
};

// Data validation utilities
export const validatePaymentData = (data) => {
  const errors = [];

  if (!data.amount || data.amount <= 0) {
    errors.push(new ValidationError('Amount must be greater than 0', 'amount'));
  }

  if (!data.customer_id && !data.customerEmail && !data.phone) {
    errors.push(new ValidationError('Customer identification is required'));
  }

  if (!data.plan_id && !data.plan_name) {
    errors.push(new ValidationError('Plan information is required'));
  }

  return errors;
};

// Safe API call wrapper
export const safeAPICall = async (apiCall, context = 'API Call') => {
  const monitor = performanceMonitor.start(context);
  
  try {
    const result = await withRetry(apiCall, 3, 1000);
    monitor.end({ success: true });
    return { success: true, data: result };
  } catch (error) {
    monitor.end({ success: false, error: error.message });
    const handledError = handleError(error, context);
    return { success: false, error: handledError };
  }
};

// Cache management with TTL
export const createCache = (defaultTTL = 5 * 60 * 1000) => { // 5 minutes default
  const cache = new Map();
  const timers = new Map();

  return {
    get: (key) => {
      const item = cache.get(key);
      return item ? item.data : null;
    },

    set: (key, data, ttl = defaultTTL) => {
      // Clear existing timer
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
      }

      // Set data
      cache.set(key, { data, timestamp: Date.now() });

      // Set expiration timer
      const timer = setTimeout(() => {
        cache.delete(key);
        timers.delete(key);
      }, ttl);
      
      timers.set(key, timer);
    },

    has: (key) => cache.has(key),

    delete: (key) => {
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
        timers.delete(key);
      }
      return cache.delete(key);
    },

    clear: () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
      cache.clear();
    },

    size: () => cache.size,

    // Get cache statistics
    getStats: () => ({
      size: cache.size,
      keys: Array.from(cache.keys()),
      oldestTimestamp: Math.min(...Array.from(cache.values()).map(v => v.timestamp)),
      newestTimestamp: Math.max(...Array.from(cache.values()).map(v => v.timestamp))
    })
  };
};

// Debounced function utility
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Throttled function utility
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default {
  APIError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  handleError,
  withRetry,
  createLoadingManager,
  performanceMonitor,
  validatePaymentData,
  safeAPICall,
  createCache,
  debounce,
  throttle
};