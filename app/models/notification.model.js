// This model is used for storing notifications

const mongoose = require("mongoose");

const Notification = mongoose.model(
  "Notification",
  new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,  //If notification is for user then save userId
      ref: "User",
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,  //If notification is for provider then save providerId
      ref: "User",
    },
    type: {
      type: String,  //Types: 1)job, 2)rating 3)chat 4)payment
      required: true
    },
    userType: {
      type: "String",       //This is to filter out condition for either user or provider
    },
    title: {
      type: String,
    },
    message: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // createdBy: {
    //   type: mongoose.Schema.Types.ObjectId,   //To know who has created this notification, user or provider
    //   ref: "User",
    // },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  }),
  "notifications"
);

module.exports = Notification;
