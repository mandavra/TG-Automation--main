# New Feature Locations in Admin Panel

## 🚀 Channel Bundle Feature Toggles & Minute-Based Plans

### Where to Find These Options:

#### 1. **Create New Channel Bundle**
📍 **Path**: Admin Panel → Groups/Channel Bundles → "Create New Bundle"  
📄 **File**: `frontend/src/pages/CreateChannelBundle.jsx`

**Location in Form**:
- **Feature Toggles**: In the "Settings" section (after GST checkbox)
  - ✅ Enable E-Sign requirement
  - ✅ Enable KYC verification  
  - ✅ Enable payment requirement

- **Plan Duration Options**: In "Subscription Plans" section
  - Testing durations: 2min, 5min, 10min, 15min, 30min, 1hour
  - Standard durations: week, month, year

#### 2. **Edit Existing Channel Bundle**
📍 **Path**: Admin Panel → Groups/Channel Bundles → [Select Bundle] → "Edit"  
📄 **File**: `frontend/src/pages/EditGroup.jsx`

**Location in Form**:
- **Feature Toggles**: Step 1 - "Edit Details" (after image upload)
  - Feature Controls (for Testing) section
  - Same toggles as create form

- **Plan Duration Options**: Step 2 - "Update Pricing" → Add New Plan
  - Same testing + standard duration options

### 🎯 How to Use:

#### **Feature Toggles**:
- **Green checkbox** = E-Sign controls
- **Orange checkbox** = KYC controls  
- **Purple checkbox** = Payment controls
- **Default**: All enabled (checked)
- **Purpose**: Turn off specific requirements for testing different user flows

#### **Minute-Based Plans**:
- **Purpose**: Rapid testing of complete subscription workflows
- **Usage**: Create plans with 2-5 minute durations to test:
  - Payment flow
  - E-Sign process
  - KYC verification
  - Invite link generation
  - User subscription lifecycle

### 🔧 Technical Details:

#### **Backend Schema Changes**:
- `backend/models/group.model.js` - Added `featureToggles` object
- `backend/models/plan.js` - Extended `duration` enum with minute options
- `backend/services/generateOneTimeInviteLink.js` - Added `convertDurationToSeconds()` utility

#### **API Support**:
- All existing group/bundle APIs now support `featureToggles` field
- Plan creation/update APIs accept minute-based duration values
- Backward compatibility maintained

### 📋 Testing Scenarios:

#### **Quick Test Setup**:
1. Create bundle with all features enabled
2. Add 2-minute plan for rapid testing
3. Toggle features off one by one to test bypass logic
4. Use 5-minute plans for slightly longer test cycles

#### **Feature Combinations**:
- **Payment Only**: E-Sign ❌, KYC ❌, Payment ✅
- **KYC Only**: E-Sign ❌, KYC ✅, Payment ❌  
- **E-Sign Only**: E-Sign ✅, KYC ❌, Payment ❌
- **No Requirements**: All features ❌ (direct access)

### 🎉 Ready for Use!
Your TG Automation system now supports granular feature control and rapid testing capabilities. Create channel bundles with the exact feature combinations you need for testing different user journeys!