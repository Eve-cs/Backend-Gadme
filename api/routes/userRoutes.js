import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../../models/User.js";
import {
  adminDashboard,
  cookieLogin,
  createUser,
  getAllUsers,
  getUserProfile,
  loginUser,
  logoutUser,
  signupUser,
  verifyToken,
} from "../controllers/usersControllers.js";
import { authRoles, authUser } from "../../middleware/auth.js";

const router = express.Router();

//Get all users
router.get("/users", getAllUsers);
//Post a user
router.post("/users", createUser);

//signup a new user
router.post("/auth/signup", signupUser);

//login a user - jwt signed token
router.post("/auth/login", loginUser);

//Login a user - jwt signed token
router.post("/auth/cookie/login", cookieLogin);

// // GET Current User Profile (protected route)
// router.get("/auth/profile", authUser, async (req, res) => {
//   const user = await User.findById(req.user.userId).select("-user_password");
//   if (!user) {
//     return res.status(404).json({ error: true, message: "User not found" });
//   }

//   res.status(200).json({ error: false, user });
// });

// Profile route - Logged-in user by role (User or Admin) (Protected route)
router.get("/auth/profile", authUser, getUserProfile);

// Admin Dashboard route - accessible to users with 'Admin' role
router.get("/admin/dashboard", authUser, authRoles("Admin"), adminDashboard);

// // Admin route - accessible to users with 'Admin' role ⌛waiting to test
// router.get("/admin", authUser, authRoles("Admin"), (req, res) => {
//   res.status(200).json({ message: "Welcome, Admin!" });
// });

// // User route - accessible to users with 'User' role ⌛waiting to test
// router.get("/User", authUser, authRoles("User"), (req, res) => {
//   res.status(200).json({ message: "Welcome, User!" });
// });

// // Profile route User (Protected route)
// router.get(
//   "/auth/profile/user",
//   authUser,
//   authRoles("User"),
//   async (req, res) => {
//     const user = await User.findById(req.user.userId).select("-user_password");
//     if (!user) {
//       return res.status(404).json({
//         error: true,
//         message: "User not found",
//       });
//     }
//     res.status(200).json({
//       error: false,
//       message: `Hello User ${req.user._id}`,
//     });
//   }
// );

// // Profile route Admin (Protected route)
// router.get(
//   "/auth/profile/admin",
//   authUser,
//   authRoles("Admin"),
//   async (req, res) => {
//     const admin = await User.findById(req.user.userId).select("-user_password");
//     if (!admin) {
//       return res.status(404).json({
//         error: true,
//         message: "Admin not found",
//       });
//     }
//     res.status(200).json({
//       error: false,
//       message: `Hello Admin ${req.user._id}`,
//     });
//   }
// );

//Logout user - clear cookie
router.post("/auth/logout", logoutUser);

// Verify JWT token
router.get("/auth/verify", verifyToken);

// ❌ Use after implementing auth
// Create User account
router.post("/create-account", async (req, res) => {
  const { user_name, user_lastname, user_username, user_email, user_password } =
    req.body;

  if (!user_name) {
    return res.status(400).json({ error: true, message: "Name is required" });
  }

  if (!user_lastname) {
    return res
      .status(400)
      .json({ error: true, message: "Lastname is required" });
  }

  if (!user_username) {
    return res
      .status(400)
      .json({ error: true, message: "Username is required" });
  }

  if (!user_email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }

  if (!user_password) {
    return res
      .status(400)
      .json({ error: true, message: "Password is required" });
  }

  const isUser = await User.findOne({ email: user_email });

  if (isUser) {
    return res.json({ error: true, message: "User already exist" });
  }

  const user = new User({
    user_name,
    user_email,
    user_password,
  });

  await user.save();

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m",
  });

  return res.json({
    error: false,
    user,
    accessToken,
    message: "Registration successful",
  });
});

//Get User
router.get("/get-user", authUser, async (req, res) => {
  const { user } = req.user;

  const isUser = await User.findOne({ _id: user._id });

  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({ user: isUser, message: "" });
});

router.get("/auth/me", authUser, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.user });
});

export default router;
