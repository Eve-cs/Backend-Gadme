import { User } from "../../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-user_password")
      .sort({ createdAt: -1 });
    res.json({ error: false, users });
  } catch (err) {
    res.status(500).json({
      error: true,
      message: "Failed to fetch users",
    });
  }
};

export const createUser = async (req, res) => {
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

  try {
    // prevent duplicates email
    const existing = await User.findOne({ user_email });
    if (existing) {
      return res
        .status(409)
        .json({ error: true, message: "Email is already in use" });
    }

    // create & save user
    const user = new User({
      user_name,
      user_lastname,
      user_username,
      user_email,
      user_password,
    });
    await user.save();

    return res
      .status(201)
      .json({ error: false, user, message: "User created successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: true, message: "server error", details: err.message });
  }
};

//signup a new user
export const signupUser = async (req, res) => {
  const { user_name, user_lastname, user_username, user_email, user_password } =
    req.body;

  if (
    !user_name ||
    !user_lastname ||
    !user_username ||
    !user_email ||
    !user_password
  ) {
    return res
      .status(400)
      .json({ error: true, message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ user_email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: true, message: "Email already in use" });
    }

    const user = new User({
      user_name,
      user_lastname,
      user_username,
      user_email,
      user_password,
    });
    await user.save();

    res.status(201).json({ error: false, message: "User signup successfully" });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "server error",
      details: err.message,
    });
  }
};

export const loginUser = async (req, res) => {
  console.log(req.body);
  const { user_email, user_password } = req.body;

  if (!user_email || !user_password) {
    return res
      .status(400)
      .json({ error: true, message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ user_email });
    if (!user) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(user_password, user.user_password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ error: false, token, message: "Login successful" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: true, message: "server error", details: err.message });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-user_password");
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }
    res
      .status(200)
      .json({ error: false, message: `Welcome ${user.user_role}`, user });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Admin dashboard access
export const adminDashboard = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select("-user_password");
    if (!admin) {
      return res.status(404).json({
        error: true,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      error: false,
      message: `Welcome to Admin Dashboard admin ${admin.user_name}`,
      admin,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Login user with cookies
export const cookieLogin = async (req, res) => {
  const { user_email, user_password } = req.body || {};

  if (!user_email || !user_password) {
    return res
      .status(400)
      .json({ error: true, message: "Email and Password are required" });
  }
  if (!process.env.JWT_SECRET) {
    return res
      .status(500)
      .json({ error: true, message: "Server misconfigured" });
  }

  try {
    const email = user_email.trim().toLowerCase();
    const user = await User.findOne({ user_email: email }).select(
      "+user_password +user_role"
    );
    if (!user)
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(user_password, user.user_password);
    if (!isMatch) {
      return res.status(401).json({
        error: true,
        message: "Invalid credentials",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1h
    });

    return res.status(200).json({
      error: false,
      message: "Login successful",
      user: {
        _id: user._id,
        user_name: user.user_name,
        user_lastname: user.user_lastname,
        user_email: user.user_email,
        user_username: user.user_username,
        user_role: user.user_role,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: true, message: "Server error", details: err.message });
  }
};

export const verifyToken = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: true, message: "Token is required" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      error: false,
      userId: decoded.userId,
      role: decoded.role,
      message: "Token is valid",
    });
  } catch (err) {
    return res.status(401).json({ error: true, message: "Invalid token" });
  }
};

// Logout user - clear cookie
export const logoutUser = (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
  });
  return res.status(200).json({ message: "Logged out successfully" });
};
