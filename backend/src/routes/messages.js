import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { chatId: { $in: await getChatIds(userId) } }]
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/send", async (req, res) => {
  try {
    const { receiverId, content, senderId, replyTo } = req.body;
    const chatId = [senderId, receiverId].sort().join("_");
    const message = new Message({
      chatId,
      senderId,
      content,
      status: "sent",
      replyTo: replyTo || null,
      reactions: []
    });

    await message.save();
    res.status(201).json({
      id: message._id,
      chatId,
      senderId,
      content,
      status: message.status,
      replyTo: message.replyTo,
      timestamp: message.timestamp,
      reactions: []
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/status", async (req, res) => {
  try {
    const { messageId, status, chatId } = req.body;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    message.status = status;
    await message.save();
    res.status(200).json({ message: "Status updated" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/react", async (req, res) => {
  try {
    const { messageId, userId, emoji, chatId } = req.body;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.chatId !== chatId)
      return res.status(400).json({ message: "Invalid chatId" });

    if (
      message.reactions.some(
        (r) => r.userId.toString() === userId && r.emoji === emoji
      )
    ) {
      return res.status(400).json({ message: "Reaction already exists" });
    }

    message.reactions.push({ userId, emoji });
    await message.save();
    console.log("Reaction added in DB:", { messageId, userId, emoji, chatId });
    res.status(200).json({
      message: "Reaction added",
      reaction: { userId, emoji },
      updatedMessage: {
        id: message._id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        status: message.status,
        replyTo: message.replyTo,
        timestamp: message.timestamp,
        reactions: message.reactions
      }
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ message: "Server error" });
  }
});

async function getChatIds(userId) {
  const user = await User.findById(userId);
  const contacts = await User.find({ _id: { $ne: userId } });
  return contacts.map((contact) => [userId, contact._id].sort().join("_"));
}

export default router;
