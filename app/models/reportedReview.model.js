const mongoose = require("mongoose");

const ReportedReview = mongoose.model(
  "ReportedReview",
  new mongoose.Schema({
    reportedPerson: { // the person who is being reported
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reportingPerson: { // the person who is reporting
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rating",
    },
    description: String,
    status: { type: String, default: 'pending' }, // pending/review/resolved
    isActive: { type: Boolean, default: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    resolvedAt: { type: String, default: null }
  }),
  "reportedReviews"
);

module.exports = ReportedReview;

/*
Pending - No action has been taken by admin yet
Review - Being reviewed by admin
Resolved - Appropriate action has been taken
*/