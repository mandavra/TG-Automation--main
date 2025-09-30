/* GENERATE OTP */
const generateOTP = (length = 4) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

module.exports = generateOTP;