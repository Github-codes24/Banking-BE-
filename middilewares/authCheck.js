const jwt = require('jsonwebtoken');
const Agent = require('../models/agentModel');
const Manager = require('../models/managerModel');


// Main protect middleware
exports.authCheck = async (req, res, next) => {
  let token;

  // 1. Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Or get from cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  console.log(token)
  // 2. Verify token exists
  if (!token) {
   res.status(401).json({ msg: "Unauthorized request" });
  }

  try {
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 4. Find user based on role
    let user;
    switch (decoded.role) {

      case 'manager':
        user = await Manager.findById(decoded.id).select('+password');
        break;
    //   case 'admin':
    //     // Assuming admin is a special manager
    //     user = await Manager.findById(decoded.id).select('+password');
    //     break;
      default:
       res.status(401).json({ msg: "invalid user role" });
    }

    if (!user) {
     res.status(401).json({ msg: "no user found with this id" });
    }



    // 6. Attach user to request
    req.user = user;
    req.role = decoded.role
    next();
  } catch (err) {
    // return next(new ErrorResponse('Not authorized to access this route', 401));
    res.status(401).json({ msg: "Not authorized to access this route" });
  }
};

// Role authorization middleware

