# Invoice Filename Implementation

## 🎯 Problem Solved

**Before**: All invoice PDF files had generic names like `invoice_507f1f77bcf86cd799439011.pdf`
**After**: Invoice PDFs now use the actual invoice number like `INV-252601102200001.pdf`

## 📋 Files Updated

### 1. Invoice Controller (`backend/controllers/invoiceController.js`)
**Changed**:
- File saving path from `invoice_${invoice._id}.pdf` to `${invoiceNo}.pdf`
- Resend email function filename updated
- Added special character sanitization

**Before**:
```javascript
const localPdfPath = path.join(uploadDir, `invoice_${invoice._id}.pdf`);
```

**After**:
```javascript
const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_');
const localPdfPath = path.join(uploadDir, `${safeInvoiceNo}.pdf`);
```

### 2. Enhanced Invoice Controller (`backend/controllers/enhancedInvoiceController.js`)
**Changed**:
- Simplified filename from complex timestamp format to clean invoice number
- Consistent with standard invoice controller

**Before**:
```javascript
const filename = `invoice_${invoiceData.invoiceNo}_${timestamp}_${invoice._id}.pdf`;
```

**After**:
```javascript
const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_');
const filename = `${safeInvoiceNo}.pdf`;
```

### 3. KYC Controller (`backend/controllers/kycController.js`)
**Changed**:
- Updated PDF path generation to use invoice number

**Before**:
```javascript
const pdfPath = path.join(__dirname, `../invoices/invoice_${invoice._id}.pdf`);
```

**After**:
```javascript
const safeInvoiceNo = invoice.invoiceNo.replace(/[^a-zA-Z0-9-]/g, '_');
const pdfPath = path.join(__dirname, `../invoices/${safeInvoiceNo}.pdf`);
```

### 4. Invoice Routes (`backend/routes/invoiceRoutes.js`)
**Changed**:
- Download endpoint now uses invoice number for filename
- View endpoint uses invoice number for browser display
- Maintains backward compatibility for legacy files

**Before**:
```javascript
res.download(invoice.localPdfPath, `invoice_${invoice.invoiceNo || invoice._id}.pdf`);
```

**After**:
```javascript
const downloadFilename = invoice.invoiceNo ? `${invoice.invoiceNo}.pdf` : `invoice_${invoice._id}.pdf`;
res.download(invoice.localPdfPath, downloadFilename);
```

## 📁 File Organization Examples

### New File Structure:
```
/backend/public/uploads/invoices/
├── INV-252601102200001.pdf    ← Admin 011, Channel 022, Counter 1
├── INV-252601102200002.pdf    ← Admin 011, Channel 022, Counter 2
├── INV-252612345600001.pdf    ← Admin 123, Channel 456, Counter 1
├── INV-252678900000001.pdf    ← Admin 789, No Channel, Counter 1
├── INV-FALLBACK-01102227821034.pdf  ← Fallback invoice
└── invoice_507f1f77bcf86cd799439011.pdf  ← Legacy file (preserved)
```

### Filename Components:
```
INV-252601102200001.pdf
│   │  │  │  │    │
│   │  │  │  │    └── Sequential counter (00001)
│   │  │  │  └────── Channel bundle last 3 digits (022)
│   │  │  └────────── Admin ID last 3 digits (011)
│   │  └──────────────── Financial year (2526 = 2025-26)
│   └──────────────────── Fixed prefix (INV-)
└───────────────────────── File extension (.pdf)
```

## ✅ Benefits

### 1. **Professional Appearance**
- Customer downloads: `INV-252601102200001.pdf` instead of `invoice_507f1f77bcf86cd799439011.pdf`
- Email attachments have meaningful names
- Browser view shows proper filename

### 2. **Better Organization**
- Files naturally sort by financial year then sequence
- Admin-specific grouping visible in filenames
- Easy to identify invoice by number

### 3. **Search-Friendly**
- Can search for specific invoice numbers in file system
- Accountants can quickly locate files
- Backup systems have meaningful names

### 4. **Consistency**
- Same filename across all touchpoints:
  - File system storage
  - Download endpoint
  - Email attachments
  - Browser view
  - Admin interface

## 🔄 Backward Compatibility

### Legacy Support:
- ✅ Existing files with old names are preserved
- ✅ Download routes handle both old and new formats
- ✅ No database migration required
- ✅ System works seamlessly during transition

### Fallback Handling:
- ✅ Special characters sanitized for filesystem safety
- ✅ Legacy invoices without `invoiceNo` use ObjectId fallback
- ✅ Error cases handled gracefully

## 🎯 Expected Results

### For New Invoices:
1. **File Creation**: `INV-252601102200001.pdf`
2. **Download**: Customer gets `INV-252601102200001.pdf`
3. **Email**: Attachment named `INV-252601102200001.pdf`
4. **Browser View**: Shows `INV-252601102200001.pdf`

### For Existing Invoices:
1. **File Remains**: `invoice_507f1f77bcf86cd799439011.pdf`
2. **Download**: Customer gets `INV-OLD-INVOICE-NO.pdf` (if has invoiceNo)
3. **Fallback**: Uses `invoice_507f1f77bcf86cd799439011.pdf` if no invoiceNo

## 🚀 Production Deployment

### Zero-Downtime Deployment:
1. ✅ Deploy code changes
2. ✅ New invoices use new naming automatically
3. ✅ Existing invoices continue working
4. ✅ No service interruption required

### Monitoring:
- Check new files are created with correct names
- Verify downloads work for both old and new files
- Monitor for any filesystem issues with special characters

---

## 📊 Summary

**Problem**: Generic filenames made invoice management difficult
**Solution**: Use actual invoice numbers as filenames
**Result**: Professional, organized, searchable invoice files

**Implementation**: ✅ Complete and ready for production