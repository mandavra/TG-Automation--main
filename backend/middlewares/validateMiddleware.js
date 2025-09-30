const { body, validationResult } = require('express-validator');

// Generic validation middleware runner
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    next();
  };
};

// ✅ Phone Number Validation (for OTP or login)
const sendOTPValidation = [
  body('phone')
    .isMobilePhone()
    .withMessage('Invalid phone number')
];

// ✅ OTP Verification Validation
const verifyOTPValidation = [
  body('phone')
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

// ✅ PAN KYC Validation
const panKycValidation = [
  body('panNumber')
    .notEmpty()
    .withMessage('PAN number is required'),
  body('dob')
    .matches(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/)
    .withMessage('Invalid date format (YYYY-MM-DD or DD/MM/YYYY)'),

  body('state')
    .notEmpty()
    .withMessage('State is required')
];


// ✅ Aadhaar KYC Validation
const aadhaarKycValidation = [
  body('aadhaarNumber')
    .matches(/^\d{12}$/)
    .withMessage('Invalid Aadhaar number')
];

// ✅ Plan Change Validation
const planChangeValidation = [
  body('currentPlan')
    .isIn(['Base', 'Pro', 'Enterprise'])
    .withMessage('Invalid current plan'),
  body('newPlan')
    .isIn(['Base', 'Pro', 'Enterprise'])
    .withMessage('Invalid new plan')
];

// Export all validations and middleware
module.exports = {
  validate,
  sendOTPValidation,
  verifyOTPValidation,
  panKycValidation,
  aadhaarKycValidation,
  planChangeValidation
};
