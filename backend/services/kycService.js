// const User = require('../models/user.model');

// exports.createUser = async (userData) => {
//   const user = new User(userData);  // 👈 create a new User instance
//   return await user.save();         // ✅ now safe to call save()
// };


// exports.getAllUsers = async () => {
//   return await User.find().populate("Invoice");
// };

// exports.getUserById = async (id) => {
//   return await User.findById(id);
// };

// exports.updateUserById = async (id, updateData) => {
//   return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
// };

// exports.deleteUserById = async (id) => {
//   return await User.findByIdAndDelete(id);
// };
const User = require('../models/user.model');

// New function for phone-based user creation/login
exports.upsertUserByPhone = async (userData) => {
  try {
    const { phone } = userData;
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Check if user already exists by phone
    let existingUser = await User.findOne({ phone: phone });

    if (existingUser) {
      // User exists - update their data (for returning users)
      console.log(`Existing user found for phone ${phone}, updating data`);

      // Preserve KYC and E-Sign status unless explicitly set in userData
      const updateFields = { ...userData, phone };
      // Always set kycCompleted to true for any update
      updateFields.kycCompleted = true;
      // if (typeof userData.esignCompleted === 'undefined') {
      //   updateFields.esignCompleted = existingUser.esignCompleted;
      // }

      // Update user with new data while preserving adminId and other existing fields
      const updatedUser = await User.findByIdAndUpdate(
        existingUser._id,
        { $set: updateFields },
        { new: true, runValidators: false }
      );

      return {
        user: updatedUser,
        isNewUser: false,
        message: 'User data updated successfully'
      };
    }

    // User doesn't exist - create new user
    console.log(`Creating new user for phone ${phone}`);
    
    // Try to determine adminId from recent payment link by phone
    if (!userData.adminId) {
      const PaymentLink = require('../models/paymentLinkModel');
      const recentPayment = await PaymentLink.findOne({ 
        phone: phone 
      }).sort({ createdAt: -1 });
      
      if (recentPayment && recentPayment.adminId) {
        userData.adminId = recentPayment.adminId;
        userData.groupId = recentPayment.groupId;
        console.log(`Assigned adminId ${recentPayment.adminId} to new user from payment`);
      }
    }

    // If still no adminId, try to find from email if provided
    if (!userData.adminId && userData.email) {
      const PaymentLink = require('../models/paymentLinkModel');
      const recentPayment = await PaymentLink.findOne({ 
        customer_id: userData.email 
      }).sort({ createdAt: -1 });
      
      if (recentPayment && recentPayment.adminId) {
        userData.adminId = recentPayment.adminId;
        userData.groupId = recentPayment.groupId;
        console.log(`Assigned adminId ${recentPayment.adminId} to new user from email payment`);
      }
    }

    // Create new user - no duplicate checking, just store the data
    const newUser = new User(userData);
    newUser.kycCompleted = true;
    await newUser.save({ validateBeforeSave: false });

    return {
      user: newUser,
      isNewUser: true,
      message: 'New user created successfully'
    };

  } catch (error) {
    throw new Error(`Error in upsertUserByPhone: ${error.message}`);
  }
};

// Get user by phone number
exports.getUserByPhone = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    const user = await User.findOne({ phone: phone });
    return user;
  } catch (error) {
    throw new Error(`Error in getUserByPhone: ${error.message}`);
  }
};

exports.upsertUserByEmail = async (userData) => {
  try {
    // If userid is not provided, create a new user
    if (!userData.userid) {
      // Try to determine adminId from their payment if possible
      if (!userData.adminId && userData.email) {
        // Look for recent payment link for this user to get adminId
        const PaymentLink = require('../models/paymentLinkModel');
        const recentPayment = await PaymentLink.findOne({ 
          customer_id: userData.email 
        }).sort({ createdAt: -1 });
        
        if (recentPayment && recentPayment.adminId) {
          userData.adminId = recentPayment.adminId;
          userData.groupId = recentPayment.groupId;
          console.log(`Assigned adminId ${recentPayment.adminId} to user from payment`);
        }
      }
      
      const newUser = new User(userData);
      return await newUser.save();
    }

    // If userid is provided, try to update existing user
    // Also try to set adminId if not present
    if (!userData.adminId) {
      const existingUser = await User.findById(userData.userid);
      if (existingUser && existingUser.email) {
        const PaymentLink = require('../models/paymentLinkModel');
        const recentPayment = await PaymentLink.findOne({ 
          customer_id: existingUser.email 
        }).sort({ createdAt: -1 });
        
        if (recentPayment && recentPayment.adminId) {
          userData.adminId = recentPayment.adminId;
          userData.groupId = recentPayment.groupId;
        }
      }
    }
    
    return await User.findByIdAndUpdate(
      userData.userid,
      { $set: userData },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    throw new Error(`Error in upsertUserByEmail: ${error.message}`);
  }
};
exports.getAllUsers = async (query = {}) => {
  return await User.find(query);
};

exports.getUserById = async (id) => {
  return await User.findById(id);
};

exports.updateUserById = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

exports.deleteUserById = async (id) => {
  return await User.findByIdAndDelete(id);
};

exports.getTodayUsers = async (adminQuery = {}) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const query = {
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    ...adminQuery
  };
  
  return await User.find(query);
};
