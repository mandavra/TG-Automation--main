import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  FileText, 
  User, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Mail,
  Phone,
  MapPin,
  Globe,
  RefreshCw
} from 'lucide-react';

const DocumentDetailsModal = ({ isOpen, onClose, documentId }) => {
  const [document, setDocument] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch document details
  const fetchDocumentDetails = async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/documents/admin/${documentId}`,
        { headers: getAuthHeader() }
      );
      
      setDocument(response.data.document);
      setTimeline(response.data.timeline);
    } catch (error) {
      console.error('Error fetching document details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocumentDetails();
    }
  }, [isOpen, documentId]);

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded': return 'text-blue-600 bg-blue-50';
      case 'sent_for_signing': return 'text-yellow-600 bg-yellow-50';
      case 'signed': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-emerald-600 bg-emerald-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'expired': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get timeline icon
  const getTimelineIcon = (status) => {
    switch (status) {
      case 'uploaded': return <FileText size={16} />;
      case 'sent_for_signing': return <Clock size={16} />;
      case 'signed': return <CheckCircle size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      case 'error': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Download document
  const handleDownload = async (type = 'signed') => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/documents/admin/${documentId}/download/${type}`,
        { 
          headers: getAuthHeader(),
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${documentId}_${type}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Document Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin mr-2" size={24} />
            <span className="text-gray-600 dark:text-gray-400">Loading document details...</span>
          </div>
        )}

        {/* Content */}
        {!loading && document && (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'timeline'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Timeline
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Document Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Document Information
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {document.originalFileName || document.fileName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Document ID: {document.documentId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                            {document.status.charAt(0).toUpperCase() + document.status.slice(1).replace('_', ' ')}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Created: {formatDate(document.createdAt)}
                          </span>
                        </div>

                        {document.fileSize && (
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              File Size: {document.fileSize}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        User Information
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <User className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {document.userName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              User
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {document.userEmail}
                          </span>
                        </div>

                        {document.userPhone && (
                          <div className="flex items-start space-x-3">
                            <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {document.userPhone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Signer Information */}
                  {document.signerData && Object.keys(document.signerData).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Signer Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {document.signerData.name && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {document.signerData.name}
                            </span>
                          </div>
                        )}
                        {document.signerData.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {document.signerData.email}
                            </span>
                          </div>
                        )}
                        {document.signerData.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {document.signerData.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {document.metadata && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Technical Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {document.metadata.mimeType && (
                          <div>MIME Type: {document.metadata.mimeType}</div>
                        )}
                        {document.metadata.pages && (
                          <div>Pages: {document.metadata.pages}</div>
                        )}
                        {document.metadata.ipAddress && (
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4" />
                            <span>IP: {document.metadata.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Document Timeline
                  </h3>
                  
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {timeline.map((event, eventIdx) => (
                        <li key={eventIdx}>
                          <div className="relative pb-8">
                            {eventIdx !== timeline.length - 1 ? (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600" />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${getStatusColor(event.status)}`}>
                                {getTimelineIcon(event.status)}
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {event.event}
                                  </p>
                                  {event.details && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                      {event.details}
                                    </p>
                                  )}
                                  {event.signer && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      Signed by: {event.signer.email || event.signer.name}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                  {formatDate(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDownload('original')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Download size={16} className="mr-2" />
                  Download Original
                </button>
                {document.canDownload && (
                  <button
                    onClick={() => handleDownload('signed')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Download Signed
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentDetailsModal;