const mongoose = require("mongoose");

const BlockSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const UnseenCountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

const ChatSchema = new mongoose.Schema({
  user: [
    {
      type: String,
      required: true,
      ref: "User",
    },
  ],
  blockedUsers: [BlockSchema], // Blocking information associated with the chat
  isDeleted: {
    type: Boolean,
  },
  message: {
    type: String,
  },
  lastMessage : {
    type: Object
  },
  unseenMessageCount: [UnseenCountSchema],
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

const Chat = mongoose.model("Chat", ChatSchema);

module.exports = Chat;
