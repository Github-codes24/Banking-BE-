const jwt = require('jsonwebtoken');
const Agent = require('../models/agentModel');
const Manager = require('../models/managerModel');


// Main protect middleware
exports.authCheck = async (req, res, next) => {
  let token;

  // 1. Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  console.log("Incoming token:", token);

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ msg: "Unauthorized request" });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Decoded JWT:", decoded);

    // 3. Find user based on role
    let user;
    switch (decoded.role) {
      case 'manager':
        user = await Manager.findById(decoded.id).select('+password');
        break;
      default:
        console.log("Invalid user role");
        return res.status(401).json({ msg: "Invalid user role" });
    }

    if (!user) {
      console.log("No user found in DB");
      return res.status(401).json({ msg: "No user found with this ID" });
    }

    // 4. Attach user to request
    req.user = user;
    req.role = decoded.role;
    console.log("Authenticated user:", user._id);

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ msg: "Not authorized to access this route" });
  }
};


// Role authorization middleware

