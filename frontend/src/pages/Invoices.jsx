import React, { useEffect, useState } from "react";
import axios from "axios";

const getDownloadUrl = (cloudinaryUrl, filename = 'invoice.pdf') => {
  if (!cloudinaryUrl) return '';
  return cloudinaryUrl.replace('/upload/', `/upload/fl_attachment:${filename}/`);
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (user._id) {
      axios.get(`http://localhost:4000/api/invoices/user/${user._id}`)
        .then(res => setInvoices(res.data.invoices || []));
    }
  }, [user._id]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Your Invoices</h2>
      {invoices.length === 0 ? (
        <p>No invoices found.</p>
      ) : (
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Invoice No</th>
              <th className="p-2">Date</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv._id} className="border-t">
                <td className="p-2">{inv.invoiceNo}</td>
                <td className="p-2">{new Date(inv.billDate).toLocaleDateString()}</td>
                <td className="p-2">₹{inv.total?.toFixed(2) || inv.price?.toFixed(2) || '-'}</td>
                <td className="p-2">
                  {inv.cloudinaryUrl ? (
                    <a
                      href={getDownloadUrl(inv.cloudinaryUrl, `invoice_${inv.invoiceNo || inv._id}.pdf`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-gray-400">Not available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Invoices; 