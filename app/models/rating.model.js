const mongoose = require("mongoose");

const Rating = mongoose.model(
  "Rating",
  new mongoose.Schema({
    userRating: Number,  // userRating is given by provider to user
    userReview: String,  // userReview is given by provider to user
    providerRating: Number,  // providerRating is given by user to provider
    providerReview: String,  // providerReview is given by user to provider
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference the User model
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference the User model
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service", // Reference the Service model
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job", // Reference the Job model
    },
    // isActive: { type: Boolean, default: true },
    isActiveForUser: { type: Boolean, default: true }, // This is for user, rating to be seen or not seen
    isActiveForProvider: { type: Boolean, default: true }, // This is for provider, rating to be seen or not seen
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    isReported: { type: Boolean, default: false }
  }),
  "ratings"
);

module.exports = Rating;
