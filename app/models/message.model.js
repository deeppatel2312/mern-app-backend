const mongoose = require("mongoose");

const Message = mongoose.model(
  "message",
  new mongoose.Schema({
    message: {
      type: String,
      index: true,
    },
    seenStatus: {
      type: Boolean,
      required: false,
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    receiversID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    roomID: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    type: {
      type: String,
    },
    image: { type: String, default: "" },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  })
);

module.exports = Message;
