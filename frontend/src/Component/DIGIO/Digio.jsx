import { useState, useEffect } from 'react';
import axios from 'axios';
import { loadDigioSDK } from '../DIGIO/utils/digio';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { setBundleSpecificValue } from '../../utils/featureToggleUtils';
import { markStepCompletedInDatabase, canUserPerformStep, verifyStepCompletionFromDatabase } from '../../utils/stepPersistenceUtils';

export default function Digio() {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // CRITICAL: Check if e-sign already completed on component mount
  useEffect(() => {
    const checkESignCompletion = async () => {
      const userPhone = localStorage.getItem('userPhone');
      const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
      
      if (userPhone) {
        try {
          const canPerform = await canUserPerformStep(userPhone, currentBundleRoute, 'esign');
          
          if (!canPerform.canPerform) {
            console.log('🚫 E-Sign already completed - redirecting to next step');
            toast.warning('Document signing has already been completed for this account.');
            
            // Import and get next path
            const { completeStepAndGetNextPath } = await import('../../utils/featureToggleUtils');
            const nextPath = completeStepAndGetNextPath('esign');
            navigate(nextPath);
            return;
          }
        } catch (error) {
          console.warn('⚠️ Could not verify e-sign completion status:', error);
        }
      }
    };
    
    checkESignCompletion();
  }, [navigate]);

  const handleSign = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadDigioSDK();

      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData)._id : null;

      const { data } = await axios.post('http://localhost:4000/api/digio/uploadPDF', {
        userid: userId
      });

      const documentId = data.documentId;
      const identifier = data.identifier;
      
      console.log(documentId,identifier);

      const digio = new window.Digio({
        environment: 'production',
        callback: async (response) => {
          console.log('Digio callback response:', response);
          if (response.error_code) {
            console.error('Signing failed:', response);
            toast.error('Unable to process your request. Please try again later.', {
              toastId: 'signing-error'
            });
            setError('Unable to process your request. Please try again later.');
            const { completeStepAndGetNextPath } = await import('../../utils/featureToggleUtils');
            const nextPath = completeStepAndGetNextPath('esign');
            setTimeout(() => {
              navigate(nextPath);
            }, 2000);
          } else {
            try {
              console.log('Signed Successfully:', response);
              
              // CRITICAL: Mark e-sign completion in database with bulletproof persistence
              const userPhone = localStorage.getItem('userPhone');
              const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
              
              if (userPhone) {
                try {
                  console.log('💾 CRITICAL: Saving e-sign completion to database...');
                  const esignCompletionData = {
                    digioDocId: response.digio_doc_id,
                    digioResponse: response,
                    documentType: 'esign_aadhaar',
                    completedAt: new Date().toISOString(),
                    signatureMethod: 'aadhaar_otp'
                  };
                  
                  await markStepCompletedInDatabase(userPhone, currentBundleRoute, 'esign', esignCompletionData);
                  console.log('✅ E-Sign completion SAVED to database successfully');
                  
                } catch (dbError) {
                  console.error('🚨 CRITICAL: Failed to save e-sign completion to database:', dbError);
                  // E-sign completion will be saved to localStorage as backup in markStepCompletedInDatabase
                }
              }
              
              // Mark e-sign as completed in localStorage as backup
              setBundleSpecificValue('digioCompleted', 'true');
              console.log('🎯 E-Sign marked as completed in localStorage');
              
              // Try to get signed document link
              try {
                const signedRes = await axios.get(`http://localhost:4000/api/digio/signed-link/${response.digio_doc_id}`);
                console.log('SignedRes:', signedRes);
                setSignedUrl(signedRes.data.signedLink);
              } catch (linkError) {
                console.warn('⚠️ Could not fetch signed document link:', linkError);
                // Don't fail the e-sign process for this
              }
              
              toast.success('Document signed successfully!', {
                toastId: 'signing-success'
              });
              
              const { completeStepAndGetNextPath } = await import('../../utils/featureToggleUtils');
              const nextPath = completeStepAndGetNextPath('esign');
              console.log('🎯 Next path after e-sign completion:', nextPath);
              
              setTimeout(() => {
                navigate(nextPath);
              }, 2000);
            } catch (err) {
              console.error('Error in e-sign completion handling:', err);
              
              // CRITICAL: Still mark e-sign completion in database even if some parts fail
              const userPhone = localStorage.getItem('userPhone');
              const currentBundleRoute = localStorage.getItem('currentBundleCustomRoute') || 'default';
              
              if (userPhone) {
                try {
                  console.log('💾 CRITICAL: Saving e-sign completion to database (recovery mode)...');
                  const esignCompletionData = {
                    digioDocId: response.digio_doc_id,
                    digioResponse: response,
                    documentType: 'esign_aadhaar',
                    completedAt: new Date().toISOString(),
                    signatureMethod: 'aadhaar_otp',
                    recoveryMode: true,
                    originalError: err.message
                  };
                  
                  await markStepCompletedInDatabase(userPhone, currentBundleRoute, 'esign', esignCompletionData);
                  console.log('✅ E-Sign completion SAVED to database in recovery mode');
                  
                } catch (dbError) {
                  console.error('🚨 CRITICAL: Failed to save e-sign completion to database even in recovery mode:', dbError);
                }
              }
              
              // Mark e-sign as completed in localStorage as backup
              setBundleSpecificValue('digioCompleted', 'true');
              console.log('🎯 E-Sign marked as completed despite errors');
              
              toast.success('Document signed successfully!', {
                toastId: 'signing-success'
              });
              
              const { completeStepAndGetNextPath } = await import('../../utils/featureToggleUtils');
              const nextPath = completeStepAndGetNextPath('esign');
              console.log('🎯 Next path after e-sign completion (with recovery):', nextPath);
              
              setTimeout(() => {
                navigate(nextPath);
              }, 2000);
            }
          }
          setLoading(false);
        }
      });

      digio.init();
      digio.submit(documentId, identifier);

    } catch (err) {
      console.error('Error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || err.message;
      
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData)._id : null;
      
      if (errorMessage.includes('Insufficient credits')) {
        console.error('Digio credit error:', errorMessage);
        const errorMsg = 'Service temporarily unavailable. Please try again later.';
        
        if (userId) {
          try {
            await axios.post('http://localhost:4000/api/digio/errors', {
              type: 'credit',
              message: errorMessage,
              userId: userId,
              timestamp: new Date().toISOString(),
              status: 'unresolved'
            });
          } catch (logError) {
            console.error('Failed to log error:', logError);
          }
        }
        
        toast.error(errorMsg, {
          toastId: 'general-error'
        });
        setError(errorMsg);
      } else if (err.response?.status === 404) {
        const errorMsg = 'Service temporarily unavailable. Please try again later.';
        
        if (userId) {
          try {
            await axios.post('http://localhost:4000/api/digio/errors', {
              type: 'service',
              message: errorMessage,
              userId: userId,
              timestamp: new Date().toISOString(),
              status: 'unresolved'
            });
          } catch (logError) {
            console.error('Failed to log error:', logError);
          }
        }
        
        toast.error(errorMsg, {
          toastId: 'service-unavailable'
        });
        setError(errorMsg);
      } else {
        const errorMsg = 'Service temporarily unavailable. Please try again later.';
        
        if (userId) {
          try {
            await axios.post('http://localhost:4000/api/digio/errors', {
              type: 'general',
              message: errorMessage,
              userId: userId,
              timestamp: new Date().toISOString(),
              status: 'unresolved'
            });
          } catch (logError) {
            console.error('Failed to log error:', logError);
          }
        }
        
        toast.error(errorMsg, {
          toastId: 'general-error'
        });
        setError(errorMsg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        theme="light"
        limit={1}
      />
      
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Aadhaar eSign Document</h2>
            <p className="text-gray-500 text-sm">Sign your documents securely with Aadhaar</p>
          </div>

          <button
            onClick={handleSign}
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-md text-sm font-medium text-white transition-colors duration-200 ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800'}`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              'Sign the Document'
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-md border border-red-100">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-800">To resolve this issue:</p>
                    <ol className="mt-1 text-sm list-decimal pl-5 text-red-700">
                      <li>Please try again after some time</li>
                      <li>If the issue persists, contact support</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {signedUrl && (
            <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-100">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">Document Signed Successfully!</h4>
                  <a 
                    href={signedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-1 inline-flex items-center text-sm text-green-600 hover:text-green-800"
                  >
                    <span>View Signed Document</span>
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
