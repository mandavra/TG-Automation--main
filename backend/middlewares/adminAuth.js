// const jwt = require('jsonwebtoken');

// module.exports = (req, res, next) => {
//   const header = req.header('Authorization') || '';
//   const token = header.startsWith('Bearer ') ? header.slice(7) : header;
//   if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

//   try {
//     const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'admin_jwt_secret');
//     req.admin = decoded;
//     next();
//   } catch (ex) {
//     res.status(401).json({ message: 'Invalid token.' });
//   }
// };
// middlewares/adminAuth.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

const verifyAdmin = async (req, res, next) => {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (!token) return res.status(401).json({ message: "Access Denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || "admin_jwt_secret");
    const admin = await Admin.findById(decoded.id);

    if (!admin) return res.status(401).json({ message: "Invalid admin" });

    req.admin = admin; // full admin object attach
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};

module.exports = verifyAdmin;
module.exports.verifyAdmin = verifyAdmin;


