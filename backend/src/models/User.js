import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    profilePicture: {
      type: String,
      default:
        "https://via.placeholder.com/150/cccccc/000000?text=Default+Avatar" 
    },
    avatarColor: {
      type: String,
      default: "#cccccc"
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date
    },
    socketId: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
