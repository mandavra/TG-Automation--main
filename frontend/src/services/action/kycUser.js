import axios from "axios";
import { toast } from "react-toastify";

export const createUser = (formData) => async (dispatch) => {
  try {
    console.log('🔍 KYC Action - Starting KYC submission...');
    console.log('📋 KYC Action - Form data received:', formData);
    
    // Get user phone from localStorage - this should always be available after OTP
    const userPhone = localStorage.getItem("userPhone");
    const userData = localStorage.getItem("user");
    
    console.log('🔍 KYC Action - localStorage check:');
    console.log('   userPhone:', userPhone);
    console.log('   userData:', userData);
    
    let phone = userPhone;
    
    // Try to get phone from user object if userPhone is not available
    if (!phone && userData) {
      try {
        const user = JSON.parse(userData);
        phone = user?.phone;
        console.log('📱 KYC Action - Got phone from user object:', phone);
      } catch (error) {
        console.error('❌ KYC Action - Error parsing user data:', error);
      }
    }
    
    // Phone is no longer collected on the form; do not read from formData
    
    console.log('📱 KYC Action - Final phone number:', phone);
    
    if (!phone) {
      console.error('❌ KYC Action - No phone number available');
      toast.error("Phone number is required for KYC submission!");
      return { success: false, message: "Phone number not found" };
    }

    // Prepare data for phone-based registration (includes phone)
    const dataToSend = {
      ...formData,
      phone: phone, // Ensure phone is included
      State: formData.state // Map state to State (backend expects State)
    };

    console.log("Sending data to phone-based registration:", dataToSend); // Debug log
    
    // Use phone-based registration endpoint instead of legacy email-based
    const response = await axios.post("http://localhost:4000/api/kyc/register", dataToSend, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log("Backend response:", response.data); // Debug log
    
    if (response.data) {
      dispatch({
        type: "CREATE_USER",
        payload: response.data
      });
      
      // Set KYC completion status in localStorage
      localStorage.setItem("kycCompleted", "true");
      
      toast.success("KYC submitted successfully!");
      return { success: true, data: response.data };
    }
  } catch (error) {
    console.error("Backend error:", error.response || error); // Debug log
    
    if (error.response?.data?.message === "User already verified") {
      toast.error("You are already verified!");
      return { success: false, message: "User already verified" };
    } else {
      const errorMessage = error.response?.data?.message || "Something went wrong!";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  }
};
