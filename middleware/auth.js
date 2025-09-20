import jwt from "jsonwebtoken";

export const authUser = async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please sign in to continue.",
    });
  }
  try {
    const decoded_token = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded_token.userId, role: decoded_token.role };

    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    res.status(401).json({
      error: true,
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      message: isExpired
        ? "Token has expired, please log in again."
        : "Invalid token.",
    });
  }
};

export const authRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: "Not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: "Forbidden: insufficient role",
      });
    }

    next();
  };
};
