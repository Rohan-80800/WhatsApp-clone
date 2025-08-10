import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/messages.js";
import User from "./models/User.js";
import Message from "./models/Message.js";
import dotenv from "dotenv";
import path from "path";
import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors({ origin: "http://localhost:5173" }));
const __dirname = path.resolve();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/messages", authMiddleware, messageRoutes);

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/whatsapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", async (userId) => {
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: null,
      socketId: socket.id
    });
    socket.join(userId);
    io.emit("userStatus", { userId, status: "online" });
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on("sendMessage", async (message) => {
    const { receiverId, content, senderId, replyTo } = message;
    const chatId = [senderId, receiverId].sort().join("_");
    try {
      const newMessage = new Message({
        chatId,
        senderId,
        content,
        timestamp: new Date(),
        status: "sent",
        replyTo: replyTo || null,
        reactions: []
      });
      await newMessage.save();
      const messageData = {
        id: newMessage._id,
        chatId,
        senderId,
        content,
        timestamp: newMessage.timestamp,
        status: newMessage.status,
        replyTo: newMessage.replyTo,
        reactions: []
      };
      io.to(senderId).to(receiverId).emit("receiveMessage", messageData);
      console.log(
        `Message sent to rooms ${senderId} and ${receiverId}:`,
        messageData
      );
      const receiver = await User.findById(receiverId);
      if (receiver?.isOnline) {
        await Message.findByIdAndUpdate(newMessage._id, { status: "delivered" });
        io.to(senderId).to(receiverId).emit("messageStatusUpdate", {
          messageId: newMessage._id,
          status: "delivered",
          chatId
        });
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("messageStatus", async ({ messageId, status, chatId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { status });
      const [user1, user2] = chatId.split("_");
      io.to(user1)
        .to(user2)
        .emit("messageStatusUpdate", { messageId, status, chatId });
      console.log(`Status updated for message ${messageId}: ${status}`);
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  });

  socket.on("reactionUpdate", async ({ messageId, userId, emoji, chatId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      message.reactions.push({ userId, emoji });
      await message.save();
      const [user1, user2] = chatId.split("_");
      io.to(user1).to(user2).emit("reactionUpdate", { messageId, userId, emoji, chatId });
      console.log(`Reaction added to message ${messageId}: ${emoji}`);
    }catch(react) {
      console.error("Error adding reaction:", error);
    }
  });

  socket.on("typing", ({ chatId, userId }) => {
    const [user1, user2] = chatId.split("_");
    socket.to(user1).to(user2).emit("typing", { userId, chatId });
  });

  socket.on("stopTyping", ({ chatId, userId }) => {
    const [user1, user2] = chatId.split("_");
    socket.to(user1).to(user2).emit("stopTyping", { userId, chatId });
  });

  socket.on("disconnect", async () => {
    const user = await User.findOne({ socketId: socket.id });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: new Date()
      });
      io.emit("userStatus", {
        userId: user._id,
        status: "offline",
        lastSeen: new Date()
      });
      console.log(`User ${user._id} disconnected`);
    }
    console.log("User disconnected:", socket.id);
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
