import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import multer from "multer";


const storage = multer.memoryStorage();
const upload = multer({ storage });
const router = express.Router();

const generateAvatarColor = () => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B59B6",
    "#3498DB",
    "#E74C3C",
    "#2ECC71"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const { username, phone, password} = req.body;
    const existingUser = await User.findOne({ $or: [{ phone }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarColor = generateAvatarColor();
    
      const profilePicture = req.file ? req.file.buffer.toString("base64") : "";
    
    
    const user = new User({
      username,
      phone,
      password: hashedPassword,
      profilePicture: profilePicture || "",
      avatarColor
    });

    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });
    res.status(201).json({
      user: {
        id: user._id,
        username,
        phone,
        profilePicture: user.profilePicture,
        avatarColor: user.avatarColor
      },
      token
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });
    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        phone,
        profilePicture: user.profilePicture,
        avatarColor: user.avatarColor
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/verify", (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ userId: decoded.userId });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      console.log("No token provided in /api/auth/users");
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded userId:", decoded.userId);
    const users = await User.find({ _id: { $ne: decoded.userId } }).select(
      "_id username phone profilePicture avatarColor isOnline lastSeen socketId"
    );
    console.log("Fetched users:", users);
    res.status(200).json(
      users.map((user) => ({
        id: user._id,
        username: user.username,
        phone: user.phone,
        profilePicture: user.profilePicture,
        avatarColor: user.avatarColor,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        socketId: user.socketId
      }))
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
