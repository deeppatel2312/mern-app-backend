const mongoose = require("mongoose");

const JobStatus = mongoose.model(
  "JobStatus",
  new mongoose.Schema({
    title: String, // ongoing/upcoming.completed/cancelled
    code: String,
  }),
  "jobStatuses"
);

module.exports = JobStatus;
