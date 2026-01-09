const jwt = require('jsonwebtoken');
const Agent = require('../models/agentModel');
const Manager = require('../models/managerModel');
const Admin = require('../models/adminModel'); // assuming you have Admin model
const Customer = require('../models/coustomerModel'); // assuming you have Admin model

// Main protect middleware
exports.authCheck = async (req, res, next) => {
  let token;

  // 1. Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ msg: "Unauthorized request: No token provided" });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Find user by role in DB
    let user = null;

    // Try Admin
    user = await Admin.findById(decoded.id).select('+password');
    if (!user) {
      // Try Manager
      user = await Manager.findById(decoded.id).select('+password');
    }
    if (!user) {
      // Try Agent / Customer
      user = await Agent.findById(decoded.id).select('+password');
    }
    // if (!user) {
    //   // Try Agent / Customer
    //   user = await Customer.findById(decoded.id).select('+password');
    // }

    if (!user) {
      return res.status(401).json({ msg: "No user found with this ID" });
    }

    // 4. Attach user and role to request
    req.user = user;
    req.role = decoded.role || user.role || 'user'; // fallback role

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ msg: "Not authorized to access this route" });
  }
};

// Role-based authorization middleware
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ msg: `Role '${req.role}' is not authorized to access this route` });
    }
    next();
  };
};
