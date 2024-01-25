const mongoose = require("mongoose");

const UserDevice = mongoose.model(
  "UserDevice",
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      deviceType: {
        type: String,
        enum: ["android", "ios", "web"],
      },
      fcmToken: {
        type: String,
      },
      deviceId: {
        type: String,
      },
      createdAt: { type: String, default: () => new Date().toISOString() },
      updatedAt: { type: String, default: () => new Date().toISOString() },
    }
  ),
  "userDevices"
);

module.exports = UserDevice;
