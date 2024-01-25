const mongoose = require("mongoose");

const ProviderService = mongoose.model(
  "ProviderService",
  new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User" // Reference the User model
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    },
    rate: { type: Number, default: 0 },
    images: { type: Array, default: [] },
    userRating: { type: Number, default: 0 }, // storing the provider's rating here, so we don't have to search in another table
    isActive: { type: Boolean, default: true },
    createdAt: { type: String, default: new Date().toISOString() },
    updatedAt: { type: String, default: new Date().toISOString() },
  }),
  "providerServices"
);

module.exports = ProviderService;
