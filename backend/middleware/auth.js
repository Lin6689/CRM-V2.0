const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "crm-dev-secret";

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, businessId: user.businessId || user._id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// RBAC: sirf allowed roles ko aage jane do
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    next();
  };
}

module.exports = { signToken, authMiddleware, authorizeRoles };
